# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
from contextlib import ExitStack
from functools import partial
from http import HTTPStatus
from pathlib import Path
from time import sleep
from typing import Optional, Sequence
from uuid import uuid4

import boto3
import pytest
from cvat_sdk import Client, exceptions
from cvat_sdk.api_client import ApiClient, apis, models
from cvat_sdk.core.client import Config
from cvat_sdk.core.proxies.tasks import ResourceType

from shared.utils.config import (
    BASE_URL,
    MINIO_ENDPOINT_URL,
    MINIO_KEY,
    MINIO_SECRET_KEY,
    USER_PASS,
    post_method,
)
from shared.utils.helpers import generate_image_file


@pytest.fixture
def fxt_image_file(tmp_path: Path):
    img_path = tmp_path / "img.png"
    with img_path.open("wb") as f:
        f.write(generate_image_file(filename=str(img_path), size=(5, 10)).getvalue())

    return img_path


def get_common_storage_params():
    return {
        "provider_type": "AWS_S3_BUCKET",
        "credentials_type": "KEY_SECRET_KEY_PAIR",
        "key": "minio_access_key",
        "secret_key": "minio_secret_key",
        "specific_attributes": "endpoint_url=http://minio:9000",
    }


def define_s3_client():
    s3 = boto3.resource(
        "s3",
        aws_access_key_id=MINIO_KEY,
        aws_secret_access_key=MINIO_SECRET_KEY,
        endpoint_url=MINIO_ENDPOINT_URL,
    )
    return s3.meta.client


class TestUserLimits:
    @classmethod
    def _create_user(cls, api_client: ApiClient, email: str) -> str:
        username = email.split("@", maxsplit=1)[0]
        with api_client:
            (user, _) = api_client.auth_api.create_register(
                models.RegisterSerializerExRequest(
                    username=username, password1=USER_PASS, password2=USER_PASS, email=email
                )
            )

        api_client.cookies.clear()

        return user.username

    @pytest.fixture(autouse=True)
    def setup(self, restore_db_per_function, tmp_path: Path):
        self.tmp_dir = tmp_path

        self.client = Client(BASE_URL, config=Config(status_check_period=0.01))
        self.user = self._create_user(self.client.api_client, email="test_user_limits@localhost")

        self.client.__enter__()
        self.client.login((self.user, USER_PASS))

    _DEFAULT_TASK_LIMIT = 10
    _DEFAULT_PROJECT_TASKS_LIMIT = 5
    _DEFAULT_PROJECTS_LIMIT = 5
    _DEFAULT_ORGS_LIMIT = 1
    _DEFAULT_CLOUD_STORAGES_LIMIT = 10

    _TASK_LIMIT_MESSAGE = "user tasks limit reached"
    _PROJECT_TASK_LIMIT_MESSAGE = "user project tasks limit reached"
    _PROJECTS_LIMIT_MESSAGE = "user projects limit reached"
    _ORGS_LIMIT_MESSAGE = "user orgs limit reached"
    _CLOUD_STORAGES_LIMIT_MESSAGE = "user cloud storages limit reached"

    def _create_task(self, data: Sequence[str], *, project: Optional[int] = None):
        return self.client.tasks.create_from_data(
            spec=models.TaskWriteRequest(
                name="test_task",
                labels=[models.PatchedLabelRequest(name="cat")] if not project else [],
                project_id=project,
            ),
            resource_type=ResourceType.LOCAL,
            resources=data,
        )

    def test_can_reach_tasks_limit(self, fxt_image_file: Path):
        _create_task = partial(self._create_task, data=[str(fxt_image_file)])

        for _ in range(self._DEFAULT_TASK_LIMIT):
            _create_task()

        with pytest.raises(exceptions.ApiException) as capture:
            _create_task()

        assert capture.value.status == HTTPStatus.FORBIDDEN
        assert json.loads(capture.value.body) == [self._TASK_LIMIT_MESSAGE]

    def test_can_reach_tasks_limit_when_creating_in_project(self, fxt_image_file: Path):
        _create_task = partial(self._create_task, data=[str(fxt_image_file)])

        project = self.client.projects.create(models.ProjectWriteRequest(name="test_project")).id

        for _ in range(self._DEFAULT_PROJECT_TASKS_LIMIT):
            _create_task(project=project)

        with pytest.raises(exceptions.ApiException) as capture:
            _create_task(project=project)

        assert capture.value.status == HTTPStatus.FORBIDDEN
        assert json.loads(capture.value.body) == [self._PROJECT_TASK_LIMIT_MESSAGE]

    def test_can_reach_tasks_limit_when_creating_in_different_projects(self, fxt_image_file: Path):
        _create_task = partial(self._create_task, data=[str(fxt_image_file)])

        project1 = self.client.projects.create(models.ProjectWriteRequest(name="test_project")).id
        project2 = self.client.projects.create(models.ProjectWriteRequest(name="test_project")).id

        for _ in range(self._DEFAULT_PROJECT_TASKS_LIMIT):
            _create_task(project=project1)
        for _ in range(self._DEFAULT_TASK_LIMIT - self._DEFAULT_PROJECT_TASKS_LIMIT):
            _create_task(project=project2)

        with pytest.raises(exceptions.ApiException) as capture:
            _create_task()

        assert capture.value.status == HTTPStatus.FORBIDDEN
        assert json.loads(capture.value.body) == [self._TASK_LIMIT_MESSAGE]

    def test_can_reach_tasks_limit_when_creating_in_filled_project(self, fxt_image_file: Path):
        _create_task = partial(self._create_task, data=[str(fxt_image_file)])

        project = self.client.projects.create(models.ProjectWriteRequest(name="test_project1")).id

        for _ in range(self._DEFAULT_PROJECT_TASKS_LIMIT):
            _create_task(project=project)
        for _ in range(self._DEFAULT_TASK_LIMIT - self._DEFAULT_PROJECT_TASKS_LIMIT):
            _create_task()

        with pytest.raises(exceptions.ApiException) as capture:
            _create_task(project=project)

        assert capture.value.status == HTTPStatus.FORBIDDEN
        assert set(json.loads(capture.value.body)) == {
            self._TASK_LIMIT_MESSAGE,
            self._PROJECT_TASK_LIMIT_MESSAGE,
        }

    def test_can_reach_projects_limit(self):
        for _ in range(self._DEFAULT_PROJECTS_LIMIT):
            self.client.projects.create(models.ProjectWriteRequest(name="test_project"))

        with pytest.raises(exceptions.ApiException) as capture:
            self.client.projects.create(models.ProjectWriteRequest(name="test_project"))

        assert capture.value.status == HTTPStatus.FORBIDDEN
        assert json.loads(capture.value.body) == [self._PROJECTS_LIMIT_MESSAGE]

    def test_can_reach_orgs_limit(self):
        for i in range(self._DEFAULT_ORGS_LIMIT):
            (_, response) = self.client.api_client.organizations_api.create(
                models.OrganizationWriteRequest(slug=f"test_user_orgs_{i}"), _parse_response=False
            )
            assert response.status == HTTPStatus.CREATED

        with pytest.raises(exceptions.ApiException) as capture:
            self.client.api_client.organizations_api.create(
                models.OrganizationWriteRequest(slug=f"test_user_orgs_{i}"), _parse_response=False
            )

        assert capture.value.status == HTTPStatus.FORBIDDEN
        assert json.loads(capture.value.body) == [self._ORGS_LIMIT_MESSAGE]

    def test_can_reach_cloud_storages_limit(self, request: pytest.FixtureRequest):
        storage_params = get_common_storage_params()

        # TODO: refactor after https://github.com/opencv/cvat/pull/4819
        s3_client = define_s3_client()

        def _create_bucket(name: str) -> str:
            name = name + str(uuid4())
            s3_client.create_bucket(Bucket=name)
            request.addfinalizer(partial(s3_client.delete_bucket, Bucket=name))
            return name

        def _add_storage(idx: int):
            response = post_method(
                self.user,
                "cloudstorages",
                {
                    "display_name": f"test_storage{idx}",
                    "resource": _create_bucket(f"testbucket{idx}"),
                    **storage_params,
                },
            )
            return response

        for i in range(self._DEFAULT_CLOUD_STORAGES_LIMIT):
            response = _add_storage(i)
            assert response.status_code == HTTPStatus.CREATED

        response = _add_storage(i)

        assert response.status_code == HTTPStatus.FORBIDDEN
        assert response.json() == [self._CLOUD_STORAGES_LIMIT_MESSAGE]


class TestOrgLimits:
    @classmethod
    def _create_user(cls, api_client: ApiClient, email: str) -> str:
        username = email.split("@", maxsplit=1)[0]
        with api_client:
            (user, _) = api_client.auth_api.create_register(
                models.RegisterSerializerExRequest(
                    username=username, password1=USER_PASS, password2=USER_PASS, email=email
                )
            )

        api_client.cookies.clear()

        return user.username

    @classmethod
    def _create_org(cls, api_client: ApiClient) -> str:
        with api_client:
            (org, _) = api_client.organizations_api.create(
                models.OrganizationWriteRequest(slug="test_org_limits")
            )

        return org.id

    @pytest.fixture(autouse=True)
    def setup(self, restore_db_per_function, tmp_path: Path):
        self.tmp_dir = tmp_path

        self.client = Client(BASE_URL, config=Config(status_check_period=0.01))
        self.user = self._create_user(self.client.api_client, email="test_user_limits@localhost")
        self.client.__enter__()
        self.client.login((self.user, USER_PASS))

        self.org = self._create_org(self.client.api_client)

    _DEFAULT_TASK_LIMIT = 10
    _DEFAULT_PROJECT_TASKS_LIMIT = 5
    _DEFAULT_PROJECTS_LIMIT = 5
    _DEFAULT_CLOUD_STORAGES_LIMIT = 10

    _TASK_LIMIT_MESSAGE = "org tasks limit reached"
    _PROJECT_TASK_LIMIT_MESSAGE = "org project tasks limit reached"
    _PROJECTS_LIMIT_MESSAGE = "org projects limit reached"
    _CLOUD_STORAGES_LIMIT_MESSAGE = "org cloud storages limit reached"

    @staticmethod
    def _wait_until_task_is_created(api: apis.TasksApi, task_id: int) -> models.RqStatus:
        for _ in range(100):
            (status, _) = api.retrieve_status(task_id)
            if status.state.value in ["Finished", "Failed"]:
                return status
            sleep(1)
        raise Exception("Cannot create task")

    def _create_task(self, data: Sequence[str], *, project: Optional[int] = None):
        api_client = self.client.api_client

        (task, response) = api_client.tasks_api.create(
            spec=models.TaskWriteRequest(
                name="test_task",
                labels=[models.PatchedLabelRequest(name="cat")] if not project else [],
                project_id=project,
            ),
            org_id=self.org,
        )
        assert response.status == HTTPStatus.CREATED

        with ExitStack() as es:
            client_files = [es.enter_context(open(filename, "rb")) for filename in data]
            (_, response) = api_client.tasks_api.create_data(
                task.id,
                data_request=models.DataRequest(client_files),
                _content_type="application/json",
                org_id=self.org,
            )
            assert response.status == HTTPStatus.ACCEPTED

        status = self._wait_until_task_is_created(api_client.tasks_api, task.id)
        assert status.state.value == "Finished"

        return task.id

    def _create_project(self, name: str) -> int:
        api_client = self.client.api_client

        (project, _) = api_client.projects_api.create(models.ProjectWriteRequest(name=name))
        return project.id

    def test_can_reach_tasks_limit(self, fxt_image_file: Path):
        _create_task = partial(self._create_task, data=[str(fxt_image_file)])

        for _ in range(self._DEFAULT_TASK_LIMIT):
            _create_task()

        with pytest.raises(exceptions.ApiException) as capture:
            _create_task()

        assert capture.value.status == HTTPStatus.FORBIDDEN
        assert json.loads(capture.value.body) == [self._TASK_LIMIT_MESSAGE]

    def test_can_reach_tasks_limit_when_creating_in_project(self, fxt_image_file: Path):
        _create_task = partial(self._create_task, data=[str(fxt_image_file)])

        project = self._create_project("test_project")

        for _ in range(self._DEFAULT_PROJECT_TASKS_LIMIT):
            _create_task(project=project)

        with pytest.raises(exceptions.ApiException) as capture:
            _create_task(project=project)

        assert capture.value.status == HTTPStatus.FORBIDDEN
        assert json.loads(capture.value.body) == [self._PROJECT_TASK_LIMIT_MESSAGE]

    def test_can_reach_tasks_limit_when_creating_in_different_projects(self, fxt_image_file: Path):
        _create_task = partial(self._create_task, data=[str(fxt_image_file)])

        project1 = self._create_project("test_project")
        project2 = self._create_project("test_project")

        for _ in range(self._DEFAULT_PROJECT_TASKS_LIMIT):
            _create_task(project=project1)
        for _ in range(self._DEFAULT_TASK_LIMIT - self._DEFAULT_PROJECT_TASKS_LIMIT):
            _create_task(project=project2)

        with pytest.raises(exceptions.ApiException) as capture:
            _create_task()

        assert capture.value.status == HTTPStatus.FORBIDDEN
        assert json.loads(capture.value.body) == [self._TASK_LIMIT_MESSAGE]

    def test_can_reach_tasks_limit_when_creating_in_filled_project(self, fxt_image_file: Path):
        _create_task = partial(self._create_task, data=[str(fxt_image_file)])

        project = self._create_project("test_project1")

        for _ in range(self._DEFAULT_PROJECT_TASKS_LIMIT):
            _create_task(project=project)
        for _ in range(self._DEFAULT_TASK_LIMIT - self._DEFAULT_PROJECT_TASKS_LIMIT):
            _create_task()

        with pytest.raises(exceptions.ApiException) as capture:
            _create_task(project=project)

        assert capture.value.status == HTTPStatus.FORBIDDEN
        assert set(json.loads(capture.value.body)) == {
            self._TASK_LIMIT_MESSAGE,
            self._PROJECT_TASK_LIMIT_MESSAGE,
        }

    def test_can_reach_projects_limit(self):
        for _ in range(self._DEFAULT_PROJECTS_LIMIT):
            self._create_project("test_project")

        with pytest.raises(exceptions.ApiException) as capture:
            self._create_project("test_project")

        assert capture.value.status == HTTPStatus.FORBIDDEN
        assert json.loads(capture.value.body) == [self._PROJECTS_LIMIT_MESSAGE]

    def test_can_reach_cloud_storages_limit(self, request: pytest.FixtureRequest):
        storage_params = get_common_storage_params()

        # TODO: refactor after https://github.com/opencv/cvat/pull/4819
        s3_client = define_s3_client()

        def _create_bucket(name: str) -> str:
            name = name + str(uuid4())
            s3_client.create_bucket(Bucket=name)
            request.addfinalizer(partial(s3_client.delete_bucket, Bucket=name))
            return name

        def _add_storage(idx: int):
            response = post_method(
                self.user,
                "cloudstorages",
                {
                    "display_name": f"test_storage{idx}",
                    "resource": _create_bucket(f"testbucket{idx}"),
                    **storage_params,
                },
                org_id=self.org,
            )
            return response

        for i in range(self._DEFAULT_CLOUD_STORAGES_LIMIT):
            response = _add_storage(i)
            assert response.status_code == HTTPStatus.CREATED

        response = _add_storage(i)

        assert response.status_code == HTTPStatus.FORBIDDEN
        assert response.json() == [self._CLOUD_STORAGES_LIMIT_MESSAGE]
