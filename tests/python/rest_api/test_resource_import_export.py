# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from collections.abc import Callable
from http import HTTPStatus
from pathlib import Path
from typing import Any
from uuid import uuid4

import pytest
from cvat_sdk import exceptions
from cvat_sdk.core import Client as SdkClient
from cvat_sdk.core.progress import NullProgressReporter
from cvat_sdk.core.uploading import Uploader
from pytest_cases import fixture, fixture_ref, parametrize

from shared.fixtures.data import Container
from shared.utils.config import get_method, make_sdk_client, post_method
from shared.utils.resource_import_export import (
    _CloudStorageResourceTest,
    _make_export_resource_params,
    _make_import_resource_params,
)
from shared.utils.s3 import make_client as make_s3_client

from .utils import create_task


class _S3ResourceTest(_CloudStorageResourceTest):
    @staticmethod
    def _make_client():
        return make_s3_client()


@pytest.mark.with_external_services
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


@pytest.mark.with_external_services
@pytest.mark.usefixtures("restore_db_per_function")
@pytest.mark.usefixtures("restore_cvat_data_per_function")
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
        self._import_resource(
            cloud_storage,
            resource,
            *(
                [
                    obj_id,
                ]
                if resource != "backup"
                else []
            ),
            obj,
            **kwargs,
        )

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
            *(
                [
                    obj_id,
                ]
                if resource != "backup"
                else []
            ),
            obj,
            user=user,
            _expect_status=HTTPStatus.FORBIDDEN,
            **kwargs,
        )


@pytest.mark.usefixtures("restore_db_per_function")
@pytest.mark.usefixtures("restore_redis_inmem_per_function")
@pytest.mark.usefixtures("restore_redis_ondisk_per_function")
class TestUploads:
    @fixture()
    def project(self, projects: Container):
        return next(p for p in projects)

    @fixture()
    def task(self, tasks: Container):
        return next(t for t in tasks)

    @fixture()
    def job(self, jobs: Container):
        return next(j for j in jobs if j["type"] == "annotation")

    @fixture(scope="class")
    def restore_task_api_path(self, admin_user: str):
        with make_sdk_client(admin_user) as client:
            return client.api_client.tasks_api.create_backup_endpoint.path

    @fixture(scope="class")
    def restore_project_api_path(self, admin_user: str):
        with make_sdk_client(admin_user) as client:
            return client.api_client.projects_api.create_backup_endpoint.path

    @fixture(scope="class")
    def upload_task_annotations_api_path(self, admin_user: str):
        with make_sdk_client(admin_user) as client:
            return client.api_client.tasks_api.create_annotations_endpoint.path

    @fixture(scope="class")
    def upload_project_dataset_api_path(self, admin_user: str):
        with make_sdk_client(admin_user) as client:
            return client.api_client.projects_api.create_dataset_endpoint.path

    @fixture(scope="class")
    def upload_job_annotations_api_path(self, admin_user: str):
        with make_sdk_client(admin_user) as client:
            return client.api_client.jobs_api.create_annotations_endpoint.path

    def _find_malefactor_with_its_resource(
        self,
        resources: Container,
        users: Container,
        *,
        get_owner_func: Callable = lambda r: r["owner"],
        user_to_skip: int | None = None,
    ) -> tuple[dict, int]:
        for resource in resources:
            malefactor = get_owner_func(resource)
            if not users[malefactor["id"]]["is_superuser"] and malefactor["id"] != user_to_skip:
                return malefactor, resource["id"]

        assert False

    @fixture()
    def downloaded_file_path(self, tmp_path: Path):
        return tmp_path / f"{uuid4()}.zip"

    @fixture()
    def project_backup_with_owner_and_malefactor(
        self,
        project: dict,
        projects: Container,
        downloaded_file_path: Path,
        restore_project_api_path: str,
        users: Container,
    ):
        project_id, project_owner = project["id"], project["owner"]
        malefactor, _ = self._find_malefactor_with_its_resource(
            projects, users, user_to_skip=project_owner["id"]
        )

        with make_sdk_client(project_owner["username"]) as client:
            client.projects.retrieve(project_id).download_backup(downloaded_file_path)

            return (
                None,
                downloaded_file_path,
                project_owner,
                malefactor,
                None,
                restore_project_api_path,
                None,
            )

    @fixture()
    def project_dataset_with_owner_and_malefactor(
        self,
        project: dict,
        projects: Container,
        downloaded_file_path: Path,
        upload_project_dataset_api_path: str,
        users: Container,
    ):
        project_id, project_owner = project["id"], project["owner"]

        malefactor, malefactor_project_id = self._find_malefactor_with_its_resource(
            projects, users, user_to_skip=project_owner["id"]
        )

        with make_sdk_client(project_owner["username"]) as client:
            client.projects.retrieve(project_id).export_dataset(
                "COCO 1.0", downloaded_file_path, include_images=True
            )

            return (
                project_id,
                downloaded_file_path,
                project_owner,
                malefactor,
                malefactor_project_id,
                upload_project_dataset_api_path,
                {"format": "COCO 1.0"},
            )

    @fixture()
    def task_backup_with_owner_and_malefactor(
        self,
        task: dict,
        tasks: Container,
        downloaded_file_path: Path,
        restore_task_api_path: str,
        users: Container,
    ):
        task_id = task["id"]
        task_owner = task["owner"]

        malefactor, _ = self._find_malefactor_with_its_resource(
            tasks, users, user_to_skip=task_owner["id"]
        )

        with make_sdk_client(task_owner["username"]) as client:
            client.tasks.retrieve(task_id).download_backup(downloaded_file_path)

            return (
                None,
                downloaded_file_path,
                task_owner,
                malefactor,
                None,
                restore_task_api_path,
                None,
            )

    @fixture()
    def task_annotations_with_owner_and_malefactor(
        self,
        task: dict,
        tasks: Container,
        downloaded_file_path: Path,
        upload_task_annotations_api_path: str,
        users: Container,
    ):
        task_id = task["id"]
        task_owner = task["owner"]

        malefactor, malefactor_task_id = self._find_malefactor_with_its_resource(
            tasks, users, user_to_skip=task_owner["id"]
        )

        with make_sdk_client(task_owner["username"]) as client:
            client.tasks.retrieve(task_id).export_dataset(
                "COCO 1.0", downloaded_file_path, include_images=False
            )

            return (
                task_id,
                downloaded_file_path,
                task_owner,
                malefactor,
                malefactor_task_id,
                upload_task_annotations_api_path,
                {"format": "COCO 1.0"},
            )

    @fixture()
    def job_annotations_with_owner_and_malefactor(
        self,
        job: dict,
        jobs: Container,
        tasks: Container,
        downloaded_file_path: Path,
        upload_job_annotations_api_path: str,
        users: Container,
    ):
        job_id = job["id"]
        job_owner = tasks[job["task_id"]]["owner"]

        malefactor, malefactor_job_id = self._find_malefactor_with_its_resource(
            jobs,
            users,
            user_to_skip=job_owner["id"],
            get_owner_func=lambda x: tasks[x["task_id"]]["owner"],
        )

        with make_sdk_client(job_owner["username"]) as client:
            client.jobs.retrieve(job_id).export_dataset(
                "COCO 1.0", downloaded_file_path, include_images=False
            )

            return (
                job_id,
                downloaded_file_path,
                job_owner,
                malefactor,
                malefactor_job_id,
                upload_job_annotations_api_path,
                {"format": "COCO 1.0"},
            )

    def _test_can_finish_upload(
        self,
        client: SdkClient,
        url: str,
        *,
        query_params: dict[str, Any],
    ):
        Uploader(client)._tus_finish_upload(url, query_params=query_params)

    def _test_cannot_finish_upload(
        self,
        client: SdkClient,
        url: str,
        *,
        query_params: dict[str, Any],
    ):
        uploader = Uploader(client)

        with pytest.raises(exceptions.ApiException) as capture:
            uploader._tus_finish_upload(url, query_params=query_params)

        assert capture.value.status == HTTPStatus.BAD_REQUEST
        assert b"No such file were uploaded" in capture.value.body

    @parametrize(
        "resource, endpoint_path",
        [
            (None, fixture_ref(restore_task_api_path)),
            (None, fixture_ref(restore_project_api_path)),
            (fixture_ref(task), fixture_ref(upload_task_annotations_api_path)),
            (fixture_ref(project), fixture_ref(upload_project_dataset_api_path)),
            (fixture_ref(job), fixture_ref(upload_job_annotations_api_path)),
        ],
    )
    def test_user_cannot_restore_resource_from_non_existent_uploads(
        self, resource: dict, endpoint_path: str, admin_user: str
    ):
        with make_sdk_client(admin_user) as client:
            url = client.api_map.make_endpoint_url(
                endpoint_path, kwsub=({"id": resource["id"]} if resource else None)
            )
            self._test_cannot_finish_upload(
                client, url, query_params={"filename": "non-existent-file.zip"}
            )

    @parametrize(
        "src_resource_id, archive_path, owner, malefactor, dst_resource_id, endpoint_path, query_params",
        [
            (fixture_ref(task_backup_with_owner_and_malefactor)),
            (fixture_ref(project_backup_with_owner_and_malefactor)),
            (fixture_ref(job_annotations_with_owner_and_malefactor)),
            (fixture_ref(task_annotations_with_owner_and_malefactor)),
            (fixture_ref(project_dataset_with_owner_and_malefactor)),
        ],
    )
    def test_user_can_use_only_own_uploads(
        self,
        src_resource_id: int | None,
        archive_path: Path,
        owner: dict,
        malefactor: dict,
        dst_resource_id: str | None,
        endpoint_path: str,
        query_params: dict | None,
    ):
        with (
            make_sdk_client(owner["username"]) as owner_client,
            make_sdk_client(malefactor["username"]) as malefactor_client,
        ):
            params = {"filename": archive_path.name}
            pbar = NullProgressReporter()
            url = owner_client.api_map.make_endpoint_url(
                endpoint_path, kwsub=({"id": src_resource_id} if src_resource_id else None)
            )

            uploader = Uploader(owner_client)
            uploader._tus_start_upload(url, query_params=params)
            with uploader._uploading_task(pbar, archive_path.stat().st_size):
                upload_name = uploader._upload_file_data_with_tus(
                    url,
                    archive_path,
                    meta=params,
                    logger=owner_client.logger.debug,
                    pbar=pbar,
                )

            query_params = {"filename": upload_name, **(query_params or {})}

            # check that malefactor cannot use someone else's uploaded file
            url_to_steal = malefactor_client.api_map.make_endpoint_url(
                endpoint_path, kwsub=({"id": dst_resource_id} if dst_resource_id else None)
            )
            self._test_cannot_finish_upload(
                malefactor_client, url=url_to_steal, query_params=query_params
            )

            # check that uploaded file still exists and owner can finish started process
            self._test_can_finish_upload(owner_client, url=url, query_params=query_params)
