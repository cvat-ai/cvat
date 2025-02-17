# Copyright (C) 2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
import itertools
import json
import operator
import xml.etree.ElementTree as ET
import zipfile
from copy import deepcopy
from datetime import datetime
from http import HTTPStatus
from io import BytesIO
from itertools import product
from operator import itemgetter
from time import sleep
from typing import Optional, Union

import pytest
from cvat_sdk.api_client import ApiClient, Configuration, exceptions, models
from cvat_sdk.api_client.api_client import Endpoint
from cvat_sdk.api_client.exceptions import ForbiddenException
from cvat_sdk.core.helpers import get_paginated_collection
from deepdiff import DeepDiff
from PIL import Image

from shared.utils.config import (
    BASE_URL,
    USER_PASS,
    get_method,
    make_api_client,
    patch_method,
    post_method,
)
from shared.utils.helpers import generate_image_files

from .utils import (
    DATUMARO_FORMAT_FOR_DIMENSION,
    CollectionSimpleFilterTestBase,
    create_task,
    export_dataset,
    export_project_backup,
    export_project_dataset,
)


@pytest.mark.usefixtures("restore_db_per_class")
class TestGetProjects:
    def _find_project_by_user_org(self, user, projects, is_project_staff_flag, is_project_staff):
        for p in projects:
            if is_project_staff(user["id"], p["id"]) == is_project_staff_flag:
                return p["id"]

    def _test_response_200(self, username, project_id):
        with make_api_client(username) as api_client:
            (project, response) = api_client.projects_api.retrieve(project_id)
            assert response.status == HTTPStatus.OK
            assert project_id == project.id

    def _test_response_403(self, username, project_id):
        with make_api_client(username) as api_client:
            (_, response) = api_client.projects_api.retrieve(
                project_id, _parse_response=False, _check_status=False
            )
            assert response.status == HTTPStatus.FORBIDDEN

    # Admin can see any project even he has no ownerships for this project.
    def test_project_admin_accessibility(self, projects, find_users, is_project_staff, org_staff):
        users = find_users(privilege="admin")

        user, project = next(
            (user, project)
            for user, project in product(users, projects)
            if not is_project_staff(user["id"], project["organization"])
            and user["id"] not in org_staff(project["organization"])
        )
        self._test_response_200(user["username"], project["id"])

    # Project owner or project assignee can see project.
    def test_project_owner_accessibility(self, projects):
        for p in projects:
            if p["owner"] is not None:
                project_with_owner = p
            if p["assignee"] is not None:
                project_with_assignee = p

        assert project_with_owner is not None
        assert project_with_assignee is not None

        self._test_response_200(project_with_owner["owner"]["username"], project_with_owner["id"])
        self._test_response_200(
            project_with_assignee["assignee"]["username"], project_with_assignee["id"]
        )

    def test_user_cannot_see_project(self, projects, find_users, is_project_staff, org_staff):
        users = find_users(exclude_privilege="admin")

        user, project = next(
            (user, project)
            for user, project in product(users, projects)
            if not is_project_staff(user["id"], project["organization"])
            and user["id"] not in org_staff(project["organization"])
        )
        self._test_response_403(user["username"], project["id"])

    @pytest.mark.parametrize("role", ("supervisor", "worker"))
    def test_if_supervisor_or_worker_cannot_see_project(
        self, projects, is_project_staff, find_users, role
    ):
        user, pid = next(
            (
                (user, project["id"])
                for user in find_users(role=role, exclude_privilege="admin")
                for project in projects
                if project["organization"] == user["org"]
                and not is_project_staff(user["id"], project["id"])
            )
        )

        self._test_response_403(user["username"], pid)

    @pytest.mark.parametrize("role", ("maintainer", "owner"))
    def test_if_maintainer_or_owner_can_see_project(
        self, find_users, projects, is_project_staff, role
    ):
        user, pid = next(
            (
                (user, project["id"])
                for user in find_users(role=role, exclude_privilege="admin")
                for project in projects
                if project["organization"] == user["org"]
                and not is_project_staff(user["id"], project["id"])
            )
        )

        self._test_response_200(user["username"], pid)

    @pytest.mark.parametrize("role", ("supervisor", "worker"))
    def test_if_org_member_supervisor_or_worker_can_see_project(
        self, projects, find_users, is_project_staff, role
    ):
        user, pid = next(
            (
                (user, project["id"])
                for user in find_users(role=role, exclude_privilege="admin")
                for project in projects
                if project["organization"] == user["org"]
                and is_project_staff(user["id"], project["id"])
            )
        )

        self._test_response_200(user["username"], pid)

    def test_can_remove_owner_and_fetch_with_sdk(self, admin_user, projects):
        # test for API schema regressions
        source_project = next(
            p for p in projects if p.get("owner") and p["owner"]["username"] != admin_user
        ).copy()

        with make_api_client(admin_user) as api_client:
            api_client.users_api.destroy(source_project["owner"]["id"])

            (_, response) = api_client.projects_api.retrieve(source_project["id"])
            fetched_project = json.loads(response.data)

        source_project["owner"] = None
        assert DeepDiff(source_project, fetched_project, ignore_order=True) == {}


class TestProjectsListFilters(CollectionSimpleFilterTestBase):
    field_lookups = {
        "owner": ["owner", "username"],
        "assignee": ["assignee", "username"],
    }

    @pytest.fixture(autouse=True)
    def setup(self, restore_db_per_class, admin_user, projects):
        self.user = admin_user
        self.samples = projects

    def _get_endpoint(self, api_client: ApiClient) -> Endpoint:
        return api_client.projects_api.list_endpoint

    @pytest.mark.parametrize(
        "field",
        (
            "name",
            "owner",
            "assignee",
            "status",
        ),
    )
    def test_can_use_simple_filter_for_object_list(self, field):
        return super()._test_can_use_simple_filter_for_object_list(field)


class TestGetPostProjectBackup:

    @pytest.fixture(autouse=True)
    def setup(self, projects):
        self.projects = projects

    def _test_can_get_project_backup(
        self,
        username: str,
        pid: int,
        *,
        api_version: int,
        local_download: bool = True,
        **kwargs,
    ) -> Optional[bytes]:
        backup = export_project_backup(username, id=pid, api_version=api_version, **kwargs)
        if local_download:
            assert zipfile.is_zipfile(io.BytesIO(backup))
        else:
            assert backup is None
        return backup

    def _test_cannot_get_project_backup(
        self,
        username: str,
        pid: int,
        api_version: int,
        **kwargs,
    ):
        with pytest.raises(ForbiddenException):
            export_project_backup(username, api_version, id=pid, expect_forbidden=True, **kwargs)

    @pytest.mark.parametrize("api_version", (1, 2))
    def test_admin_can_get_project_backup(self, api_version: int):
        project = list(self.projects)[0]
        self._test_can_get_project_backup("admin1", project["id"], api_version=api_version)

    # User that not in [project:owner, project:assignee] cannot get project backup.
    @pytest.mark.parametrize("api_version", (1, 2))
    def test_user_cannot_get_project_backup(self, find_users, is_project_staff, api_version: int):
        users = find_users(exclude_privilege="admin")

        user, project = next(
            (user, project)
            for user, project in product(users, self.projects)
            if not is_project_staff(user["id"], project["id"])
        )

        self._test_cannot_get_project_backup(
            user["username"], project["id"], api_version=api_version
        )

    # Org worker that not in [project:owner, project:assignee] cannot get project backup.
    @pytest.mark.parametrize("api_version", (1, 2))
    def test_org_worker_cannot_get_project_backup(
        self, find_users, is_project_staff, is_org_member, api_version: int
    ):
        users = find_users(role="worker", exclude_privilege="admin")

        user, project = next(
            (user, project)
            for user, project in product(users, self.projects)
            if not is_project_staff(user["id"], project["id"])
            and project["organization"]
            and is_org_member(user["id"], project["organization"])
        )

        self._test_cannot_get_project_backup(
            user["username"], project["id"], api_version=api_version
        )

    # Org worker that in [project:owner, project:assignee] can get project backup.
    @pytest.mark.parametrize("api_version", (1, 2))
    def test_org_worker_can_get_project_backup(
        self,
        find_users,
        is_project_staff,
        is_org_member,
        api_version: int,
    ):
        users = find_users(role="worker", exclude_privilege="admin")

        user, project = next(
            (user, project)
            for user, project in product(users, self.projects)
            if is_project_staff(user["id"], project["id"])
            and project["organization"]
            and is_org_member(user["id"], project["organization"])
        )

        self._test_can_get_project_backup(user["username"], project["id"], api_version=api_version)

    # Org supervisor that in [project:owner, project:assignee] can get project backup.
    @pytest.mark.parametrize("api_version", (1, 2))
    def test_org_supervisor_can_get_project_backup(
        self, find_users, is_project_staff, is_org_member, api_version: int
    ):
        users = find_users(role="supervisor", exclude_privilege="admin")

        user, project = next(
            (user, project)
            for user, project in product(users, self.projects)
            if is_project_staff(user["id"], project["id"])
            and project["organization"]
            and is_org_member(user["id"], project["organization"])
        )

        self._test_can_get_project_backup(user["username"], project["id"], api_version=api_version)

    # Org supervisor that not in [project:owner, project:assignee] cannot get project backup.
    @pytest.mark.parametrize("api_version", (1, 2))
    def test_org_supervisor_cannot_get_project_backup(
        self,
        find_users,
        is_project_staff,
        is_org_member,
        api_version: int,
    ):
        users = find_users(exclude_privilege="admin")

        user, project = next(
            (user, project)
            for user, project in product(users, self.projects)
            if not is_project_staff(user["id"], project["id"])
            and project["organization"]
            and is_org_member(user["id"], project["organization"], role="supervisor")
        )

        self._test_cannot_get_project_backup(
            user["username"], project["id"], api_version=api_version
        )

    # Org maintainer that not in [project:owner, project:assignee] can get project backup.
    @pytest.mark.parametrize("api_version", (1, 2))
    def test_org_maintainer_can_get_project_backup(
        self,
        find_users,
        is_project_staff,
        is_org_member,
        api_version: int,
    ):
        users = find_users(role="maintainer", exclude_privilege="admin")

        user, project = next(
            (user, project)
            for user, project in product(users, self.projects)
            if not is_project_staff(user["id"], project["id"])
            and project["organization"]
            and is_org_member(user["id"], project["organization"])
        )

        self._test_can_get_project_backup(user["username"], project["id"], api_version=api_version)

    # Org owner that not in [project:owner, project:assignee] can get project backup.
    @pytest.mark.parametrize("api_version", (1, 2))
    def test_org_owner_can_get_project_backup(
        self, find_users, is_project_staff, is_org_member, api_version: int
    ):
        users = find_users(role="owner", exclude_privilege="admin")

        user, project = next(
            (user, project)
            for user, project in product(users, self.projects)
            if not is_project_staff(user["id"], project["id"])
            and project["organization"]
            and is_org_member(user["id"], project["organization"])
        )

        self._test_can_get_project_backup(user["username"], project["id"], api_version=api_version)

    @pytest.mark.parametrize("api_version", (1, 2))
    def test_can_get_backup_project_when_some_tasks_have_no_data(self, api_version: int):
        project = next((p for p in self.projects if 0 < p["tasks"]["count"]))

        # add empty task to project
        response = post_method(
            "admin1", "tasks", {"name": "empty_task", "project_id": project["id"]}
        )
        assert response.status_code == HTTPStatus.CREATED

        self._test_can_get_project_backup("admin1", project["id"], api_version=api_version)

    @pytest.mark.parametrize("api_version", (1, 2))
    def test_can_get_backup_project_when_all_tasks_have_no_data(
        self, api_version: int, filter_projects
    ):
        project = filter_projects(tasks__count=0)[0]

        # add empty tasks to empty project
        response = post_method(
            "admin1",
            "tasks",
            {"name": "empty_task1", "project_id": project["id"]},
            **({"org_id": project["organization"]} if project["organization"] else {}),
        )
        assert response.status_code == HTTPStatus.CREATED, response.text

        response = post_method(
            "admin1",
            "tasks",
            {"name": "empty_task2", "project_id": project["id"]},
            **({"org_id": project["organization"]} if project["organization"] else {}),
        )
        assert response.status_code == HTTPStatus.CREATED, response.text

        self._test_can_get_project_backup("admin1", project["id"], api_version=api_version)

    @pytest.mark.parametrize("api_version", (1, 2))
    def test_can_get_backup_for_empty_project(self, api_version: int):
        empty_project = next((p for p in self.projects if 0 == p["tasks"]["count"]))
        self._test_can_get_project_backup("admin1", empty_project["id"], api_version=api_version)

    @pytest.mark.parametrize("api_version", (1, 2))
    def test_admin_can_get_project_backup_and_create_project_by_backup(
        self, admin_user: str, api_version: int
    ):
        project_id = 5
        backup = self._test_can_get_project_backup(admin_user, project_id, api_version=api_version)

        tmp_file = io.BytesIO(backup)
        tmp_file.name = "dataset.zip"

        import_data = {
            "project_file": tmp_file,
        }

        with make_api_client(admin_user) as api_client:
            (_, response) = api_client.projects_api.create_backup(
                backup_write_request=deepcopy(import_data), _content_type="multipart/form-data"
            )
            assert response.status == HTTPStatus.ACCEPTED


@pytest.mark.usefixtures("restore_db_per_function")
class TestPostProjects:
    def _test_create_project_201(self, user, spec, **kwargs):
        with make_api_client(user) as api_client:
            (_, response) = api_client.projects_api.create(spec, **kwargs)
            assert response.status == HTTPStatus.CREATED

        return response

    def _test_create_project_403(self, user, spec, **kwargs):
        with make_api_client(user) as api_client:
            (_, response) = api_client.projects_api.create(
                spec, **kwargs, _parse_response=False, _check_status=False
            )
        assert response.status == HTTPStatus.FORBIDDEN

        return response

    def test_if_worker_cannot_create_project(self, find_users):
        workers = find_users(privilege="worker")
        assert len(workers)

        username = workers[0]["username"]
        spec = {"name": f"test {username} tries to create a project"}
        self._test_create_project_403(username, spec)

    @pytest.mark.parametrize("privilege", ("admin", "user"))
    def test_if_user_can_create_project(self, find_users, privilege):
        privileged_users = find_users(privilege=privilege)
        assert len(privileged_users)

        username = privileged_users[0]["username"]
        spec = {"name": f"test {username} tries to create a project"}
        self._test_create_project_201(username, spec)

    def test_if_org_worker_cannot_create_project(self, find_users):
        workers = find_users(role="worker")

        worker = next(u for u in workers if u["org"])

        spec = {
            "name": f'test: worker {worker["username"]} creating a project for his organization',
        }
        self._test_create_project_403(worker["username"], spec, org_id=worker["org"])

    @pytest.mark.parametrize("role", ("supervisor", "maintainer", "owner"))
    def test_if_org_role_can_create_project(self, role, admin_user):
        # We can hit org or user limits here, so we create a new org and users
        user = self._create_user(
            ApiClient(configuration=Configuration(BASE_URL)), email="test_org_roles@localhost"
        )

        if role != "owner":
            org = self._create_org(make_api_client(admin_user), members={user["email"]: role})
        else:
            org = self._create_org(make_api_client(user["username"]))

        spec = {
            "name": f'test: worker {user["username"]} creating a project for his organization',
        }
        self._test_create_project_201(user["username"], spec, org_id=org)

    @classmethod
    def _create_user(cls, api_client: ApiClient, email: str) -> str:
        username = email.split("@", maxsplit=1)[0]
        with api_client:
            (_, response) = api_client.auth_api.create_register(
                models.RegisterSerializerExRequest(
                    username=username, password1=USER_PASS, password2=USER_PASS, email=email
                )
            )

        api_client.cookies.clear()

        return json.loads(response.data)

    @classmethod
    def _create_org(cls, api_client: ApiClient, members: Optional[dict[str, str]] = None) -> str:
        with api_client:
            (_, response) = api_client.organizations_api.create(
                models.OrganizationWriteRequest(slug="test_org_roles"), _parse_response=False
            )
            org = json.loads(response.data)["id"]

            for email, role in (members or {}).items():
                api_client.invitations_api.create(
                    models.InvitationWriteRequest(role=role, email=email),
                    org_id=org,
                    _parse_response=False,
                )

        return org

    def test_cannot_create_project_with_same_labels(self, admin_user):
        project_spec = {
            "name": "test cannot create project with same labels",
            "labels": [{"name": "l1"}, {"name": "l1"}],
        }
        response = post_method(admin_user, "projects", project_spec)
        assert response.status_code == HTTPStatus.BAD_REQUEST

        response = get_method(admin_user, "projects")
        assert response.status_code == HTTPStatus.OK

    def test_cannot_create_project_with_same_skeleton_sublabels(self, admin_user):
        project_spec = {
            "name": "test cannot create project with same skeleton sublabels",
            "labels": [
                {"name": "s1", "type": "skeleton", "sublabels": [{"name": "1"}, {"name": "1"}]}
            ],
        }
        response = post_method(admin_user, "projects", project_spec)
        assert response.status_code == HTTPStatus.BAD_REQUEST

        response = get_method(admin_user, "projects")
        assert response.status_code == HTTPStatus.OK

    @pytest.mark.parametrize(
        "storage_id",
        [
            1,  # public bucket
            2,  # private bucket
        ],
    )
    @pytest.mark.parametrize("field", ["source_storage", "target_storage"])
    def test_user_cannot_create_project_with_cloud_storage_without_access(
        self, storage_id, field, regular_lonely_user
    ):
        user = regular_lonely_user

        project_spec = {
            "name": f"Project with foreign cloud storage {storage_id} settings",
            field: {
                "location": "cloud_storage",
                "cloud_storage_id": storage_id,
            },
        }

        response = post_method(user, "projects", project_spec)
        assert response.status_code == HTTPStatus.FORBIDDEN

    def test_create_response_matches_get(self, admin_user):
        username = admin_user

        spec = {"name": "test create project", "labels": [{"name": "a"}]}

        response = self._test_create_project_201(username, spec)
        project = json.loads(response.data)

        with make_api_client(username) as api_client:
            (_, response) = api_client.projects_api.retrieve(project["id"])
            assert DeepDiff(project, json.loads(response.data), ignore_order=True) == {}

    @pytest.mark.parametrize("assignee", [None, "admin1"])
    def test_can_create_with_assignee(self, admin_user, users_by_name, assignee):
        spec = {
            "name": "test project creation with assignee",
            "labels": [{"name": "car"}],
            "assignee_id": users_by_name[assignee]["id"] if assignee else None,
        }

        with make_api_client(admin_user) as api_client:
            (project, _) = api_client.projects_api.create(project_write_request=spec)

            if assignee:
                assert project.assignee.username == assignee
                assert project.assignee_updated_date
            else:
                assert project.assignee is None
                assert project.assignee_updated_date is None


def _check_cvat_for_video_project_annotations_meta(content, values_to_be_checked):
    document = ET.fromstring(content)
    instance = list(document.find("meta"))[0]
    assert instance.tag == "project"
    assert instance.find("id").text == values_to_be_checked["pid"]
    assert len(list(document.iter("task"))) == len(values_to_be_checked["tasks"])
    tasks = document.iter("task")
    for task_checking in values_to_be_checked["tasks"]:
        task_meta = next(tasks)
        assert task_meta.find("id").text == str(task_checking["id"])
        assert task_meta.find("name").text == task_checking["name"]
        assert task_meta.find("size").text == str(task_checking["size"])
        assert task_meta.find("mode").text == task_checking["mode"]
        assert task_meta.find("source").text


@pytest.mark.usefixtures("restore_db_per_function")
@pytest.mark.usefixtures("restore_redis_inmem_per_function")
@pytest.mark.usefixtures("restore_redis_ondisk_per_function")
class TestImportExportDatasetProject:

    @pytest.fixture(autouse=True)
    def setup(self, projects):
        self.projects = projects

    @staticmethod
    def _test_export_dataset(
        username: str,
        pid: int,
        *,
        api_version: Union[int, tuple[int]],
        local_download: bool = True,
        **kwargs,
    ) -> Optional[bytes]:
        dataset = export_project_dataset(username, api_version, save_images=True, id=pid, **kwargs)
        if local_download:
            assert zipfile.is_zipfile(io.BytesIO(dataset))
        else:
            assert dataset is None

        return dataset

    @staticmethod
    def _test_export_annotations(
        username: str, pid: int, *, api_version: int, local_download: bool = True, **kwargs
    ) -> Optional[bytes]:
        dataset = export_project_dataset(username, api_version, save_images=False, id=pid, **kwargs)
        if local_download:
            assert zipfile.is_zipfile(io.BytesIO(dataset))
        else:
            assert dataset is None

        return dataset

    def _test_import_project(self, username, project_id, format_name, data):
        with make_api_client(username) as api_client:
            (_, response) = api_client.projects_api.create_dataset(
                id=project_id,
                format=format_name,
                dataset_write_request=deepcopy(data),
                _content_type="multipart/form-data",
            )
            assert response.status == HTTPStatus.ACCEPTED
            rq_id = json.loads(response.data).get("rq_id")
            assert rq_id, "The rq_id was not found in the response"

            for _ in range(50):
                (background_request, response) = api_client.requests_api.retrieve(rq_id)
                assert response.status == HTTPStatus.OK
                if (
                    background_request.status.value
                    == models.RequestStatus.allowed_values[("value",)]["FINISHED"]
                ):
                    break
                sleep(0.1)
            else:
                assert (
                    False
                ), f"Import process was not finished, last status: {background_request.status.value}"

    def _test_get_annotations_from_task(self, username, task_id):
        with make_api_client(username) as api_client:
            (_, response) = api_client.tasks_api.retrieve_annotations(task_id)
            assert response.status == HTTPStatus.OK

            response_data = json.loads(response.data)
        return response_data

    def test_can_import_dataset_in_org(self, admin_user: str):
        project_id = 4

        dataset = self._test_export_dataset(
            admin_user,
            project_id,
            api_version=2,
        )

        tmp_file = io.BytesIO(dataset)
        tmp_file.name = "dataset.zip"

        import_data = {
            "dataset_file": tmp_file,
        }

        self._test_import_project(admin_user, project_id, "CVAT 1.1", import_data)

    @pytest.mark.parametrize(
        "export_format, import_format",
        (
            ("COCO Keypoints 1.0", "COCO Keypoints 1.0"),
            ("CVAT for images 1.1", "CVAT 1.1"),
            ("CVAT for video 1.1", "CVAT 1.1"),
            ("Datumaro 1.0", "Datumaro 1.0"),
            ("Ultralytics YOLO Pose 1.0", "Ultralytics YOLO Pose 1.0"),
        ),
    )
    def test_can_export_and_import_dataset_with_skeletons(
        self, annotations, tasks, admin_user, export_format, import_format
    ):
        tasks_with_skeletons = [
            int(task_id)
            for task_id in annotations["task"]
            for element in annotations["task"][task_id]["shapes"]
            if element["type"] == "skeleton"
        ]
        for task in tasks:
            if task["id"] in tasks_with_skeletons and task["project_id"] is not None:
                project_id = task["project_id"]
                project = next(p for p in self.projects if p["id"] == project_id)
                if (project["target_storage"] or {}).get("location") == "local":
                    break
        else:
            assert False, "Can't find suitable project"

        dataset = self._test_export_dataset(
            admin_user,
            project_id,
            api_version=2,
            format=export_format,
        )

        tmp_file = io.BytesIO(dataset)
        tmp_file.name = "dataset.zip"
        import_data = {
            "dataset_file": tmp_file,
        }

        self._test_import_project(admin_user, project_id, import_format, import_data)

    @pytest.mark.parametrize("api_version", (1, 2))
    @pytest.mark.parametrize("format_name", ("Datumaro 1.0", "ImageNet 1.0", "PASCAL VOC 1.1"))
    def test_can_import_export_dataset_with_some_format(self, format_name: str, api_version: int):
        # https://github.com/cvat-ai/cvat/issues/4410
        # https://github.com/cvat-ai/cvat/issues/4850
        # https://github.com/cvat-ai/cvat/issues/4621
        username = "admin1"
        project_id = 4

        dataset = self._test_export_dataset(
            username,
            project_id,
            api_version=api_version,
            format=format_name,
        )

        tmp_file = io.BytesIO(dataset)
        tmp_file.name = "dataset.zip"

        import_data = {
            "dataset_file": tmp_file,
        }

        self._test_import_project(username, project_id, format_name, import_data)

    @pytest.mark.parametrize("api_version", product((1, 2), repeat=2))
    @pytest.mark.parametrize(
        "local_download", (True, pytest.param(False, marks=pytest.mark.with_external_services))
    )
    def test_can_export_dataset_locally_and_to_cloud_with_both_api_versions(
        self, admin_user: str, filter_projects, api_version: tuple[int], local_download: bool
    ):
        filter_ = "target_storage__location"
        if local_download:
            filter_ = "exclude_" + filter_

        pid = filter_projects(**{filter_: "cloud_storage"})[0]["id"]

        self._test_export_dataset(
            admin_user,
            pid,
            api_version=api_version,
            local_download=local_download,
        )

    @pytest.mark.parametrize("api_version", (1, 2))
    @pytest.mark.parametrize("username, pid", [("admin1", 8)])
    @pytest.mark.parametrize(
        "anno_format, anno_file_name, check_func",
        [
            (
                "CVAT for video 1.1",
                "annotations.xml",
                _check_cvat_for_video_project_annotations_meta,
            ),
        ],
    )
    def test_exported_project_dataset_structure(
        self,
        username,
        pid,
        anno_format,
        anno_file_name,
        check_func,
        tasks,
        api_version: int,
    ):
        project = self.projects[pid]

        values_to_be_checked = {
            "pid": str(pid),
            "name": project["name"],
            "tasks": [
                {
                    "id": task["id"],
                    "name": task["name"],
                    "size": str(task["size"]),
                    "mode": task["mode"],
                }
                for task in tasks
                if task["project_id"] == project["id"]
            ],
        }

        dataset = self._test_export_annotations(
            username,
            pid,
            api_version=api_version,
            format=anno_format,
        )

        with zipfile.ZipFile(BytesIO(dataset)) as zip_file:
            content = zip_file.read(anno_file_name)
        check_func(content, values_to_be_checked)

    @pytest.mark.parametrize("api_version", (1, 2))
    def test_can_import_export_annotations_with_rotation(self, api_version: int):
        # https://github.com/cvat-ai/cvat/issues/4378
        username = "admin1"
        project_id = 4

        dataset = self._test_export_dataset(
            username,
            project_id,
            api_version=api_version,
        )

        tmp_file = io.BytesIO(dataset)
        tmp_file.name = "dataset.zip"

        import_data = {
            "dataset_file": tmp_file,
        }

        self._test_import_project(username, project_id, "CVAT 1.1", import_data)

        response = get_method(username, f"tasks", project_id=project_id)
        assert response.status_code == HTTPStatus.OK
        tasks = response.json()["results"]

        response_data = self._test_get_annotations_from_task(username, tasks[0]["id"])
        task1_rotation = response_data["shapes"][0]["rotation"]
        response_data = self._test_get_annotations_from_task(username, tasks[1]["id"])
        task2_rotation = response_data["shapes"][0]["rotation"]

        assert task1_rotation == task2_rotation

    @pytest.mark.parametrize("api_version", (1, 2))
    def test_can_export_dataset_with_skeleton_labels_with_spaces(self, api_version: int):
        # https://github.com/cvat-ai/cvat/issues/5257
        # https://github.com/cvat-ai/cvat/issues/5600
        username = "admin1"
        project_id = 11

        self._test_export_dataset(
            username,
            project_id,
            api_version=api_version,
            format="COCO Keypoints 1.0",
        )

    @pytest.mark.parametrize("api_version", (1, 2))
    def test_can_export_dataset_for_empty_project(self, filter_projects, api_version: int):
        empty_project = filter_projects(
            tasks__count=0, exclude_target_storage__location="cloud_storage"
        )[0]
        self._test_export_dataset(
            "admin1",
            empty_project["id"],
            api_version=api_version,
            format="COCO 1.0",
        )

    @pytest.mark.parametrize("api_version", (1, 2))
    def test_can_export_project_dataset_when_some_tasks_have_no_data(
        self, filter_projects, api_version: int
    ):
        project = filter_projects(
            exclude_tasks__count=0, exclude_target_storage__location="cloud_storage"
        )[0]

        # add empty task to project
        response = post_method(
            "admin1",
            "tasks",
            {
                "name": "empty_task",
                "project_id": project["id"],
            },
            **({"org_id": project["organization"]} if project["organization"] else {}),
        )
        assert response.status_code == HTTPStatus.CREATED

        self._test_export_dataset(
            "admin1",
            project["id"],
            api_version=api_version,
            format="COCO 1.0",
        )

    @pytest.mark.parametrize("api_version", (1, 2))
    def test_can_export_project_dataset_when_all_tasks_have_no_data(
        self, filter_projects, api_version: int
    ):
        project = filter_projects(tasks__count=0, exclude_target_storage__location="cloud_storage")[
            0
        ]

        # add empty tasks to empty project
        response = post_method(
            "admin1",
            "tasks",
            {"name": "empty_task1", "project_id": project["id"]},
            **({"org_id": project["organization"]} if project["organization"] else {}),
        )
        assert response.status_code == HTTPStatus.CREATED, response.text

        response = post_method(
            "admin1",
            "tasks",
            {"name": "empty_task2", "project_id": project["id"]},
            **({"org_id": project["organization"]} if project["organization"] else {}),
        )
        assert response.status_code == HTTPStatus.CREATED, response.text

        self._test_export_dataset(
            "admin1",
            project["id"],
            api_version=api_version,
            format="COCO 1.0",
        )

    @pytest.mark.parametrize("api_version", (1, 2))
    @pytest.mark.parametrize("cloud_storage_id", [3])  # import/export bucket
    def test_can_export_and_import_dataset_after_deleting_related_storage(
        self, admin_user, cloud_storage_id: int, api_version: int
    ):
        project_id = next(
            p
            for p in self.projects
            if p["source_storage"]
            and p["source_storage"]["cloud_storage_id"] == cloud_storage_id
            and p["target_storage"]
            and p["target_storage"]["cloud_storage_id"] == cloud_storage_id
        )["id"]

        with make_api_client(admin_user) as api_client:
            _, response = api_client.cloudstorages_api.destroy(cloud_storage_id)
            assert response.status == HTTPStatus.NO_CONTENT

        result, response = api_client.projects_api.retrieve(project_id)
        assert all([not getattr(result, field) for field in ("source_storage", "target_storage")])

        dataset = self._test_export_dataset(admin_user, project_id, api_version=api_version)

        with io.BytesIO(dataset) as tmp_file:
            tmp_file.name = "dataset.zip"
            import_data = {
                "dataset_file": tmp_file,
            }

            self._test_import_project(admin_user, project_id, "CVAT 1.1", import_data)

    @pytest.mark.parametrize(
        "dimension, format_name",
        [
            *DATUMARO_FORMAT_FOR_DIMENSION.items(),
            ("2d", "CVAT 1.1"),
            ("3d", "CVAT 1.1"),
            ("2d", "COCO 1.0"),
        ],
    )
    def test_cant_import_annotations_as_project(self, admin_user, tasks, format_name, dimension):
        task = next(t for t in tasks if t.get("size") if t["dimension"] == dimension)

        def _export_task(task_id: int, format_name: str) -> io.BytesIO:
            with make_api_client(admin_user) as api_client:
                return io.BytesIO(
                    export_dataset(
                        api_client.tasks_api,
                        api_version=2,
                        id=task_id,
                        format=format_name,
                        save_images=False,
                    )
                )

        if format_name in list(DATUMARO_FORMAT_FOR_DIMENSION.values()):
            with zipfile.ZipFile(_export_task(task["id"], format_name)) as zip_file:
                annotations = zip_file.read("annotations/default.json")

            dataset_file = io.BytesIO(annotations)
            dataset_file.name = "annotations.json"
        elif format_name == "CVAT 1.1":
            with zipfile.ZipFile(_export_task(task["id"], "CVAT for images 1.1")) as zip_file:
                annotations = zip_file.read("annotations.xml")

            dataset_file = io.BytesIO(annotations)
            dataset_file.name = "annotations.xml"
        elif format_name == "COCO 1.0":
            with zipfile.ZipFile(_export_task(task["id"], format_name)) as zip_file:
                annotations = zip_file.read("annotations/instances_default.json")

            dataset_file = io.BytesIO(annotations)
            dataset_file.name = "annotations.json"
        else:
            assert False

        with make_api_client(admin_user) as api_client:
            project, _ = api_client.projects_api.create(
                project_write_request=models.ProjectWriteRequest(
                    name=f"test_annotations_import_as_project {format_name}"
                )
            )

            import_data = {"dataset_file": dataset_file}

            with pytest.raises(exceptions.ApiException, match="Dataset file should be zip archive"):
                self._test_import_project(
                    admin_user,
                    project.id,
                    format_name=format_name,
                    data=import_data,
                )

    @pytest.mark.parametrize(
        "export_format, subset_path_template",
        [
            ("COCO 1.0", "images/{subset}/"),
            ("COCO Keypoints 1.0", "images/{subset}/"),
            ("CVAT for images 1.1", "images/{subset}/"),
            ("CVAT for video 1.1", "images/{subset}/"),
            ("Datumaro 1.0", "images/{subset}/"),
            ("Datumaro 3D 1.0", "point_clouds/{subset}/"),
            ("LabelMe 3.0", "{subset}/"),
            ("MOTS PNG 1.0", "{subset}/images/"),
            ("YOLO 1.1", "obj_{subset}_data/"),
            ("CamVid 1.0", "{subset}/"),
            ("WiderFace 1.0", "WIDER_{subset}/images/"),
            ("VGGFace2 1.0", "{subset}/"),
            ("Market-1501 1.0", "bounding_box_{subset}/"),
            ("ICDAR Recognition 1.0", "{subset}/images/"),
            ("ICDAR Localization 1.0", "{subset}/images/"),
            ("ICDAR Segmentation 1.0", "{subset}/images/"),
            ("KITTI 1.0", "{subset}/image_2/"),
            ("LFW 1.0", "{subset}/images/"),
            ("Cityscapes 1.0", "imgsFine/leftImg8bit/{subset}/"),
            ("Open Images V6 1.0", "images/{subset}/"),
            ("Ultralytics YOLO Detection 1.0", "images/{subset}/"),
            ("Ultralytics YOLO Oriented Bounding Boxes 1.0", "images/{subset}/"),
            ("Ultralytics YOLO Segmentation 1.0", "images/{subset}/"),
            ("Ultralytics YOLO Pose 1.0", "images/{subset}/"),
        ],
    )
    @pytest.mark.parametrize("api_version", (1, 2))
    def test_creates_subfolders_for_subsets_on_export(
        self, filter_tasks, admin_user, export_format, subset_path_template, api_version: int
    ):
        group_key_func = itemgetter("project_id")
        subsets = ["Train", "Validation"]
        tasks = filter_tasks(exclude_target_storage__location="cloud_storage")
        project_id = next(
            project_id
            for project_id, group in itertools.groupby(
                sorted(filter(group_key_func, tasks), key=group_key_func),
                key=group_key_func,
            )
            if sorted(task["subset"] for task in group) == subsets
        )
        dataset = self._test_export_dataset(
            admin_user, project_id, api_version=api_version, format=export_format
        )
        with zipfile.ZipFile(io.BytesIO(dataset)) as zip_file:
            for subset in subsets:
                folder_prefix = subset_path_template.format(subset=subset)
                assert (
                    len([f for f in zip_file.namelist() if f.startswith(folder_prefix)]) > 0
                ), f"No {folder_prefix} in {zip_file.namelist()}"

    def test_export_project_with_honeypots(self, admin_user: str):
        project_spec = {
            "name": "Project with honeypots",
            "labels": [{"name": "cat"}],
        }

        with make_api_client(admin_user) as api_client:
            project, _ = api_client.projects_api.create(project_spec)

        image_files = generate_image_files(3)
        image_names = [i.name for i in image_files]

        task_params = {
            "name": "Task with honeypots",
            "segment_size": 1,
            "project_id": project.id,
        }

        data_params = {
            "image_quality": 70,
            "client_files": image_files,
            "sorting_method": "random",
            "validation_params": {
                "mode": "gt_pool",
                "frame_selection_method": "manual",
                "frames_per_job_count": 1,
                "frames": [image_files[-1].name],
            },
        }

        create_task(admin_user, spec=task_params, data=data_params)

        dataset = export_project_dataset(
            admin_user, api_version=2, save_images=True, id=project.id, format="COCO 1.0"
        )

        with zipfile.ZipFile(io.BytesIO(dataset)) as zip_file:
            subset_path = "images/default"
            assert (
                sorted(
                    [
                        f[len(subset_path) + 1 :]
                        for f in zip_file.namelist()
                        if f.startswith(subset_path)
                    ]
                )
                == image_names
            )
            with zip_file.open("annotations/instances_default.json") as anno_file:
                annotations = json.load(anno_file)
                assert sorted([a["file_name"] for a in annotations["images"]]) == image_names


@pytest.mark.usefixtures("restore_db_per_function")
class TestPatchProjectLabel:
    def _get_project_labels(self, pid, user, **kwargs) -> list[models.Label]:
        kwargs.setdefault("return_json", True)
        with make_api_client(user) as api_client:
            return get_paginated_collection(
                api_client.labels_api.list_endpoint, project_id=pid, **kwargs
            )

    def test_can_delete_label(self, projects_wlc, labels, admin_user):
        project = [p for p in projects_wlc if p["labels"]["count"] > 0][0]
        label = deepcopy([l for l in labels if l.get("project_id") == project["id"]][0])
        label_payload = {"id": label["id"], "deleted": True}

        prev_lc = get_method(admin_user, "labels", project_id=project["id"]).json()["count"]
        response = patch_method(
            admin_user, f'projects/{project["id"]}', {"labels": [label_payload]}
        )
        curr_lc = get_method(admin_user, "labels", project_id=project["id"]).json()["count"]
        assert response.status_code == HTTPStatus.OK, response.content
        assert curr_lc == prev_lc - 1

    def test_can_delete_skeleton_label(self, projects, labels, admin_user):
        project = next(
            p
            for p in projects
            if any(
                label
                for label in labels
                if label.get("project_id") == p["id"]
                if label["type"] == "skeleton"
            )
        )
        project_labels = deepcopy([l for l in labels if l.get("project_id") == project["id"]])
        label = next(l for l in project_labels if l["type"] == "skeleton")
        project_labels.remove(label)
        label_payload = {"id": label["id"], "deleted": True}

        prev_lc = get_method(admin_user, "labels", project_id=project["id"]).json()["count"]
        response = patch_method(
            admin_user, f'projects/{project["id"]}', {"labels": [label_payload]}
        )
        curr_lc = get_method(admin_user, "labels", project_id=project["id"]).json()["count"]
        assert response.status_code == HTTPStatus.OK
        assert curr_lc == prev_lc - 1

        resulting_labels = self._get_project_labels(project["id"], admin_user)
        assert DeepDiff(resulting_labels, project_labels, ignore_order=True) == {}

    def test_can_rename_label(self, projects_wlc, labels, admin_user):
        project = [p for p in projects_wlc if p["labels"]["count"] > 0][0]
        project_labels = deepcopy([l for l in labels if l.get("project_id") == project["id"]])
        project_labels[0].update({"name": "new name"})

        response = patch_method(
            admin_user, f'projects/{project["id"]}', {"labels": [project_labels[0]]}
        )
        assert response.status_code == HTTPStatus.OK

        resulting_labels = self._get_project_labels(project["id"], admin_user)
        assert DeepDiff(resulting_labels, project_labels, ignore_order=True) == {}

    def test_cannot_rename_label_to_duplicate_name(self, projects_wlc, labels, admin_user):
        project = [p for p in projects_wlc if p["labels"]["count"] > 1][0]
        project_labels = deepcopy([l for l in labels if l.get("project_id") == project["id"]])
        project_labels[0].update({"name": project_labels[1]["name"]})

        label_payload = {"id": project_labels[0]["id"], "name": project_labels[0]["name"]}

        response = patch_method(
            admin_user, f'projects/{project["id"]}', {"labels": [label_payload]}
        )
        assert response.status_code == HTTPStatus.BAD_REQUEST
        assert "All label names must be unique" in response.text

    def test_cannot_add_foreign_label(self, projects, labels, admin_user):
        project = list(projects)[0]
        new_label = deepcopy([l for l in labels if l.get("project_id") != project["id"]][0])

        response = patch_method(admin_user, f'projects/{project["id"]}', {"labels": [new_label]})
        assert response.status_code == HTTPStatus.NOT_FOUND
        assert f"Not found label with id #{new_label['id']} to change" in response.text

    def test_admin_can_add_label(self, projects, admin_user):
        project = list(projects)[0]
        new_label = {"name": "new name"}

        prev_lc = get_method(admin_user, "labels", project_id=project["id"]).json()["count"]
        response = patch_method(admin_user, f'projects/{project["id"]}', {"labels": [new_label]})
        curr_lc = get_method(admin_user, "labels", project_id=project["id"]).json()["count"]
        assert response.status_code == HTTPStatus.OK
        assert curr_lc == prev_lc + 1

    @pytest.mark.parametrize("role", ["maintainer", "owner"])
    def test_non_project_staff_privileged_org_members_can_add_label(
        self,
        find_users,
        projects,
        is_project_staff,
        is_org_member,
        role,
    ):
        users = find_users(role=role, exclude_privilege="admin")

        user, project = next(
            (user, project)
            for user, project in product(users, projects)
            if not is_project_staff(user["id"], project["id"])
            and project["organization"]
            and is_org_member(user["id"], project["organization"])
        )

        prev_lc = get_method(user["username"], "labels", project_id=project["id"]).json()["count"]
        new_label = {"name": "new name"}
        response = patch_method(
            user["username"],
            f'projects/{project["id"]}',
            {"labels": [new_label]},
        )
        curr_lc = get_method(user["username"], "labels", project_id=project["id"]).json()["count"]
        assert response.status_code == HTTPStatus.OK
        assert curr_lc == prev_lc + 1

    @pytest.mark.parametrize("role", ["supervisor", "worker"])
    def test_non_project_staff_org_members_cannot_add_label(
        self,
        find_users,
        projects,
        is_project_staff,
        is_org_member,
        role,
    ):
        users = find_users(exclude_privilege="admin")

        user, project = next(
            (user, project)
            for user, project in product(users, projects)
            if not is_project_staff(user["id"], project["id"])
            and project["organization"]
            and is_org_member(user["id"], project["organization"], role=role)
        )

        new_label = {"name": "new name"}
        response = patch_method(
            user["username"],
            f'projects/{project["id"]}',
            {"labels": [new_label]},
        )
        assert response.status_code == HTTPStatus.FORBIDDEN

    # TODO: add supervisor too, but this leads to a test-side problem with DB restoring
    @pytest.mark.parametrize("role", ["worker"])
    def test_project_staff_org_members_can_add_label(
        self, find_users, projects, is_project_staff, is_org_member, labels, role
    ):
        users = find_users(exclude_privilege="admin")

        user, project = next(
            (user, project)
            for user, project in product(users, projects)
            if is_project_staff(user["id"], project["id"])
            and project["organization"]
            and is_org_member(user["id"], project["organization"], role=role)
            and any(label.get("project_id") == project["id"] for label in labels)
        )

        prev_lc = get_method(user["username"], "labels", project_id=project["id"]).json()["count"]
        new_label = {"name": "new name"}
        response = patch_method(
            user["username"],
            f'projects/{project["id"]}',
            {"labels": [new_label]},
        )
        curr_lc = get_method(user["username"], "labels", project_id=project["id"]).json()["count"]
        assert response.status_code == HTTPStatus.OK
        assert curr_lc == prev_lc + 1

    def test_admin_can_add_skeleton(self, projects, admin_user):
        project = list(projects)[0]
        new_skeleton = {
            "name": "skeleton1",
            "type": "skeleton",
            "sublabels": [
                {
                    "name": "1",
                    "type": "points",
                }
            ],
            "svg": '<circle r="1.5" stroke="black" fill="#b3b3b3" cx="48.794559478759766" '
            'cy="36.98698806762695" stroke-width="0.1" data-type="element node" '
            'data-element-id="1" data-node-id="1" data-label-name="597501"></circle>',
        }

        prev_lc = get_method(admin_user, "labels", project_id=project["id"]).json()["count"]
        response = patch_method(admin_user, f'projects/{project["id"]}', {"labels": [new_skeleton]})
        curr_lc = get_method(admin_user, "labels", project_id=project["id"]).json()["count"]
        assert response.status_code == HTTPStatus.OK
        assert curr_lc == prev_lc + 1


@pytest.mark.usefixtures("restore_db_per_class")
class TestGetProjectPreview:
    def _test_response_200(self, username, project_id, **kwargs):
        with make_api_client(username) as api_client:
            (_, response) = api_client.projects_api.retrieve_preview(project_id, **kwargs)

            assert response.status == HTTPStatus.OK
            (width, height) = Image.open(BytesIO(response.data)).size
            assert width > 0 and height > 0

    def _test_response_403(self, username, project_id):
        with make_api_client(username) as api_client:
            (_, response) = api_client.projects_api.retrieve_preview(
                project_id, _parse_response=False, _check_status=False
            )
            assert response.status == HTTPStatus.FORBIDDEN

    def _test_response_404(self, username, project_id):
        with make_api_client(username) as api_client:
            (_, response) = api_client.projects_api.retrieve_preview(
                project_id, _parse_response=False, _check_status=False
            )
            assert response.status == HTTPStatus.NOT_FOUND

    # Admin can see any project preview even he has no ownerships for this project.
    def test_project_preview_admin_accessibility(
        self, projects, find_users, is_project_staff, org_staff
    ):
        users = find_users(privilege="admin")

        user, project = next(
            (user, project)
            for user, project in product(users, projects)
            if not is_project_staff(user["id"], project["organization"])
            and user["id"] not in org_staff(project["organization"])
            and project["tasks"]["count"] > 0
        )
        self._test_response_200(user["username"], project["id"])

    # Project owner or project assignee can see project preview.
    def test_project_preview_owner_accessibility(self, projects):
        for p in projects:
            if not p["tasks"]:
                continue
            if p["owner"] is not None:
                project_with_owner = p
            if p["assignee"] is not None:
                project_with_assignee = p

        assert project_with_owner is not None
        assert project_with_assignee is not None

        self._test_response_200(project_with_owner["owner"]["username"], project_with_owner["id"])
        self._test_response_200(
            project_with_assignee["assignee"]["username"], project_with_assignee["id"]
        )

    def test_project_preview_not_found(self, projects, tasks):
        for p in projects:
            if any(t["project_id"] == p["id"] for t in tasks):
                continue
            if p["owner"] is not None:
                project_with_owner = p
            if p["assignee"] is not None:
                project_with_assignee = p

        assert project_with_owner is not None
        assert project_with_assignee is not None

        self._test_response_404(project_with_owner["owner"]["username"], project_with_owner["id"])
        self._test_response_404(
            project_with_assignee["assignee"]["username"], project_with_assignee["id"]
        )

    def test_user_cannot_see_project_preview(
        self, projects, find_users, is_project_staff, org_staff
    ):
        users = find_users(exclude_privilege="admin")

        user, project = next(
            (user, project)
            for user, project in product(users, projects)
            if not is_project_staff(user["id"], project["organization"])
            and user["id"] not in org_staff(project["organization"])
        )
        self._test_response_403(user["username"], project["id"])

    @pytest.mark.parametrize("role", ("supervisor", "worker"))
    def test_if_supervisor_or_worker_cannot_see_project_preview(
        self, projects, is_project_staff, find_users, role
    ):
        user, pid = next(
            (
                (user, project["id"])
                for user in find_users(role=role, exclude_privilege="admin")
                for project in projects
                if project["organization"] == user["org"]
                and not is_project_staff(user["id"], project["id"])
            )
        )

        self._test_response_403(user["username"], pid)

    @pytest.mark.parametrize("role", ("maintainer", "owner"))
    def test_if_maintainer_or_owner_can_see_project_preview(
        self, find_users, projects, is_project_staff, role
    ):
        user, pid = next(
            (
                (user, project["id"])
                for user in find_users(role=role, exclude_privilege="admin")
                for project in projects
                if project["organization"] == user["org"]
                and not is_project_staff(user["id"], project["id"])
                and project["tasks"]["count"] > 0
            )
        )

        self._test_response_200(user["username"], pid)


@pytest.mark.usefixtures("restore_db_per_function")
class TestPatchProject:
    @pytest.mark.parametrize(
        "storage_id",
        [
            1,  # public bucket
            2,  # private bucket
        ],
    )
    @pytest.mark.parametrize("field", ["source_storage", "target_storage"])
    def test_user_cannot_update_project_with_cloud_storage_without_access(
        self, storage_id, field, regular_lonely_user
    ):
        user = regular_lonely_user

        project_spec = {
            "name": f"Project with foreign cloud storage {storage_id} settings",
        }
        response = post_method(user, "projects", project_spec)

        updated_fields = {
            field: {
                "location": "cloud_storage",
                "cloud_storage_id": storage_id,
            }
        }
        project_id = response.json()["id"]

        response = patch_method(user, f"projects/{project_id}", updated_fields)
        assert response.status_code == HTTPStatus.FORBIDDEN

    @pytest.mark.parametrize("has_old_assignee", [False, True])
    @pytest.mark.parametrize("new_assignee", [None, "same", "different"])
    def test_can_update_assignee_updated_date_on_assignee_updates(
        self, admin_user, projects, users, has_old_assignee, new_assignee
    ):
        project = next(p for p in projects if bool(p.get("assignee")) == has_old_assignee)

        old_assignee_id = (project.get("assignee") or {}).get("id")

        new_assignee_id = None
        if new_assignee == "same":
            new_assignee_id = old_assignee_id
        elif new_assignee == "different":
            new_assignee_id = next(u for u in users if u["id"] != old_assignee_id)["id"]

        with make_api_client(admin_user) as api_client:
            (updated_project, _) = api_client.projects_api.partial_update(
                project["id"], patched_project_write_request={"assignee_id": new_assignee_id}
            )

            op = operator.eq if new_assignee_id == old_assignee_id else operator.ne

            # FUTURE-TODO: currently it is possible to have a project with an assignee but with assignee_updated_date == None
            # because there was no migration to set some assignee_updated_date for projects/tasks/jobs with assignee != None
            if isinstance(updated_project.assignee_updated_date, datetime):
                assert op(
                    str(updated_project.assignee_updated_date.isoformat()).replace("+00:00", "Z"),
                    project["assignee_updated_date"],
                )
            else:
                assert op(updated_project.assignee_updated_date, project["assignee_updated_date"])

            if new_assignee_id:
                assert updated_project.assignee.id == new_assignee_id
            else:
                assert updated_project.assignee is None

    def test_malefactor_cannot_obtain_project_details_via_empty_partial_update_request(
        self, regular_lonely_user, projects
    ):
        project = next(iter(projects))

        with make_api_client(regular_lonely_user) as api_client:
            with pytest.raises(ForbiddenException):
                api_client.projects_api.partial_update(project["id"])

    @staticmethod
    def _test_patch_linked_storage(
        user: str, project_id: int, *, expected_status: HTTPStatus = HTTPStatus.OK
    ) -> None:
        with make_api_client(user) as api_client:
            for associated_storage in ("source_storage", "target_storage"):
                patch_data = {
                    associated_storage: {
                        "location": "local",
                    }
                }
                (_, response) = api_client.projects_api.partial_update(
                    project_id,
                    patched_project_write_request=patch_data,
                    _check_status=False,
                    _parse_response=False,
                )
                assert response.status == expected_status, response.status

    @pytest.mark.parametrize(
        "is_project_assignee", [True, False]
    )  # being a project assignee must not change anything
    @pytest.mark.parametrize(
        "role, is_allow",
        [
            ("owner", True),
            ("maintainer", True),
            ("supervisor", False),
            ("worker", False),
        ],
    )
    def test_org_update_project_associated_storage(
        self,
        is_project_assignee: bool,
        role: str,
        is_allow: bool,
        projects,
        find_users,
    ):
        project_id: Optional[int] = None
        username: Optional[str] = None

        for project in projects:
            if project_id is not None:
                break
            for user in find_users(role=role, exclude_privilege="admin"):
                is_user_project_assignee = (project["assignee"] or {}).get("id") == user["id"]
                if (
                    project["organization"] == user["org"]
                    and project["owner"]["id"] != user["id"]
                    and (
                        is_project_assignee
                        and is_user_project_assignee
                        or not (is_project_assignee or is_user_project_assignee)
                    )
                ):
                    project_id = project["id"]
                    username = user["username"]
                    break

        assert project_id is not None

        self._test_patch_linked_storage(
            username,
            project_id,
            expected_status=HTTPStatus.OK if is_allow else HTTPStatus.FORBIDDEN,
        )

    @pytest.mark.parametrize(
        "is_owner, is_assignee, is_allow",
        [
            (True, False, True),
            (False, True, False),
            (False, False, False),
        ],
    )
    def test_sandbox_update_project_associated_storage(
        self,
        is_owner: bool,
        is_assignee: str,
        is_allow: bool,
        find_users,
        filter_projects,
    ):
        username: Optional[str] = None
        project_id: Optional[int] = None

        projects = filter_projects(organization=None)
        users = find_users(exclude_privilege="admin")

        for project in projects:
            if project_id is not None:
                break
            for user in users:
                is_user_project_owner = project["owner"]["id"] == user["id"]
                is_user_project_assignee = (project["assignee"] or {}).get("id") == user["id"]

                if (
                    (is_owner and is_user_project_owner)
                    or (is_assignee and not is_user_project_owner and is_user_project_assignee)
                    or not any(
                        [is_owner, is_assignee, is_user_project_owner, is_user_project_assignee]
                    )
                ):
                    project_id = project["id"]
                    username = user["username"]
                    break

        assert project_id is not None

        self._test_patch_linked_storage(
            username,
            project_id,
            expected_status=HTTPStatus.OK if is_allow else HTTPStatus.FORBIDDEN,
        )
