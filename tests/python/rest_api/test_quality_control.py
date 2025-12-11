# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
import math
from collections.abc import Callable, Collection, Iterable
from copy import deepcopy
from functools import partial
from http import HTTPStatus
from itertools import groupby, product
from typing import Any

import pytest
from cvat_sdk.api_client import exceptions, models
from cvat_sdk.api_client.api_client import ApiClient, Endpoint
from cvat_sdk.core.helpers import get_paginated_collection
from deepdiff import DeepDiff

from shared.tasks.utils import parse_frame_step
from shared.utils.config import make_api_client

from .utils import (
    CollectionSimpleFilterTestBase,
    invite_user_to_org,
    register_new_user,
    wait_background_request,
)


class _PermissionTestBase:
    def create_quality_report(
        self, *, user: str, task_id: int | None = None, project_id: int | None = None
    ) -> dict:
        assert task_id is not None or project_id is not None

        with make_api_client(user) as api_client:
            (_, response) = api_client.quality_api.create_report(
                quality_report_create_request=models.QualityReportCreateRequest(
                    **{"task_id": task_id} if task_id else {},
                    **{"project_id": project_id} if project_id else {},
                ),
                _parse_response=False,
            )
            assert response.status == HTTPStatus.ACCEPTED
            rq_id = json.loads(response.data)["rq_id"]

            background_request, _ = wait_background_request(api_client, rq_id)
            assert (
                background_request.status.value
                == models.RequestStatus.allowed_values[("value",)]["FINISHED"]
            )
            report_id = background_request.result_id

            _, response = api_client.quality_api.retrieve_report(report_id, _parse_response=False)

            return json.loads(response.data)

    def create_gt_job(self, user: str, task_id: int, *, complete: bool = True) -> models.IJobRead:
        with make_api_client(user) as api_client:
            (meta, _) = api_client.tasks_api.retrieve_data_meta(task_id)
            start_frame = meta.start_frame

            (job, _) = api_client.jobs_api.create(
                models.JobWriteRequest(
                    type="ground_truth",
                    task_id=task_id,
                    frame_selection_method="manual",
                    frames=[start_frame],
                )
            )

            if complete:
                (labels, _) = api_client.labels_api.list(
                    **({"project_id": job.project_id} if job.project_id else {"task_id": task_id})
                )

                api_client.jobs_api.update_annotations(
                    job.id,
                    labeled_data_request=dict(
                        shapes=[
                            dict(
                                frame=start_frame,
                                label_id=labels.results[0].id,
                                type="rectangle",
                                points=[1, 1, 2, 2],
                            ),
                        ],
                    ),
                )

                api_client.jobs_api.partial_update(
                    job.id,
                    patched_job_write_request={
                        "stage": "acceptance",
                        "state": "completed",
                    },
                )

        return job

    @pytest.fixture(scope="class")
    def find_sandbox_task(self, tasks, jobs, users, is_task_staff):
        def _find(
            is_staff: bool, *, has_gt_jobs: bool | None = None
        ) -> tuple[dict[str, Any], dict[str, Any]]:
            task = next(
                t
                for t in tasks
                if t["organization"] is None
                and not users[t["owner"]["id"]]["is_superuser"]
                and (
                    has_gt_jobs is None
                    or has_gt_jobs
                    == any(
                        j for j in jobs if j["task_id"] == t["id"] and j["type"] == "ground_truth"
                    )
                )
            )

            if is_staff:
                user = task["owner"]
            else:
                user = next(u for u in users if not is_task_staff(u["id"], task["id"]))

            return task, user

        return _find

    @pytest.fixture(scope="class")
    def find_sandbox_task_without_gt(self, find_sandbox_task):
        return partial(find_sandbox_task, has_gt_jobs=False)

    @pytest.fixture(scope="class")
    def find_org_task(self, tasks, jobs, users, is_org_member, is_task_staff):
        def _find(
            is_staff: bool, user_org_role: str, *, has_gt_jobs: bool | None = None
        ) -> tuple[dict[str, Any], dict[str, Any]]:
            for user in users:
                if user["is_superuser"]:
                    continue

                task = next(
                    (
                        t
                        for t in tasks
                        if t["organization"] is not None
                        and is_task_staff(user["id"], t["id"]) == is_staff
                        and is_org_member(user["id"], t["organization"], role=user_org_role)
                        and (
                            has_gt_jobs is None
                            or has_gt_jobs
                            == any(
                                j
                                for j in jobs
                                if j["task_id"] == t["id"] and j["type"] == "ground_truth"
                            )
                        )
                    ),
                    None,
                )
                if task is not None:
                    break

            assert task

            return task, user

        return _find

    @pytest.fixture(scope="class")
    def find_org_task_without_gt(self, find_org_task):
        return partial(find_org_task, has_gt_jobs=False)

    @pytest.fixture(scope="class")
    def find_sandbox_project(self, projects, tasks, users, labels, is_project_staff):
        def _find(
            is_staff: bool, has_gt_jobs: bool | None = False
        ) -> tuple[dict[str, Any], dict[str, Any]]:
            project = next(
                p
                for p in projects
                if p["organization"] is None
                if not users[p["owner"]["id"]]["is_superuser"]
                if any(l for l in labels if l.get("project_id") == p["id"])
                if any(t for t in tasks if t["project_id"] == p["id"] and t["size"])
                if (
                    has_gt_jobs is None
                    or has_gt_jobs
                    == any(t["validation_mode"] for t in tasks if t["project_id"] == p["id"])
                )
            )

            if is_staff:
                user = project["owner"]
            else:
                user = next(u for u in users if not is_project_staff(u["id"], project["id"]))

            return project, user

        return _find

    @pytest.fixture(scope="class")
    def find_sandbox_project_without_validation(self, find_sandbox_project):
        return partial(find_sandbox_project, has_gt_jobs=False)

    @pytest.fixture
    def find_org_project(
        self,
        restore_db_per_function,
        admin_user,
        projects,
        tasks,
        users,
        labels,
        is_org_member,
        is_project_staff,
    ):
        def _find(
            is_staff: bool, user_org_role: str, has_gt_jobs: bool | None = False
        ) -> tuple[dict[str, Any], dict[str, Any]]:
            project = None

            for user in users:
                if user["is_superuser"]:
                    continue

                project = next(
                    (
                        p
                        for p in projects
                        if p["organization"] is not None
                        if any(l for l in labels if l.get("project_id") == p["id"])
                        if (
                            has_gt_jobs is None
                            or has_gt_jobs
                            == any(
                                t["validation_mode"] for t in tasks if t["project_id"] == p["id"]
                            )
                        )
                        if any(t for t in tasks if t["project_id"] == p["id"] and t["size"])
                        if is_project_staff(user["id"], p["id"]) == is_staff
                        if is_org_member(user["id"], p["organization"], role=user_org_role)
                    ),
                    None,
                )
                if project is not None:
                    break

            if not project:
                project = next(
                    p
                    for p in projects
                    if p["organization"] is not None
                    if any(l for l in labels if l.get("project_id") == p["id"])
                    if any(t for t in tasks if t["project_id"] == p["id"] and t["size"])
                    if (
                        has_gt_jobs is None
                        or has_gt_jobs
                        == any(t["validation_mode"] for t in tasks if t["project_id"] == p["id"])
                    )
                )
                user = next(
                    u
                    for u in users
                    if is_org_member(u["id"], project["organization"], role=user_org_role)
                )

                if is_staff:
                    with make_api_client(admin_user) as api_client:
                        api_client.projects_api.partial_update(
                            project["id"],
                            patched_project_write_request=models.PatchedProjectWriteRequest(
                                assignee_id=user["id"]
                            ),
                        )

            return project, user

        return _find

    @pytest.fixture
    def find_org_project_without_validation(self, find_org_project):
        return partial(find_org_project, has_gt_jobs=False)

    _default_sandbox_cases = ("is_staff, allow", [(True, True), (False, False)])

    _default_org_cases = (
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
    _default_org_roles = ("owner", "maintainer", "supervisor", "worker")

    key_field_for_target = {
        "project": "project_id",
        "task": "task_id",
        "job": "job_id",
    }


@pytest.mark.usefixtures("restore_db_per_class")
class TestListQualityReports(_PermissionTestBase):
    def _test_list_reports_200(self, user, *, expected_data=None, **kwargs):
        with make_api_client(user) as api_client:
            results = get_paginated_collection(
                api_client.quality_api.list_reports_endpoint,
                return_json=True,
                **kwargs,
            )

            if expected_data is not None:
                assert DeepDiff(expected_data, results) == {}

    def _test_list_reports_403(self, user, **kwargs):
        with make_api_client(user) as api_client:
            (_, response) = api_client.quality_api.list_reports(
                **kwargs, _parse_response=False, _check_status=False
            )

            assert response.status == HTTPStatus.FORBIDDEN

    def test_can_list_quality_reports(self, admin_user, quality_reports):
        reports = sorted(quality_reports, key=lambda r: -r["id"])

        self._test_list_reports_200(admin_user, sort="-id", expected_data=reports)

    @pytest.mark.usefixtures("restore_db_per_function")
    @pytest.mark.parametrize("target", ["project", "task", "job"])
    @pytest.mark.parametrize(*_PermissionTestBase._default_sandbox_cases)
    def test_user_list_reports_in_sandbox(
        self,
        is_staff,
        allow,
        admin_user,
        tasks,
        find_sandbox_task_without_gt,
        find_sandbox_project_without_validation,
        target,
    ):
        if target == "project":
            project, user = find_sandbox_project_without_validation(is_staff)
            task = next(t for t in tasks if t["project_id"] == project["id"] and t["size"])
            self.create_gt_job(admin_user, task["id"])
            report = self.create_quality_report(user=admin_user, project_id=project["id"])
            target_id = project["id"]
        else:
            task, user = find_sandbox_task_without_gt(is_staff)
            self.create_gt_job(admin_user, task["id"])
            report = self.create_quality_report(user=admin_user, task_id=task["id"])
            target_id = task["id"]

            if target == "job":
                with make_api_client(admin_user) as api_client:
                    report = json.loads(
                        api_client.quality_api.list_reports(target="job", parent_id=report["id"])[
                            1
                        ].data
                    )["results"][0]
                    target_id = report["job_id"]

        list_kwargs = {
            "user": user["username"],
            "target": target,
            self.key_field_for_target[target]: target_id,
        }

        if allow:
            self._test_list_reports_200(expected_data=[report], **list_kwargs)
        else:
            self._test_list_reports_403(**list_kwargs)

    @pytest.mark.usefixtures("restore_db_per_function")
    @pytest.mark.parametrize("target", ["project", "task", "job"])
    @pytest.mark.parametrize(*_PermissionTestBase._default_org_cases)
    def test_user_list_reports_in_org(
        self,
        find_org_task_without_gt,
        find_org_project_without_validation,
        tasks,
        org_role,
        is_staff,
        allow,
        admin_user,
        target,
    ):
        if target == "project":
            project, user = find_org_project_without_validation(is_staff, org_role)
            task = next(t for t in tasks if t["project_id"] == project["id"] and t["size"])
            self.create_gt_job(admin_user, task["id"])
            report = self.create_quality_report(user=admin_user, project_id=project["id"])
            target_id = project["id"]
        else:
            task, user = find_org_task_without_gt(is_staff, org_role)
            self.create_gt_job(admin_user, task["id"])
            report = self.create_quality_report(user=admin_user, task_id=task["id"])
            target_id = task["id"]

            if target == "job":
                with make_api_client(admin_user) as api_client:
                    report = json.loads(
                        api_client.quality_api.list_reports(target="job", parent_id=report["id"])[
                            1
                        ].data
                    )["results"][0]
                    target_id = report["job_id"]

        list_kwargs = {
            "user": user["username"],
            "target": target,
            self.key_field_for_target[target]: target_id,
        }

        if allow:
            self._test_list_reports_200(expected_data=[report], **list_kwargs)
        else:
            self._test_list_reports_403(**list_kwargs)


@pytest.mark.usefixtures("restore_db_per_class")
class TestGetQualityReports(_PermissionTestBase):
    def _test_get_report_200(
        self, user: str, obj_id: int, *, expected_data: dict[str, Any] | None = None, **kwargs
    ):
        with make_api_client(user) as api_client:
            (_, response) = api_client.quality_api.retrieve_report(obj_id, **kwargs)
            assert response.status == HTTPStatus.OK

        if expected_data is not None:
            assert DeepDiff(expected_data, json.loads(response.data), ignore_order=True) == {}

        return response

    def _test_get_report_403(self, user: str, obj_id: int, **kwargs):
        with make_api_client(user) as api_client:
            (_, response) = api_client.quality_api.retrieve_report(
                obj_id, **kwargs, _parse_response=False, _check_status=False
            )
            assert response.status == HTTPStatus.FORBIDDEN

        return response

    @pytest.mark.usefixtures("restore_db_per_function")
    @pytest.mark.parametrize(*_PermissionTestBase._default_sandbox_cases)
    def test_user_get_report_in_sandbox_task(
        self, is_staff, allow, admin_user, find_sandbox_task_without_gt
    ):
        task, user = find_sandbox_task_without_gt(is_staff)

        self.create_gt_job(admin_user, task["id"])
        report = self.create_quality_report(user=admin_user, task_id=task["id"])

        if allow:
            self._test_get_report_200(user["username"], report["id"], expected_data=report)
        else:
            self._test_get_report_403(user["username"], report["id"])

    @pytest.mark.usefixtures("restore_db_per_function")
    @pytest.mark.parametrize(*_PermissionTestBase._default_org_cases)
    def test_user_get_report_in_org_task(
        self,
        find_org_task_without_gt,
        org_role,
        is_staff,
        allow,
        admin_user,
    ):
        task, user = find_org_task_without_gt(is_staff, org_role)

        self.create_gt_job(admin_user, task["id"])
        report = self.create_quality_report(user=admin_user, task_id=task["id"])

        if allow:
            self._test_get_report_200(user["username"], report["id"], expected_data=report)
        else:
            self._test_get_report_403(user["username"], report["id"])


@pytest.mark.usefixtures("restore_db_per_class")
class TestGetQualityReportData(_PermissionTestBase):
    def _test_get_report_data_200(
        self, user: str, obj_id: int, *, expected_data: dict[str, Any] | None = None, **kwargs
    ):
        with make_api_client(user) as api_client:
            (_, response) = api_client.quality_api.retrieve_report_data(obj_id, **kwargs)
            assert response.status == HTTPStatus.OK

        if expected_data is not None:
            assert DeepDiff(expected_data, json.loads(response.data), ignore_order=True) == {}

        return response

    def _test_get_report_data_403(self, user: str, obj_id: int, **kwargs):
        with make_api_client(user) as api_client:
            (_, response) = api_client.quality_api.retrieve_report_data(
                obj_id, **kwargs, _parse_response=False, _check_status=False
            )
            assert response.status == HTTPStatus.FORBIDDEN

        return response

    @pytest.mark.parametrize("target", ["project", "task", "job"])
    def test_can_get_full_report_data(self, admin_user, target, quality_reports):
        report = next(
            r for r in quality_reports if r[self.key_field_for_target[target]] is not None
        )
        report_id = report["id"]

        with make_api_client(admin_user) as api_client:
            (report_data, response) = api_client.quality_api.retrieve_report_data(report_id)
            assert response.status == HTTPStatus.OK

        # Just check several keys exist
        for key in ["parameters", "comparison_summary"] + (
            ["frame_results"] if target != "project" else []
        ):
            assert key in report_data.keys(), key

    @pytest.mark.usefixtures("restore_db_per_function")
    @pytest.mark.parametrize(*_PermissionTestBase._default_sandbox_cases)
    def test_user_get_report_data_in_sandbox_task(
        self, is_staff, allow, admin_user, find_sandbox_task_without_gt
    ):
        task, user = find_sandbox_task_without_gt(is_staff)

        self.create_gt_job(admin_user, task["id"])
        report = self.create_quality_report(user=admin_user, task_id=task["id"])
        report_data = json.loads(self._test_get_report_data_200(admin_user, report["id"]).data)

        if allow:
            self._test_get_report_data_200(
                user["username"], report["id"], expected_data=report_data
            )
        else:
            self._test_get_report_data_403(user["username"], report["id"])

    @pytest.mark.usefixtures("restore_db_per_function")
    @pytest.mark.parametrize(*_PermissionTestBase._default_org_cases)
    def test_user_get_report_data_in_org_task(
        self,
        find_org_task_without_gt,
        org_role,
        is_staff,
        allow,
        admin_user,
    ):
        task, user = find_org_task_without_gt(is_staff, org_role)

        self.create_gt_job(admin_user, task["id"])
        report = self.create_quality_report(user=admin_user, task_id=task["id"])
        report_data = json.loads(self._test_get_report_data_200(admin_user, report["id"]).data)

        if allow:
            self._test_get_report_data_200(
                user["username"], report["id"], expected_data=report_data
            )
        else:
            self._test_get_report_data_403(user["username"], report["id"])

    @pytest.mark.usefixtures("restore_db_per_function")
    @pytest.mark.parametrize("has_assignee", [False, True])
    def test_can_get_report_data_with_job_assignees(
        self, admin_user, jobs, users_by_name, has_assignee
    ):
        gt_job = next(
            j
            for j in jobs
            if j["type"] == "ground_truth"
            and j["stage"] == "acceptance"
            and j["state"] == "completed"
        )
        task_id = gt_job["task_id"]

        normal_job = next(j for j in jobs if j["type"] == "annotation" and j["task_id"] == task_id)
        if has_assignee:
            new_assignee = users_by_name[admin_user]
        else:
            new_assignee = None

        if bool(normal_job["assignee"]) != has_assignee:
            with make_api_client(admin_user) as api_client:
                api_client.jobs_api.partial_update(
                    normal_job["id"],
                    patched_job_write_request={
                        "assignee": new_assignee["id"] if new_assignee else None
                    },
                )

        task_report = self.create_quality_report(user=admin_user, task_id=task_id)

        with make_api_client(admin_user) as api_client:
            job_report = api_client.quality_api.list_reports(
                job_id=normal_job["id"], parent_id=task_report["id"]
            )[0].results[0]

        report_data = json.loads(self._test_get_report_data_200(admin_user, job_report["id"]).data)
        assert (
            DeepDiff(
                (
                    {
                        k: v
                        for k, v in new_assignee.items()
                        if k in ["id", "username", "first_name", "last_name"]
                    }
                    if new_assignee
                    else None
                ),
                report_data["assignee"],
            )
            == {}
        )


@pytest.mark.usefixtures("restore_db_per_function")
class TestPostQualityReports(_PermissionTestBase):
    def test_can_create_report(self, admin_user, jobs):
        gt_job = next(
            j
            for j in jobs
            if j["type"] == "ground_truth"
            and j["stage"] == "acceptance"
            and j["state"] == "completed"
        )
        task_id = gt_job["task_id"]

        report = self.create_quality_report(user=admin_user, task_id=task_id)
        assert models.QualityReport._from_openapi_data(**report)

    @pytest.mark.parametrize("has_assignee", [False, True])
    def test_can_create_report_with_job_assignees(
        self, admin_user, jobs, users_by_name, has_assignee
    ):
        gt_job = next(
            j
            for j in jobs
            if j["type"] == "ground_truth"
            and j["stage"] == "acceptance"
            and j["state"] == "completed"
        )
        task_id = gt_job["task_id"]

        normal_job = next(j for j in jobs if j["type"] == "annotation")
        if bool(normal_job["assignee"]) != has_assignee:
            with make_api_client(admin_user) as api_client:
                api_client.jobs_api.partial_update(
                    normal_job["id"],
                    patched_job_write_request={
                        "assignee": users_by_name[admin_user]["id"] if has_assignee else None
                    },
                )

        report = self.create_quality_report(user=admin_user, task_id=task_id)
        assert models.QualityReport._from_openapi_data(**report)

    def test_cannot_create_report_without_gt_job(self, admin_user, tasks):
        task_id = next(t["id"] for t in tasks if t["jobs"]["count"] == 1)

        with pytest.raises(exceptions.ApiException) as capture:
            self.create_quality_report(user=admin_user, task_id=task_id)

        assert (
            "Quality reports require a Ground Truth job in the task at the acceptance "
            "stage and in the completed state"
        ) in capture.value.body

    @pytest.mark.parametrize(
        "field_name, field_value",
        [
            ("stage", "annotation"),
            ("stage", "validation"),
            ("state", "new"),
            ("state", "in progress"),
            ("state", "rejected"),
        ],
    )
    def test_cannot_create_report_with_incomplete_gt_job(
        self, admin_user, jobs, field_name, field_value
    ):
        gt_job = next(
            j
            for j in jobs
            if j["type"] == "ground_truth"
            and j["stage"] == "acceptance"
            and j["state"] == "completed"
        )
        task_id = gt_job["task_id"]

        with make_api_client(admin_user) as api_client:
            api_client.jobs_api.partial_update(
                gt_job["id"], patched_job_write_request={field_name: field_value}
            )

        with pytest.raises(exceptions.ApiException) as capture:
            self.create_quality_report(user=admin_user, task_id=task_id)

        assert (
            "Quality reports require a Ground Truth job in the task at the acceptance "
            "stage and in the completed state"
        ) in capture.value.body

    def _test_create_report_200(self, user: str, task_id: int):
        return self.create_quality_report(user=user, task_id=task_id)

    def _test_create_report_403(self, user: str, task_id: int):
        with make_api_client(user) as api_client:
            (_, response) = api_client.quality_api.create_report(
                quality_report_create_request=models.QualityReportCreateRequest(task_id=task_id),
                _parse_response=False,
                _check_status=False,
            )
            assert response.status == HTTPStatus.FORBIDDEN

        return response

    @pytest.mark.parametrize(*_PermissionTestBase._default_sandbox_cases)
    def test_user_create_report_in_sandbox_task(
        self, is_staff, allow, admin_user, find_sandbox_task_without_gt
    ):
        task, user = find_sandbox_task_without_gt(is_staff)

        self.create_gt_job(admin_user, task["id"])

        if allow:
            self._test_create_report_200(user["username"], task["id"])
        else:
            self._test_create_report_403(user["username"], task["id"])

    @pytest.mark.parametrize(*_PermissionTestBase._default_org_cases)
    def test_user_create_report_in_org_task(
        self,
        find_org_task_without_gt,
        org_role,
        is_staff,
        allow,
        admin_user,
    ):
        task, user = find_org_task_without_gt(is_staff, org_role)

        self.create_gt_job(admin_user, task["id"])

        if allow:
            self._test_create_report_200(user["username"], task["id"])
        else:
            self._test_create_report_403(user["username"], task["id"])

    @staticmethod
    def _initialize_report_creation(task_id: int, user: str) -> str:
        with make_api_client(user) as api_client:
            (_, response) = api_client.quality_api.create_report(
                quality_report_create_request=models.QualityReportCreateRequest(task_id=task_id),
                _parse_response=False,
            )
            rq_id = json.loads(response.data)["rq_id"]
            assert rq_id

            return rq_id

    # users with task:view rights can check status of report creation
    def _test_check_status_of_report_creation(
        self,
        rq_id: str,
        *,
        task_staff: str,
        another_user: str,
        another_user_status: int = HTTPStatus.FORBIDDEN,
    ):
        with make_api_client(another_user) as api_client:
            (_, response) = api_client.requests_api.retrieve(
                rq_id, _parse_response=False, _check_status=False
            )
            assert response.status == another_user_status

        with make_api_client(task_staff) as api_client:
            wait_background_request(api_client, rq_id)

    @pytest.mark.parametrize(
        "role",
        # owner and maintainer have rights even without being assigned to a task
        ("supervisor", "worker"),
    )
    def test_task_assignee_can_check_status_of_report_creation_in_org(
        self,
        find_org_task_without_gt: Callable[[bool, str], tuple[dict[str, Any], dict[str, Any]]],
        role: str,
        admin_user: str,
    ):
        task, another_user = find_org_task_without_gt(is_staff=False, user_org_role=role)
        self.create_gt_job(admin_user, task["id"])

        task_owner = task["owner"]

        rq_id = self._initialize_report_creation(task_id=task["id"], user=task_owner["username"])
        self._test_check_status_of_report_creation(
            rq_id,
            task_staff=task_owner["username"],
            another_user=another_user["username"],
        )

        with make_api_client(task_owner["username"]) as api_client:
            api_client.tasks_api.partial_update(
                task["id"],
                patched_task_write_request=models.PatchedTaskWriteRequest(
                    assignee_id=another_user["id"]
                ),
            )

        self._test_check_status_of_report_creation(
            rq_id,
            task_staff=task_owner["username"],
            another_user=another_user["username"],
            another_user_status=HTTPStatus.OK,
        )

    def test_user_without_rights_cannot_check_status_of_report_creation_in_sandbox(
        self,
        find_sandbox_task_without_gt: Callable[[bool], tuple[dict[str, Any], dict[str, Any]]],
        admin_user: str,
        users: Iterable,
    ):
        task, task_staff = find_sandbox_task_without_gt(is_staff=True)

        self.create_gt_job(admin_user, task["id"])

        another_user = next(
            u
            for u in users
            if (
                u["id"] != task_staff["id"]
                and not u["is_superuser"]
                and u["id"] != task["owner"]["id"]
                and u["id"] != (task["assignee"] or {}).get("id")
            )
        )
        rq_id = self._initialize_report_creation(task["id"], task_staff["username"])
        self._test_check_status_of_report_creation(
            rq_id, task_staff=task_staff["username"], another_user=another_user["username"]
        )

    @pytest.mark.parametrize(
        "same_org, role",
        [
            pair
            for pair in product([True, False], _PermissionTestBase._default_org_roles)
            if not (pair[0] and pair[1] in ["owner", "maintainer"])
        ],
    )
    def test_user_without_rights_cannot_check_status_of_report_creation_in_org(
        self,
        same_org: bool,
        role: str,
        admin_user: str,
        find_org_task_without_gt: Callable[[bool, str], tuple[dict[str, Any], dict[str, Any]]],
        organizations,
    ):
        task, task_staff = find_org_task_without_gt(is_staff=True, user_org_role="supervisor")

        self.create_gt_job(admin_user, task["id"])

        # create another user that passes the requirements
        another_user = register_new_user(f"{same_org}{role}")
        org_id = (
            task["organization"]
            if same_org
            else next(o for o in organizations if o["id"] != task["organization"])["id"]
        )
        invite_user_to_org(another_user["email"], org_id, role)

        rq_id = self._initialize_report_creation(task["id"], task_staff["username"])
        self._test_check_status_of_report_creation(
            rq_id, task_staff=task_staff["username"], another_user=another_user["username"]
        )

    @pytest.mark.parametrize("is_sandbox", (True, False))
    def test_admin_can_check_status_of_report_creation(
        self,
        is_sandbox: bool,
        users: Iterable,
        admin_user: str,
        find_org_task_without_gt: Callable[[bool, str], tuple[dict[str, Any], dict[str, Any]]],
        find_sandbox_task_without_gt: Callable[[bool], tuple[dict[str, Any], dict[str, Any]]],
    ):
        if is_sandbox:
            task, task_staff = find_sandbox_task_without_gt(is_staff=True)
        else:
            task, task_staff = find_org_task_without_gt(is_staff=True, user_org_role="owner")

        admin = next(
            u
            for u in users
            if (
                u["is_superuser"]
                and u["id"] != task_staff["id"]
                and u["id"] != task["owner"]["id"]
                and u["id"] != (task["assignee"] or {}).get("id")
            )
        )

        self.create_gt_job(admin_user, task["id"])

        rq_id = self._initialize_report_creation(task["id"], task_staff["username"])

        with make_api_client(admin["username"]) as api_client:
            wait_background_request(api_client, rq_id)


class TestSimpleQualityReportsFilters(CollectionSimpleFilterTestBase):
    @pytest.fixture(autouse=True)
    def setup(self, restore_db_per_class, admin_user, quality_reports, jobs, tasks, projects):
        self.user = admin_user
        self.samples = quality_reports
        self.job_samples = jobs
        self.task_samples = tasks
        self.project_samples = projects

    def _get_endpoint(self, api_client: ApiClient) -> Endpoint:
        return api_client.quality_api.list_reports_endpoint

    def _get_field_samples(self, field: str) -> tuple[Any, list[dict[str, Any]]]:
        def _get_job_reports(task_ids: Collection[int]) -> list[dict[str, Any]]:
            job_ids = set(j["id"] for j in self.job_samples if j["task_id"] in task_ids)
            job_reports = [
                r for r in self.samples if self._get_field(r, self._map_field("job_id")) in job_ids
            ]
            return job_reports

        if field == "project_id":
            # This filter includes both the project, task and nested job reports
            project_id, project_reports = super()._get_field_samples(field)
            return project_id, list(project_reports) + _get_job_reports(
                [r["task_id"] for r in project_reports]
            )
        elif field == "task_id":
            # This filter includes both the task and nested job reports
            task_id, task_reports = super()._get_field_samples(field)
            task_reports = list(task_reports) + _get_job_reports([task_id])
            return task_id, task_reports
        elif field == "org_id":
            org_id = self.task_samples[
                next(
                    s
                    for s in self.samples
                    if s["task_id"] and self.task_samples[s["task_id"]]["organization"]
                )["task_id"]
            ]["organization"]
            return org_id, [
                s
                for s in self.samples
                if s["job_id"]
                and self.job_samples[s["job_id"]]["organization"] == org_id
                or s["task_id"]
                and self.task_samples[s["task_id"]]["organization"] == org_id
                or s["project_id"]
                and self.project_samples[s["project_id"]]["organization"] == org_id
            ]
        else:
            return super()._get_field_samples(field)

    @pytest.mark.parametrize(
        "field",
        ("project_id", "task_id", "job_id", "parent_id", "target", "org_id"),
    )
    def test_can_use_simple_filter_for_object_list(self, field):
        return super()._test_can_use_simple_filter_for_object_list(field)


@pytest.mark.usefixtures("restore_db_per_class")
class TestListQualityConflicts(_PermissionTestBase):
    def _test_list_conflicts_200(self, user, report_id, *, expected_data=None, **kwargs):
        with make_api_client(user) as api_client:
            results = get_paginated_collection(
                api_client.quality_api.list_conflicts_endpoint,
                return_json=True,
                report_id=report_id,
                **kwargs,
            )

            if expected_data is not None:
                assert DeepDiff(expected_data, results) == {}

        return results

    def _test_list_conflicts_403(self, user, report_id, **kwargs):
        with make_api_client(user) as api_client:
            (_, response) = api_client.quality_api.list_conflicts(
                report_id=report_id, **kwargs, _parse_response=False, _check_status=False
            )

            assert response.status == HTTPStatus.FORBIDDEN

    def test_can_list_job_report_conflicts(self, admin_user, quality_reports, quality_conflicts):
        report = next(r for r in quality_reports if r["job_id"])
        conflicts = [c for c in quality_conflicts if c["report_id"] == report["id"]]

        self._test_list_conflicts_200(admin_user, report["id"], expected_data=conflicts)

    @pytest.mark.usefixtures("restore_db_per_function")
    @pytest.mark.parametrize(*_PermissionTestBase._default_sandbox_cases)
    def test_user_list_conflicts_in_sandbox_task(
        self, is_staff, allow, admin_user, find_sandbox_task_without_gt
    ):
        task, user = find_sandbox_task_without_gt(is_staff)

        self.create_gt_job(admin_user, task["id"])
        report = self.create_quality_report(user=admin_user, task_id=task["id"])
        conflicts = self._test_list_conflicts_200(admin_user, report_id=report["id"])
        assert conflicts

        if allow:
            self._test_list_conflicts_200(user["username"], report["id"], expected_data=conflicts)
        else:
            self._test_list_conflicts_403(user["username"], report["id"])

    @pytest.mark.usefixtures("restore_db_per_function")
    @pytest.mark.parametrize(*_PermissionTestBase._default_org_cases)
    def test_user_list_conflicts_in_org_task(
        self,
        find_org_task_without_gt,
        org_role,
        is_staff,
        allow,
        admin_user,
    ):
        task, user = find_org_task_without_gt(is_staff, org_role)
        user = user["username"]

        self.create_gt_job(admin_user, task["id"])
        report = self.create_quality_report(user=admin_user, task_id=task["id"])
        conflicts = self._test_list_conflicts_200(admin_user, report_id=report["id"])
        assert conflicts

        if allow:
            self._test_list_conflicts_200(user, report["id"], expected_data=conflicts)
        else:
            self._test_list_conflicts_403(user, report["id"])


class TestSimpleQualityConflictsFilters(CollectionSimpleFilterTestBase):
    @pytest.fixture(autouse=True)
    def setup(
        self,
        restore_db_per_class,
        admin_user,
        quality_conflicts,
        quality_reports,
        jobs,
        tasks,
        projects,
    ):
        self.user = admin_user
        self.samples = quality_conflicts
        self.report_samples = quality_reports
        self.job_samples = jobs
        self.task_samples = tasks
        self.project_samples = projects

    def _get_endpoint(self, api_client: ApiClient) -> Endpoint:
        return api_client.quality_api.list_conflicts_endpoint

    def _get_field_samples(self, field: str) -> tuple[Any, list[dict[str, Any]]]:
        def _get_job_reports(task_ids: Collection[int]) -> list[dict[str, Any]]:
            job_ids = set(j["id"] for j in self.job_samples if j["task_id"] in task_ids)
            job_reports = [
                r
                for r in self.report_samples
                if self._get_field(r, self._map_field("job_id")) in job_ids
            ]
            return job_reports

        if field == "job_id":
            # This field is not included in the response
            job_id = self._find_valid_field_value(self.report_samples, field_path=["job_id"])
            job_reports = set(r["id"] for r in self.report_samples if r["job_id"] == job_id)
            job_conflicts = [
                c
                for c in self.samples
                if self._get_field(c, self._map_field("report_id")) in job_reports
            ]
            return job_id, job_conflicts
        elif field == "task_id":
            # This field is not included in the response
            task_id = self._find_valid_field_value(self.report_samples, field_path=["task_id"])
            task_reports = [r for r in self.report_samples if r["task_id"] == task_id]
            task_report_ids = {r["id"] for r in task_reports}
            task_report_ids |= {r["id"] for r in _get_job_reports([task_id])}
            task_conflicts = [
                c
                for c in self.samples
                if self._get_field(c, self._map_field("report_id")) in task_report_ids
            ]
            return task_id, task_conflicts
        elif field == "project_id":
            # This field is not included in the response
            project_id = self._find_valid_field_value(
                self.report_samples, field_path=["project_id"]
            )
            project_reports = [r for r in self.report_samples if r["project_id"] == project_id]
            project_report_ids = {r["id"] for r in project_reports}
            project_report_ids |= {
                r["id"] for r in _get_job_reports([r["task_id"] for r in project_reports])
            }
            project_conflicts = [
                c
                for c in self.samples
                if self._get_field(c, self._map_field("report_id")) in project_report_ids
            ]
            return project_id, project_conflicts
        elif field == "org_id":
            org_id = self.task_samples[
                next(
                    s
                    for s in self.report_samples
                    if s["task_id"] and self.task_samples[s["task_id"]]["organization"]
                )["task_id"]
            ]["organization"]
            report_ids = set(
                s["id"]
                for s in self.report_samples
                if s["job_id"]
                and self.job_samples[s["job_id"]]["organization"] == org_id
                or s["task_id"]
                and self.task_samples[s["task_id"]]["organization"] == org_id
            )
            return org_id, [c for c in self.samples if c["report_id"] in report_ids]
        else:
            return super()._get_field_samples(field)

    @pytest.mark.parametrize(
        "field",
        ("report_id", "severity", "type", "frame", "job_id", "task_id", "project_id", "org_id"),
    )
    def test_can_use_simple_filter_for_object_list(self, field):
        return super()._test_can_use_simple_filter_for_object_list(field)

    @pytest.mark.parametrize("filter_name", ["project_id", "task_id", "job_id"])
    def test_cannot_use_object_id_filters_without_permissions(
        self, is_project_staff, is_task_staff, is_job_staff, users, filter_name
    ):
        # Find a project where the user doesn't have permissions
        non_admin_user = next(
            u["username"] for u in users if not u["is_superuser"] and u["username"] != self.user
        )

        if filter_name == "project_id":
            samples = self.project_samples
            is_staff = is_project_staff
        elif filter_name == "task_id":
            samples = self.task_samples
            is_staff = is_task_staff
        elif filter_name == "job_id":
            samples = self.job_samples
            is_staff = is_job_staff
        else:
            assert False

        obj_id = next(obj["id"] for obj in samples if not is_staff(non_admin_user, obj["id"]))

        with make_api_client(non_admin_user) as api_client:
            response = api_client.quality_api.list_reports(
                **{filter_name: obj_id}, _parse_response=False, _check_status=False
            )[1]

        assert response.status == HTTPStatus.FORBIDDEN


class TestSimpleQualitySettingsFilters(CollectionSimpleFilterTestBase):
    @pytest.fixture(autouse=True)
    def setup(self, restore_db_per_class, admin_user, quality_settings, tasks, projects):
        self.user = admin_user
        self.samples = quality_settings
        self.task_samples = tasks
        self.project_samples = projects

    def _get_endpoint(self, api_client: ApiClient) -> Endpoint:
        return api_client.quality_api.list_settings_endpoint

    def _get_field_samples(self, field):
        if field == "parent_type":
            # This field is not included in the response
            parent_type = "project"
            parent_type_reports = [s for s in self.samples if s["project_id"]]
            return parent_type, parent_type_reports
        elif field == "project_id":
            # Nested task settings are also included
            project_id = self._find_valid_field_value(self.samples, field_path=["project_id"])
            project_task_ids = set(
                t["id"] for t in self.task_samples if t["project_id"] == project_id
            )
            return project_id, [
                s
                for s in self.samples
                if s["project_id"] == project_id or s["task_id"] in project_task_ids
            ]
        elif field == "org_id":
            # This field is not included in the response
            org_id = self.task_samples[
                next(
                    s
                    for s in self.samples
                    if s["task_id"] and self.task_samples[s["task_id"]]["organization"]
                )["task_id"]
            ]["organization"]
            return org_id, [
                s
                for s in self.samples
                if s["task_id"]
                and self.task_samples[s["task_id"]]["organization"] == org_id
                or s["project_id"]
                and self.project_samples[s["project_id"]]["organization"] == org_id
            ]
        else:
            return super()._get_field_samples(field)

    @pytest.mark.parametrize(
        "field",
        (
            "task_id",
            "project_id",
            "parent_type",
            "inherit",
            "org_id",
        ),
    )
    def test_can_use_simple_filter_for_object_list(self, field):
        return super()._test_can_use_simple_filter_for_object_list(field)

    @pytest.mark.parametrize("filter_name", ["project_id", "task_id"])
    def test_cannot_use_object_id_filters_without_permissions(
        self, is_project_staff, is_task_staff, projects, tasks, users, filter_name
    ):
        # Find a project where the user doesn't have permissions
        non_admin_user = next(
            u["username"] for u in users if not u["is_superuser"] and u["username"] != self.user
        )

        if filter_name == "project_id":
            samples = projects
            is_staff = is_project_staff
        elif filter_name == "task_id":
            samples = tasks
            is_staff = is_task_staff
        else:
            assert False

        obj_id = next(obj["id"] for obj in samples if not is_staff(non_admin_user, obj["id"]))

        with make_api_client(non_admin_user) as api_client:
            response = api_client.quality_api.list_reports(
                **{filter_name: obj_id}, _parse_response=False, _check_status=False
            )[1]

        assert response.status == HTTPStatus.FORBIDDEN


@pytest.mark.usefixtures("restore_db_per_class")
class TestListSettings(_PermissionTestBase):
    def _test_list_settings_200(
        self, user: str, task_id: int, *, expected_data: dict[str, Any] | None = None, **kwargs
    ):
        with make_api_client(user) as api_client:
            actual = get_paginated_collection(
                api_client.quality_api.list_settings_endpoint,
                task_id=task_id,
                **kwargs,
                return_json=True,
            )

        if expected_data is not None:
            assert DeepDiff(expected_data, actual, ignore_order=True) == {}

    def _test_list_settings_403(self, user: str, task_id: int, **kwargs):
        with make_api_client(user) as api_client:
            (_, response) = api_client.quality_api.list_settings(
                task_id=task_id, **kwargs, _parse_response=False, _check_status=False
            )
            assert response.status == HTTPStatus.FORBIDDEN

        return response

    @pytest.mark.parametrize(*_PermissionTestBase._default_sandbox_cases)
    def test_user_list_settings_in_sandbox(
        self, quality_settings, find_sandbox_task, is_staff, allow
    ):
        task, user = find_sandbox_task(is_staff)

        settings = [s for s in quality_settings if s["task_id"] == task["id"]]

        if allow:
            self._test_list_settings_200(
                user["username"], task_id=task["id"], expected_data=settings
            )
        else:
            self._test_list_settings_403(user["username"], task_id=task["id"])

    @pytest.mark.parametrize(*_PermissionTestBase._default_org_cases)
    def test_user_list_settings_in_org_task(
        self,
        find_org_task,
        org_role,
        is_staff,
        allow,
        quality_settings,
    ):
        task, user = find_org_task(is_staff, org_role)

        settings = [s for s in quality_settings if s["task_id"] == task["id"]]
        org_id = task["organization"]

        if allow:
            self._test_list_settings_200(
                user["username"], task_id=task["id"], expected_data=settings, org_id=org_id
            )
        else:
            self._test_list_settings_403(user["username"], task_id=task["id"], org_id=org_id)


@pytest.mark.usefixtures("restore_db_per_class")
class TestGetSettings(_PermissionTestBase):
    def _test_get_settings_200(
        self, user: str, obj_id: int, *, expected_data: dict[str, Any] | None = None, **kwargs
    ):
        with make_api_client(user) as api_client:
            (_, response) = api_client.quality_api.retrieve_settings(obj_id, **kwargs)
            assert response.status == HTTPStatus.OK

        if expected_data is not None:
            assert DeepDiff(expected_data, json.loads(response.data), ignore_order=True) == {}

        return response

    def _test_get_settings_403(self, user: str, obj_id: int, **kwargs):
        with make_api_client(user) as api_client:
            (_, response) = api_client.quality_api.retrieve_settings(
                obj_id, **kwargs, _parse_response=False, _check_status=False
            )
            assert response.status == HTTPStatus.FORBIDDEN

        return response

    def test_can_get_settings(self, admin_user, quality_settings):
        settings = next(iter(quality_settings))
        settings_id = settings["id"]
        self._test_get_settings_200(admin_user, settings_id, expected_data=settings)

    @pytest.mark.parametrize(*_PermissionTestBase._default_sandbox_cases)
    def test_user_get_settings_in_sandbox_task(
        self, quality_settings, find_sandbox_task, is_staff, allow
    ):
        task, user = find_sandbox_task(is_staff)

        settings = next(s for s in quality_settings if s["task_id"] == task["id"])
        settings_id = settings["id"]

        if allow:
            self._test_get_settings_200(user["username"], settings_id, expected_data=settings)
        else:
            self._test_get_settings_403(user["username"], settings_id)

    @pytest.mark.parametrize(*_PermissionTestBase._default_org_cases)
    def test_user_get_settings_in_org_task(
        self,
        find_org_task,
        org_role,
        is_staff,
        allow,
        quality_settings,
    ):
        task, user = find_org_task(is_staff, org_role)

        settings = next(s for s in quality_settings if s["task_id"] == task["id"])
        settings_id = settings["id"]

        if allow:
            self._test_get_settings_200(user["username"], settings_id, expected_data=settings)
        else:
            self._test_get_settings_403(user["username"], settings_id)


@pytest.mark.usefixtures("restore_db_per_function")
class TestPatchSettings(_PermissionTestBase):
    def _test_patch_settings_200(
        self,
        user: str,
        obj_id: int,
        data: dict[str, Any],
        *,
        expected_data: dict[str, Any] | None = None,
        **kwargs,
    ):
        with make_api_client(user) as api_client:
            (_, response) = api_client.quality_api.partial_update_settings(
                obj_id, patched_quality_settings_request=data, **kwargs
            )
            assert response.status == HTTPStatus.OK

        if expected_data is not None:
            assert (
                DeepDiff(
                    expected_data,
                    json.loads(response.data),
                    exclude_paths=["root['updated_date']"],
                    ignore_order=True,
                )
                == {}
            )

        return response

    def _test_patch_settings_403(self, user: str, obj_id: int, data: dict[str, Any], **kwargs):
        with make_api_client(user) as api_client:
            (_, response) = api_client.quality_api.partial_update_settings(
                obj_id,
                patched_quality_settings_request=data,
                **kwargs,
                _parse_response=False,
                _check_status=False,
            )
            assert response.status == HTTPStatus.FORBIDDEN

        return response

    def _get_request_data(self, data: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
        patched_data = deepcopy(data)

        for field, value in data.items():
            if isinstance(value, bool):
                patched_data[field] = not value
            elif isinstance(value, float):
                patched_data[field] = 1 - value

        expected_data = deepcopy(patched_data)

        return patched_data, expected_data

    def test_can_patch_settings(self, admin_user, quality_settings):
        settings = next(iter(quality_settings))
        settings_id = settings["id"]
        data, expected_data = self._get_request_data(settings)
        self._test_patch_settings_200(admin_user, settings_id, data, expected_data=expected_data)

    @pytest.mark.parametrize(*_PermissionTestBase._default_sandbox_cases)
    def test_user_patch_settings_in_sandbox_task(
        self, quality_settings, find_sandbox_task, is_staff, allow
    ):
        task, user = find_sandbox_task(is_staff)

        settings = next(s for s in quality_settings if s["task_id"] == task["id"])
        settings_id = settings["id"]
        data, expected_data = self._get_request_data(settings)

        if allow:
            self._test_patch_settings_200(
                user["username"], settings_id, data, expected_data=expected_data
            )
        else:
            self._test_patch_settings_403(user["username"], settings_id, data)

    @pytest.mark.parametrize(*_PermissionTestBase._default_org_cases)
    def test_user_patch_settings_in_org_task(
        self,
        find_org_task,
        org_role,
        is_staff,
        allow,
        quality_settings,
    ):
        task, user = find_org_task(is_staff, org_role)

        settings = next(s for s in quality_settings if s["task_id"] == task["id"])
        settings_id = settings["id"]
        data, expected_data = self._get_request_data(settings)

        if allow:
            self._test_patch_settings_200(
                user["username"], settings_id, data, expected_data=expected_data
            )
        else:
            self._test_patch_settings_403(user["username"], settings_id, data)


@pytest.mark.usefixtures("restore_db_per_function")
class TestQualityReportMetrics(_PermissionTestBase):
    demo_task_id = 22  # this task reproduces all the checkable cases
    demo_task_id_multiple_jobs = 23  # this task reproduces cases for multiple jobs

    @pytest.mark.parametrize("task_id", [demo_task_id])
    def test_report_summary(self, task_id, tasks, jobs, quality_reports):
        gt_job = next(j for j in jobs if j["task_id"] == task_id and j["type"] == "ground_truth")
        task = tasks[task_id]
        report = next(r for r in quality_reports if r["task_id"] == task_id)

        summary = report["summary"]
        assert 0 < summary["conflict_count"]
        assert all(summary["conflicts_by_type"].values())
        assert summary["conflict_count"] == sum(summary["conflicts_by_type"].values())
        assert summary["conflict_count"] == summary["warning_count"] + summary["error_count"]
        assert 0 < summary["valid_count"]
        assert summary["valid_count"] < summary["ds_count"]
        assert summary["valid_count"] < summary["gt_count"]
        assert summary["frame_count"] == gt_job["frame_count"]
        assert summary["frame_share"] == summary["frame_count"] / task["size"]

    def test_unmodified_task_produces_the_same_metrics(self, admin_user, quality_reports):
        old_report = max(
            (
                r
                for r in quality_reports
                if r["task_id"] == self.demo_task_id
                if r["target"] == "task"
            ),
            key=lambda r: r["id"],
        )
        task_id = old_report["task_id"]

        new_report = self.create_quality_report(user=admin_user, task_id=task_id)

        with make_api_client(admin_user) as api_client:
            (old_report_data, _) = api_client.quality_api.retrieve_report_data(old_report["id"])
            (new_report_data, _) = api_client.quality_api.retrieve_report_data(new_report["id"])

        assert (
            DeepDiff(
                new_report,
                old_report,
                ignore_order=True,
                exclude_paths=["root['created_date']", "root['id']"],
            )
            == {}
        )
        assert (
            DeepDiff(
                new_report_data,
                old_report_data,
                ignore_order=True,
                exclude_paths=[
                    "root['created_date']",
                    "root['id']",
                    "root['parameters']['included_annotation_types']",
                ],
            )
            == {}
        )

    def test_modified_task_produces_different_metrics(
        self, admin_user, quality_reports, jobs, labels
    ):
        gt_job = next(
            j for j in jobs if j["type"] == "ground_truth" and j["task_id"] == self.demo_task_id
        )
        task_id = gt_job["task_id"]
        old_report = max(
            (r for r in quality_reports if r["task_id"] == task_id), key=lambda r: r["id"]
        )
        job_labels = [
            l
            for l in labels
            if l.get("task_id") == task_id
            or gt_job.get("project_id")
            and l.get("project_id") == gt_job.get("project_id")
            if not l["parent_id"]
        ]

        with make_api_client(admin_user) as api_client:
            api_client.jobs_api.partial_update_annotations(
                "create",
                gt_job["id"],
                patched_labeled_data_request=dict(
                    shapes=[
                        dict(
                            frame=gt_job["start_frame"],
                            label_id=job_labels[0]["id"],
                            type="rectangle",
                            points=[1, 1, 2, 2],
                        ),
                    ],
                ),
            )

        new_report = self.create_quality_report(user=admin_user, task_id=task_id)
        assert new_report["summary"]["conflict_count"] > old_report["summary"]["conflict_count"]

    @pytest.mark.parametrize("task_id", [demo_task_id])
    @pytest.mark.parametrize(
        "parameter",
        [
            "check_covered_annotations",
            "compare_attributes",
            "compare_groups",
            "group_match_threshold",
            "iou_threshold",
            "line_orientation_threshold",
            "line_thickness",
            "low_overlap_threshold",
            "object_visibility_threshold",
            "oks_sigma",
            "compare_line_orientation",
            "panoptic_comparison",
            "point_size_base",
            "empty_is_annotated",
        ],
    )
    def test_settings_affect_metrics(
        self, admin_user, quality_reports, quality_settings, task_id, parameter
    ):
        old_report = max(
            (r for r in quality_reports if r["task_id"] == task_id), key=lambda r: r["id"]
        )
        task_id = old_report["task_id"]

        settings = deepcopy(next(s for s in quality_settings if s["task_id"] == task_id))
        if isinstance(settings[parameter], bool):
            settings[parameter] = not settings[parameter]
        elif isinstance(settings[parameter], float):
            settings[parameter] = 1 - settings[parameter]
            if parameter == "group_match_threshold":
                settings[parameter] = 0.9
        elif parameter == "point_size_base":
            settings[parameter] = next(
                v
                for v in models.QualityPointSizeBase.allowed_values[("value",)].values()
                if v != settings[parameter]
            )
        else:
            assert False

        with make_api_client(admin_user) as api_client:
            api_client.quality_api.partial_update_settings(
                settings["id"], patched_quality_settings_request=settings
            )

        new_report = self.create_quality_report(user=admin_user, task_id=task_id)
        if parameter == "empty_is_annotated":
            assert new_report["summary"]["valid_count"] != old_report["summary"]["valid_count"]
            assert new_report["summary"]["total_count"] != old_report["summary"]["total_count"]
            assert new_report["summary"]["ds_count"] != old_report["summary"]["ds_count"]
            assert new_report["summary"]["gt_count"] != old_report["summary"]["gt_count"]
        else:
            assert (
                new_report["summary"]["conflict_count"] != old_report["summary"]["conflict_count"]
            )

    def test_old_report_can_be_loaded(self, admin_user, quality_reports):
        report = min((r for r in quality_reports if r["task_id"]), key=lambda r: r["id"])
        assert report["created_date"] < "2024"

        with make_api_client(admin_user) as api_client:
            (report_data, _) = api_client.quality_api.retrieve_report_data(report["id"])

        # This report should have been created before the Jaccard index was included.
        for d in [report_data["comparison_summary"], *report_data["frame_results"].values()]:
            assert d["annotations"]["confusion_matrix"]["jaccard_index"] is None

    def test_accumulation_annotation_conflicts_multiple_jobs(self, admin_user):
        report = self.create_quality_report(
            user=admin_user, task_id=self.demo_task_id_multiple_jobs
        )
        with make_api_client(admin_user) as api_client:
            (_, response) = api_client.quality_api.retrieve_report_data(report["id"])
            assert response.status == HTTPStatus.OK
        report_data = json.loads(response.data)
        task_confusion_matrix = report_data["comparison_summary"]["annotations"][
            "confusion_matrix"
        ]["rows"]

        expected_frame_confusion_matrix = {
            "5": [[1, 0, 0], [0, 0, 0], [0, 0, 0]],
            "7": [[1, 0, 0], [0, 0, 0], [0, 0, 0]],
            "4": [[0, 0, 1], [0, 0, 0], [1, 0, 0]],
        }
        for frame_id in report_data["frame_results"].keys():
            assert (
                report_data["frame_results"][frame_id]["annotations"]["confusion_matrix"]["rows"]
                == expected_frame_confusion_matrix[frame_id]
            )

        assert task_confusion_matrix == [[2, 0, 1], [0, 0, 0], [1, 0, 0]]

    @pytest.mark.parametrize("task_id", [8])
    def test_can_compute_quality_if_non_skeleton_label_follows_skeleton_label(
        self, admin_user, labels, task_id
    ):
        new_label_name = "non_skeleton"
        with make_api_client(admin_user) as api_client:
            task_labels = [label for label in labels if label.get("task_id") == task_id]
            assert any(label["type"] == "skeleton" for label in task_labels)
            task_labels += [{"name": new_label_name, "type": "any"}]
            api_client.tasks_api.partial_update(
                task_id,
                patched_task_write_request=models.PatchedTaskWriteRequest(labels=task_labels),
            )

            new_label_obj, _ = api_client.labels_api.list(task_id=task_id, name=new_label_name)
            new_label_id = new_label_obj.results[0].id
            api_client.tasks_api.update_annotations(
                task_id,
                labeled_data_request={
                    "shapes": [
                        models.LabeledShapeRequest(
                            type="rectangle",
                            frame=0,
                            label_id=new_label_id,
                            points=[0, 0, 1, 1],
                        )
                    ]
                },
            )

        self.create_gt_job(admin_user, task_id)

        report = self.create_quality_report(user=admin_user, task_id=task_id)
        with make_api_client(admin_user) as api_client:
            (_, response) = api_client.quality_api.retrieve_report_data(report["id"])
            assert response.status == HTTPStatus.OK

    def test_excluded_gt_job_frames_are_not_included_in_honeypot_task_quality_report(
        self, admin_user, tasks, jobs
    ):
        task_id = next(t["id"] for t in tasks if t["validation_mode"] == "gt_pool")
        gt_job = next(j for j in jobs if j["task_id"] == task_id if j["type"] == "ground_truth")
        gt_job_frames = range(gt_job["start_frame"], gt_job["stop_frame"] + 1)

        with make_api_client(admin_user) as api_client:
            gt_job_meta, _ = api_client.jobs_api.retrieve_data_meta(gt_job["id"])
            gt_frame_names = [f.name for f in gt_job_meta.frames]

            task_meta, _ = api_client.tasks_api.retrieve_data_meta(task_id)
            honeypot_frames = [
                i
                for i, f in enumerate(task_meta.frames)
                if f.name in gt_frame_names and i not in gt_job_frames
            ]
            gt_frame_uses = {
                name: (gt_job["start_frame"] + gt_frame_names.index(name), list(ids))
                for name, ids in groupby(
                    sorted(
                        [
                            i
                            for i in range(task_meta.size)
                            if task_meta.frames[i].name in gt_frame_names
                        ],
                        key=lambda i: task_meta.frames[i].name,
                    ),
                    key=lambda i: task_meta.frames[i].name,
                )
            }

            api_client.jobs_api.partial_update(
                gt_job["id"],
                patched_job_write_request=models.PatchedJobWriteRequest(
                    stage="acceptance", state="completed"
                ),
            )
            report = self.create_quality_report(user=admin_user, task_id=task_id)

            (_, response) = api_client.quality_api.retrieve_report_data(report["id"])
            assert response.status == HTTPStatus.OK
            assert honeypot_frames == json.loads(response.data)["comparison_summary"]["frames"]

            excluded_gt_frame, excluded_gt_frame_honeypots = next(
                (i, honeypots) for i, honeypots in gt_frame_uses.values() if len(honeypots) > 1
            )
            api_client.jobs_api.partial_update_data_meta(
                gt_job["id"],
                patched_job_data_meta_write_request=models.PatchedJobDataMetaWriteRequest(
                    deleted_frames=[excluded_gt_frame]
                ),
            )

            report = self.create_quality_report(user=admin_user, task_id=task_id)

            (_, response) = api_client.quality_api.retrieve_report_data(report["id"])
            assert response.status == HTTPStatus.OK
            assert [
                v for v in honeypot_frames if v not in excluded_gt_frame_honeypots
            ] == json.loads(response.data)["comparison_summary"]["frames"]

    @pytest.mark.parametrize("task_id", [23])
    def test_excluded_gt_job_frames_are_not_included_in_simple_gt_job_task_quality_report(
        self, admin_user, task_id: int, jobs
    ):
        gt_job = next(j for j in jobs if j["task_id"] == task_id if j["type"] == "ground_truth")

        with make_api_client(admin_user) as api_client:
            gt_job_meta, _ = api_client.jobs_api.retrieve_data_meta(gt_job["id"])
            gt_frames = [
                (f - gt_job_meta.start_frame) // parse_frame_step(gt_job_meta.frame_filter)
                for f in gt_job_meta.included_frames
            ]

            api_client.jobs_api.partial_update(
                gt_job["id"],
                patched_job_write_request=models.PatchedJobWriteRequest(
                    stage="acceptance", state="completed"
                ),
            )
            report = self.create_quality_report(user=admin_user, task_id=task_id)

            (_, response) = api_client.quality_api.retrieve_report_data(report["id"])
            assert response.status == HTTPStatus.OK
            assert gt_frames == json.loads(response.data)["comparison_summary"]["frames"]

            excluded_gt_frame = gt_frames[0]
            api_client.jobs_api.partial_update_data_meta(
                gt_job["id"],
                patched_job_data_meta_write_request=models.PatchedJobDataMetaWriteRequest(
                    deleted_frames=[excluded_gt_frame]
                ),
            )

            report = self.create_quality_report(user=admin_user, task_id=task_id)

            (_, response) = api_client.quality_api.retrieve_report_data(report["id"])
            assert response.status == HTTPStatus.OK
            assert [f for f in gt_frames if f != excluded_gt_frame] == json.loads(response.data)[
                "comparison_summary"
            ]["frames"]

    def test_quality_metrics_in_task_with_gt_and_tracks(
        self,
        admin_user,
        tasks,
        labels,
    ):
        task_id = next(
            t["id"]
            for t in tasks
            if not t["validation_mode"] and t["size"] >= 5 and not t["project_id"]
        )
        label_id = next(l["id"] for l in labels if l.get("task_id") == task_id)

        with make_api_client(admin_user) as api_client:
            gt_frames = [1, 3]
            gt_job = api_client.jobs_api.create(
                job_write_request=models.JobWriteRequest(
                    type="ground_truth",
                    task_id=task_id,
                    frame_selection_method="manual",
                    frames=gt_frames,
                )
            )[0]

            gt_annotations = {
                "shapes": [
                    {
                        "frame": 1,
                        "label_id": label_id,
                        "points": [0.5, 1.5, 2.5, 3.5],
                        "rotation": 0,
                        "type": "rectangle",
                        "occluded": False,
                        "outside": False,
                        "attributes": [],
                    },
                    {
                        "frame": 3,
                        "label_id": label_id,
                        "points": [3.0, 4.0, 5.0, 6.0],
                        "rotation": 0,
                        "type": "rectangle",
                        "occluded": False,
                        "outside": False,
                        "attributes": [],
                    },
                ]
            }

            normal_annotations = {
                "tracks": [
                    {
                        "type": "rectangle",
                        "frame": 0,
                        "label_id": label_id,
                        "shapes": [
                            {
                                "frame": 0,
                                "points": [1.0, 2.0, 3.0, 4.0],
                                "rotation": 0,
                                "type": "rectangle",
                                "occluded": False,
                                "outside": False,
                                "attributes": [],
                            },
                            {
                                "frame": 2,  # not included, but must affect interpolation
                                "points": [0.0, 1.0, 2.0, 3.0],
                                "rotation": 0,
                                "type": "rectangle",
                                "occluded": False,
                                "outside": False,
                                "attributes": [],
                            },
                            {
                                "frame": 4,
                                "points": [6.0, 7.0, 8.0, 9.0],
                                "rotation": 0,
                                "type": "rectangle",
                                "occluded": False,
                                "outside": False,
                                "attributes": [],
                            },
                        ],
                    }
                ]
            }

            api_client.jobs_api.update_annotations(gt_job.id, labeled_data_request=gt_annotations)

            api_client.tasks_api.update_annotations(
                task_id, labeled_data_request=normal_annotations
            )

            api_client.jobs_api.partial_update(
                gt_job.id,
                patched_job_write_request=models.PatchedJobWriteRequest(
                    stage="acceptance", state="completed"
                ),
            )

            report = self.create_quality_report(user=admin_user, task_id=task_id)

            assert report["summary"]["conflict_count"] == 0
            assert report["summary"]["valid_count"] == 2
            assert report["summary"]["total_count"] == 2

    def test_project_report_aggregates_nested_task_reports(self, quality_reports, tasks, jobs):
        project_report = max(
            (r for r in quality_reports if r["target"] == "project"), key=lambda r: r["id"]
        )
        task_reports = [r for r in quality_reports if r["parent_id"] == project_report["id"]]

        tasks_with_configured_validation = [
            t
            for t in tasks
            if t["project_id"] == project_report["project_id"]
            if any(
                j
                for j in jobs
                if j["task_id"] == t["id"]
                and j["type"] == "ground_truth"
                and j["state"] == "completed"
                and j["stage"] == "acceptance"
            )
        ]
        assert len(task_reports) == len(tasks_with_configured_validation)

        # Base fields of confusion matrix are scaled by inverse task validation frame share.
        # This is needed to make the derived averaged metrics (accuracy etc.)
        # for projects consistent with the averaged metrics in tasks in cases
        # with different validation frame shares in project tasks
        task_weights = {
            r["task_id"]: 1 / r["summary"]["validation_frame_share"] for r in task_reports
        }
        summary = project_report["summary"]
        for confusion_field in ["valid_count", "total_count", "ds_count", "gt_count"]:
            assert summary[confusion_field] == sum(
                math.ceil(r["summary"][confusion_field] * task_weights[r["task_id"]])
                for r in task_reports
            )

        assert summary["accuracy"] == summary["valid_count"] / summary["total_count"]
        assert summary["precision"] == summary["valid_count"] / summary["ds_count"]
        assert summary["recall"] == summary["valid_count"] / summary["gt_count"]

        # other summary fields are simply aggregated
        for summary_field in [
            "conflict_count",
            "error_count",
            "warning_count",
            "total_frames",
            "validation_frames",
        ]:
            assert summary[summary_field] == sum(r["summary"][summary_field] for r in task_reports)


@pytest.mark.usefixtures("restore_db_per_function")
class TestPostProjectQualityReports(_PermissionTestBase):
    def _test_create_report_200(self, user: str, project_id: int):
        return self.create_quality_report(user=user, project_id=project_id)

    def _test_create_report_403(self, user: str, project_id: int):
        with make_api_client(user) as api_client:
            (_, response) = api_client.quality_api.create_report(
                quality_report_create_request=models.QualityReportCreateRequest(
                    project_id=project_id
                ),
                _parse_response=False,
                _check_status=False,
            )
            assert response.status == HTTPStatus.FORBIDDEN

        return response

    def test_can_create_project_report(self, admin_user, projects, tasks, labels):
        project = next(
            p
            for p in projects
            if p["tasks"]["count"] > 0
            and any(l for l in labels if l.get("project_id") == p["id"])
            and not any(t["validation_mode"] for t in tasks if t.get("project_id") == p["id"])
        )
        project_id = project["id"]

        # Create GT jobs for all tasks in the project
        tasks = [t for t in tasks if t.get("project_id") == project_id]
        for task in tasks:
            self.create_gt_job(admin_user, task["id"])

        # Create project report
        report = self.create_quality_report(user=admin_user, project_id=project_id)

        # Check report data
        with make_api_client(admin_user) as api_client:
            report_data, _ = api_client.quality_api.retrieve_report_data(report["id"])

        for r in [report, report_data]:
            # Verify report was created
            assert r["project_id"] == project_id
            assert r.get("task_id") is None
            assert r.get("job_id") is None
            assert r.get("parent_id") is None

        # Verify child reports were created
        with make_api_client(admin_user) as api_client:
            child_reports = get_paginated_collection(
                api_client.quality_api.list_reports_endpoint,
                parent_id=report["id"],
                target="task",
                return_json=True,
            )

        assert len(child_reports) == len(tasks)
        for child in child_reports:
            assert child["parent_id"] == report["id"]

    def test_can_create_project_report_in_empty_project(self, admin_user, projects):
        project = next(p for p in projects if p["tasks"]["count"] == 0)
        project_id = project["id"]

        report = self.create_quality_report(user=admin_user, project_id=project_id)

        assert report["project_id"] == project_id
        assert report["summary"]["total_count"] == 0
        assert report["summary"]["tasks"]["total"] == 0

    def test_can_create_project_report_when_there_are_tasks_without_validation(
        self, admin_user, projects, tasks, labels
    ):
        project = next(
            p
            for p in projects
            if p["tasks"]["count"] > 0
            and any(l for l in labels if l.get("project_id") == p["id"])
            and not any(t["validation_mode"] for t in tasks if t.get("project_id") == p["id"])
        )
        project_id = project["id"]

        self.create_quality_report(user=admin_user, project_id=project_id)

    def test_can_create_project_report_when_there_are_tasks_without_configured_gt(
        self, admin_user, projects, tasks, jobs, labels
    ):
        project = next(
            p
            for p in projects
            if p["tasks"]["count"] > 1
            and any(l for l in labels if l.get("project_id") == p["id"])
            and any(t["validation_mode"] for t in tasks if t.get("project_id") == p["id"])
        )
        project_id = project["id"]

        # Create GT jobs for 1 task in the project
        task = next(t for t in tasks if t.get("project_id") == project_id and t["validation_mode"])
        gt_job = next(j for j in jobs if j["type"] == "ground_truth" and j["task_id"] == task["id"])
        with make_api_client(admin_user) as api_client:
            api_client.jobs_api.partial_update(
                gt_job["id"],
                patched_job_write_request=models.PatchedJobWriteRequest(
                    stage="annotation", state="new"
                ),
            )

        # Create project report
        self.create_quality_report(user=admin_user, project_id=project_id)

    def test_can_reuse_relevant_task_reports_in_project_report(
        self, admin_user, projects, tasks, labels, quality_settings, quality_reports
    ):
        project = next(
            p
            for p in projects
            if any(r["project_id"] == p["id"] for r in quality_reports)
            if p["tasks"]["count"] >= 2
            if all(t["size"] > 0 for t in tasks if t["project_id"] == p["id"])
            if any(l for l in labels if l.get("project_id") == p["id"])
            if any(t["validation_mode"] for t in tasks if t.get("project_id") == p["id"])
            if all(
                s["inherit"]
                for s in quality_settings
                if s["task_id"]
                if tasks[s["task_id"]]["project_id"] == p["id"]
            )
        )
        project_id = project["id"]

        project_tasks = sorted(
            [t for t in tasks if t.get("project_id") == project_id], key=lambda t: t["id"]
        )

        latest_project_reports = sorted(
            [r for r in quality_reports if r["project_id"] == project_id], key=lambda r: -r["id"]
        )
        latest_project_report = next(r for r in latest_project_reports if r["target"] == "project")
        latest_project_reports = [
            r for r in latest_project_reports if r["parent_id"] == latest_project_report["id"]
        ]
        latest_task_reports = {
            task_id: next(task_reports)
            for task_id, task_reports in groupby(
                sorted(latest_project_reports, key=lambda r: (r["task_id"], -r["id"])),
                key=lambda r: r["task_id"],
            )
        }

        # Create project report before task changes
        new_report_before_task_changes = self.create_quality_report(
            user=admin_user, project_id=project_id
        )

        with make_api_client(admin_user) as api_client:
            task_reports_in_new_report_before_task_changes = {
                r["id"]
                for r in get_paginated_collection(
                    api_client.quality_api.list_reports_endpoint,
                    parent_id=new_report_before_task_changes["id"],
                    target="task",
                )
            }
            assert task_reports_in_new_report_before_task_changes == set(
                r["id"] for r in latest_task_reports.values()
            )

        # Modify one of the tasks
        with make_api_client(admin_user) as api_client:
            modified_task_id = project_tasks[0]["id"]
            api_client.tasks_api.update_annotations(
                modified_task_id, labeled_data_request={"shapes": []}
            )

        # Create new project report after task changes
        new_report_after_task_changes = self.create_quality_report(
            user=admin_user, project_id=project_id
        )

        with make_api_client(admin_user) as api_client:
            task_reports_in_new_report_after_task_changes = {
                (r["id"], r["task_id"])
                for r in get_paginated_collection(
                    api_client.quality_api.list_reports_endpoint,
                    parent_id=new_report_after_task_changes["id"],
                    target="task",
                )
            }
            assert set(
                r for r in task_reports_in_new_report_after_task_changes if r[1] != modified_task_id
            ) == set(
                (r["id"], r["task_id"])
                for task_id, r in latest_task_reports.items()
                if task_id != modified_task_id
            )
            assert (
                latest_task_reports[modified_task_id]["id"],
                modified_task_id,
            ) not in task_reports_in_new_report_after_task_changes

    @pytest.mark.parametrize(*_PermissionTestBase._default_sandbox_cases)
    def test_user_create_project_report_in_sandbox(self, is_staff, allow, find_sandbox_project):
        project, user = find_sandbox_project(is_staff)

        if allow:
            self._test_create_report_200(user=user["username"], project_id=project["id"])
        else:
            self._test_create_report_403(user=user["username"], project_id=project["id"])

    @pytest.mark.parametrize(*_PermissionTestBase._default_org_cases)
    def test_user_create_project_report_in_org(self, org_role, is_staff, allow, find_org_project):
        project, user = find_org_project(is_staff, org_role)

        if allow:
            self._test_create_report_200(user=user["username"], project_id=project["id"])
        else:
            self._test_create_report_403(user=user["username"], project_id=project["id"])

    def test_cannot_create_report_with_both_task_and_project_id(self, admin_user, tasks):
        task = next(t for t in tasks if t.get("project_id") is not None)
        task_id = task["id"]
        project_id = task["project_id"]

        with pytest.raises(exceptions.ApiException) as e:
            with make_api_client(admin_user) as api_client:
                api_client.quality_api.create_report(
                    quality_report_create_request=models.QualityReportCreateRequest(
                        task_id=task_id, project_id=project_id
                    ),
                )

        assert HTTPStatus.BAD_REQUEST == e.value.status
        assert "Only 1 of the fields" in e.value.body


@pytest.mark.usefixtures("restore_db_per_function")
class TestProjectQualitySettingsBehavior(_PermissionTestBase):
    @pytest.mark.parametrize("inherit", [True, False])
    def test_can_inherit_project_settings_in_task_report(
        self, admin_user, tasks, quality_settings, inherit: bool
    ):
        task = next(
            t for t in tasks if t.get("project_id") is not None and t.get("validation_mode") is None
        )
        task_id = task["id"]
        project_id = task["project_id"]

        self.create_gt_job(admin_user, task_id)

        project_settings = next(s for s in quality_settings if s["project_id"] == project_id)
        task_settings = next(s for s in quality_settings if s["task_id"] == task_id)

        with make_api_client(admin_user) as api_client:
            api_client.quality_api.partial_update_settings(
                task_settings["id"],
                patched_quality_settings_request={
                    "inherit": inherit,
                    "empty_is_annotated": inherit,
                },
            )

            api_client.quality_api.partial_update_settings(
                project_settings["id"],
                patched_quality_settings_request={
                    "empty_is_annotated": inherit,
                },
            )

            # Create task report
            task_report = self.create_quality_report(user=admin_user, task_id=task_id)

            # Get report data to verify settings were inherited
            task_report_data = api_client.quality_api.retrieve_report_data(task_report["id"])[0]
            assert task_report_data["parameters"]["empty_is_annotated"] == inherit
            assert task_report_data["parameters"]["inherited"] == inherit
