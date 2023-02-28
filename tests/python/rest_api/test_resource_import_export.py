# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import functools
import json
from abc import ABC, abstractstaticmethod
from contextlib import ExitStack
from http import HTTPStatus
from typing import Any, Dict, TypeVar

import pytest

from shared.utils.azure import make_client as make_azure_blob_container_client
from shared.utils.config import (
    AZURE_ACCOUNT_NAME,
    AZURE_CONTAINER,
    AZURE_TOKEN,
    get_method,
    make_api_client,
    post_method,
)
from shared.utils.s3 import make_client as make_s3_client

T = TypeVar("T")

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

        response = get_method(user, url)

        assert response.status_code != HTTPStatus.OK
        annotations = response.json()

        assert len(annotations["shapes"])

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


class _S3ResourceTest(_CloudStorageResourceTest):
    @staticmethod
    def _make_client():
        return make_s3_client()


# https://docs.pytest.org/en/7.1.x/example/markers.html#marking-whole-classes-or-modules
@pytest.mark.with_external_services
@pytest.mark.usefixtures("restore_db_per_class")
class TestExportResourceToS3(_S3ResourceTest):
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
        kwargs = _make_export_resource_params(
            resource, is_default=False, obj=obj, cloud_storage_id=cloud_storage_id
        )

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
        kwargs = _make_export_resource_params(resource, obj=obj)

        self._export_resource(cloud_storage, obj_id, obj, resource, **kwargs)


@pytest.mark.with_external_services
@pytest.mark.usefixtures("restore_db_per_function")
@pytest.mark.usefixtures("restore_cvat_data")
class TestImportResourceFromS3(_S3ResourceTest):
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
        kwargs = _make_import_resource_params(
            resource, is_default=False, obj=obj, cloud_storage_id=cloud_storage_id
        )
        export_kwargs = _make_export_resource_params(
            resource, is_default=False, obj=obj, cloud_storage_id=cloud_storage_id
        )
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

        export_kwargs = _make_export_resource_params(resource, obj=obj)
        import_kwargs = _make_import_resource_params(resource, obj=obj)
        self._export_resource(cloud_storage, obj_id, obj, resource, **export_kwargs)
        self._import_resource(cloud_storage, resource, obj_id, obj, **import_kwargs)


class _AzureResourceTest(_CloudStorageResourceTest):

    SPEC = {
        "provider_type": "AZURE_CONTAINER",
        "resource": AZURE_CONTAINER,
        "display_name": "Azure Container",
        "credentials_type": "ACCOUNT_NAME_TOKEN_PAIR",
        "session_token": AZURE_TOKEN,
        "account_name": AZURE_ACCOUNT_NAME,
        "description": "Some description",
        "manifests": [
            "empty_manifest.jsonl",
        ],
    }

    @staticmethod
    def _make_client():
        return make_azure_blob_container_client()


@pytest.mark.skipif(
    not bool(AZURE_CONTAINER and AZURE_TOKEN and AZURE_ACCOUNT_NAME),
    reason="Azure credentials were not found",
)
@pytest.mark.usefixtures("restore_db_per_class")
@pytest.mark.usefixtures("restore_cvat_data")
class TestExportImportAnnotationsToAzure(_AzureResourceTest):
    @pytest.mark.parametrize("obj, obj_id, resource", [("tasks", 11, "annotations")])
    def test_export_resource_to_azure_cloud_storage(self, obj: str, obj_id: int, resource: str):
        with make_api_client(self.user) as api_client:
            (cloud_storage, response) = api_client.cloudstorages_api.create(self.SPEC)
            assert response.status == HTTPStatus.CREATED

        kwargs = _make_export_resource_params(
            resource, is_default=False, obj=obj, cloud_storage_id=cloud_storage["id"]
        )
        self._export_resource(cloud_storage, obj_id, obj, resource, **kwargs)


@pytest.mark.skipif(
    not bool(AZURE_CONTAINER and AZURE_TOKEN and AZURE_ACCOUNT_NAME),
    reason="Azure credentials were not found",
)
@pytest.mark.usefixtures("restore_db_per_class")
@pytest.mark.usefixtures("restore_cvat_data")
class TestImportAnnotationsFromAzure(_AzureResourceTest):
    @pytest.mark.parametrize("obj, obj_id, resource", [("tasks", 11, "annotations")])
    def test_import_resource_from_cloud_storage(self, obj: str, obj_id: int, resource: str):
        with make_api_client(self.user) as api_client:
            (cloud_storage, response) = api_client.cloudstorages_api.create(self.SPEC)
            assert response.status == HTTPStatus.CREATED

        export_kwargs = _make_export_resource_params(
            resource, is_default=False, obj=obj, cloud_storage_id=cloud_storage["id"]
        )
        import_kwargs = _make_import_resource_params(
            resource, is_default=False, obj=obj, cloud_storage_id=cloud_storage["id"]
        )
        self._export_resource(cloud_storage, obj_id, obj, resource, **export_kwargs)
        self._import_resource(cloud_storage, resource, obj_id, obj, **import_kwargs)
