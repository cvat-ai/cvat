# Copyright (C) 2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import base64
import json
import os
import textwrap
from copy import deepcopy
from datetime import timedelta
from functools import wraps
from typing import Any

import datumaro.util.mask_tools as mask_tools
import django_rq
import numpy as np
import requests
import rq
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist, ValidationError
from django.core.signing import BadSignature, TimestampSigner
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import (
    OpenApiParameter,
    OpenApiResponse,
    extend_schema,
    extend_schema_view,
    inline_serializer,
)
from rest_framework import serializers, status, viewsets
from rest_framework.response import Response

import cvat.apps.dataset_manager as dm
from cvat.apps.dataset_manager.task import PatchAction
from cvat.apps.engine.frame_provider import TaskFrameProvider
from cvat.apps.engine.log import ServerLogManager
from cvat.apps.engine.models import (
    Job,
    Label,
    RequestAction,
    RequestTarget,
    ShapeType,
    SourceType,
    Task,
)
from cvat.apps.engine.rq import RequestId, define_dependent_job
from cvat.apps.engine.serializers import LabeledDataSerializer
from cvat.apps.engine.types import ExtendedRequest
from cvat.apps.engine.utils import get_rq_lock_by_user, get_rq_lock_for_job, take_by
from cvat.apps.events.handlers import handle_function_call
from cvat.apps.iam.filters import ORGANIZATION_OPEN_API_PARAMETERS
from cvat.apps.lambda_manager.models import FunctionKind
from cvat.apps.lambda_manager.permissions import LambdaPermission
from cvat.apps.lambda_manager.rq import LambdaRQMeta
from cvat.apps.lambda_manager.serializers import (
    FunctionCallRequestSerializer,
    FunctionCallSerializer,
)
from cvat.apps.lambda_manager.signals import interactive_function_call_signal
from cvat.utils.http import make_requests_session

slogger = ServerLogManager(__name__)


class LambdaGateway:
    NUCLIO_ROOT_URL = "/api/functions"

    def _http(
        self,
        method="get",
        scheme=None,
        host=None,
        port=None,
        function_namespace=None,
        url=None,
        headers=None,
        data=None,
    ):
        NUCLIO_GATEWAY = "{}://{}:{}".format(
            scheme or settings.NUCLIO["SCHEME"],
            host or settings.NUCLIO["HOST"],
            port or settings.NUCLIO["PORT"],
        )
        NUCLIO_FUNCTION_NAMESPACE = function_namespace or settings.NUCLIO["FUNCTION_NAMESPACE"]
        NUCLIO_TIMEOUT = settings.NUCLIO["DEFAULT_TIMEOUT"]
        extra_headers = {
            "x-nuclio-project-name": "cvat",
            "x-nuclio-function-namespace": NUCLIO_FUNCTION_NAMESPACE,
            "x-nuclio-invoke-via": "domain-name",
            "X-Nuclio-Invoke-Timeout": f"{NUCLIO_TIMEOUT}s",
        }
        if headers:
            extra_headers.update(headers)

        if url:
            url = "{}{}".format(NUCLIO_GATEWAY, url)
        else:
            url = NUCLIO_GATEWAY

        with make_requests_session() as session:
            reply = session.request(
                method, url, headers=extra_headers, timeout=NUCLIO_TIMEOUT, json=data
            )
            reply.raise_for_status()
            response = reply.json()

        return response

    def list(self):
        data = self._http(url=self.NUCLIO_ROOT_URL)
        for item in data.values():
            try:
                yield LambdaFunction(self, item)
            except InvalidFunctionMetadataError:
                slogger.glob.error("Failed to parse lambda function metadata", exc_info=True)

    def get(self, func_id):
        data = self._http(url=self.NUCLIO_ROOT_URL + "/" + func_id)
        response = LambdaFunction(self, data)
        return response

    def invoke(self, func, payload):
        invoke_method = {
            "dashboard": self._invoke_via_dashboard,
            "direct": self._invoke_directly,
        }

        return invoke_method[settings.NUCLIO["INVOKE_METHOD"]](func, payload)

    def _invoke_via_dashboard(self, func, payload):
        return self._http(
            method="post",
            url="/api/function_invocations",
            data=payload,
            headers={"x-nuclio-function-name": func.id, "x-nuclio-path": "/"},
        )

    def _invoke_directly(self, func, payload):
        # host.docker.internal for Linux will work only with Docker 20.10+
        NUCLIO_TIMEOUT = settings.NUCLIO["DEFAULT_TIMEOUT"]
        if os.path.exists("/.dockerenv"):  # inside a docker container
            url = f"http://host.docker.internal:{func.port}"
        else:
            url = f"http://localhost:{func.port}"

        with make_requests_session() as session:
            reply = session.post(url, timeout=NUCLIO_TIMEOUT, json=payload)
            reply.raise_for_status()
            response = reply.json()

        return response


class InvalidFunctionMetadataError(Exception):
    pass


class LambdaFunction:
    FRAME_PARAMETERS = (
        ("frame", "frame"),
        ("frame0", "start frame"),
        ("frame1", "end frame"),
    )

    TRACKER_STATE_MAX_AGE = timedelta(hours=8)

    def __init__(self, gateway, data):
        # ID of the function (e.g. omz.public.yolo-v3)
        self.id = data["metadata"]["name"]
        # type of the function (e.g. detector, interactor)
        meta_anno: dict[str, str] = data["metadata"]["annotations"]
        kind = meta_anno.get("type")
        try:
            self.kind = FunctionKind(kind)
        except ValueError as e:
            raise InvalidFunctionMetadataError(
                f"{self.id} lambda function has unknown type: {kind!r}"
            ) from e
        # dictionary of labels for the function (e.g. car, person)
        spec = json.loads(meta_anno.get("spec") or "[]")

        def parse_labels(spec):
            def parse_attributes(attrs_spec):
                parsed_attributes = [
                    {
                        "name": attr["name"],
                        "input_type": attr["input_type"],
                        "values": attr["values"],
                    }
                    for attr in attrs_spec
                ]

                if len(parsed_attributes) != len({attr["name"] for attr in attrs_spec}):
                    raise InvalidFunctionMetadataError(
                        f"{self.id} lambda function has non-unique attributes"
                    )

                return parsed_attributes

            parsed_labels = []
            for label in spec:
                parsed_label = {
                    "name": label["name"],
                    "type": label.get("type", "any"),
                    "attributes": parse_attributes(label.get("attributes", [])),
                }
                if parsed_label["type"] == "skeleton":
                    parsed_label.update(
                        {"sublabels": parse_labels(label["sublabels"]), "svg": label["svg"]}
                    )
                parsed_labels.append(parsed_label)

            if len(parsed_labels) != len({label["name"] for label in spec}):
                raise InvalidFunctionMetadataError(
                    f"{self.id} lambda function has non-unique labels"
                )

            return parsed_labels

        self.labels = parse_labels(spec)
        # mapping of labels and corresponding supported attributes
        self.func_attributes = {item["name"]: item.get("attributes", []) for item in spec}
        for label, attributes in self.func_attributes.items():
            if len([attr["name"] for attr in attributes]) != len(
                set([attr["name"] for attr in attributes])
            ):
                raise InvalidFunctionMetadataError(
                    "`{}` lambda function has non-unique attributes for label {}".format(
                        self.id, label
                    )
                )
        # description of the function
        self.description = data["spec"]["description"]
        # http port to access the serverless function
        self.port = data["status"].get("httpPort")
        # display name for the function
        self.name = meta_anno.get("name", self.id)
        self.min_pos_points = int(meta_anno.get("min_pos_points", 1))
        self.min_neg_points = int(meta_anno.get("min_neg_points", -1))
        self.startswith_box = bool(meta_anno.get("startswith_box", False))
        self.startswith_box_optional = bool(meta_anno.get("startswith_box_optional", False))
        self.animated_gif = meta_anno.get("animated_gif", "")
        self.version = int(meta_anno.get("version", "1"))
        self.help_message = meta_anno.get("help_message", "")
        self.gateway = gateway

        if "supported_shape_types" in meta_anno:
            self.supported_shape_types = [
                stripped
                for st in meta_anno["supported_shape_types"].split(",")
                for stripped in [st.strip()]
                if stripped
            ]
            if not self.supported_shape_types:
                raise InvalidFunctionMetadataError(
                    f"{self.id!r} lambda function has no supported shape types"
                )
        else:
            # This means that the function only supports rectangles, and that it
            # implements the legacy interface where "shapes" only contains point arrays.
            self.supported_shape_types = None

    def to_dict(self):
        response = {
            "id": self.id,
            "kind": str(self.kind),
            "labels_v2": self.labels,
            "description": self.description,
            "name": self.name,
            "version": self.version,
        }

        if self.kind is FunctionKind.INTERACTOR:
            response.update(
                {
                    "min_pos_points": self.min_pos_points,
                    "min_neg_points": self.min_neg_points,
                    "startswith_box": self.startswith_box,
                    "startswith_box_optional": self.startswith_box_optional,
                    "help_message": self.help_message,
                    "animated_gif": self.animated_gif,
                }
            )
        elif self.kind is FunctionKind.TRACKER:
            response.update(
                {
                    "supported_shape_types": self.supported_shape_types or ["rectangle"],
                }
            )

        return response

    def invoke(
        self,
        db_task: Task,
        data: dict[str, Any],
        *,
        db_job: Job | None = None,
        is_interactive: bool | None = False,
        request: ExtendedRequest | None = None,
        converter: DetectionResultConverter | None = None,
    ):
        if db_job is not None and db_job.get_task_id() != db_task.id:
            raise ValidationError(
                "Job task id does not match task id", code=status.HTTP_400_BAD_REQUEST
            )

        payload = {}
        data = {k: v for k, v in data.items() if v is not None}

        def mandatory_arg(name: str) -> Any:
            try:
                return data[name]
            except KeyError:
                raise ValidationError(
                    "`{}` lambda function was called without mandatory argument: {}".format(
                        self.id, name
                    ),
                    code=status.HTTP_400_BAD_REQUEST,
                )

        threshold = data.get("threshold")
        if threshold:
            payload.update({"threshold": threshold})
        mapping = data.get("mapping", {})

        model_labels = self.labels
        task_labels = db_task.get_labels(prefetch=True)

        def labels_compatible(model_label: dict, task_label: Label) -> bool:
            model_type = model_label["type"]
            db_type = task_label.type
            compatible_types = [[ShapeType.MASK, ShapeType.POLYGON]]
            return (
                model_type == db_type
                or (db_type == "any" and model_type != "skeleton")
                or (model_type == "any" and db_type != "skeleton")
                or any(
                    [
                        model_type in compatible and db_type in compatible
                        for compatible in compatible_types
                    ]
                )
            )

        def make_default_mapping(model_labels, task_labels):
            mapping_by_default = {}
            for model_label in model_labels:
                for task_label in task_labels:
                    if task_label.name == model_label["name"] and labels_compatible(
                        model_label, task_label
                    ):
                        attributes_default_mapping = {}
                        for model_attr in model_label.get("attributes", {}):
                            for db_attr in task_label.attributespec_set.all():
                                if db_attr.name == model_attr["name"]:
                                    attributes_default_mapping[model_attr["name"]] = db_attr.name

                        mapping_by_default[model_label["name"]] = {
                            "name": task_label.name,
                            "attributes": attributes_default_mapping,
                        }

                        if model_label["type"] == "skeleton" and task_label.type == "skeleton":
                            mapping_by_default[model_label["name"]]["sublabels"] = (
                                make_default_mapping(
                                    model_label["sublabels"],
                                    task_label.sublabels.all(),
                                )
                            )

            return mapping_by_default

        def update_mapping(_mapping, _model_labels, _db_labels):
            copy = deepcopy(_mapping)
            for model_label_name, mapping_item in copy.items():
                md_label = next(filter(lambda x: x["name"] == model_label_name, _model_labels))
                db_label = next(filter(lambda x: x.name == mapping_item["name"], _db_labels))
                mapping_item.setdefault("attributes", {})
                mapping_item["md_label"] = md_label
                mapping_item["db_label"] = db_label
                if md_label["type"] == "skeleton" and db_label.type == "skeleton":
                    mapping_item["sublabels"] = update_mapping(
                        mapping_item["sublabels"], md_label["sublabels"], db_label.sublabels.all()
                    )
            return copy

        def validate_labels_mapping(_mapping, _model_labels, _db_labels):
            def validate_attributes_mapping(attributes_mapping, model_attributes, db_attributes):
                db_attr_names = [attr.name for attr in db_attributes]
                model_attr_names = [attr["name"] for attr in model_attributes]
                for model_attr in attributes_mapping:
                    task_attr = attributes_mapping[model_attr]
                    if model_attr not in model_attr_names:
                        raise ValidationError(
                            f'Invalid mapping. Unknown model attribute "{model_attr}"'
                        )
                    if task_attr not in db_attr_names:
                        raise ValidationError(
                            f'Invalid mapping. Unknown db attribute "{task_attr}"'
                        )

            for model_label_name, mapping_item in _mapping.items():
                db_label_name = mapping_item["name"]

                md_label = None
                db_label = None
                try:
                    md_label = next(x for x in _model_labels if x["name"] == model_label_name)
                except StopIteration:
                    raise ValidationError(
                        f'Invalid mapping. Unknown model label "{model_label_name}"'
                    )

                try:
                    db_label = next(x for x in _db_labels if x.name == db_label_name)
                except StopIteration:
                    raise ValidationError(f'Invalid mapping. Unknown db label "{db_label_name}"')

                if not labels_compatible(md_label, db_label):
                    raise ValidationError(
                        f'Invalid mapping. Model label "{model_label_name}" and'
                        + f' database label "{db_label_name}" are not compatible'
                    )

                validate_attributes_mapping(
                    mapping_item.get("attributes", {}),
                    md_label["attributes"],
                    db_label.attributespec_set.all(),
                )

                if md_label["type"] == "skeleton" and db_label.type == "skeleton":
                    if "sublabels" not in mapping_item:
                        raise ValidationError(
                            f'Mapping for elements was not specified in skeleton "{model_label_name}" '
                        )

                    validate_labels_mapping(
                        mapping_item["sublabels"], md_label["sublabels"], db_label.sublabels.all()
                    )

        if not mapping:
            mapping = make_default_mapping(model_labels, task_labels)
        else:
            validate_labels_mapping(mapping, self.labels, task_labels)

        mapping = update_mapping(mapping, self.labels, task_labels)

        # Check job frame boundaries
        if db_job:
            task_data = db_task.data
            data_start_frame = task_data.start_frame
            step = task_data.get_frame_step()

            for key, desc in self.FRAME_PARAMETERS:
                if key not in data:
                    continue

                abs_frame_id = data_start_frame + data[key] * step
                if not db_job.segment.contains_frame(abs_frame_id):
                    raise ValidationError(
                        f"The {desc} is outside the job range", code=status.HTTP_400_BAD_REQUEST
                    )

        if self.kind == FunctionKind.DETECTOR:
            payload.update({"image": self._get_image(db_task, mandatory_arg("frame"))})
        elif self.kind == FunctionKind.INTERACTOR:
            payload.update(
                {
                    "image": self._get_image(db_task, mandatory_arg("frame")),
                    "pos_points": mandatory_arg("pos_points"),
                    "neg_points": mandatory_arg("neg_points"),
                    "obj_bbox": data.get("obj_bbox", None),
                }
            )
        elif self.kind == FunctionKind.REID:
            payload.update(
                {
                    "image0": self._get_image(db_task, mandatory_arg("frame0")),
                    "image1": self._get_image(db_task, mandatory_arg("frame1")),
                    "boxes0": mandatory_arg("boxes0"),
                    "boxes1": mandatory_arg("boxes1"),
                }
            )
            max_distance = data.get("max_distance")
            if max_distance:
                payload.update({"max_distance": max_distance})
        elif self.kind == FunctionKind.TRACKER:
            signer = TimestampSigner(salt=f"cvat-tracker-state:{self.id}")

            def prepare_shape(shape):
                if shape is None:
                    return None

                supported_shape_types = self.supported_shape_types or [ShapeType.RECTANGLE]
                if shape["type"] not in supported_shape_types:
                    raise ValidationError(
                        f"This function does not support shapes of type {shape['type']!r}"
                    )

                if self.supported_shape_types is None:
                    # If the function does not declare supported shape types,
                    # it uses the legacy behavior where "shapes" only contains point arrays
                    # and the "rectangle" type is implied.
                    return shape["points"]

                return shape

            try:
                if "states" not in data:
                    # initializing tracking
                    shapes = mandatory_arg("shapes")
                    states = []
                elif "shapes" not in data:
                    # continuing tracking
                    states = mandatory_arg("states")

                    # Previously, the UI used to pass the previous-frame shapes when continuing
                    # tracking. It doesn't do that anymore, but to support old tracking functions
                    # that rely on the length of the "shapes" array, we'll pad it out with nulls.
                    # If a function relies on the _contents_ of the "shapes" array, it will not
                    # work anymore.
                    shapes = [None] * len(states)
                else:
                    # We should not normally get here, but it's possible if e.g. someone is still
                    # running an old UI version.
                    states = data["states"]
                    shapes = data["shapes"]

                payload.update(
                    {
                        "image": self._get_image(db_task, mandatory_arg("frame")),
                        "shapes": list(map(prepare_shape, shapes)),
                        "states": [
                            (
                                None
                                if state is None
                                else json.loads(
                                    signer.unsign(state, max_age=self.TRACKER_STATE_MAX_AGE)
                                )
                            )
                            for state in states
                        ],
                    }
                )
            except BadSignature as ex:
                raise ValidationError("Invalid or expired tracker state") from ex
        else:
            raise ValidationError(
                "`{}` lambda function has incorrect type: {}".format(self.id, self.kind),
                code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        if is_interactive and request:
            interactive_function_call_signal.send(sender=self, request=request)

        response = self.gateway.invoke(self, payload)

        def check_attr_value(value, db_attr):
            if db_attr is None:
                return False

            db_attr_type = db_attr["input_type"]
            if db_attr_type == "number":
                min_value, max_value, step = map(int, db_attr["values"].split("\n"))

                try:
                    value_num = int(value)
                except ValueError:
                    return False

                return min_value <= value_num <= max_value and (value_num - min_value) % step == 0
            elif db_attr_type == "checkbox":
                return value in ["true", "false"]
            elif db_attr_type == "text":
                return True
            elif db_attr_type in ["select", "radio"]:
                return value in db_attr["values"]
            else:
                return False

        def transform_attributes(input_attributes, attr_mapping, db_attributes):
            attributes = []
            for attr in input_attributes:
                if attr["name"] not in attr_mapping:
                    continue
                db_attr_name = attr_mapping[attr["name"]]
                db_attr = next(filter(lambda x: x["name"] == db_attr_name, db_attributes), None)
                if db_attr is not None and check_attr_value(attr["value"], db_attr):
                    attributes.append({"name": db_attr["name"], "value": attr["value"]})
            return attributes

        if self.kind == FunctionKind.DETECTOR:
            response_filtered = []

            for item in response:
                item_label = item["label"]
                if item_label not in mapping:
                    continue
                db_label = mapping[item_label]["db_label"]
                item["label"] = db_label.name
                item["attributes"] = transform_attributes(
                    item.get("attributes", {}),
                    mapping[item_label]["attributes"],
                    db_label.attributespec_set.values(),
                )

                if "elements" in item:
                    sublabels = mapping[item_label]["sublabels"]
                    item["elements"] = [x for x in item["elements"] if x["label"] in sublabels]
                    for element in item["elements"]:
                        element_label = element["label"]
                        db_label = sublabels[element_label]["db_label"]
                        element["label"] = db_label.name
                        element["attributes"] = transform_attributes(
                            element.get("attributes", {}),
                            sublabels[element_label]["attributes"],
                            db_label.attributespec_set.values(),
                        )
                response_filtered.append(item)

            response = converter.convert(
                conv_mask_to_poly=data.get("conv_mask_to_poly", False),
                frame=mandatory_arg("frame"),
                annotations=response_filtered,
            )
        elif self.kind == FunctionKind.TRACKER:
            if "shapes" in response and not self.supported_shape_types:
                response["shapes"] = [
                    None if points is None else {"type": ShapeType.RECTANGLE, "points": points}
                    for points in response["shapes"]
                ]
            response["states"] = [
                # We could've used .sign_object, but that unconditionally applies
                # an extra layer of Base64 encoding, bloating each state by 33%.
                # So we just encode the state manually instead.
                signer.sign(json.dumps(state, separators=(",", ":")))
                for state in response["states"]
            ]

        return response

    def _get_image(self, db_task, frame):
        frame_provider = TaskFrameProvider(db_task)
        image = frame_provider.get_frame(frame)

        return base64.b64encode(image.data.getvalue()).decode("utf-8")


class LambdaQueue:
    RESULT_TTL = timedelta(minutes=30)
    FAILED_TTL = timedelta(hours=3)

    def _get_queue(self):
        return django_rq.get_queue(settings.CVAT_QUEUES.AUTO_ANNOTATION.value)

    def get_jobs(self):
        queue = self._get_queue()
        # Only failed jobs are not included in the list below.
        job_ids = set(
            queue.get_job_ids()
            + queue.started_job_registry.get_job_ids()
            + queue.finished_job_registry.get_job_ids()
            + queue.scheduled_job_registry.get_job_ids()
            + queue.deferred_job_registry.get_job_ids()
        )
        jobs = queue.job_class.fetch_many(job_ids, queue.connection)

        return [LambdaJob(job) for job in jobs if job and LambdaRQMeta.for_job(job).lambda_]

    def enqueue(
        self,
        lambda_func,
        threshold,
        task,
        mapping,
        cleanup,
        conv_mask_to_poly,
        max_distance,
        request,
        *,
        job: int | None = None,
    ) -> LambdaJob:
        queue = self._get_queue()
        rq_id = RequestId(
            action=RequestAction.AUTOANNOTATE, target=RequestTarget.TASK, target_id=task
        ).render()

        # Ensure that there is no race condition when processing parallel requests.
        # Enqueuing an RQ job with (queue, user) lock  but without (queue, rq_id) lock
        # may lead to queue jamming for a user due to self-dependencies.
        with get_rq_lock_for_job(queue, rq_id):
            if rq_job := queue.fetch_job(rq_id):
                if rq_job.get_status(refresh=False) not in {
                    rq.job.JobStatus.FAILED,
                    rq.job.JobStatus.FINISHED,
                }:
                    raise ValidationError(
                        "Only one running request is allowed for the same task #{}".format(task),
                        code=status.HTTP_409_CONFLICT,
                    )
                rq_job.delete()

            # LambdaJob(None) is a workaround for python-rq. It has multiple issues
            # with invocation of non-trivial functions. For example, it cannot run
            # staticmethod, it cannot run a callable class. Thus I provide an object
            # which has __call__ function.
            user_id = request.user.id

            with get_rq_lock_by_user(queue, user_id):
                meta = LambdaRQMeta.build_for(
                    request=request,
                    db_obj=Job.objects.get(pk=job) if job else Task.objects.get(pk=task),
                    function_id=lambda_func.id,
                )
                rq_job = queue.create_job(
                    LambdaJob(None),
                    job_id=rq_id,
                    meta=meta,
                    kwargs={
                        "function": lambda_func,
                        "threshold": threshold,
                        "task": task,
                        "job": job,
                        "cleanup": cleanup,
                        "conv_mask_to_poly": conv_mask_to_poly,
                        "mapping": mapping,
                        "max_distance": max_distance,
                    },
                    depends_on=define_dependent_job(queue, user_id),
                    result_ttl=self.RESULT_TTL.total_seconds(),
                    failure_ttl=self.FAILED_TTL.total_seconds(),
                )

                queue.enqueue_job(rq_job)

        return LambdaJob(rq_job)

    def fetch_job(self, pk):
        queue = self._get_queue()
        rq_job = queue.fetch_job(pk)
        if rq_job is None or not LambdaRQMeta.for_job(rq_job).lambda_:
            raise ValidationError(
                "{} lambda job is not found".format(pk), code=status.HTTP_404_NOT_FOUND
            )

        return LambdaJob(rq_job)


class DetectionResultConverter:
    def __init__(self, db_task: Task) -> None:
        self._labels = self._convert_labels(db_task.get_labels(prefetch=True))

    @classmethod
    def _convert_labels(cls, db_labels) -> dict:
        labels = {}
        for label in db_labels:
            labels[label.name] = {"id": label.id, "attributes": {}, "type": label.type}
            if label.type == "skeleton":
                labels[label.name]["sublabels"] = cls._convert_labels(label.sublabels.all())
            for attr in label.attributespec_set.values():
                labels[label.name]["attributes"][attr["name"]] = attr["id"]
        return labels

    def convert(self, *, conv_mask_to_poly: bool, frame: int, annotations: list) -> dict:
        data = {"tags": [], "shapes": []}

        for anno in annotations:
            if parsed := self._parse_anno(
                labels=self._labels, conv_mask_to_poly=conv_mask_to_poly, frame=frame, anno=anno
            ):
                if anno["type"].lower() == "tag":
                    data["tags"].append(parsed)
                else:
                    data["shapes"].append(parsed)

        serializer = LabeledDataSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        return serializer.validated_data

    def _parse_anno(
        self, *, labels: dict, conv_mask_to_poly: bool, frame: int, anno: dict
    ) -> dict | None:
        label = labels.get(anno["label"])
        if label is None:
            # Invalid label provided
            return None

        attrs = [
            {"spec_id": label["attributes"][attr["name"]], "value": attr["value"]}
            for attr in anno.get("attributes", [])
            if attr["name"] in label["attributes"]
        ]

        if anno["type"].lower() == "tag":
            return {
                "frame": frame,
                "label_id": label["id"],
                "source": "auto",
                "attributes": attrs,
                "group": None,
            }
        else:
            shape = {
                "frame": frame,
                "label_id": label["id"],
                "source": "auto",
                "attributes": attrs,
                "group": anno["group_id"] if "group_id" in anno else None,
                "type": anno["type"],
                "occluded": False,
                "outside": anno.get("outside", False),
                "points": (
                    anno.get("mask", []) if anno["type"] == "mask" else anno.get("points", [])
                ),
                "z_order": 0,
            }

            if shape["type"] in ("rectangle", "ellipse"):
                shape["rotation"] = anno.get("rotation", 0)

            if anno["type"] == "mask" and "points" in anno and conv_mask_to_poly:
                shape["type"] = "polygon"
                shape["points"] = anno["points"]
            elif anno["type"] == "mask":
                [xtl, ytl, xbr, ybr] = shape["points"][-4:]
                cut_points = shape["points"][:-4]
                rle = mask_tools.mask_to_rle(np.array(cut_points)[:, np.newaxis])["counts"].tolist()
                rle.extend([xtl, ytl, xbr, ybr])
                shape["points"] = rle

            if shape["type"] == "skeleton":
                parsed_elements = [
                    self._parse_anno(
                        labels=label["sublabels"],
                        conv_mask_to_poly=conv_mask_to_poly,
                        frame=frame,
                        anno=x,
                    )
                    for x in anno["elements"]
                ]

                # find a center to set position of missing points
                center = [0, 0]
                for element in parsed_elements:
                    center[0] += element["points"][0]
                    center[1] += element["points"][1]
                center[0] /= len(parsed_elements) or 1
                center[1] /= len(parsed_elements) or 1

                def _map(sublabel_body):
                    try:
                        return next(
                            filter(lambda x: x["label_id"] == sublabel_body["id"], parsed_elements)
                        )
                    except StopIteration:
                        return {
                            "frame": frame,
                            "label_id": sublabel_body["id"],
                            "source": "auto",
                            "attributes": [],
                            "group": None,
                            "type": sublabel_body["type"],
                            "occluded": False,
                            "points": center,
                            "outside": True,
                            "z_order": 0,
                        }

                shape["elements"] = list(map(_map, label["sublabels"].values()))
                if all(element["outside"] for element in shape["elements"]):
                    return None

            return shape


class DetectionResultCollector:
    def __init__(self, task: Task, job: Job | None) -> None:
        self._task = task
        self._job = job

        self._reset()

    def add(self, data: dict) -> None:
        self._data["tags"] += data["tags"]
        self._data["shapes"] += data["shapes"]

        assert not data["tracks"]

    def submit(self):
        if self._is_empty():
            return

        if self._job:
            dm.task.patch_job_data(self._job.id, self._data, PatchAction.CREATE)
        else:
            dm.task.patch_task_data(self._task.id, self._data, PatchAction.CREATE)

        self._reset()

    def _is_empty(self) -> bool:
        return not (self._data["tags"] or self._data["shapes"])

    def _reset(self) -> None:
        s = LabeledDataSerializer(data={})
        s.is_valid(raise_exception=True)

        self._data = s.validated_data


class LambdaJob:
    def __init__(self, job):
        self.job = job

    def to_dict(self):
        lambda_func = self.job.kwargs.get("function")
        dict_ = {
            "id": self.job.id,
            "function": {
                "id": lambda_func.id if lambda_func else None,
                "threshold": self.job.kwargs.get("threshold"),
                "task": self.job.kwargs.get("task"),
                **(
                    {
                        "job": self.job.kwargs["job"],
                    }
                    if self.job.kwargs.get("job")
                    else {}
                ),
            },
            "status": self.job.get_status(),
            "progress": LambdaRQMeta.for_job(self.job).progress,
            "enqueued": self.job.enqueued_at,
            "started": self.job.started_at,
            "ended": self.job.ended_at,
            "exc_info": self.job.exc_info,
        }
        if dict_["status"] == rq.job.JobStatus.DEFERRED:
            dict_["status"] = rq.job.JobStatus.QUEUED.value

        return dict_

    def get_task(self):
        return self.job.kwargs.get("task")

    def get_status(self):
        return self.job.get_status()

    @property
    def is_finished(self):
        return self.get_status() == rq.job.JobStatus.FINISHED

    @property
    def is_queued(self):
        return self.get_status() == rq.job.JobStatus.QUEUED

    @property
    def is_failed(self):
        return self.get_status() == rq.job.JobStatus.FAILED

    @property
    def is_started(self):
        return self.get_status() == rq.job.JobStatus.STARTED

    @property
    def is_deferred(self):
        return self.get_status() == rq.job.JobStatus.DEFERRED

    @property
    def is_scheduled(self):
        return self.get_status() == rq.job.JobStatus.SCHEDULED

    def delete(self):
        self.job.delete()

    @classmethod
    def _call_detector(
        cls,
        function: LambdaFunction,
        db_task: Task,
        threshold: float,
        mapping: dict[str, str] | None,
        conv_mask_to_poly: bool,
        *,
        db_job: Job | None = None,
    ):
        collector = DetectionResultCollector(db_task, db_job)

        converter = DetectionResultConverter(db_task)

        frame_set = cls._get_frame_set(db_task, db_job)

        for frame in frame_set:
            if frame in db_task.data.deleted_frames:
                continue

            annotations = function.invoke(
                db_task,
                db_job=db_job,
                data={
                    "frame": frame,
                    "mapping": mapping,
                    "threshold": threshold,
                    "conv_mask_to_poly": conv_mask_to_poly,
                },
                converter=converter,
            )

            progress = (frame + 1) / db_task.data.size
            if not cls._update_progress(progress):
                break

            collector.add(annotations)

            # Accumulate data during 100 frames before submitting results.
            # It is optimization to make fewer calls to our server. Also
            # it isn't possible to keep all results in memory.
            if frame and frame % 100 == 0:
                collector.submit()

        collector.submit()

    @staticmethod
    # progress is in [0, 1] range
    def _update_progress(progress):
        job = rq.get_current_job()
        rq_job_meta = LambdaRQMeta.for_job(job)
        # If the job has been deleted, get_status will return None. Thus it will
        # exist the loop.
        rq_job_meta.progress = int(progress * 100)
        rq_job_meta.save()

        return job.get_status()

    @classmethod
    def _get_frame_set(cls, db_task: Task, db_job: Job | None):
        if db_job:
            task_data = db_task.data
            data_start_frame = task_data.start_frame
            step = task_data.get_frame_step()
            frame_set = sorted(
                (abs_id - data_start_frame) // step for abs_id in db_job.segment.frame_set
            )
        else:
            frame_set = range(db_task.data.size)

        return frame_set

    @classmethod
    def _call_reid(
        cls,
        function: LambdaFunction,
        db_task: Task,
        threshold: float,
        max_distance: int,
        *,
        db_job: Job | None = None,
    ):
        if db_job:
            data = dm.task.get_job_data(db_job.id)
        else:
            data = dm.task.get_task_data(db_task.id)

        frame_set = cls._get_frame_set(db_task, db_job)

        boxes_by_frame = {frame: [] for frame in frame_set}
        shapes_without_boxes = []
        for shape in data["shapes"]:
            if shape["type"] == str(ShapeType.RECTANGLE):
                boxes_by_frame[shape["frame"]].append(shape)
            else:
                shapes_without_boxes.append(shape)

        paths = {}
        for i, (frame0, frame1) in enumerate(zip(frame_set[:-1], frame_set[1:])):
            boxes0 = boxes_by_frame[frame0]
            for box in boxes0:
                if "path_id" not in box:
                    path_id = len(paths)
                    paths[path_id] = [box]
                    box["path_id"] = path_id

            boxes1 = boxes_by_frame[frame1]
            if boxes0 and boxes1:
                matching = function.invoke(
                    db_task,
                    db_job=db_job,
                    data={
                        "frame0": frame0,
                        "frame1": frame1,
                        "boxes0": boxes0,
                        "boxes1": boxes1,
                        "threshold": threshold,
                        "max_distance": max_distance,
                    },
                )

                for idx0, idx1 in enumerate(matching):
                    if idx1 >= 0:
                        path_id = boxes0[idx0]["path_id"]
                        boxes1[idx1]["path_id"] = path_id
                        paths[path_id].append(boxes1[idx1])

            if not LambdaJob._update_progress((i + 1) / len(frame_set)):
                break

        for box in boxes_by_frame[frame_set[-1]]:
            if "path_id" not in box:
                path_id = len(paths)
                paths[path_id] = [box]
                box["path_id"] = path_id

        tracks = []
        for path_id in paths:
            box0 = paths[path_id][0]
            tracks.append(
                {
                    "label_id": box0["label_id"],
                    "group": None,
                    "attributes": [],
                    "frame": box0["frame"],
                    "shapes": paths[path_id],
                    "source": str(SourceType.AUTO),
                }
            )

            for box in tracks[-1]["shapes"]:
                box.pop("id", None)
                box.pop("path_id")
                box.pop("group")
                box.pop("label_id")
                box.pop("source")
                box["outside"] = False
                box["attributes"] = []

        for track in tracks:
            if track["shapes"][-1]["frame"] != frame_set[-1]:
                box = track["shapes"][-1].copy()
                box["outside"] = True
                box["frame"] += 1
                track["shapes"].append(box)

        if tracks:
            data["shapes"] = shapes_without_boxes
            data["tracks"].extend(tracks)

            serializer = LabeledDataSerializer(data=data)
            if serializer.is_valid(raise_exception=True):
                if db_job:
                    dm.task.put_job_data(db_job.id, serializer.data)
                else:
                    dm.task.put_task_data(db_task.id, serializer.data)

    @classmethod
    def __call__(cls, function, task: int, cleanup: bool, **kwargs):
        # TODO: need logging
        db_job = None
        if job := kwargs.get("job"):
            db_job = Job.objects.select_related("segment", "segment__task").get(pk=job)
            db_task = db_job.segment.task
        else:
            db_task = Task.objects.get(pk=task)

        if cleanup:
            if db_job:
                dm.task.delete_job_data(db_job.id)
            elif db_task:
                dm.task.delete_task_data(db_task.id)
            else:
                assert False

        if function.kind == FunctionKind.DETECTOR:
            cls._call_detector(
                function,
                db_task,
                kwargs.get("threshold"),
                kwargs.get("mapping"),
                kwargs.get("conv_mask_to_poly"),
                db_job=db_job,
            )
        elif function.kind == FunctionKind.REID:
            cls._call_reid(
                function,
                db_task,
                kwargs.get("threshold"),
                kwargs.get("max_distance"),
                db_job=db_job,
            )


def return_response(success_code=status.HTTP_200_OK):
    def wrap_response(func):
        @wraps(func)
        def func_wrapper(*args, **kwargs):
            data = None
            status_code = success_code
            try:
                data = func(*args, **kwargs)
            except requests.ConnectionError as err:
                status_code = status.HTTP_503_SERVICE_UNAVAILABLE
                data = str(err)
            except requests.HTTPError as err:
                status_code = err.response.status_code
                data = str(err)
            except requests.Timeout as err:
                status_code = status.HTTP_504_GATEWAY_TIMEOUT
                data = str(err)
            except requests.RequestException as err:
                status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
                data = str(err)
            except ValidationError as err:
                status_code = err.code or status.HTTP_400_BAD_REQUEST
                data = err.message
            except ObjectDoesNotExist as err:
                status_code = status.HTTP_400_BAD_REQUEST
                data = str(err)

            return Response(data=data, status=status_code)

        return func_wrapper

    return wrap_response


@extend_schema(tags=["lambda"])
@extend_schema_view(
    retrieve=extend_schema(
        operation_id="lambda_retrieve_functions",
        summary="Method returns the information about the function",
        responses={
            "200": OpenApiResponse(
                response=OpenApiTypes.OBJECT, description="Information about the function"
            ),
        },
    ),
    list=extend_schema(
        operation_id="lambda_list_functions", summary="Method returns a list of functions"
    ),
)
class FunctionViewSet(viewsets.ViewSet):
    lookup_value_regex = "[a-zA-Z0-9_.-]+"
    lookup_field = "func_id"
    iam_organization_field = None
    iam_permission_class = LambdaPermission
    serializer_class = None

    @return_response()
    def list(self, request):
        gateway = LambdaGateway()
        return [f.to_dict() for f in gateway.list()]

    @return_response()
    def retrieve(self, request, func_id):
        self.check_object_permissions(request, func_id)
        gateway = LambdaGateway()
        return gateway.get(func_id).to_dict()

    @extend_schema(
        description=textwrap.dedent(
            """\
        Allows to execute a function for immediate computation.

        Intended for short-lived executions, useful for interactive calls.

        When executed for interactive annotation, the job id must be specified
        in the 'job' input field. The task id is not required in this case,
        but if it is specified, it must match the job task id.
        """
        ),
        request=inline_serializer(
            "OnlineFunctionCall",
            fields={
                "job": serializers.IntegerField(required=False),
                "task": serializers.IntegerField(required=False),
            },
        ),
        responses=OpenApiResponse(description="Returns function invocation results"),
    )
    @return_response()
    def call(self, request, func_id):
        self.check_object_permissions(request, func_id)
        try:
            job_id = request.data.get("job")
            job = None
            if job_id is not None:
                job = Job.objects.get(id=job_id)
                task_id = job.get_task_id()
            else:
                task_id = request.data["task"]

            db_task = Task.objects.get(pk=task_id)
        except (KeyError, ObjectDoesNotExist) as err:
            raise ValidationError(
                "`{}` lambda function was run ".format(func_id)
                + "with wrong arguments ({})".format(str(err)),
                code=status.HTTP_400_BAD_REQUEST,
            )

        gateway = LambdaGateway()
        lambda_func = gateway.get(func_id)

        converter = None

        if lambda_func.kind == FunctionKind.DETECTOR:
            converter = DetectionResultConverter(db_task)

        response = lambda_func.invoke(
            db_task,
            request.data,  # TODO: better to add validation via serializer for these data
            db_job=job,
            converter=converter,
            is_interactive=True,
            request=request,
        )

        handle_function_call(
            func_id,
            db_task,
            category="interactive",
            parameters={
                param_name: param_value
                for param_name, _ in LambdaFunction.FRAME_PARAMETERS
                for param_value in [request.data.get(param_name)]
                if param_value is not None
            },
        )

        return response


@extend_schema(tags=["lambda"])
@extend_schema_view(
    retrieve=extend_schema(
        operation_id="lambda_retrieve_requests",
        summary="Method returns the status of the request",
        parameters=[
            OpenApiParameter(
                "id",
                location=OpenApiParameter.PATH,
                type=OpenApiTypes.STR,
                description="Request id",
            ),
        ],
        responses={"200": FunctionCallSerializer},
    ),
    list=extend_schema(
        operation_id="lambda_list_requests",
        summary="Method returns a list of requests",
        responses={"200": FunctionCallSerializer(many=True)},
    ),
    create=extend_schema(
        parameters=ORGANIZATION_OPEN_API_PARAMETERS,
        summary="Method calls the function",
        request=FunctionCallRequestSerializer,
        responses={"200": FunctionCallSerializer},
    ),
    destroy=extend_schema(
        operation_id="lambda_delete_requests",
        summary="Method cancels the request",
        parameters=[
            OpenApiParameter(
                "id",
                location=OpenApiParameter.PATH,
                type=OpenApiTypes.STR,
                description="Request id",
            ),
        ],
    ),
)
class RequestViewSet(viewsets.ViewSet):
    iam_organization_field = None
    iam_permission_class = LambdaPermission
    serializer_class = None

    @return_response()
    def list(self, request):
        queue = LambdaQueue()
        queued_jobs = queue.get_jobs()
        queued_task_ids = set(job.get_task() for job in queued_jobs if job.get_task())
        visible_task_ids = set()
        if queued_task_ids:
            perm = LambdaPermission.create_scope_list(request)

            queryset = perm.filter(Task.objects).values_list("id", flat=True)

            # Avoid big DB requests
            for queued_task_ids_chunk in take_by(sorted(queued_task_ids), 1000):
                visible_task_ids.update(queryset.filter(id__in=queued_task_ids_chunk))

        rq_jobs = [job.to_dict() for job in queued_jobs if job.get_task() in visible_task_ids]

        response_serializer = FunctionCallSerializer(rq_jobs, many=True)
        return response_serializer.data

    @return_response()
    def create(self, request):
        request_serializer = FunctionCallRequestSerializer(data=request.data)
        request_serializer.is_valid(raise_exception=True)
        request_data = request_serializer.validated_data

        try:
            function = request_data["function"]
            threshold = request_data.get("threshold")
            task = request_data["task"]
            job = request_data.get("job", None)
            cleanup = request_data.get("cleanup", False)
            conv_mask_to_poly = request_data.get("conv_mask_to_poly", False)
            mapping = request_data.get("mapping")
            max_distance = request_data.get("max_distance")
        except KeyError as err:
            raise ValidationError(
                "`{}` lambda function was run ".format(request_data.get("function", "undefined"))
                + "with wrong arguments ({})".format(str(err)),
                code=status.HTTP_400_BAD_REQUEST,
            )

        gateway = LambdaGateway()
        queue = LambdaQueue()
        lambda_func = gateway.get(function)
        rq_job = queue.enqueue(
            lambda_func,
            threshold,
            task,
            mapping,
            cleanup,
            conv_mask_to_poly,
            max_distance,
            request,
            job=job,
        )

        handle_function_call(function, job or task, category="batch")

        response_serializer = FunctionCallSerializer(rq_job.to_dict())
        return response_serializer.data

    @return_response()
    def retrieve(self, request, pk):
        self.check_object_permissions(request, pk)
        queue = LambdaQueue()
        rq_job = queue.fetch_job(pk)

        response_serializer = FunctionCallSerializer(rq_job.to_dict())
        return response_serializer.data

    @return_response(status.HTTP_204_NO_CONTENT)
    def destroy(self, request, pk):
        self.check_object_permissions(request, pk)
        queue = LambdaQueue()
        rq_job = queue.fetch_job(pk)
        rq_job.delete()
