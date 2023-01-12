# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
from contextlib import contextmanager
from functools import partial
from http import HTTPStatus
from pathlib import Path
from typing import Optional
from uuid import uuid4

import boto3
import pytest
from cvat_sdk import Client, exceptions
from cvat_sdk.api_client import ApiClient, models
from cvat_sdk.core.client import Config
from cvat_sdk.core.proxies.projects import Project
from cvat_sdk.core.proxies.tasks import ResourceType, Task

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

    def _make_client(self) -> Client:
        return Client(BASE_URL, config=Config(status_check_period=0.01))

    @pytest.fixture(autouse=True)
    def setup(self, restore_db_per_function, tmp_path: Path, fxt_image_file: Path):
        self.tmp_dir = tmp_path
        self.image_file = fxt_image_file

        self.client = self._make_client()
        self.user = self._create_user(self.client.api_client, email="test_user_limits@localhost")

        with self.client:
            self.client.login((self.user, USER_PASS))

    @pytest.fixture
    def fxt_another_client(self) -> Client:
        client = self._make_client()
        user = self._create_user(self.client.api_client, email="test_user_limits2@localhost")

        with client:
            client.login((user, USER_PASS))
            yield client

    _DEFAULT_TASKS_LIMIT = 10
    _DEFAULT_PROJECT_TASKS_LIMIT = 5
    _DEFAULT_PROJECTS_LIMIT = 3
    _DEFAULT_ORGS_LIMIT = 1
    _DEFAULT_CLOUD_STORAGES_LIMIT = 1
    _DEFAULT_PROJECT_WEBHOOKS_LIMIT = 10

    _TASK_LIMIT_MESSAGE = "tasks per user"
    _PROJECT_TASK_LIMIT_MESSAGE = "tasks per project for the user"
    _PROJECTS_LIMIT_MESSAGE = "projects per user"
    _ORGS_LIMIT_MESSAGE = "organizations per user"
    _CLOUD_STORAGES_LIMIT_MESSAGE = "cloud storages per user"
    _PROJECT_WEBHOOKS_LIMIT_MESSAGE = "webhooks per project for the user"

    def _create_task(
        self, *, project: Optional[int] = None, client: Optional[Client] = None
    ) -> Task:
        if client is None:
            client = self.client

        return client.tasks.create_from_data(
            spec=models.TaskWriteRequest(
                name="test_task",
                labels=[models.PatchedLabelRequest(name="cat")] if not project else [],
                project_id=project,
            ),
            resource_type=ResourceType.LOCAL,
            resources=[str(self.image_file)],
        )

    def _create_project(self, *, client: Optional[Client] = None) -> Project:
        if client is None:
            client = self.client

        return client.projects.create(models.ProjectWriteRequest(name="test_project"))

    def test_can_reach_tasks_limit(self):
        for _ in range(self._DEFAULT_TASKS_LIMIT):
            self._create_task()

        with pytest.raises(exceptions.ApiException) as capture:
            self._create_task()

        assert capture.value.status == HTTPStatus.FORBIDDEN
        assert self._TASK_LIMIT_MESSAGE in str(capture.value.body)

    def test_can_reach_tasks_limit_when_importing_backup(self):
        for _ in range(self._DEFAULT_TASKS_LIMIT):
            task = self._create_task()

        backup_filename = self.tmp_dir / "task_backup.zip"
        task.download_backup(backup_filename)

        with pytest.raises(exceptions.ApiException) as capture:
            self.client.tasks.create_from_backup(backup_filename)

        assert capture.value.status == HTTPStatus.FORBIDDEN
        assert self._TASK_LIMIT_MESSAGE in str(capture.value.body)

    def test_can_reach_tasks_limit_when_creating_in_project(self):
        project = self._create_project().id

        for _ in range(self._DEFAULT_PROJECT_TASKS_LIMIT):
            self._create_task(project=project)

        with pytest.raises(exceptions.ApiException) as capture:
            self._create_task(project=project)

        assert capture.value.status == HTTPStatus.FORBIDDEN
        assert self._PROJECT_TASK_LIMIT_MESSAGE in str(capture.value.body)

    def test_can_reach_tasks_limit_when_creating_in_different_projects(self):
        project1 = self._create_project().id
        project2 = self._create_project().id

        for _ in range(self._DEFAULT_PROJECT_TASKS_LIMIT):
            self._create_task(project=project1)
        for _ in range(self._DEFAULT_TASKS_LIMIT - self._DEFAULT_PROJECT_TASKS_LIMIT):
            self._create_task(project=project2)

        with pytest.raises(exceptions.ApiException) as capture:
            self._create_task()

        assert capture.value.status == HTTPStatus.FORBIDDEN
        assert self._TASK_LIMIT_MESSAGE in str(capture.value.body)

    def test_can_reach_tasks_limit_when_creating_in_filled_project(self):
        project = self._create_project().id

        for _ in range(self._DEFAULT_PROJECT_TASKS_LIMIT):
            self._create_task(project=project)
        for _ in range(self._DEFAULT_TASKS_LIMIT - self._DEFAULT_PROJECT_TASKS_LIMIT):
            self._create_task()

        with pytest.raises(exceptions.ApiException) as capture:
            self._create_task(project=project)

        assert capture.value.status == HTTPStatus.FORBIDDEN
        assert self._TASK_LIMIT_MESSAGE in str(capture.value.body)
        assert self._PROJECT_TASK_LIMIT_MESSAGE in str(capture.value.body)

    def test_can_reach_project_tasks_limit_when_moving_into_filled_project(self):
        project = self._create_project().id
        for _ in range(self._DEFAULT_PROJECT_TASKS_LIMIT):
            self._create_task(project=project)

        task = self._create_task()

        with pytest.raises(exceptions.ApiException) as capture:
            task.update(models.PatchedTaskWriteRequest(project_id=project))

        assert capture.value.status == HTTPStatus.FORBIDDEN
        assert self._PROJECT_TASK_LIMIT_MESSAGE in str(capture.value.body)

    @pytest.mark.xfail(
        raises=AssertionError, reason="only admins can change ownership, but they ignore limits"
    )
    def test_can_reach_tasks_limit_when_giving_away_to_another_user(
        self, fxt_another_client: Client
    ):
        for _ in range(self._DEFAULT_TASKS_LIMIT):
            self._create_task(client=fxt_another_client)

        task = self._create_task()

        with pytest.raises(exceptions.ApiException) as capture:
            task.update(
                models.PatchedTaskWriteRequest(
                    owner_id=fxt_another_client.users.retrieve_current_user().id
                )
            )

        assert capture.value.status == HTTPStatus.FORBIDDEN
        assert self._PROJECT_TASK_LIMIT_MESSAGE in str(capture.value.body)

    @pytest.mark.xfail(
        raises=AssertionError, reason="only admins can change ownership, but they ignore limits"
    )
    def test_can_reach_project_tasks_limit_when_giving_away_to_another_users_filled_project(
        self, fxt_another_client: Client
    ):
        project = self._create_project(client=fxt_another_client).id

        for _ in range(self._DEFAULT_PROJECT_TASKS_LIMIT):
            self._create_task(client=fxt_another_client, project=project)
        for _ in range(self._DEFAULT_TASKS_LIMIT - self._DEFAULT_PROJECT_TASKS_LIMIT):
            self._create_task(client=fxt_another_client)

        task = self._create_task()

        with pytest.raises(exceptions.ApiException) as capture:
            task.update(
                models.PatchedTaskWriteRequest(
                    owner_id=fxt_another_client.users.retrieve_current_user().id
                )
            )

        assert capture.value.status == HTTPStatus.FORBIDDEN
        assert self._TASK_LIMIT_MESSAGE in str(capture.value.body)
        assert self._PROJECT_TASK_LIMIT_MESSAGE in str(capture.value.body)

    @pytest.mark.xfail(
        raises=AssertionError, reason="only admins can change ownership, but they ignore limits"
    )
    def test_can_reach_projects_limit_when_giving_away_to_another_user(
        self, fxt_another_client: Client
    ):
        for _ in range(self._DEFAULT_PROJECTS_LIMIT):
            self._create_project(client=fxt_another_client)

        project = self._create_project()

        with pytest.raises(exceptions.ApiException) as capture:
            project.update(
                models.PatchedProjectWriteRequest(
                    owner_id=fxt_another_client.users.retrieve_current_user().id
                )
            )

        assert capture.value.status == HTTPStatus.FORBIDDEN
        assert self._PROJECT_TASK_LIMIT_MESSAGE in str(capture.value.body)

    def test_can_reach_projects_limit(self):
        for _ in range(self._DEFAULT_PROJECTS_LIMIT):
            self._create_project()

        with pytest.raises(exceptions.ApiException) as capture:
            self._create_project()

        assert capture.value.status == HTTPStatus.FORBIDDEN
        assert self._PROJECTS_LIMIT_MESSAGE in str(capture.value.body)

    def test_can_reach_projects_limit_when_importing_backup(self):
        for _ in range(self._DEFAULT_PROJECTS_LIMIT):
            project = self._create_project()

        backup_filename = self.tmp_dir / (project.name + "_backup.zip")
        project.download_backup(backup_filename)

        with pytest.raises(exceptions.ApiException) as capture:
            self.client.projects.create_from_backup(backup_filename)

        assert capture.value.status == HTTPStatus.FORBIDDEN
        assert self._PROJECTS_LIMIT_MESSAGE in str(capture.value.body)

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
        assert self._ORGS_LIMIT_MESSAGE in str(capture.value.body)

    @pytest.mark.with_external_services
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
        assert self._CLOUD_STORAGES_LIMIT_MESSAGE in str(response.content)


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
            (_, response) = api_client.organizations_api.create(
                models.OrganizationWriteRequest(slug="test_org_limits"), _parse_response=False
            )

        return json.loads(response.data)

    def _make_client(self) -> Client:
        return Client(BASE_URL, config=Config(status_check_period=0.01))

    @pytest.fixture(autouse=True)
    def setup(
        self, restore_db_per_function, tmp_path: Path, regular_user: str, fxt_image_file: Path
    ):
        self.tmp_dir = tmp_path
        self.image_file = fxt_image_file

        self.client = self._make_client()
        self.user = regular_user

        with self.client:
            self.client.login((self.user, USER_PASS))

            org = self._create_org(self.client.api_client)
            self.org = org["id"]
            self.org_slug = org["slug"]

            with self._patch_client_with_org(self.client):
                yield

    _DEFAULT_TASKS_LIMIT = 10
    _DEFAULT_PROJECT_TASKS_LIMIT = 5
    _DEFAULT_PROJECTS_LIMIT = 3
    _DEFAULT_CLOUD_STORAGES_LIMIT = 1
    _DEFAULT_PROJECT_WEBHOOKS_LIMIT = 10
    _DEFAULT_COMMON_WEBHOOKS_LIMIT = 10
    _DEFAULT_MEMBERS_LIMIT = 3

    _TASK_LIMIT_MESSAGE = "tasks per organization"
    _PROJECT_TASK_LIMIT_MESSAGE = "tasks per project for the organization"
    _PROJECTS_LIMIT_MESSAGE = "projects per organization"
    _CLOUD_STORAGES_LIMIT_MESSAGE = "cloud storages per organization"
    _PROJECT_WEBHOOKS_LIMIT_MESSAGE = "webhooks per project for the organization"
    _COMMON_WEBHOOKS_LIMIT_MESSAGE = "webhooks for the organization"
    _MEMBERS_LIMIT_MESSAGE = "members for the organization"

    @contextmanager
    def _patch_client_with_org(self, client: Optional[Client] = None):
        if client is None:
            client = self.client

        new_headers = self.client.api_client.default_headers.copy()
        new_headers["X-Organization"] = self.org_slug
        with pytest.MonkeyPatch.context() as monkeypatch:
            monkeypatch.setattr(client.api_client, "default_headers", new_headers)
            yield client

    @pytest.fixture
    def fxt_patch_client_with_org(self):
        with self._patch_client_with_org(self.client):
            yield

    def _create_task(
        self, *, project: Optional[int] = None, client: Optional[Client] = None
    ) -> Task:
        if client is None:
            client = self.client

        return client.tasks.create_from_data(
            spec=models.TaskWriteRequest(
                name="test_task",
                labels=[models.PatchedLabelRequest(name="cat")] if not project else [],
                project_id=project,
            ),
            resource_type=ResourceType.LOCAL,
            resources=[str(self.image_file)],
        )

    def _create_project(self, *, client: Optional[Client] = None) -> Project:
        if client is None:
            client = self.client

        return client.projects.create(models.ProjectWriteRequest(name="test_project"))

    def test_can_reach_tasks_limit(self):
        for _ in range(self._DEFAULT_TASKS_LIMIT):
            self._create_task()

        with pytest.raises(exceptions.ApiException) as capture:
            self._create_task()

        assert capture.value.status == HTTPStatus.FORBIDDEN
        assert self._TASK_LIMIT_MESSAGE in str(capture.value.body)

    def test_can_reach_tasks_limit_when_importing_backup(self):
        for _ in range(self._DEFAULT_TASKS_LIMIT):
            task = self._create_task()

        backup_filename = self.tmp_dir / "task_backup.zip"
        task.download_backup(backup_filename)

        with pytest.raises(exceptions.ApiException) as capture:
            self.client.tasks.create_from_backup(backup_filename)

        assert capture.value.status == HTTPStatus.FORBIDDEN
        assert self._TASK_LIMIT_MESSAGE in str(capture.value.body)

    def test_can_reach_tasks_limit_when_creating_in_project(self):
        project = self._create_project().id

        for _ in range(self._DEFAULT_PROJECT_TASKS_LIMIT):
            self._create_task(project=project)

        with pytest.raises(exceptions.ApiException) as capture:
            self._create_task(project=project)

        assert capture.value.status == HTTPStatus.FORBIDDEN
        assert self._PROJECT_TASK_LIMIT_MESSAGE in str(capture.value.body)

    def test_can_reach_tasks_limit_when_creating_in_different_projects(self):
        project1 = self._create_project().id
        project2 = self._create_project().id

        for _ in range(self._DEFAULT_PROJECT_TASKS_LIMIT):
            self._create_task(project=project1)
        for _ in range(self._DEFAULT_TASKS_LIMIT - self._DEFAULT_PROJECT_TASKS_LIMIT):
            self._create_task(project=project2)

        with pytest.raises(exceptions.ApiException) as capture:
            self._create_task()

        assert capture.value.status == HTTPStatus.FORBIDDEN
        assert self._TASK_LIMIT_MESSAGE in str(capture.value.body)

    def test_can_reach_tasks_limit_when_creating_in_filled_project(self):
        project = self._create_project().id

        for _ in range(self._DEFAULT_PROJECT_TASKS_LIMIT):
            self._create_task(project=project)
        for _ in range(self._DEFAULT_TASKS_LIMIT - self._DEFAULT_PROJECT_TASKS_LIMIT):
            self._create_task()

        with pytest.raises(exceptions.ApiException) as capture:
            self._create_task(project=project)

        assert capture.value.status == HTTPStatus.FORBIDDEN
        assert self._TASK_LIMIT_MESSAGE in str(capture.value.body)
        assert self._PROJECT_TASK_LIMIT_MESSAGE in str(capture.value.body)

    def test_can_reach_projects_limit(self):
        for _ in range(self._DEFAULT_PROJECTS_LIMIT):
            self._create_project()

        with pytest.raises(exceptions.ApiException) as capture:
            self._create_project()

        assert capture.value.status == HTTPStatus.FORBIDDEN
        assert self._PROJECTS_LIMIT_MESSAGE in str(capture.value.body)

    def test_can_reach_projects_limit_when_importing_backup(self):
        for _ in range(self._DEFAULT_PROJECTS_LIMIT):
            project = self._create_project()

        backup_filename = self.tmp_dir / "test_project_backup.zip"
        project.download_backup(str(backup_filename))

        with pytest.raises(exceptions.ApiException) as capture:
            self.client.projects.create_from_backup(str(backup_filename))

        assert capture.value.status == HTTPStatus.FORBIDDEN
        assert self._PROJECTS_LIMIT_MESSAGE in str(capture.value.body)

    @pytest.mark.with_external_services
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
        assert self._CLOUD_STORAGES_LIMITS_MESSAGE in str(response.content)

    def test_can_reach_project_webhooks_limit(self):
        def _create_webhook():
            self.client.api_client.webhooks_api.create(
                models.WebhookWriteRequest(
                    **{
                        "description": "webhook description",
                        "content_type": "application/json",
                        "enable_ssl": False,
                        "events": ["create:task", "delete:task"],
                        "is_active": True,
                        "project_id": project.id,
                        "secret": "secret",
                        "target_url": "http://localhost",
                        "type": "project",
                    }
                )
            )

        project = self._create_project()

        for _ in range(self._DEFAULT_PROJECT_WEBHOOKS_LIMIT):
            _create_webhook()

        with pytest.raises(exceptions.ApiException) as capture:
            _create_webhook()

        assert capture.value.status == HTTPStatus.FORBIDDEN
        assert self._PROJECT_WEBHOOKS_LIMITS_MESSAGE in str(capture.value.body)

    def test_can_reach_org_common_webhooks_limit(self):
        def _create_webhook():
            self.client.api_client.webhooks_api.create(
                models.WebhookWriteRequest(
                    **{
                        "description": "webhook description",
                        "content_type": "application/json",
                        "enable_ssl": False,
                        "events": ["create:task", "delete:task"],
                        "is_active": True,
                        "secret": "secret",
                        "target_url": "http://localhost",
                        "type": "organization",
                    }
                )
            )

        for _ in range(self._DEFAULT_COMMON_WEBHOOKS_LIMIT):
            _create_webhook()

        with pytest.raises(exceptions.ApiException) as capture:
            _create_webhook()

        assert capture.value.status == HTTPStatus.FORBIDDEN
        assert self._COMMON_WEBHOOKS_LIMITS_MESSAGE in str(capture.value.body)

    def test_can_reach_members_limit(self):
        def _add_member(i: int):
            extra_user_email = f"test.org.member{i}@localhost"
            self._create_user(self.client.api_client, email=extra_user_email)
            return self.client.api_client.invitations_api.create(
                models.InvitationWriteRequest(role="worker", email=extra_user_email),
                _parse_response=False,
            )

        for i in range(self._DEFAULT_MEMBERS_LIMIT - 1):  # 1 is for the owner
            _add_member(i)

        with pytest.raises(exceptions.ApiException) as capture:
            _add_member(i + 1)

        assert capture.value.status == HTTPStatus.FORBIDDEN
        assert self._MEMBERS_LIMITS_MESSAGE in str(capture.value.body)
