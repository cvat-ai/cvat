import functools
import json
from abc import ABC, abstractmethod
from contextlib import ExitStack
from http import HTTPStatus
from time import sleep
from typing import Any, Optional, TypeVar

import pytest

T = TypeVar("T")

from shared.utils.config import get_method, post_method, put_method

FILENAME_TEMPLATE = "cvat/{}/{}.zip"
EXPORT_FORMAT = "CVAT for images 1.1"
IMPORT_FORMAT = "CVAT 1.1"


def _make_custom_resource_params(resource: str, obj: str, cloud_storage_id: int) -> dict[str, Any]:
    return {
        "filename": FILENAME_TEMPLATE.format(obj, resource),
        "location": "cloud_storage",
        "cloud_storage_id": cloud_storage_id,
    }


def _make_default_resource_params(resource: str, obj: str) -> dict[str, Any]:
    return {
        "filename": FILENAME_TEMPLATE.format(obj, resource),
    }


def _make_export_resource_params(
    resource: str, is_default: bool = True, **kwargs
) -> dict[str, Any]:
    func = _make_default_resource_params if is_default else _make_custom_resource_params
    params = func(resource, **kwargs)
    if resource != "backup":
        params["format"] = EXPORT_FORMAT
    return params


def _make_import_resource_params(
    resource: str, is_default: bool = True, **kwargs
) -> dict[str, Any]:
    func = _make_default_resource_params if is_default else _make_custom_resource_params
    params = func(resource, **kwargs)
    if resource != "backup":
        params["format"] = IMPORT_FORMAT
    return params


class _CloudStorageResourceTest(ABC):
    @staticmethod
    @abstractmethod
    def _make_client():
        pass

    @pytest.fixture(autouse=True)
    def setup(self, admin_user: str):
        self.user = admin_user
        self.client = self._make_client()
        self.exit_stack = ExitStack()
        with self.exit_stack:
            yield

    def _ensure_file_created(self, func: T, storage: dict[str, Any]) -> T:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            filename = kwargs["filename"]
            bucket = storage["resource"]

            # check that file doesn't exist on the bucket
            assert not self.client.file_exists(bucket=bucket, filename=filename)

            func(*args, **kwargs)

            # check that file exists on the bucket
            assert self.client.file_exists(bucket=bucket, filename=filename)

        return wrapper

    def _export_resource_to_cloud_storage(
        self,
        obj_id: int,
        obj: str,
        resource: str,
        *,
        user: str,
        _expect_status: Optional[int] = None,
        **kwargs,
    ):
        _expect_status = _expect_status or HTTPStatus.ACCEPTED

        sleep_interval = 0.1
        number_of_checks = 100

        # initialize the export process
        response = get_method(user, f"{obj}/{obj_id}/{resource}", **kwargs)
        assert response.status_code == _expect_status

        if _expect_status == HTTPStatus.FORBIDDEN:
            return

        rq_id = json.loads(response.content).get("rq_id")
        assert rq_id, "The rq_id was not found in server request"

        for _ in range(number_of_checks):
            sleep(sleep_interval)
            # use new requests API for checking the status of the operation
            response = get_method(user, f"requests/{rq_id}")
            assert response.status_code == HTTPStatus.OK

            request_details = json.loads(response.content)
            status = request_details["status"]
            assert status in {"started", "queued", "finished", "failed"}
            if status in {"finished", "failed"}:
                break

    def _import_resource_from_cloud_storage(
        self, url: str, *, user: str, _expect_status: Optional[int] = None, **kwargs
    ) -> None:
        _expect_status = _expect_status or HTTPStatus.ACCEPTED

        response = post_method(user, url, data=None, **kwargs)
        status = response.status_code

        assert status == _expect_status
        if status == HTTPStatus.FORBIDDEN:
            return

        rq_id = response.json().get("rq_id")
        assert rq_id, "The rq_id parameter was not found in the server response"

        number_of_checks = 100
        sleep_interval = 0.1

        for _ in range(number_of_checks):
            sleep(sleep_interval)
            # use new requests API for checking the status of the operation
            response = get_method(user, f"requests/{rq_id}")
            assert response.status_code == HTTPStatus.OK

            request_details = json.loads(response.content)
            status = request_details["status"]
            assert status in {"started", "queued", "finished", "failed"}
            if status in {"finished", "failed"}:
                break

    def _import_annotations_from_cloud_storage(
        self,
        obj_id,
        obj,
        *,
        user,
        _expect_status: Optional[int] = None,
        _check_uploaded: bool = True,
        **kwargs,
    ):
        _expect_status = _expect_status or HTTPStatus.CREATED

        url = f"{obj}/{obj_id}/annotations"
        response = post_method(user, url, data=None, **kwargs)
        status = response.status_code

        # Only the first POST request contains rq_id in response.
        # Exclude cases with 403 expected status.
        rq_id = None
        if status == HTTPStatus.ACCEPTED:
            rq_id = response.json().get("rq_id")
            assert rq_id, "The rq_id was not found in the response"

        while status != _expect_status:
            assert status == HTTPStatus.ACCEPTED
            response = put_method(user, url, data=None, rq_id=rq_id, **kwargs)
            status = response.status_code

        if _check_uploaded:
            response = get_method(user, url)
            assert response.status_code == HTTPStatus.OK

            annotations = response.json()

            assert len(annotations["shapes"])

    def _import_backup_from_cloud_storage(
        self, obj_id, obj, *, user, _expect_status: Optional[int] = None, **kwargs
    ):
        _expect_status = _expect_status or HTTPStatus.CREATED

        url = f"{obj}/backup"
        response = post_method(user, url, data=None, **kwargs)
        status = response.status_code

        while status != _expect_status:
            assert status == HTTPStatus.ACCEPTED
            data = json.loads(response.content.decode("utf8"))
            response = post_method(user, url, data=data, **kwargs)
            status = response.status_code

    def _import_dataset_from_cloud_storage(
        self, obj_id, obj, *, user, _expect_status: Optional[int] = None, **kwargs
    ):
        _expect_status = _expect_status or HTTPStatus.CREATED

        url = f"{obj}/{obj_id}/dataset"
        response = post_method(user, url, data=None, **kwargs)
        status = response.status_code

        # Only the first POST request contains rq_id in response.
        # Exclude cases with 403 expected status.
        rq_id = None
        if status == HTTPStatus.ACCEPTED:
            rq_id = response.json().get("rq_id")
            assert rq_id, "The rq_id was not found in the response"

        while status != _expect_status:
            assert status == HTTPStatus.ACCEPTED
            response = get_method(user, url, action="import_status", rq_id=rq_id)
            status = response.status_code

    def _import_resource(self, cloud_storage: dict[str, Any], resource_type: str, *args, **kwargs):
        methods = {
            "annotations": self._import_annotations_from_cloud_storage,
            "dataset": self._import_dataset_from_cloud_storage,
            "backup": self._import_backup_from_cloud_storage,
        }

        org_id = cloud_storage["organization"]
        if org_id:
            kwargs.setdefault("org_id", org_id)

        kwargs.setdefault("user", self.user)

        return methods[resource_type](*args, **kwargs)

    def _export_resource(self, cloud_storage: dict[str, Any], *args, **kwargs):
        org_id = cloud_storage["organization"]
        if org_id:
            kwargs.setdefault("org_id", org_id)

        kwargs.setdefault("user", self.user)

        export_callback = self._ensure_file_created(
            self._export_resource_to_cloud_storage, storage=cloud_storage
        )
        export_callback(*args, **kwargs)

        self.exit_stack.callback(
            self.client.remove_file,
            bucket=cloud_storage["resource"],
            filename=kwargs["filename"],
        )
