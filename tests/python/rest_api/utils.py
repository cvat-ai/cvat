# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
from abc import ABCMeta, abstractmethod
from collections.abc import Hashable, Iterator, Sequence
from copy import deepcopy
from http import HTTPStatus
from time import sleep
from typing import Any, Callable, Iterable, Optional, TypeVar, Union

import requests
from cvat_sdk.api_client import apis, models
from cvat_sdk.api_client.api.jobs_api import JobsApi
from cvat_sdk.api_client.api.projects_api import ProjectsApi
from cvat_sdk.api_client.api.tasks_api import TasksApi
from cvat_sdk.api_client.api_client import ApiClient, Endpoint
from cvat_sdk.api_client.exceptions import ForbiddenException
from cvat_sdk.core.helpers import get_paginated_collection
from deepdiff import DeepDiff

from shared.utils.config import make_api_client


def initialize_export(endpoint: Endpoint, *, expect_forbidden: bool = False, **kwargs) -> str:
    (_, response) = endpoint.call_with_http_info(
        **kwargs, _parse_response=False, _check_status=False
    )
    if expect_forbidden:
        assert (
            response.status == HTTPStatus.FORBIDDEN
        ), f"Request should be forbidden, status: {response.status}"
        raise ForbiddenException()

    assert response.status == HTTPStatus.ACCEPTED, f"Status: {response.status}"

    # define background request ID returned in the server response
    rq_id = json.loads(response.data).get("rq_id")
    assert rq_id, "The rq_id parameter was not found in the server response"
    return rq_id


def wait_and_download_v1(
    endpoint: Endpoint,
    *,
    max_retries: int = 50,
    interval: float = 0.1,
    download_result: bool = True,
    **kwargs,
) -> Optional[bytes]:
    for _ in range(max_retries):
        (_, response) = endpoint.call_with_http_info(**kwargs, _parse_response=False)
        if response.status in (HTTPStatus.CREATED, HTTPStatus.OK):
            break
        assert response.status == HTTPStatus.ACCEPTED
        sleep(interval)
    else:
        assert (
            False
        ), f"Export process was not finished within allowed time ({interval * max_retries}, sec)"

    if not download_result:
        return None

    if response.status == HTTPStatus.CREATED:
        (_, response) = endpoint.call_with_http_info(
            **kwargs, action="download", _parse_response=False
        )
        assert response.status == HTTPStatus.OK

    return response.data or None  # return None when export was on cloud storage


def export_v1(
    endpoint: Endpoint,
    *,
    max_retries: int = 50,
    interval: float = 0.1,
    expect_forbidden: bool = False,
    wait_result: bool = True,
    download_result: bool = True,
    **kwargs,
) -> Optional[bytes]:
    """Export datasets|annotations|backups using first version of export API

    Args:
        endpoint (Endpoint): Export endpoint, will be called to initialize export process and to check status
        max_retries (int, optional): Number of retries when checking process status. Defaults to 30.
        interval (float, optional): Interval in seconds between retries. Defaults to 0.1.
        expect_forbidden (bool, optional): Should export request be forbidden or not. Defaults to False.
        wait_result (bool, optional): Wait until export process will be finished. Defaults to True.
        download_result (bool, optional): Download exported file. Defaults to True.

    Returns:
        bytes: The content of the file if downloaded locally.
        None: If `wait_result` or `download_result` were False or the file is downloaded to cloud storage.
    """
    # initialize background process and ensure that the first request returns 403 code if request should be forbidden
    initialize_export(endpoint, expect_forbidden=expect_forbidden, **kwargs)

    if not wait_result:
        return None

    return wait_and_download_v1(
        endpoint,
        max_retries=max_retries,
        interval=interval,
        download_result=download_result,
        **kwargs,
    )


def wait_and_download_v2(
    api_client: ApiClient,
    rq_id: str,
    *,
    max_retries: int = 50,
    interval: float = 0.1,
    download_result: bool = True,
) -> Optional[bytes]:
    for _ in range(max_retries):
        (background_request, response) = api_client.requests_api.retrieve(rq_id)
        assert response.status == HTTPStatus.OK
        if (
            background_request.status.value
            == models.RequestStatus.allowed_values[("value",)]["FINISHED"]
        ):
            break
        sleep(interval)
    else:
        assert False, (
            f"Export process was not finished within allowed time ({interval * max_retries}, sec). "
            + f"Last status was: {background_request.status.value}"
        )

    if not download_result:
        return None

    # return downloaded file in case of local downloading or None otherwise
    if background_request.result_url:
        response = requests.get(
            background_request.result_url,
            auth=(api_client.configuration.username, api_client.configuration.password),
        )
        assert response.status_code == HTTPStatus.OK

        return response.content

    return None


def export_v2(
    endpoint: Endpoint,
    *,
    max_retries: int = 50,
    interval: float = 0.1,
    expect_forbidden: bool = False,
    wait_result: bool = True,
    download_result: bool = True,
    **kwargs,
) -> Optional[bytes]:
    """Export datasets|annotations|backups using the second version of export API

    Args:
        endpoint (Endpoint): Export endpoint, will be called only to initialize export process
        max_retries (int, optional): Number of retries when checking process status. Defaults to 30.
        interval (float, optional): Interval in seconds between retries. Defaults to 0.1.
        expect_forbidden (bool, optional): Should export request be forbidden or not. Defaults to False.
        download_result (bool, optional): Download exported file. Defaults to True.

    Returns:
        bytes: The content of the file if downloaded locally.
        None: If `wait_result` or `download_result` were False or the file is downloaded to cloud storage.
    """
    # initialize background process and ensure that the first request returns 403 code if request should be forbidden
    rq_id = initialize_export(endpoint, expect_forbidden=expect_forbidden, **kwargs)

    if not wait_result:
        return None

    # check status of background process
    return wait_and_download_v2(
        endpoint.api_client,
        rq_id,
        max_retries=max_retries,
        interval=interval,
        download_result=download_result,
    )


def export_dataset(
    api: Union[ProjectsApi, TasksApi, JobsApi],
    api_version: Union[
        int, tuple[int]
    ],  # make this parameter required to be sure that all tests was updated and both API versions are used
    *,
    save_images: bool,
    max_retries: int = 300,
    interval: float = 0.1,
    format: str = "CVAT for images 1.1",  # pylint: disable=redefined-builtin
    **kwargs,
) -> Optional[bytes]:
    def _get_endpoint_and_kwargs(version: int) -> Endpoint:
        extra_kwargs = {
            "format": format,
        }
        if version == 1:
            endpoint = (
                api.retrieve_dataset_endpoint if save_images else api.retrieve_annotations_endpoint
            )
        else:
            endpoint = api.create_dataset_export_endpoint
            extra_kwargs["save_images"] = save_images
        return endpoint, extra_kwargs

    if api_version == 1:
        endpoint, extra_kwargs = _get_endpoint_and_kwargs(api_version)
        return export_v1(
            endpoint,
            max_retries=max_retries,
            interval=interval,
            **kwargs,
            **extra_kwargs,
        )
    elif api_version == 2:
        endpoint, extra_kwargs = _get_endpoint_and_kwargs(api_version)
        return export_v2(
            endpoint,
            max_retries=max_retries,
            interval=interval,
            **kwargs,
            **extra_kwargs,
        )
    elif isinstance(api_version, tuple):
        assert len(api_version) == 2, "Expected 2 elements in api_version tuple"
        initialize_endpoint, extra_kwargs = _get_endpoint_and_kwargs(api_version[0])
        rq_id = initialize_export(initialize_endpoint, **kwargs, **extra_kwargs)

        if api_version[1] == 1:
            endpoint, extra_kwargs = _get_endpoint_and_kwargs(api_version[1])
            return wait_and_download_v1(
                endpoint, max_retries=max_retries, interval=interval, **kwargs, **extra_kwargs
            )
        else:
            return wait_and_download_v2(
                api.api_client, rq_id, max_retries=max_retries, interval=interval
            )

    assert False, "Unsupported API version"


# FUTURE-TODO: support username: optional, api_client: optional
def export_project_dataset(
    username: str, api_version: Union[int, tuple[int]], *args, **kwargs
) -> Optional[bytes]:
    with make_api_client(username) as api_client:
        return export_dataset(api_client.projects_api, api_version, *args, **kwargs)


def export_task_dataset(
    username: str, api_version: Union[int, tuple[int]], *args, **kwargs
) -> Optional[bytes]:
    with make_api_client(username) as api_client:
        return export_dataset(api_client.tasks_api, api_version, *args, **kwargs)


def export_job_dataset(
    username: str, api_version: Union[int, tuple[int]], *args, **kwargs
) -> Optional[bytes]:
    with make_api_client(username) as api_client:
        return export_dataset(api_client.jobs_api, api_version, *args, **kwargs)


def export_backup(
    api: Union[ProjectsApi, TasksApi],
    api_version: Union[
        int, tuple[int]
    ],  # make this parameter required to be sure that all tests was updated and both API versions are used
    *,
    max_retries: int = 50,
    interval: float = 0.1,
    **kwargs,
) -> Optional[bytes]:
    if api_version == 1:
        endpoint = api.retrieve_backup_endpoint
        return export_v1(endpoint, max_retries=max_retries, interval=interval, **kwargs)
    elif api_version == 2:
        endpoint = api.create_backup_export_endpoint
        return export_v2(endpoint, max_retries=max_retries, interval=interval, **kwargs)
    elif isinstance(api_version, tuple):
        assert len(api_version) == 2, "Expected 2 elements in api_version tuple"
        initialize_endpoint = (
            api.retrieve_backup_endpoint
            if api_version[0] == 1
            else api.create_backup_export_endpoint
        )
        rq_id = initialize_export(initialize_endpoint, **kwargs)

        if api_version[1] == 1:
            return wait_and_download_v1(
                api.retrieve_backup_endpoint, max_retries=max_retries, interval=interval, **kwargs
            )
        else:
            return wait_and_download_v2(
                api.api_client, rq_id, max_retries=max_retries, interval=interval
            )

    assert False, "Unsupported API version"


def export_project_backup(
    username: str, api_version: Union[int, tuple[int]], *args, **kwargs
) -> Optional[bytes]:
    with make_api_client(username) as api_client:
        return export_backup(api_client.projects_api, api_version, *args, **kwargs)


def export_task_backup(
    username: str, api_version: Union[int, tuple[int]], *args, **kwargs
) -> Optional[bytes]:
    with make_api_client(username) as api_client:
        return export_backup(api_client.tasks_api, api_version, *args, **kwargs)


def import_resource(
    endpoint: Endpoint,
    *,
    max_retries: int = 50,
    interval: float = 0.1,
    expect_forbidden: bool = False,
    wait_result: bool = True,
    **kwargs,
) -> None:
    # initialize background process and ensure that the first request returns 403 code if request should be forbidden
    (_, response) = endpoint.call_with_http_info(
        **kwargs,
        _parse_response=False,
        _check_status=False,
        _content_type="multipart/form-data",
    )
    if expect_forbidden:
        assert response.status == HTTPStatus.FORBIDDEN, "Request should be forbidden"
        raise ForbiddenException()

    assert response.status == HTTPStatus.ACCEPTED

    if not wait_result:
        return None

    # define background request ID returned in the server response
    rq_id = json.loads(response.data).get("rq_id")
    assert rq_id, "The rq_id parameter was not found in the server response"

    # check status of background process
    for _ in range(max_retries):
        (background_request, response) = endpoint.api_client.requests_api.retrieve(rq_id)
        assert response.status == HTTPStatus.OK
        if background_request.status.value in (
            models.RequestStatus.allowed_values[("value",)]["FINISHED"],
            models.RequestStatus.allowed_values[("value",)]["FAILED"],
        ):
            break
        sleep(interval)
    else:
        assert False, (
            f"Import process was not finished within allowed time ({interval * max_retries}, sec). "
            + f"Last status was: {background_request.status.value}"
        )


def import_backup(
    api: Union[ProjectsApi, TasksApi],
    *,
    max_retries: int = 50,
    interval: float = 0.1,
    **kwargs,
) -> None:
    endpoint = api.create_backup_endpoint
    return import_resource(endpoint, max_retries=max_retries, interval=interval, **kwargs)


def import_project_backup(username: str, data: dict, **kwargs) -> None:
    with make_api_client(username) as api_client:
        return import_backup(api_client.projects_api, project_file_request=deepcopy(data), **kwargs)


def import_task_backup(username: str, data: dict, **kwargs) -> None:
    with make_api_client(username) as api_client:
        return import_backup(api_client.tasks_api, task_file_request=deepcopy(data), **kwargs)


FieldPath = Sequence[Union[str, Callable]]


class CollectionSimpleFilterTestBase(metaclass=ABCMeta):
    # These fields need to be defined in the subclass
    user: str
    samples: list[dict[str, Any]]
    field_lookups: dict[str, FieldPath] = None
    cmp_ignore_keys: list[str] = ["updated_date"]

    @abstractmethod
    def _get_endpoint(self, api_client: ApiClient) -> Endpoint: ...

    def _retrieve_collection(self, **kwargs) -> list:
        kwargs["return_json"] = True
        with make_api_client(self.user) as api_client:
            return get_paginated_collection(self._get_endpoint(api_client), **kwargs)

    @classmethod
    def _get_field(cls, d: dict[str, Any], path: Union[str, FieldPath]) -> Optional[Any]:
        assert path
        for key in path:
            if isinstance(d, dict):
                assert isinstance(key, str)
                d = d.get(key)
            else:
                if callable(key):
                    assert isinstance(d, str)
                    d = key(d)
                else:
                    d = None

        return d

    def _map_field(self, name: str) -> FieldPath:
        return (self.field_lookups or {}).get(name, [name])

    @classmethod
    def _find_valid_field_value(
        cls, samples: Iterator[dict[str, Any]], field_path: FieldPath
    ) -> Any:
        value = None
        for sample in samples:
            value = cls._get_field(sample, field_path)
            if value:
                break

        assert value, f"Failed to find a sample for the '{'.'.join(field_path)}' field"
        return value

    def _get_field_samples(self, field: str) -> tuple[Any, list[dict[str, Any]]]:
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

    def _test_can_use_simple_filter_for_object_list(
        self, field: str, field_values: Optional[list[Any]] = None
    ):
        gt_objects = []
        field_path = self._map_field(field)

        if not field_values:
            value, gt_objects = self._get_field_samples(field)
            field_values = [value]

        are_gt_objects_initialized = bool(gt_objects)

        for value in field_values:
            if not are_gt_objects_initialized:
                gt_objects = [
                    sample
                    for sample in self.samples
                    if value == self._get_field(sample, field_path)
                ]
            received_items = self._retrieve_collection(**{field: value})
            self._compare_results(gt_objects, received_items)


def get_attrs(obj: Any, attributes: Sequence[str]) -> tuple[Any, ...]:
    """Returns 1 or more object attributes as a tuple"""
    return (getattr(obj, attr) for attr in attributes)


def build_exclude_paths_expr(ignore_fields: Iterator[str]) -> list[str]:
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


def wait_until_task_is_created(api: apis.RequestsApi, rq_id: str) -> models.Request:
    for _ in range(100):
        (request_details, _) = api.retrieve(rq_id)

        if request_details.status.value in ("finished", "failed"):
            return request_details
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

        (result, response) = api_client.tasks_api.create_data(
            task.id,
            data_request=deepcopy(data),
            _content_type=content_type,
            **data_kwargs,
            **last_kwargs,
        )
        assert response.status == HTTPStatus.ACCEPTED

        request_details = wait_until_task_is_created(api_client.requests_api, result.rq_id)
        assert request_details.status.value == "finished", request_details.message

    return task.id, response_.headers.get("X-Request-Id")


def compare_annotations(a: dict, b: dict) -> dict:
    def _exclude_cb(obj, path):
        return path.endswith("['elements']") and not obj

    return DeepDiff(
        a,
        b,
        ignore_order=True,
        significant_digits=2,  # annotations are stored with 2 decimal digit precision
        exclude_obj_callback=_exclude_cb,
        exclude_regex_paths=[
            r"root\['version|updated_date'\]",
            r"root(\['\w+'\]\[\d+\])+\['id'\]",
            r"root(\['\w+'\]\[\d+\])+\['label_id'\]",
            r"root(\['\w+'\]\[\d+\])+\['attributes'\]\[\d+\]\['spec_id'\]",
            r"root(\['\w+'\]\[\d+\])+\['source'\]",
        ],
    )


DATUMARO_FORMAT_FOR_DIMENSION = {
    "2d": "Datumaro 1.0",
    "3d": "Datumaro 3D 1.0",
}


def parse_frame_step(frame_filter: str) -> int:
    return int((frame_filter or "step=1").split("=")[1])


def calc_end_frame(start_frame: int, stop_frame: int, frame_step: int) -> int:
    return stop_frame - ((stop_frame - start_frame) % frame_step) + frame_step


_T = TypeVar("_T")


def unique(
    it: Union[Iterator[_T], Iterable[_T]], *, key: Callable[[_T], Hashable] = None
) -> Iterable[_T]:
    return {key(v): v for v in it}.values()
