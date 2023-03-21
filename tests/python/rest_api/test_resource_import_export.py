# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import pytest

from shared.utils.resource_import_export import (
    _CloudStorageResourceTest, _make_export_resource_params, _make_import_resource_params
)
from shared.utils.s3 import make_client as make_s3_client


# https://docs.pytest.org/en/7.1.x/example/markers.html#marking-whole-classes-or-modules
pytestmark = [pytest.mark.with_external_services]


class _S3ResourceTest(_CloudStorageResourceTest):
    @staticmethod
    def _make_client():
        return make_s3_client()


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

