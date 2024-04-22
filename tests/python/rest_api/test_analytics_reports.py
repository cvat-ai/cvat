# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
from http import HTTPStatus
from typing import Any, Dict, Optional

import pytest
from cvat_sdk.api_client import models
from deepdiff import DeepDiff

from shared.utils.config import make_api_client


class _PermissionTestBase:
    @staticmethod
    def _get_query_params(
        job_id: Optional[int] = None,
        task_id: Optional[int] = None,
        project_id: Optional[int] = None,
    ):
        params = {}
        if job_id is not None:
            params["job_id"] = job_id
        elif task_id is not None:
            params["task_id"] = task_id
        elif project_id is not None:
            params["project_id"] = project_id

        return params

    def create_analytics_report(
        self,
        user: str,
        *,
        job_id: Optional[int] = None,
        task_id: Optional[int] = None,
        project_id: Optional[int] = None,
    ):
        params = self._get_query_params(job_id=job_id, task_id=task_id, project_id=project_id)

        with make_api_client(user) as api_client:
            (_, response) = api_client.analytics_api.create_report(
                analytics_report_create_request=models.AnalyticsReportCreateRequest(**params),
                _parse_response=False,
            )
            assert response.status == HTTPStatus.ACCEPTED
            rq_id = json.loads(response.data)["rq_id"]

            while True:
                (_, response) = api_client.analytics_api.create_report(
                    rq_id=rq_id, _parse_response=False
                )
                assert response.status in [HTTPStatus.CREATED, HTTPStatus.ACCEPTED]

                if response.status == HTTPStatus.CREATED:
                    break


@pytest.mark.usefixtures("restore_db_per_class")
class TestGetAnalyticsReports(_PermissionTestBase):
    def _test_get_report_200(
        self,
        user: str,
        *,
        job_id: Optional[int] = None,
        task_id: Optional[int] = None,
        project_id: Optional[int] = None,
        expected_data: Optional[Dict[str, Any]] = None,
        **kwargs,
    ):
        params = self._get_query_params(job_id=job_id, task_id=task_id, project_id=project_id)
        with make_api_client(user) as api_client:
            (_, response) = api_client.analytics_api.get_reports(**params, **kwargs)
            assert response.status == HTTPStatus.OK

        if expected_data is not None:
            assert DeepDiff(expected_data, json.loads(response.data), ignore_order=True) == {}

        return response

    def _test_get_report_403(
        self,
        user: str,
        *,
        job_id: Optional[int] = None,
        task_id: Optional[int] = None,
        project_id: Optional[int] = None,
        **kwargs,
    ):
        params = self._get_query_params(job_id=job_id, task_id=task_id, project_id=project_id)
        with make_api_client(user) as api_client:
            (_, response) = api_client.analytics_api.get_reports(
                **params, **kwargs, _parse_response=False, _check_status=False
            )
            assert response.status == HTTPStatus.FORBIDDEN

        return response

    @pytest.mark.usefixtures("restore_db_per_function")
    @pytest.mark.parametrize("is_staff, allow", [(True, True), (False, False)])
    def test_user_get_report_in_sandbox_task(
        self, tasks, users, is_task_staff, is_staff, allow, admin_user
    ):
        task = next(
            t
            for t in tasks
            if t["organization"] is None and not users[t["owner"]["id"]]["is_superuser"]
        )

        if is_staff:
            user = task["owner"]["username"]
        else:
            user = next(u for u in users if not is_task_staff(u["id"], task["id"]))["username"]

        self.create_analytics_report(admin_user, task_id=task["id"])

        if allow:
            self._test_get_report_200(user, task_id=task["id"])
        else:
            self._test_get_report_403(user, task_id=task["id"])

    @pytest.mark.usefixtures("restore_db_per_function")
    @pytest.mark.parametrize("is_staff, allow", [(True, True), (False, False)])
    def test_user_get_report_in_sandbox_job(
        self, jobs, users, is_job_staff, is_staff, allow, admin_user
    ):
        job = next(j for j in jobs if j["assignee"] is not None and j["type"] != "ground_truth")

        if is_staff:
            user = job["assignee"]["username"]
        else:
            user = next(u for u in users if not is_job_staff(u["id"], job["id"]))["username"]

        self.create_analytics_report(admin_user, job_id=job["id"])

        if allow:
            self._test_get_report_200(user, job_id=job["id"])
        else:
            self._test_get_report_403(user, job_id=job["id"])

    @pytest.mark.usefixtures("restore_db_per_function")
    @pytest.mark.parametrize("is_staff, allow", [(True, True), (False, False)])
    def test_user_get_report_in_sandbox_project(
        self, projects, users, is_project_staff, is_staff, allow, admin_user
    ):
        project = next(
            p
            for p in projects
            if p["organization"] is None and not users[p["owner"]["id"]]["is_superuser"]
        )

        if is_staff:
            user = project["owner"]["username"]
        else:
            user = next(u for u in users if not is_project_staff(u["id"], project["id"]))[
                "username"
            ]

        self.create_analytics_report(admin_user, project_id=project["id"])

        if allow:
            self._test_get_report_200(user, project_id=project["id"])
        else:
            self._test_get_report_403(user, project_id=project["id"])

    @pytest.mark.usefixtures("restore_db_per_function")
    @pytest.mark.parametrize(
        "org_role, is_staff, allow",
        [
            ("owner", True, True),
            ("owner", False, True),
            ("maintainer", True, True),
            ("maintainer", False, True),
            ("supervisor", True, True),
            ("supervisor", False, False),
            ("worker", True, True),
            ("worker", False, False),
        ],
    )
    def test_user_get_report_in_org_task(
        self,
        tasks,
        users,
        is_org_member,
        is_task_staff,
        org_role,
        is_staff,
        allow,
        admin_user,
    ):
        for user in users:
            if user["is_superuser"]:
                continue

            task = next(
                (
                    t
                    for t in tasks
                    if t["organization"] is not None
                    and is_task_staff(user["id"], t["id"]) == is_staff
                    and is_org_member(user["id"], t["organization"], role=org_role)
                ),
                None,
            )
            if task is not None:
                break

        assert task

        self.create_analytics_report(admin_user, task_id=task["id"])

        if allow:
            self._test_get_report_200(user["username"], task_id=task["id"])
        else:
            self._test_get_report_403(user["username"], task_id=task["id"])

    @pytest.mark.usefixtures("restore_db_per_function")
    @pytest.mark.parametrize(
        "org_role, is_staff, allow",
        [
            ("owner", True, True),
            ("owner", False, True),
            ("maintainer", True, True),
            ("maintainer", False, True),
            ("supervisor", True, True),
            ("supervisor", False, False),
            ("worker", True, True),
            ("worker", False, False),
        ],
    )
    def test_user_get_report_in_org_job(
        self,
        jobs,
        users,
        is_org_member,
        is_job_staff,
        org_role,
        is_staff,
        allow,
        admin_user,
    ):
        for user in users:
            if user["is_superuser"]:
                continue

            job = next(
                (
                    j
                    for j in jobs
                    if j["organization"] is not None
                    and is_job_staff(user["id"], j["id"]) == is_staff
                    and is_org_member(user["id"], j["organization"], role=org_role)
                ),
                None,
            )
            if job is not None:
                break

        assert job

        self.create_analytics_report(admin_user, job_id=job["id"])

        if allow:
            self._test_get_report_200(user["username"], job_id=job["id"])
        else:
            self._test_get_report_403(user["username"], job_id=job["id"])

    @pytest.mark.usefixtures("restore_db_per_function")
    @pytest.mark.parametrize(
        "org_role, is_staff, allow",
        [
            ("owner", True, True),
            ("owner", False, True),
            ("maintainer", False, True),
            ("supervisor", True, True),
            ("supervisor", False, False),
            ("worker", True, True),
            ("worker", False, False),
        ],
    )
    def test_user_get_report_in_org_project(
        self,
        projects,
        users,
        is_org_member,
        is_project_staff,
        org_role,
        is_staff,
        allow,
        admin_user,
    ):
        for user in users:
            if user["is_superuser"]:
                continue

            project = next(
                (
                    p
                    for p in projects
                    if p["organization"] is not None
                    and is_project_staff(user["id"], p["id"]) == is_staff
                    and is_org_member(user["id"], p["organization"], role=org_role)
                ),
                None,
            )
            if project is not None:
                break

        assert project

        self.create_analytics_report(admin_user, project_id=project["id"])

        if allow:
            self._test_get_report_200(user["username"], project_id=project["id"])
        else:
            self._test_get_report_403(user["username"], project_id=project["id"])

    @pytest.mark.usefixtures("restore_db_per_function")
    @pytest.mark.parametrize("is_staff, allow", [(True, True), (False, False)])
    def test_user_get_empty_report_in_sandbox_task(
        self, tasks, users, is_task_staff, is_staff, allow, admin_user
    ):
        task = next(
            t
            for t in tasks
            if t["organization"] is None and not users[t["owner"]["id"]]["is_superuser"]
        )

        if is_staff:
            user = task["owner"]["username"]
        else:
            user = next(u for u in users if not is_task_staff(u["id"], task["id"]))["username"]

        if allow:
            self._test_get_report_200(user, task_id=task["id"])
        else:
            self._test_get_report_403(user, task_id=task["id"])

    @pytest.mark.usefixtures("restore_db_per_function")
    @pytest.mark.parametrize("is_staff, allow", [(True, True), (False, False)])
    def test_user_get_empty_report_in_sandbox_job(
        self, jobs, users, is_job_staff, is_staff, allow, admin_user
    ):
        job = next(j for j in jobs if j["assignee"] is not None and j["type"] != "ground_truth")

        if is_staff:
            user = job["assignee"]["username"]
        else:
            user = next(u for u in users if not is_job_staff(u["id"], job["id"]))["username"]

        if allow:
            self._test_get_report_200(user, job_id=job["id"])
        else:
            self._test_get_report_403(user, job_id=job["id"])

    @pytest.mark.usefixtures("restore_db_per_function")
    @pytest.mark.parametrize("is_staff, allow", [(True, True), (False, False)])
    def test_user_get_empty_report_in_sandbox_project(
        self, projects, users, is_project_staff, is_staff, allow, admin_user
    ):
        project = next(
            p
            for p in projects
            if p["organization"] is None and not users[p["owner"]["id"]]["is_superuser"]
        )

        if is_staff:
            user = project["owner"]["username"]
        else:
            user = next(u for u in users if not is_project_staff(u["id"], project["id"]))[
                "username"
            ]

        if allow:
            self._test_get_report_200(user, project_id=project["id"])
        else:
            self._test_get_report_403(user, project_id=project["id"])
