import functools
import json
from abc import ABC, abstractstaticmethod
from contextlib import ExitStack
from http import HTTPStatus
from typing import Any, Dict, Optional, TypeVar

import pytest

T = TypeVar("T")

from shared.utils.config import get_method, post_method, put_method

FILENAME_TEMPLATE = "cvat/{}/{}.zip"
EXPORT_FORMAT = "CVAT for images 1.1"
IMPORT_FORMAT = "CVAT 1.1"


def _make_custom_resource_params(resource: str, obj: str, cloud_storage_id: int) -> Dict[str, Any]:
    return {
        "filename": FILENAME_TEMPLATE.format(obj, resource),
        "location": "cloud_storage",
        "cloud_storage_id": cloud_storage_id,
        "use_default_location": False,
    }


def _make_default_resource_params(resource: str, obj: str) -> Dict[str, Any]:
    return {
        "filename": FILENAME_TEMPLATE.format(obj, resource),
        "use_default_location": True,
    }


def _make_export_resource_params(
    resource: str, is_default: bool = True, **kwargs
) -> Dict[str, Any]:
    func = _make_default_resource_params if is_default else _make_custom_resource_params
    params = func(resource, **kwargs)
    if resource != "backup":
        params["format"] = EXPORT_FORMAT
    return params


def _make_import_resource_params(
    resource: str, is_default: bool = True, **kwargs
) -> Dict[str, Any]:
    func = _make_default_resource_params if is_default else _make_custom_resource_params
    params = func(resource, **kwargs)
    if resource != "backup":
        params["format"] = IMPORT_FORMAT
    return params


class _CloudStorageResourceTest(ABC):
    @abstractstaticmethod
    def _make_client():
        pass

    @pytest.fixture(autouse=True)
    def setup(self, admin_user: str):
        self.user = admin_user
        self.client = self._make_client()
        self.exit_stack = ExitStack()
        with self.exit_stack:
            yield

    def _ensure_file_created(self, func: T, storage: Dict[str, Any]) -> T:
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
        _expect_status = _expect_status or HTTPStatus.OK

        response = get_method(user, f"{obj}/{obj_id}/{resource}", **kwargs)
        status = response.status_code

        while status != _expect_status:
            assert status in (HTTPStatus.CREATED, HTTPStatus.ACCEPTED)
            response = get_method(user, f"{obj}/{obj_id}/{resource}", action="download", **kwargs)
            status = response.status_code

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

    def _import_resource(self, cloud_storage: Dict[str, Any], resource_type: str, *args, **kwargs):
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

    def _export_resource(self, cloud_storage: Dict[str, Any], *args, **kwargs):
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
