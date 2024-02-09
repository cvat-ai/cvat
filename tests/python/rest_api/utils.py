# Copyright (C) 2022-2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from abc import ABCMeta, abstractmethod
from copy import deepcopy
from http import HTTPStatus
from time import sleep
from typing import Any, Dict, Iterator, List, Optional, Sequence, Tuple, Union

from cvat_sdk.api_client import apis, models
from cvat_sdk.api_client.api_client import ApiClient, Endpoint
from cvat_sdk.core.helpers import get_paginated_collection
from deepdiff import DeepDiff
from urllib3 import HTTPResponse

from shared.utils.config import make_api_client


def export_dataset(
    endpoint: Endpoint,
    *,
    max_retries: int = 20,
    interval: float = 0.1,
    format: str = "CVAT for images 1.1",  # pylint: disable=redefined-builtin
    **kwargs,
) -> HTTPResponse:
    for _ in range(max_retries):
        (_, response) = endpoint.call_with_http_info(**kwargs, format=format, _parse_response=False)
        if response.status in (HTTPStatus.CREATED, HTTPStatus.OK):
            break
        assert response.status == HTTPStatus.ACCEPTED
        sleep(interval)
    else:
        assert (
            False
        ), f"Export process was not finished within allowed time ({interval * max_retries}, sec)"

    if response.status == HTTPStatus.CREATED:
        (_, response) = endpoint.call_with_http_info(
            **kwargs, format=format, action="download", _parse_response=False
        )
        assert response.status == HTTPStatus.OK

    return response


FieldPath = Sequence[str]


class CollectionSimpleFilterTestBase(metaclass=ABCMeta):
    # These fields need to be defined in the subclass
    user: str
    samples: List[Dict[str, Any]]
    field_lookups: Dict[str, FieldPath] = None
    cmp_ignore_keys: List[str] = ["updated_date"]

    @abstractmethod
    def _get_endpoint(self, api_client: ApiClient) -> Endpoint: ...

    def _retrieve_collection(self, **kwargs) -> List:
        kwargs["return_json"] = True
        with make_api_client(self.user) as api_client:
            return get_paginated_collection(self._get_endpoint(api_client), **kwargs)

    @classmethod
    def _get_field(cls, d: Dict[str, Any], path: Union[str, FieldPath]) -> Optional[Any]:
        assert path
        for key in path:
            if isinstance(d, dict):
                d = d.get(key)
            else:
                d = None

        return d

    def _map_field(self, name: str) -> FieldPath:
        return (self.field_lookups or {}).get(name, [name])

    @classmethod
    def _find_valid_field_value(
        cls, samples: Iterator[Dict[str, Any]], field_path: FieldPath
    ) -> Any:
        value = None
        for sample in samples:
            value = cls._get_field(sample, field_path)
            if value:
                break

        assert value, f"Failed to find a sample for the '{'.'.join(field_path)}' field"
        return value

    def _get_field_samples(self, field: str) -> Tuple[Any, List[Dict[str, Any]]]:
        field_path = self._map_field(field)
        field_value = self._find_valid_field_value(self.samples, field_path)

        gt_objects = filter(lambda p: field_value == self._get_field(p, field_path), self.samples)

        return field_value, gt_objects

    def _compare_results(self, gt_objects, received_objects):
        if self.cmp_ignore_keys:
            ignore_keys = [f"root['{k}']" for k in self.cmp_ignore_keys]
        else:
            ignore_keys = None

        diff = DeepDiff(
            list(gt_objects),
            received_objects,
            exclude_paths=ignore_keys,
            ignore_order=True,
        )

        assert diff == {}, diff

    def test_can_use_simple_filter_for_object_list(self, field):
        value, gt_objects = self._get_field_samples(field)

        received_items = self._retrieve_collection(**{field: value})

        self._compare_results(gt_objects, received_items)


def get_attrs(obj: Any, attributes: Sequence[str]) -> Tuple[Any, ...]:
    """Returns 1 or more object attributes as a tuple"""
    return (getattr(obj, attr) for attr in attributes)


def build_exclude_paths_expr(ignore_fields: Iterator[str]) -> List[str]:
    exclude_expr_parts = []
    for key in ignore_fields:
        if "." in key:
            key_parts = key.split(".")
            expr = r"root\['{}'\]".format(key_parts[0])
            expr += "".join(r"\[.*\]\['{}'\]".format(part) for part in key_parts[1:])
        else:
            expr = r"root\['{}'\]".format(key)

        exclude_expr_parts.append(expr)

    return exclude_expr_parts


def wait_until_task_is_created(api: apis.TasksApi, task_id: int) -> models.RqStatus:
    for _ in range(100):
        (status, _) = api.retrieve_status(task_id)
        if status.state.value in ["Finished", "Failed"]:
            return status
        sleep(1)
    raise Exception("Cannot create task")


def create_task(username, spec, data, content_type="application/json", **kwargs):
    with make_api_client(username) as api_client:
        (task, response_) = api_client.tasks_api.create(spec, **kwargs)
        assert response_.status == HTTPStatus.CREATED

        sent_upload_start = False

        data_kwargs = (kwargs or {}).copy()
        data_kwargs.pop("org", None)
        data_kwargs.pop("org_id", None)

        if data.get("client_files") and "json" in content_type:
            (_, response) = api_client.tasks_api.create_data(
                task.id,
                data_request=models.DataRequest(image_quality=data["image_quality"]),
                upload_start=True,
                _content_type=content_type,
                **data_kwargs,
            )
            assert response.status == HTTPStatus.ACCEPTED
            sent_upload_start = True

            # Can't encode binary files in json
            (_, response) = api_client.tasks_api.create_data(
                task.id,
                data_request=models.DataRequest(
                    client_files=data["client_files"],
                    image_quality=data["image_quality"],
                ),
                upload_multiple=True,
                _content_type="multipart/form-data",
                **data_kwargs,
            )
            assert response.status == HTTPStatus.OK

            data = data.copy()
            del data["client_files"]

        last_kwargs = {}
        if sent_upload_start:
            last_kwargs["upload_finish"] = True

        (_, response) = api_client.tasks_api.create_data(
            task.id,
            data_request=deepcopy(data),
            _content_type=content_type,
            **data_kwargs,
            **last_kwargs,
        )
        assert response.status == HTTPStatus.ACCEPTED

        status = wait_until_task_is_created(api_client.tasks_api, task.id)
        assert status.state.value == "Finished", status.message

    return task.id, response_.headers.get("X-Request-Id")


def compare_annotations(a, b):
    def _exclude_cb(obj, path):
        return path.endswith("['elements']") and not obj

    return DeepDiff(
        a,
        b,
        ignore_order=True,
        exclude_obj_callback=_exclude_cb,
        exclude_regex_paths=[
            r"root\['version|updated_date'\]",
            r"root(\['\w+'\]\[\d+\])+\['id'\]",
            r"root(\['\w+'\]\[\d+\])+\['label_id'\]",
            r"root(\['\w+'\]\[\d+\])+\['attributes'\]\[\d+\]\['spec_id'\]",
        ],
    )
