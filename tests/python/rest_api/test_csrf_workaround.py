# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import pytest
from cvat_sdk.api_client import ApiClient, Configuration, models
from cvat_sdk.api_client.exceptions import UnauthorizedException

from shared.utils.config import BASE_URL, USER_PASS


class TestCsrfWorkaround:
    """
    Test that session authentication does not work with endpoints
    that respond to GET requests and produce side effects.
    """

    @pytest.fixture(autouse=True)
    def setup(self, admin_user):
        self.client = ApiClient(Configuration(host=BASE_URL))

        # Don't store the result - we only want the session cookie.
        self.client.auth_api.create_login(
            models.LoginSerializerExRequest(username=admin_user, password=USER_PASS)
        )

        # Test that session authentication works in general.
        user, _ = self.client.users_api.retrieve_self()
        assert user.username == admin_user

    def test_project(self, projects):
        actual_project, _ = self.client.projects_api.retrieve(next(iter(projects))["id"])

        with pytest.raises(UnauthorizedException):
            self.client.projects_api.retrieve_backup(actual_project.id)
        with pytest.raises(UnauthorizedException):
            self.client.projects_api.retrieve_annotations(id=actual_project.id, format="COCO 1.0")
        with pytest.raises(UnauthorizedException):
            self.client.projects_api.retrieve_dataset(id=actual_project.id, format="COCO 1.0")

    def test_task(self, tasks):
        actual_task, _ = self.client.tasks_api.retrieve(next(iter(tasks))["id"])

        with pytest.raises(UnauthorizedException):
            self.client.tasks_api.retrieve_backup(actual_task.id)
        with pytest.raises(UnauthorizedException):
            self.client.tasks_api.retrieve_annotations(id=actual_task.id, format="COCO 1.0")
        with pytest.raises(UnauthorizedException):
            self.client.tasks_api.retrieve_dataset(id=actual_task.id, format="COCO 1.0")

    def test_job(self, jobs):
        actual_job, _ = self.client.jobs_api.retrieve(next(iter(jobs))["id"])

        with pytest.raises(UnauthorizedException):
            self.client.jobs_api.retrieve_annotations(id=actual_job.id, format="COCO 1.0")
        with pytest.raises(UnauthorizedException):
            self.client.jobs_api.retrieve_dataset(id=actual_job.id, format="COCO 1.0")
