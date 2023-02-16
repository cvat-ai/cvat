# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import functools
import json
from contextlib import ExitStack
from http import HTTPStatus
from typing import Any, Dict, TypeVar

import pytest

from shared.utils.config import get_method, post_method
from shared.utils.s3 import make_client

T = TypeVar("T")

FILENAME_TEMPLATE = "cvat/{}/{}.zip"
FORMAT = "COCO 1.0"


# https://docs.pytest.org/en/7.1.x/example/markers.html#marking-whole-classes-or-modules
pytestmark = [pytest.mark.with_external_services]


def _make_custom_resource_params(obj: str, resource: str, cloud_storage_id: int) -> Dict[str, Any]:
    params = {
        "filename": FILENAME_TEMPLATE.format(obj, resource),
        "location": "cloud_storage",
        "cloud_storage_id": cloud_storage_id,
        "use_default_location": False,
    }
    if resource != "backup":
        params["format"] = FORMAT
    return params


def _make_default_resource_params(obj: str, resource: str) -> Dict[str, Any]:
    params = {
        "filename": FILENAME_TEMPLATE.format(obj, resource),
        "use_default_location": True,
    }
    if resource != "backup":
        params["format"] = FORMAT
    return params


class _S3ResourceTest:
    @pytest.fixture(autouse=True)
    def setup(self, admin_user: str):
        self.user = admin_user
        self.s3_client = make_client()
        self.exit_stack = ExitStack()
        with self.exit_stack:
            yield

    def _ensure_file_created(self, func: T, storage: Dict[str, Any]) -> T:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            filename = kwargs["filename"]
            bucket = storage["resource"]

            # check that file doesn't exist on the bucket
            assert not self.s3_client.file_exists(bucket, filename)

            func(*args, **kwargs)

            # check that file exists on the bucket
            assert self.s3_client.file_exists(bucket, filename)

        return wrapper

    def _export_resource_to_cloud_storage(
        self, obj_id: int, obj: str, resource: str, *, user: str, **kwargs
    ):
        response = get_method(user, f"{obj}/{obj_id}/{resource}", **kwargs)
        status = response.status_code

        while status != HTTPStatus.OK:
            assert status in (HTTPStatus.CREATED, HTTPStatus.ACCEPTED)
            response = get_method(user, f"{obj}/{obj_id}/{resource}", action="download", **kwargs)
            status = response.status_code

    def _import_annotations_from_cloud_storage(self, obj_id, obj, *, user, **kwargs):
        url = f"{obj}/{obj_id}/annotations"
        response = post_method(user, url, data=None, **kwargs)
        status = response.status_code

        while status != HTTPStatus.CREATED:
            assert status == HTTPStatus.ACCEPTED
            response = post_method(user, url, data=None, **kwargs)
            status = response.status_code

    def _import_backup_from_cloud_storage(self, obj_id, obj, *, user, **kwargs):
        url = f"{obj}/backup"
        response = post_method(user, url, data=None, **kwargs)
        status = response.status_code

        while status != HTTPStatus.CREATED:
            assert status == HTTPStatus.ACCEPTED
            data = json.loads(response.content.decode("utf8"))
            response = post_method(user, url, data=data, **kwargs)
            status = response.status_code

    def _import_dataset_from_cloud_storage(self, obj_id, obj, *, user, **kwargs):
        url = f"{obj}/{obj_id}/dataset"
        response = post_method(user, url, data=None, **kwargs)
        status = response.status_code

        while status != HTTPStatus.CREATED:
            assert status == HTTPStatus.ACCEPTED
            response = get_method(user, url, action="import_status")
            status = response.status_code

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
            self.s3_client.remove_file,
            bucket=cloud_storage["resource"],
            filename=kwargs["filename"],
        )


@pytest.mark.usefixtures("restore_db_per_class")
class TestExportResource(_S3ResourceTest):
    @pytest.mark.parametrize("cloud_storage_id", [3])
    @pytest.mark.parametrize(
        "obj_id, obj, resource",
        [
            (2, "projects", "annotations"),
            (2, "projects", "dataset"),
            (2, "projects", "backup"),
            (11, "tasks", "annotations"),
            (11, "tasks", "dataset"),
            (11, "tasks", "backup"),
            (16, "jobs", "annotations"),
            (16, "jobs", "dataset"),
        ],
    )
    def test_save_resource_to_cloud_storage_with_specific_location(
        self, cloud_storage_id, obj_id, obj, resource, cloud_storages
    ):
        cloud_storage = cloud_storages[cloud_storage_id]
        kwargs = _make_custom_resource_params(obj, resource, cloud_storage_id)

        self._export_resource(cloud_storage, obj_id, obj, resource, **kwargs)

    @pytest.mark.parametrize(
        "obj_id, obj, resource",
        [
            (2, "projects", "annotations"),
            (2, "projects", "dataset"),
            (2, "projects", "backup"),
            (11, "tasks", "annotations"),
            (11, "tasks", "dataset"),
            (11, "tasks", "backup"),
            (16, "jobs", "annotations"),
            (16, "jobs", "dataset"),
        ],
    )
    def test_save_resource_to_cloud_storage_with_default_location(
        self,
        obj_id,
        obj,
        resource,
        projects,
        tasks,
        jobs,
        cloud_storages,
    ):
        objects = {
            "projects": projects,
            "tasks": tasks,
            "jobs": jobs,
        }
        if obj in ("projects", "tasks"):
            cloud_storage_id = objects[obj][obj_id]["target_storage"]["cloud_storage_id"]
        else:
            task_id = jobs[obj_id]["task_id"]
            cloud_storage_id = tasks[task_id]["target_storage"]["cloud_storage_id"]
        cloud_storage = cloud_storages[cloud_storage_id]
        kwargs = _make_default_resource_params(obj, resource)

        self._export_resource(cloud_storage, obj_id, obj, resource, **kwargs)


@pytest.mark.usefixtures("restore_db_per_function")
@pytest.mark.usefixtures("restore_cvat_data")
class TestImportResource(_S3ResourceTest):
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

    @pytest.mark.parametrize("cloud_storage_id", [3])
    @pytest.mark.parametrize(
        "obj_id, obj, resource",
        [
            (2, "projects", "dataset"),
            (2, "projects", "backup"),
            (11, "tasks", "annotations"),
            (11, "tasks", "backup"),
            (16, "jobs", "annotations"),
        ],
    )
    def test_import_resource_from_cloud_storage_with_specific_location(
        self, cloud_storage_id, obj_id, obj, resource, cloud_storages
    ):
        cloud_storage = cloud_storages[cloud_storage_id]
        kwargs = _make_custom_resource_params(obj, resource, cloud_storage_id)
        export_kwargs = _make_custom_resource_params(obj, resource, cloud_storage_id)
        self._export_resource(cloud_storage, obj_id, obj, resource, **export_kwargs)

        self._import_resource(cloud_storage, resource, obj_id, obj, **kwargs)

    @pytest.mark.parametrize(
        "obj_id, obj, resource",
        [
            (2, "projects", "dataset"),
            (11, "tasks", "annotations"),
            (16, "jobs", "annotations"),
        ],
    )
    def test_import_resource_from_cloud_storage_with_default_location(
        self,
        obj_id,
        obj,
        resource,
        projects,
        tasks,
        jobs,
        cloud_storages,
    ):
        objects = {
            "projects": projects,
            "tasks": tasks,
            "jobs": jobs,
        }
        if obj in ("projects", "tasks"):
            cloud_storage_id = objects[obj][obj_id]["source_storage"]["cloud_storage_id"]
        else:
            task_id = jobs[obj_id]["task_id"]
            cloud_storage_id = tasks[task_id]["source_storage"]["cloud_storage_id"]
        cloud_storage = cloud_storages[cloud_storage_id]

        kwargs = _make_default_resource_params(obj, resource)
        self._export_resource(cloud_storage, obj_id, obj, resource, **kwargs)

        self._import_resource(cloud_storage, resource, obj_id, obj, **kwargs)
