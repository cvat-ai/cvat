# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) 2022-2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from http import HTTPStatus

import pytest

from shared.utils.config import get_method, post_method
from shared.utils.resource_import_export import (
    _CloudStorageResourceTest,
    _make_export_resource_params,
    _make_import_resource_params,
)
from shared.utils.s3 import make_client as make_s3_client

from .utils import create_task

# https://docs.pytest.org/en/7.1.x/example/markers.html#marking-whole-classes-or-modules
pytestmark = [pytest.mark.with_external_services]


class _S3ResourceTest(_CloudStorageResourceTest):
    @staticmethod
    def _make_client():
        return make_s3_client()


@pytest.mark.usefixtures("restore_db_per_class")
class TestExportResourceToS3(_S3ResourceTest):
    @pytest.mark.usefixtures("restore_redis_inmem_per_function")
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

    @pytest.mark.usefixtures("restore_redis_inmem_per_function")
    @pytest.mark.parametrize("user_type", ["admin", "assigned_supervisor_org_member"])
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
        user_type,
        projects,
        tasks,
        jobs,
        cloud_storages,
        users,
        is_project_staff,
        is_task_staff,
        is_job_staff,
        is_org_member,
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

        if user_type == "admin":
            user = self.user
        elif user_type == "assigned_supervisor_org_member":
            is_staff = {"projects": is_project_staff, "tasks": is_task_staff, "jobs": is_job_staff}[
                obj
            ]
            user = next(
                u
                for u in users
                if is_staff(u["id"], obj_id)
                if is_org_member(u["id"], cloud_storage["organization"], role="supervisor")
            )["username"]
        else:
            assert False

        kwargs = _make_export_resource_params(resource, obj=obj)
        kwargs["user"] = user

        self._export_resource(cloud_storage, obj_id, obj, resource, **kwargs)

    @pytest.mark.parametrize("storage_id", [3])
    @pytest.mark.parametrize(
        "obj, resource",
        [
            ("projects", "annotations"),
            ("projects", "dataset"),
            ("projects", "backup"),
            ("tasks", "annotations"),
            ("tasks", "dataset"),
            ("tasks", "backup"),
            ("jobs", "annotations"),
            ("jobs", "dataset"),
        ],
    )
    def test_user_cannot_export_to_cloud_storage_with_specific_location_without_access(
        self, storage_id, regular_lonely_user, obj, resource
    ):
        user = regular_lonely_user

        project_spec = {"name": "Test project"}
        project = post_method(user, "projects", project_spec).json()
        project_id = project["id"]

        task_spec = {
            "name": f"Task with files from foreign cloud storage {storage_id}",
            "labels": [
                {
                    "name": "car",
                }
            ],
        }
        data_spec = {
            "image_quality": 75,
            "use_cache": True,
            "server_files": ["images/image_1.jpg"],
            "project_id": project_id,
        }
        (task_id, _) = create_task(user, task_spec, data_spec)

        jobs = get_method(user, "jobs", task_id=task_id).json()["results"]
        job_id = jobs[0]["id"]

        if obj == "projects":
            obj_id = project_id
        elif obj == "tasks":
            obj_id = task_id
        elif obj == "jobs":
            obj_id = job_id
        else:
            assert False

        kwargs = _make_export_resource_params(
            resource, is_default=False, obj=obj, cloud_storage_id=storage_id
        )
        self._export_resource_to_cloud_storage(
            obj_id, obj, resource, user=user, _expect_status=HTTPStatus.FORBIDDEN, **kwargs
        )


@pytest.mark.usefixtures("restore_db_per_function")
@pytest.mark.usefixtures("restore_cvat_data")
class TestImportResourceFromS3(_S3ResourceTest):
    @pytest.mark.usefixtures("restore_redis_inmem_per_function")
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

    @pytest.mark.usefixtures("restore_redis_inmem_per_function")
    @pytest.mark.parametrize(
        "user_type",
        ["admin", "assigned_supervisor_org_member"],
    )
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
        user_type,
        projects,
        tasks,
        jobs,
        cloud_storages,
        users,
        is_project_staff,
        is_task_staff,
        is_job_staff,
        is_org_member,
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

        if user_type == "admin":
            user = self.user
        elif user_type == "assigned_supervisor_org_member":
            is_staff = {"projects": is_project_staff, "tasks": is_task_staff, "jobs": is_job_staff}[
                obj
            ]
            user = next(
                u
                for u in users
                if is_staff(u["id"], obj_id)
                if is_org_member(u["id"], cloud_storage["organization"], role="supervisor")
            )["username"]
        else:
            assert False

        export_kwargs = _make_export_resource_params(resource, obj=obj)
        import_kwargs = _make_import_resource_params(resource, obj=obj)
        export_kwargs["user"] = user
        import_kwargs["user"] = user

        self._export_resource(cloud_storage, obj_id, obj, resource, **export_kwargs)
        self._import_resource(cloud_storage, resource, obj_id, obj, **import_kwargs)

    @pytest.mark.parametrize("storage_id", [3])
    @pytest.mark.parametrize(
        "obj, resource",
        [
            ("projects", "dataset"),
            ("tasks", "annotations"),
            ("jobs", "annotations"),
            ("tasks", "backup"),
            ("projects", "backup"),
        ],
    )
    def test_user_cannot_import_from_cloud_storage_with_specific_location_without_access(
        self, storage_id, regular_lonely_user, obj, resource, cloud_storages
    ):
        user = regular_lonely_user

        project_spec = {"name": "Test project"}
        project = post_method(user, "projects", project_spec).json()
        project_id = project["id"]

        task_spec = {
            "name": f"Task with files from foreign cloud storage {storage_id}",
            "labels": [
                {
                    "name": "car",
                }
            ],
        }
        data_spec = {
            "image_quality": 75,
            "use_cache": True,
            "server_files": ["images/image_1.jpg"],
            "project_id": project_id,
        }
        (task_id, _) = create_task(user, task_spec, data_spec)

        jobs = get_method(user, "jobs", task_id=task_id).json()["results"]
        job_id = jobs[0]["id"]

        if obj == "projects":
            obj_id = project_id
        elif obj == "tasks":
            obj_id = task_id
        elif obj == "jobs":
            obj_id = job_id
        else:
            assert False

        cloud_storage = cloud_storages[storage_id]
        kwargs = _make_import_resource_params(
            resource, is_default=False, obj=obj, cloud_storage_id=storage_id
        )
        if resource == "annotations":
            kwargs["_check_uploaded"] = False

        self._import_resource(
            cloud_storage,
            resource,
            obj_id,
            obj,
            user=user,
            _expect_status=HTTPStatus.FORBIDDEN,
            **kwargs,
        )
