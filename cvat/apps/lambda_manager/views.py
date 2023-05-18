# Copyright (C) 2022 Intel Corporation
# Copyright (C) 2022-2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import base64
import json
import os
import textwrap
import glob
from django_sendfile import sendfile
from copy import deepcopy
from enum import Enum
from functools import wraps
from typing import Any, Dict, Optional

import datumaro.util.mask_tools as mask_tools
import django_rq
import numpy as np
import requests
import rq
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist, ValidationError
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import (OpenApiParameter, OpenApiResponse,
                                   extend_schema, extend_schema_view,
                                   inline_serializer)
from rest_framework import serializers, status, viewsets
from rest_framework.response import Response

import cvat.apps.dataset_manager as dm
from cvat.apps.engine.frame_provider import FrameProvider
from cvat.apps.engine.models import Job, ShapeType, SourceType, Task
from cvat.apps.engine.serializers import LabeledDataSerializer
from cvat.utils.http import make_requests_session
from cvat.apps.iam.permissions import LambdaPermission


class LambdaType(Enum):
    DETECTOR = "detector"
    INTERACTOR = "interactor"
    REID = "reid"
    TRACKER = "tracker"
    UNKNOWN = "unknown"

    def __str__(self):
        return self.value

class LambdaGateway:
    NUCLIO_ROOT_URL = '/api/functions'

    def _http(self, method="get", scheme=None, host=None, port=None,
        function_namespace=None, url=None, headers=None, data=None):
        NUCLIO_GATEWAY = '{}://{}:{}'.format(
            scheme or settings.NUCLIO['SCHEME'],
            host or settings.NUCLIO['HOST'],
            port or settings.NUCLIO['PORT'])
        NUCLIO_FUNCTION_NAMESPACE = function_namespace or settings.NUCLIO['FUNCTION_NAMESPACE']
        extra_headers = {
            'x-nuclio-project-name': 'cvat',
            'x-nuclio-function-namespace': NUCLIO_FUNCTION_NAMESPACE,
            'x-nuclio-invoke-via': 'domain-name',
        }
        if headers:
            extra_headers.update(headers)
        NUCLIO_TIMEOUT = settings.NUCLIO['DEFAULT_TIMEOUT']

        if url:
            url = "{}{}".format(NUCLIO_GATEWAY, url)
        else:
            url = NUCLIO_GATEWAY

        with make_requests_session() as session:
            reply = session.request(method, url, headers=extra_headers,
                timeout=NUCLIO_TIMEOUT, json=data)
            reply.raise_for_status()
            response = reply.json()

        return response

    def list(self):
        data = self._http(url=self.NUCLIO_ROOT_URL)
        response = [LambdaFunction(self, item) for item in data.values()]
        return response

    def get(self, func_id):
        data = self._http(url=self.NUCLIO_ROOT_URL + '/' + func_id)
        response = LambdaFunction(self, data)
        return response

    def invoke(self, func, payload):
        invoke_method = {
            'dashboard': self._invoke_via_dashboard,
            'direct': self._invoke_directly,
        }

        return invoke_method[settings.NUCLIO['INVOKE_METHOD']](func, payload)

    def _invoke_via_dashboard(self, func, payload):
        return self._http(method="post", url='/api/function_invocations',
            data=payload, headers={
                'x-nuclio-function-name': func.id,
                'x-nuclio-path': '/'
            })

    def _invoke_directly(self, func, payload):
        # host.docker.internal for Linux will work only with Docker 20.10+
        NUCLIO_TIMEOUT = settings.NUCLIO['DEFAULT_TIMEOUT']
        if os.path.exists('/.dockerenv'): # inside a docker container
            url = f'http://host.docker.internal:{func.port}'
        else:
            url = f'http://localhost:{func.port}'

        with make_requests_session() as session:
            reply = session.post(url, timeout=NUCLIO_TIMEOUT, json=payload)
            reply.raise_for_status()
            response = reply.json()

        return response

class LambdaFunction:
    def __init__(self, gateway, data):
        # ID of the function (e.g. omz.public.yolo-v3)
        self.id = data['metadata']['name']
        # type of the function (e.g. detector, interactor)
        meta_anno = data['metadata']['annotations']
        kind = meta_anno.get('type')
        try:
            self.kind = LambdaType(kind)
        except ValueError:
            self.kind = LambdaType.UNKNOWN
        # dictionary of labels for the function (e.g. car, person)
        spec = json.loads(meta_anno.get('spec') or '[]')
        labels = [item['name'] for item in spec]
        if len(labels) != len(set(labels)):
            raise ValidationError(
                "`{}` lambda function has non-unique labels".format(self.id),
                code=status.HTTP_404_NOT_FOUND)
        self.labels = labels
        # mapping of labels and corresponding supported attributes
        self.func_attributes = {item['name']: item.get('attributes', []) for item in spec}
        for label, attributes in self.func_attributes.items():
            if len([attr['name'] for attr in attributes]) != len(set([attr['name'] for attr in attributes])):
                raise ValidationError(
                    "`{}` lambda function has non-unique attributes for label {}".format(self.id, label),
                    code=status.HTTP_404_NOT_FOUND)
        # state of the function
        self.state = data['status']['state']
        # description of the function
        self.description = data['spec']['description']
        # http port to access the serverless function
        self.port = data["status"].get("httpPort")
        # framework which is used for the function (e.g. tensorflow, openvino)
        self.framework = meta_anno.get('framework')
        # display name for the function
        self.name = meta_anno.get('name', self.id)
        self.min_pos_points = int(meta_anno.get('min_pos_points', 1))
        self.min_neg_points = int(meta_anno.get('min_neg_points', -1))
        self.startswith_box = bool(meta_anno.get('startswith_box', False))
        self.animated_gif = meta_anno.get('animated_gif', '')
        self.version = int(meta_anno.get('version', '1'))
        self.help_message = meta_anno.get('help_message', '')
        self.gateway = gateway

    def to_dict(self):
        response = {
            'id': self.id,
            'kind': str(self.kind),
            'labels': self.labels,
            'description': self.description,
            'framework': self.framework,
            'name': self.name,
            'version': self.version
        }

        if self.kind is LambdaType.INTERACTOR:
            response.update({
                'min_pos_points': self.min_pos_points,
                'min_neg_points': self.min_neg_points,
                'startswith_box': self.startswith_box,
                'help_message': self.help_message,
                'animated_gif': self.animated_gif
            })

        if self.kind is LambdaType.TRACKER:
            response.update({
                'state': self.state
            })
        if self.kind is LambdaType.DETECTOR:
            response.update({
                'attributes': self.func_attributes
            })

        return response

    def invoke(self, db_task: Task, data: Dict[str, Any], *, db_job: Optional[Job] = None):
        try:
            if db_job is not None and db_job.get_task_id() != db_task.id:
                raise ValidationError("Job task id does not match task id",
                    code=status.HTTP_400_BAD_REQUEST
                )

            payload = {}
            data = {k: v for k,v in data.items() if v is not None}
            threshold = data.get("threshold")
            if threshold:
                payload.update({ "threshold": threshold })
            quality = data.get("quality")
            mapping = data.get("mapping", {})

            task_attributes = {}
            mapping_by_default = {}
            for db_label in (db_task.project.label_set if db_task.project_id else db_task.label_set).prefetch_related("attributespec_set").all():
                mapping_by_default[db_label.name] = {
                    'name': db_label.name,
                    'attributes': {}
                }
                task_attributes[db_label.name] = {}
                for attribute in db_label.attributespec_set.all():
                    task_attributes[db_label.name][attribute.name] = {
                        'input_type': attribute.input_type,
                        'values': attribute.values.split('\n')
                    }
            if not mapping:
                # use mapping by default to avoid labels in mapping which
                # don't exist in the task
                mapping = mapping_by_default
            else:
                # filter labels in mapping which don't exist in the task
                mapping = {k:v for k,v in mapping.items() if v['name'] in mapping_by_default}

            attr_mapping = { label: mapping[label]['attributes'] if 'attributes' in mapping[label] else {} for label in mapping }
            mapping = { modelLabel: mapping[modelLabel]['name'] for modelLabel in mapping }

            supported_attrs = {}
            for func_label, func_attrs in self.func_attributes.items():
                if func_label not in mapping:
                    continue

                mapped_label = mapping[func_label]
                mapped_attributes = attr_mapping.get(func_label, {})
                supported_attrs[func_label] = {}

                if mapped_attributes:
                    task_attr_names = [task_attr for task_attr in task_attributes[mapped_label]]
                    for attr in func_attrs:
                        mapped_attr = mapped_attributes.get(attr["name"])
                        if mapped_attr in task_attr_names:
                            supported_attrs[func_label].update({ attr["name"]: task_attributes[mapped_label][mapped_attr] })

            # Check job frame boundaries
            for key, desc in (
                ('frame', 'frame'),
                ('frame0', 'start frame'),
                ('frame1', 'end frame'),
            ):
                if key in data and db_job and not db_job.segment.contains_frame(data[key]):
                    raise ValidationError(f"The {desc} is outside the job range",
                        code=status.HTTP_400_BAD_REQUEST)

            if self.kind == LambdaType.DETECTOR:
                payload.update({
                    "image": self._get_image(db_task, data["frame"], quality)
                })
            elif self.kind == LambdaType.INTERACTOR:
                payload.update({
                    "image": self._get_image(db_task, data["frame"], quality),
                    "pos_points": data["pos_points"][2:] if self.startswith_box else data["pos_points"],
                    "neg_points": data["neg_points"],
                    "obj_bbox": data["pos_points"][0:2] if self.startswith_box else None
                })
            elif self.kind == LambdaType.REID:
                payload.update({
                    "image0": self._get_image(db_task, data["frame0"], quality),
                    "image1": self._get_image(db_task, data["frame1"], quality),
                    "boxes0": data["boxes0"],
                    "boxes1": data["boxes1"]
                })
                max_distance = data.get("max_distance")
                if max_distance:
                    payload.update({
                        "max_distance": max_distance
                    })
            elif self.kind == LambdaType.TRACKER:
                payload.update({
                    "image": self._get_image(db_task, data["frame"], quality),
                    "shapes": data.get("shapes", []),
                    "states": data.get("states", [])
                })
            else:
                raise ValidationError(
                    '`{}` lambda function has incorrect type: {}'
                    .format(self.id, self.kind),
                    code=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except KeyError as err:
            raise ValidationError(
                "`{}` lambda function was called without mandatory argument: {}"
                .format(self.id, str(err)),
                code=status.HTTP_400_BAD_REQUEST)

        response = self.gateway.invoke(self, payload)
        response_filtered = []
        def check_attr_value(value, func_attr, db_attr):
            if db_attr is None:
                return False
            func_attr_type = func_attr["input_type"]
            db_attr_type = db_attr["input_type"]
            # Check if attribute types are equal for function configuration and db spec
            if func_attr_type == db_attr_type:
                if func_attr_type == "number":
                    return value.isnumeric()
                elif func_attr_type == "checkbox":
                    return value in ["true", "false"]
                elif func_attr_type in ["select", "radio", "text"]:
                    return True
                else:
                    return False
            else:
                if func_attr_type == "number":
                    return db_attr_type in ["select", "radio", "text"] and value.isnumeric()
                elif func_attr_type == "text":
                    return db_attr_type == "text" or \
                           (db_attr_type in ["select", "radio"] and len(value.split(" ")) == 1)
                elif func_attr_type == "select":
                    return db_attr_type in ["radio", "text"]
                elif func_attr_type == "radio":
                    return db_attr_type in ["select", "text"]
                elif func_attr_type == "checkbox":
                    return value in ["true", "false"]
                else:
                    return False
        if self.kind == LambdaType.DETECTOR:
            for item in response:
                item_label = item['label']

                if item_label not in mapping:
                    continue

                attributes = deepcopy(item.get("attributes", []))
                item["attributes"] = []
                mapped_attributes = attr_mapping[item_label]

                for attr in attributes:
                    if attr['name'] not in mapped_attributes:
                        continue

                    func_attr = [func_attr for func_attr in self.func_attributes.get(item_label, []) if func_attr['name'] == attr["name"]]
                    # Skip current attribute if it was not declared as supported in function config
                    if not func_attr:
                        continue

                    db_attr = supported_attrs.get(item_label, {}).get(attr["name"])

                    if check_attr_value(attr["value"], func_attr[0], db_attr):
                        attr["name"] = mapped_attributes[attr['name']]
                        item["attributes"].append(attr)

                item['label'] = mapping[item['label']]
                response_filtered.append(item)
                response = response_filtered

        return response

    def _get_image(self, db_task, frame, quality):
        if quality is None or quality == "original":
            quality = FrameProvider.Quality.ORIGINAL
        elif  quality == "compressed":
            quality = FrameProvider.Quality.COMPRESSED
        else:
            raise ValidationError(
                '`{}` lambda function was run '.format(self.id) +
                'with wrong arguments (quality={})'.format(quality),
                code=status.HTTP_400_BAD_REQUEST)

        frame_provider = FrameProvider(db_task.data)
        image = frame_provider.get_frame(frame, quality=quality)

        return base64.b64encode(image[0].getvalue()).decode('utf-8')

class LambdaQueue:
    def _get_queue(self):
        return django_rq.get_queue(settings.CVAT_QUEUES.AUTO_ANNOTATION.value)

    def get_jobs(self):
        queue = self._get_queue()
        # Only failed jobs are not included in the list below.
        job_ids = set(queue.get_job_ids() +
            queue.started_job_registry.get_job_ids() +
            queue.finished_job_registry.get_job_ids() +
            queue.scheduled_job_registry.get_job_ids() +
            queue.deferred_job_registry.get_job_ids())
        jobs = queue.job_class.fetch_many(job_ids, queue.connection)

        return [LambdaJob(job) for job in jobs if job.meta.get("lambda")]

    def enqueue(self, lambda_func, threshold, task, quality, mapping, cleanup, conv_mask_to_poly, max_distance):
        jobs = self.get_jobs()
        # It is still possible to run several concurrent jobs for the same task.
        # But the race isn't critical. The filtration is just a light-weight
        # protection.
        if list(filter(lambda job: job.get_task() == task and not job.is_finished, jobs)):
            raise ValidationError(
                "Only one running request is allowed for the same task #{}".format(task),
                code=status.HTTP_409_CONFLICT)

        queue = self._get_queue()
        # LambdaJob(None) is a workaround for python-rq. It has multiple issues
        # with invocation of non-trivial functions. For example, it cannot run
        # staticmethod, it cannot run a callable class. Thus I provide an object
        # which has __call__ function.
        job = queue.create_job(LambdaJob(None),
            meta = { "lambda": True },
            kwargs = {
                "function": lambda_func,
                "threshold": threshold,
                "task": task,
                "quality": quality,
                "cleanup": cleanup,
                "conv_mask_to_poly": conv_mask_to_poly,
                "mapping": mapping,
                "max_distance": max_distance
            })

        queue.enqueue_job(job)

        return LambdaJob(job)

    def fetch_job(self, pk):
        queue = self._get_queue()
        job = queue.fetch_job(pk)
        if job is None or not job.meta.get("lambda"):
            raise ValidationError("{} lambda job is not found".format(pk),
                code=status.HTTP_404_NOT_FOUND)

        return LambdaJob(job)

class LambdaJob:
    def __init__(self, job):
        self.job = job

    def to_dict(self):
        lambda_func = self.job.kwargs.get("function")
        return {
            "id": self.job.id,
            "function": {
                "id": lambda_func.id if lambda_func else None,
                "threshold": self.job.kwargs.get("threshold"),
                "task": self.job.kwargs.get("task")
            },
            "status": self.job.get_status(),
            "progress": self.job.meta.get('progress', 0),
            "enqueued": self.job.enqueued_at,
            "started": self.job.started_at,
            "ended": self.job.ended_at,
            "exc_info": self.job.exc_info
        }

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

    @staticmethod
    def _call_detector(function, db_task, labels, quality, threshold, mapping, conv_mask_to_poly):
        class Results:
            def __init__(self, task_id):
                self.task_id = task_id
                self.reset()

            def append_shape(self, shape):
                self.data["shapes"].append(shape)

            def append_tag(self, tag):
                self.data["tags"].append(tag)

            def submit(self):
                if not self.is_empty():
                    serializer = LabeledDataSerializer(data=self.data)
                    if serializer.is_valid(raise_exception=True):
                        dm.task.patch_task_data(self.task_id, serializer.data, "create")
                    self.reset()

            def is_empty(self):
                return not (self.data["tags"] or self.data["shapes"] or self.data["tracks"])

            def reset(self):
                # TODO: need to make "tags" and "tracks" are optional
                # FIXME: need to provide the correct version here
                self.data = {"version": 0, "tags": [], "shapes": [], "tracks": []}

        results = Results(db_task.id)

        for frame in range(db_task.data.size):
            if frame in db_task.data.deleted_frames:
                continue
            annotations = function.invoke(db_task, data={
                "frame": frame, "quality": quality, "mapping": mapping,
                "threshold": threshold })
            progress = (frame + 1) / db_task.data.size
            if not LambdaJob._update_progress(progress):
                break

            for anno in annotations:
                label = labels.get(anno["label"])
                if label is None:
                    continue # Invalid label provided
                if anno.get('attributes'):
                    attrs = [{'spec_id': label['attributes'][attr['name']], 'value': attr['value']} for attr in anno.get('attributes') if attr['name'] in label['attributes']]
                else:
                    attrs = []
                if anno["type"].lower() == "tag":
                    results.append_tag({
                        "frame": frame,
                        "label_id": label['id'],
                        "source": "auto",
                        "attributes": attrs,
                        "group": None,
                    })
                else:
                    shape = {
                        "frame": frame,
                        "label_id": label['id'],
                        "type": anno["type"],
                        "occluded": False,
                        "points": anno["mask"] if anno["type"] == "mask" else anno["points"],
                        "z_order": 0,
                        "group": anno["group_id"] if "group_id" in anno else None,
                        "attributes": attrs,
                        "source": "auto"
                    }

                    if anno["type"] == "mask" and "points" in anno and conv_mask_to_poly:
                        shape["type"] = "polygon"
                        shape["points"] = anno["points"]
                    elif anno["type"] == "mask":
                        [xtl, ytl, xbr, ybr] = shape["points"][-4:]
                        cut_points = shape["points"][:-4]
                        rle = mask_tools.mask_to_rle(np.array(cut_points))["counts"].tolist()
                        rle.extend([xtl, ytl, xbr, ybr])
                        shape["points"] = rle

                    results.append_shape(shape)

            # Accumulate data during 100 frames before sumbitting results.
            # It is optimization to make fewer calls to our server. Also
            # it isn't possible to keep all results in memory.
            if frame and frame % 100 == 0:
                results.submit()

        results.submit()

    @staticmethod
    # progress is in [0, 1] range
    def _update_progress(progress):
        job = rq.get_current_job()
        # If the job has been deleted, get_status will return None. Thus it will
        # exist the loop.
        job.meta["progress"] = int(progress * 100)
        job.save_meta()

        return job.get_status()


    @staticmethod
    def _call_reid(function, db_task, quality, threshold, max_distance):
        data = dm.task.get_task_data(db_task.id)
        boxes_by_frame = [[] for _ in range(db_task.data.size)]
        shapes_without_boxes = []
        for shape in data["shapes"]:
            if shape["type"] == str(ShapeType.RECTANGLE):
                boxes_by_frame[shape["frame"]].append(shape)
            else:
                shapes_without_boxes.append(shape)

        paths = {}
        for frame in range(db_task.data.size - 1):
            boxes0 = boxes_by_frame[frame]
            for box in boxes0:
                if "path_id" not in box:
                    path_id = len(paths)
                    paths[path_id] = [box]
                    box["path_id"] = path_id

            boxes1 = boxes_by_frame[frame + 1]
            if boxes0 and boxes1:
                matching = function.invoke(db_task, data={
                    "frame0": frame, "frame1": frame + 1, "quality": quality,
                    "boxes0": boxes0, "boxes1": boxes1, "threshold": threshold,
                    "max_distance": max_distance})

                for idx0, idx1 in enumerate(matching):
                    if idx1 >= 0:
                        path_id = boxes0[idx0]["path_id"]
                        boxes1[idx1]["path_id"] = path_id
                        paths[path_id].append(boxes1[idx1])

            progress = (frame + 2) / db_task.data.size
            if not LambdaJob._update_progress(progress):
                break


        for box in boxes_by_frame[db_task.data.size - 1]:
            if "path_id" not in box:
                path_id = len(paths)
                paths[path_id] = [box]
                box["path_id"] = path_id

        tracks = []
        for path_id in paths:
            box0 = paths[path_id][0]
            tracks.append({
                "label_id": box0["label_id"],
                "group": None,
                "attributes": [],
                "frame": box0["frame"],
                "shapes": paths[path_id],
                "source": str(SourceType.AUTO)
            })

            for box in tracks[-1]["shapes"]:
                box.pop("id", None)
                box.pop("path_id")
                box.pop("group")
                box.pop("label_id")
                box.pop("source")
                box["outside"] = False
                box["attributes"] = []

        for track in tracks:
            if track["shapes"][-1]["frame"] != db_task.data.size - 1:
                box = track["shapes"][-1].copy()
                box["outside"] = True
                box["frame"] += 1
                track["shapes"].append(box)

        if tracks:
            data["shapes"] = shapes_without_boxes
            data["tracks"].extend(tracks)

            serializer = LabeledDataSerializer(data=data)
            if serializer.is_valid(raise_exception=True):
                dm.task.put_task_data(db_task.id, serializer.data)

    @staticmethod
    def __call__(function, task, quality, cleanup, **kwargs):
        # TODO: need logging
        db_task = Task.objects.get(pk=task)
        if cleanup:
            dm.task.delete_task_data(db_task.id)
        db_labels = (db_task.project.label_set if db_task.project_id else db_task.label_set).prefetch_related("attributespec_set").all()
        labels = {}
        for label in db_labels:
            labels[label.name] = {'id':label.id, 'attributes': {}}
            for attr in label.attributespec_set.values():
                labels[label.name]['attributes'][attr['name']] = attr['id']

        if function.kind == LambdaType.DETECTOR:
            LambdaJob._call_detector(function, db_task, labels, quality,
                kwargs.get("threshold"), kwargs.get("mapping"), kwargs.get("conv_mask_to_poly"))
        elif function.kind == LambdaType.REID:
            LambdaJob._call_reid(function, db_task, quality,
                kwargs.get("threshold"), kwargs.get("max_distance"))

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

@extend_schema(tags=['lambda'])
@extend_schema_view(
    retrieve=extend_schema(
        operation_id='lambda_retrieve_functions',
        summary='Method returns the information about the function',
        responses={
            '200': OpenApiResponse(response=OpenApiTypes.OBJECT, description='Information about the function'),
        }),
    list=extend_schema(
        operation_id='lambda_list_functions',
        summary='Method returns a list of functions')
)
class FunctionViewSet(viewsets.ViewSet):
    lookup_value_regex = '[a-zA-Z0-9_.-]+'
    lookup_field = 'func_id'
    iam_organization_field = None
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

    @extend_schema(description=textwrap.dedent("""\
        Allows to execute a function for immediate computation.

        Intended for short-lived executions, useful for interactive calls.

        When executed for interactive annotation, the job id must be specified
        in the 'job' input field. The task id is not required in this case,
        but if it is specified, it must match the job task id.
        """),
        request=inline_serializer("OnlineFunctionCall", fields={
            "job": serializers.IntegerField(required=False),
            "task": serializers.IntegerField(required=False),
        }),
        responses=OpenApiResponse(description="Returns function invocation results")
    )
    @return_response()
    def call(self, request, func_id):
        self.check_object_permissions(request, func_id)
        try:
            job_id = request.data.get('job')
            job = None
            if job_id is not None:
                job = Job.objects.get(id=job_id)
                task_id = job.get_task_id()
            else:
                task_id = request.data['task']

            db_task = Task.objects.get(pk=task_id)
        except (KeyError, ObjectDoesNotExist) as err:
            raise ValidationError(
                '`{}` lambda function was run '.format(func_id) +
                'with wrong arguments ({})'.format(str(err)),
                code=status.HTTP_400_BAD_REQUEST)

        gateway = LambdaGateway()
        lambda_func = gateway.get(func_id)

        return lambda_func.invoke(db_task, request.data, db_job=job)

@extend_schema(tags=['lambda'])
@extend_schema_view(
    retrieve=extend_schema(
        operation_id='lambda_retrieve_requests',
        summary='Method returns the status of the request',
        parameters=[
            # specify correct type
            OpenApiParameter('id', location=OpenApiParameter.PATH, type=OpenApiTypes.INT,
                description='Request id'),
        ]),
    list=extend_schema(
        operation_id='lambda_list_requests',
        summary='Method returns a list of requests'),
    #TODO
    create=extend_schema(
        summary='Method calls the function'),
    delete=extend_schema(
        summary='Method cancels the request')
)
class RequestViewSet(viewsets.ViewSet):
    iam_organization_field = None
    serializer_class = None

    @return_response()
    def list(self, request):
        queryset = Task.objects.select_related(
            "assignee",
            "owner",
            "organization",
        ).prefetch_related(
            "project__owner",
            "project__assignee",
            "project__organization",
        )

        perm = LambdaPermission.create_scope_list(request)
        queryset = perm.filter(queryset)
        task_ids = set(queryset.values_list("id", flat=True))

        queue = LambdaQueue()
        return [job.to_dict() for job in queue.get_jobs() if job.get_task() in task_ids]

    @return_response()
    def create(self, request):
        try:
            function = request.data['function']
            threshold = request.data.get('threshold')
            task = request.data['task']
            quality = request.data.get("quality")
            cleanup = request.data.get('cleanup', False)
            conv_mask_to_poly = request.data.get('convMaskToPoly', False)
            mapping = request.data.get('mapping')
            max_distance = request.data.get('max_distance')
        except KeyError as err:
            raise ValidationError(
                '`{}` lambda function was run '.format(request.data.get('function', 'undefined')) +
                'with wrong arguments ({})'.format(str(err)),
                code=status.HTTP_400_BAD_REQUEST)

        gateway = LambdaGateway()
        queue = LambdaQueue()
        lambda_func = gateway.get(function)
        job = queue.enqueue(lambda_func, threshold, task, quality,
            mapping, cleanup, conv_mask_to_poly, max_distance)

        return job.to_dict()

    @return_response()
    def retrieve(self, request, pk):
        self.check_object_permissions(request, pk)
        queue = LambdaQueue()
        job = queue.fetch_job(pk)

        return job.to_dict()

    @return_response(status.HTTP_204_NO_CONTENT)
    def delete(self, request, pk):
        self.check_object_permissions(request, pk)
        queue = LambdaQueue()
        job = queue.fetch_job(pk)
        job.delete()

def ONNXDetector(request):
    dirname = os.path.join(settings.STATIC_ROOT, 'lambda_manager')
    pattern = os.path.join(dirname, 'decoder.onnx')
    path = glob.glob(pattern)[0]
    response = sendfile(request, path)
    response['Cache-Control'] = "public, max-age=604800"
    return response
