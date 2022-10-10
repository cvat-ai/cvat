# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import functools
import json
from http import HTTPStatus

import boto3
import pytest
from botocore.exceptions import ClientError

from shared.utils.config import (
    MINIO_ENDPOINT_URL,
    MINIO_KEY,
    MINIO_SECRET_KEY,
    get_method,
    post_method,
)

FILENAME_TEMPLATE = "cvat/{}/{}.zip"
FORMAT = "COCO 1.0"


def _use_custom_settings(obj, resource, cloud_storage_id):
    return {
        "filename": FILENAME_TEMPLATE.format(obj, resource),
        "use_default_location": False,
        "location": "cloud_storage",
        "cloud_storage_id": cloud_storage_id,
        "format": FORMAT,
    }


def _use_default_settings(obj, resource):
    return {
        "filename": FILENAME_TEMPLATE.format(obj, resource),
        "use_default_location": True,
        "format": FORMAT,
    }


def define_client():
    s3 = boto3.resource(
        "s3",
        aws_access_key_id=MINIO_KEY,
        aws_secret_access_key=MINIO_SECRET_KEY,
        endpoint_url=MINIO_ENDPOINT_URL,
    )
    return s3.meta.client


def assert_file_does_not_exist(client, bucket, filename):
    try:
        client.head_object(Bucket=bucket, Key=filename)
        raise AssertionError(f"File {filename} on bucket {bucket} already exists")
    except ClientError:
        pass


def assert_file_exists(client, bucket, filename):
    try:
        client.head_object(Bucket=bucket, Key=filename)
    except ClientError:
        raise AssertionError(f"File {filename} on bucket {bucket} doesn't exist")


def assert_file_status(func):
    @functools.wraps(func)
    def wrapper(user, storage_conf, *args, **kwargs):
        filename = kwargs["filename"]
        bucket = storage_conf["resource"]
        # get storage client
        client = define_client()
        # check that file doesn't exist on the bucket
        assert_file_does_not_exist(client, bucket, filename)
        func(user, storage_conf, *args, **kwargs)
        # check that file exists on the bucket
        assert_file_exists(client, bucket, filename)

    return wrapper


def remove_asset(bucket, filename):
    client = define_client()
    client.delete_object(Bucket=bucket, Key=filename)


@assert_file_status
def _save_resource_to_cloud_storage(user, storage_conf, obj_id, obj, resource, **kwargs):
    response = get_method(user, f"{obj}/{obj_id}/{resource}", **kwargs)
    status = response.status_code

    while status != HTTPStatus.OK:
        assert status in (HTTPStatus.CREATED, HTTPStatus.ACCEPTED)
        response = get_method(user, f"{obj}/{obj_id}/{resource}", action="download", **kwargs)
        status = response.status_code


def _idempotent_saving_resource_to_cloud_storage(*args, **kwargs):
    _save_resource_to_cloud_storage(*args, **kwargs)
    remove_asset(args[1]["resource"], kwargs["filename"])


@pytest.mark.usefixtures("dontchangedb")
class TestSaveResource:
    _USERNAME = "admin1"
    _ORG = 2

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
        kwargs = _use_custom_settings(obj, resource, cloud_storage_id)
        if resource == "backup":
            kwargs.pop("format")

        _idempotent_saving_resource_to_cloud_storage(
            self._USERNAME, cloud_storage, obj_id, obj, resource, org_id=self._ORG, **kwargs
        )

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

        kwargs = _use_default_settings(obj, resource)

        if resource == "backup":
            kwargs.pop("format")

        _idempotent_saving_resource_to_cloud_storage(
            self._USERNAME, cloud_storage, obj_id, obj, resource, org_id=self._ORG, **kwargs
        )


def _import_annotations_from_cloud_storage(user, obj_id, obj, **kwargs):
    url = f"{obj}/{obj_id}/annotations"
    response = post_method(user, url, data=None, **kwargs)
    status = response.status_code

    while status != HTTPStatus.CREATED:
        assert status == HTTPStatus.ACCEPTED
        response = post_method(user, url, data=None, **kwargs)
        status = response.status_code


def _import_backup_from_cloud_storage(user, obj_id, obj, **kwargs):
    url = f"{obj}/backup"
    response = post_method(user, url, data=None, **kwargs)
    status = response.status_code

    while status != HTTPStatus.CREATED:
        assert status == HTTPStatus.ACCEPTED
        data = json.loads(response.content.decode("utf8"))
        response = post_method(user, url, data=data, **kwargs)
        status = response.status_code


def _import_dataset_from_cloud_storage(user, obj_id, obj, **kwargs):
    url = f"{obj}/{obj_id}/dataset"
    response = post_method(user, url, data=None, **kwargs)
    status = response.status_code

    while status != HTTPStatus.CREATED:
        assert status == HTTPStatus.ACCEPTED
        response = get_method(user, url, action="import_status")
        status = response.status_code


@pytest.mark.usefixtures("changedb")
@pytest.mark.usefixtures("restore_cvat_data")
class TestImportResource:
    _USERNAME = "admin1"
    _ORG = 2

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
        kwargs = _use_custom_settings(obj, resource, cloud_storage_id)
        export_kwargs = _use_custom_settings(obj, resource, cloud_storage_id)

        if resource == "backup":
            kwargs.pop("format")
            kwargs.pop("use_default_location")
            export_kwargs.pop("format")

        # export current resource to cloud storage
        _save_resource_to_cloud_storage(
            self._USERNAME, cloud_storage, obj_id, obj, resource, org_id=self._ORG, **export_kwargs
        )

        import_resource = {
            "annotations": _import_annotations_from_cloud_storage,
            "dataset": _import_dataset_from_cloud_storage,
            "backup": _import_backup_from_cloud_storage,
        }
        import_resource[resource](self._USERNAME, obj_id, obj, org_id=self._ORG, **kwargs)
        remove_asset(cloud_storage["resource"], kwargs["filename"])

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
        kwargs = _use_default_settings(obj, resource)

        # export current resource to cloud storage
        _save_resource_to_cloud_storage(
            self._USERNAME, cloud_storage, obj_id, obj, resource, org_id=self._ORG, **kwargs
        )

        import_resource = {
            "annotations": _import_annotations_from_cloud_storage,
            "dataset": _import_dataset_from_cloud_storage,
            "backup": _import_backup_from_cloud_storage,
        }
        import_resource[resource](self._USERNAME, obj_id, obj, org_id=self._ORG, **kwargs)
        remove_asset(cloud_storage["resource"], kwargs["filename"])
