# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
from collections import Counter
from copy import deepcopy
from datetime import datetime
from http import HTTPStatus
from typing import Any, Dict, List, Optional, Tuple

import pytest
from cvat_sdk.api_client import exceptions, models
from cvat_sdk.api_client.api_client import ApiClient, Endpoint
from cvat_sdk.core.helpers import get_paginated_collection
from deepdiff import DeepDiff

from shared.utils.config import make_api_client
from shared.utils.helpers import generate_image_files

from .utils import CollectionSimpleFilterTestBase, create_task


class _PermissionTestBase:
    def create_quality_report(
        self, user: str, task_id: Optional[int] = None, project_id: Optional[int] = None
    ) -> dict:
        assert bool(task_id) ^ bool(project_id), "task or project id must be specified"

        params = {
            **(dict(task_id=task_id) if task_id else {}),
            **(dict(project_id=project_id) if project_id else {}),
        }

        with make_api_client(user) as api_client:
            (_, response) = api_client.quality_api.create_report(
                quality_report_create_request=models.QualityReportCreateRequest(**params),
                _parse_response=False,
            )
            assert response.status == HTTPStatus.ACCEPTED
            rq_id = json.loads(response.data)["rq_id"]

            while True:
                (_, response) = api_client.quality_api.create_report(
                    rq_id=rq_id, _parse_response=False
                )
                assert response.status in [HTTPStatus.CREATED, HTTPStatus.ACCEPTED]

                if response.status == HTTPStatus.CREATED:
                    break

            return json.loads(response.data)

    def create_gt_job(self, user: str, task_id: int) -> models.JobRead:
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

            (labels, _) = api_client.labels_api.list(task_id=task_id)
            api_client.jobs_api.update_annotations(
                job.id,
                job_annotations_update_request=dict(
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

    user_sandbox_cases = ("is_staff, allow", [(True, True), (False, False)])

    user_org_cases = (
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


@pytest.mark.usefixtures("restore_db_per_class")
class TestListQualityReports(_PermissionTestBase):
    def _test_list_reports_200(self, user, task_id, *, expected_data=None, **kwargs):
        with make_api_client(user) as api_client:
            results = get_paginated_collection(
                api_client.quality_api.list_reports_endpoint,
                return_json=True,
                task_id=task_id,
                **kwargs,
            )

            if expected_data is not None:
                assert DeepDiff(expected_data, results) == {}

    def _test_list_reports_403(self, user, task_id, **kwargs):
        with make_api_client(user) as api_client:
            (_, response) = api_client.quality_api.list_reports(
                task_id=task_id, **kwargs, _parse_response=False, _check_status=False
            )

            assert response.status == HTTPStatus.FORBIDDEN

    def test_can_list_quality_reports(self, admin_user, quality_reports):
        parent_report = next(r for r in quality_reports if r["task_id"])
        task_id = parent_report["task_id"]
        reports = [parent_report] + [
            r for r in quality_reports if r["parent_id"] == parent_report["id"]
        ]

        self._test_list_reports_200(admin_user, task_id, expected_data=reports)

    @pytest.mark.usefixtures("restore_db_per_function")
    @pytest.mark.parametrize(*_PermissionTestBase.user_sandbox_cases)
    def test_user_list_reports_in_sandbox_task(
        self, tasks, jobs, users, is_task_staff, is_staff, allow, admin_user
    ):
        task = next(
            t
            for t in tasks
            if t["organization"] is None
            and not users[t["owner"]["id"]]["is_superuser"]
            and not any(j for j in jobs if j["task_id"] == t["id"] and j["type"] == "ground_truth")
        )

        if is_staff:
            user = task["owner"]["username"]
        else:
            user = next(u for u in users if not is_task_staff(u["id"], task["id"]))["username"]

        self.create_gt_job(admin_user, task["id"])
        report = self.create_quality_report(admin_user, task["id"])

        if allow:
            self._test_list_reports_200(user, task["id"], expected_data=[report], target="task")
        else:
            self._test_list_reports_403(user, task["id"])

    @pytest.mark.usefixtures("restore_db_per_function")
    @pytest.mark.parametrize(*_PermissionTestBase.user_org_cases)
    def test_user_list_reports_in_org_task(
        self,
        tasks,
        jobs,
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
                    and not any(
                        j for j in jobs if j["task_id"] == t["id"] and j["type"] == "ground_truth"
                    )
                ),
                None,
            )
            if task is not None:
                break

        assert task

        self.create_gt_job(admin_user, task["id"])
        report = self.create_quality_report(admin_user, task["id"])

        if allow:
            self._test_list_reports_200(
                user["username"], task["id"], expected_data=[report], target="task"
            )
        else:
            self._test_list_reports_403(user["username"], task["id"])


@pytest.mark.usefixtures("restore_db_per_class")
class TestGetQualityReports(_PermissionTestBase):
    def _test_get_report_200(
        self, user: str, obj_id: int, *, expected_data: Optional[Dict[str, Any]] = None, **kwargs
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
    @pytest.mark.parametrize(*_PermissionTestBase.user_sandbox_cases)
    def test_user_get_report_in_sandbox_task(
        self, tasks, jobs, users, is_task_staff, is_staff, allow, admin_user
    ):
        task = next(
            t
            for t in tasks
            if t["organization"] is None
            and not users[t["owner"]["id"]]["is_superuser"]
            and not any(j for j in jobs if j["task_id"] == t["id"] and j["type"] == "ground_truth")
        )

        if is_staff:
            user = task["owner"]["username"]
        else:
            user = next(u for u in users if not is_task_staff(u["id"], task["id"]))["username"]

        self.create_gt_job(admin_user, task["id"])
        report = self.create_quality_report(admin_user, task["id"])

        if allow:
            self._test_get_report_200(user, report["id"], expected_data=report)
        else:
            self._test_get_report_403(user, report["id"])

    @pytest.mark.usefixtures("restore_db_per_function")
    @pytest.mark.parametrize(*_PermissionTestBase.user_org_cases)
    def test_user_get_report_in_org_task(
        self,
        tasks,
        jobs,
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
                    and not any(
                        j for j in jobs if j["task_id"] == t["id"] and j["type"] == "ground_truth"
                    )
                ),
                None,
            )
            if task is not None:
                break

        assert task

        self.create_gt_job(admin_user, task["id"])
        report = self.create_quality_report(admin_user, task["id"])

        if allow:
            self._test_get_report_200(user["username"], report["id"], expected_data=report)
        else:
            self._test_get_report_403(user["username"], report["id"])


@pytest.mark.usefixtures("restore_db_per_class")
class TestGetQualityReportData(_PermissionTestBase):
    def _test_get_report_data_200(
        self, user: str, obj_id: int, *, expected_data: Optional[Dict[str, Any]] = None, **kwargs
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

    @pytest.mark.parametrize("target", ["task", "job"])
    def test_can_get_full_report_data(self, admin_user, target, quality_reports):
        report = next(r for r in quality_reports if (r["job_id"] is not None) == (target == "job"))
        report_id = report["id"]

        with make_api_client(admin_user) as api_client:
            (report_data, response) = api_client.quality_api.retrieve_report_data(report_id)
            assert response.status == HTTPStatus.OK

        # Just check several keys exist
        for key in ["parameters", "comparison_summary", "frame_results"]:
            assert key in report_data.keys(), key

    @pytest.mark.usefixtures("restore_db_per_function")
    @pytest.mark.parametrize(*_PermissionTestBase.user_sandbox_cases)
    def test_user_get_report_data_in_sandbox_task(
        self, tasks, jobs, users, is_task_staff, is_staff, allow, admin_user
    ):
        task = next(
            t
            for t in tasks
            if t["organization"] is None
            and not users[t["owner"]["id"]]["is_superuser"]
            and not any(j for j in jobs if j["task_id"] == t["id"] and j["type"] == "ground_truth")
        )

        if is_staff:
            user = task["owner"]["username"]
        else:
            user = next(u for u in users if not is_task_staff(u["id"], task["id"]))["username"]

        self.create_gt_job(admin_user, task["id"])
        report = self.create_quality_report(admin_user, task["id"])
        report_data = json.loads(self._test_get_report_data_200(admin_user, report["id"]).data)

        if allow:
            self._test_get_report_data_200(user, report["id"], expected_data=report_data)
        else:
            self._test_get_report_data_403(user, report["id"])

    @pytest.mark.usefixtures("restore_db_per_function")
    @pytest.mark.parametrize(*_PermissionTestBase.user_org_cases)
    def test_user_get_report_data_in_org_task(
        self,
        tasks,
        jobs,
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
                    and not any(
                        j for j in jobs if j["task_id"] == t["id"] and j["type"] == "ground_truth"
                    )
                ),
                None,
            )
            if task is not None:
                break

        assert task

        self.create_gt_job(admin_user, task["id"])
        report = self.create_quality_report(admin_user, task["id"])
        report_data = json.loads(self._test_get_report_data_200(admin_user, report["id"]).data)

        if allow:
            self._test_get_report_data_200(
                user["username"], report["id"], expected_data=report_data
            )
        else:
            self._test_get_report_data_403(user["username"], report["id"])


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

        report = self.create_quality_report(admin_user, task_id)
        assert models.QualityReport._from_openapi_data(**report)

    def test_cannot_create_report_without_gt_job(self, admin_user, tasks):
        task_id = next(t["id"] for t in tasks if t["jobs"]["count"] == 1)

        with pytest.raises(exceptions.ApiException) as capture:
            self.create_quality_report(admin_user, task_id)

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
            self.create_quality_report(admin_user, task_id)

        assert (
            "Quality reports require a Ground Truth job in the task at the acceptance "
            "stage and in the completed state"
        ) in capture.value.body


class TestSimpleQualityReportsFilters(CollectionSimpleFilterTestBase):
    @pytest.fixture(autouse=True)
    def setup(self, restore_db_per_class, admin_user, quality_reports, jobs, tasks):
        self.user = admin_user
        self.samples = quality_reports
        self.job_samples = jobs
        self.task_samples = tasks

    def _get_endpoint(self, api_client: ApiClient) -> Endpoint:
        return api_client.quality_api.list_reports_endpoint

    def _get_field_samples(self, field: str) -> Tuple[Any, List[Dict[str, Any]]]:
        if field == "task_id":
            # This filter includes both the task and nested job reports
            task_id, task_reports = super()._get_field_samples(field)
            task_job_ids = set(j["id"] for j in self.job_samples if j["task_id"] == task_id)
            task_reports = list(task_reports) + [
                r
                for r in self.samples
                if self._get_field(r, self._map_field("job_id")) in task_job_ids
            ]
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
            ]
        else:
            return super()._get_field_samples(field)

    @pytest.mark.parametrize(
        "field",
        ("project_id", "task_id", "job_id", "parent_id", "target", "org_id"),
    )
    def test_can_use_simple_filter_for_object_list(self, field):
        return super().test_can_use_simple_filter_for_object_list(field)


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
    @pytest.mark.parametrize(*_PermissionTestBase.user_sandbox_cases)
    def test_user_list_conflicts_in_sandbox_task(
        self, tasks, jobs, users, is_task_staff, is_staff, allow, admin_user
    ):
        task = next(
            t
            for t in tasks
            if t["organization"] is None
            and not users[t["owner"]["id"]]["is_superuser"]
            and not any(j for j in jobs if j["task_id"] == t["id"] and j["type"] == "ground_truth")
        )

        if is_staff:
            user = task["owner"]["username"]
        else:
            user = next(u for u in users if not is_task_staff(u["id"], task["id"]))["username"]

        self.create_gt_job(admin_user, task["id"])
        report = self.create_quality_report(admin_user, task["id"])
        conflicts = self._test_list_conflicts_200(admin_user, report_id=report["id"])
        assert conflicts

        if allow:
            self._test_list_conflicts_200(user, report["id"], expected_data=conflicts)
        else:
            self._test_list_conflicts_403(user, report["id"])

    @pytest.mark.usefixtures("restore_db_per_function")
    @pytest.mark.parametrize(*_PermissionTestBase.user_org_cases)
    def test_user_list_conflicts_in_org_task(
        self,
        tasks,
        jobs,
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
                    and not any(
                        j for j in jobs if j["task_id"] == t["id"] and j["type"] == "ground_truth"
                    )
                ),
                None,
            )
            if task is not None:
                break

        assert task
        user = user["username"]

        self.create_gt_job(admin_user, task["id"])
        report = self.create_quality_report(admin_user, task["id"])
        conflicts = self._test_list_conflicts_200(admin_user, report_id=report["id"])
        assert conflicts

        if allow:
            self._test_list_conflicts_200(user, report["id"], expected_data=conflicts)
        else:
            self._test_list_conflicts_403(user, report["id"])


class TestSimpleQualityConflictsFilters(CollectionSimpleFilterTestBase):
    @pytest.fixture(autouse=True)
    def setup(
        self, restore_db_per_class, admin_user, quality_conflicts, quality_reports, jobs, tasks
    ):
        self.user = admin_user
        self.samples = quality_conflicts
        self.report_samples = quality_reports
        self.task_samples = tasks
        self.job_samples = jobs

    def _get_endpoint(self, api_client: ApiClient) -> Endpoint:
        return api_client.quality_api.list_conflicts_endpoint

    def _get_field_samples(self, field: str) -> Tuple[Any, List[Dict[str, Any]]]:
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
            task_report = next(r for r in self.report_samples if r["task_id"])
            task_reports = {task_report["id"]} | {
                r["id"] for r in self.report_samples if r["parent_id"] == task_report["id"]
            }
            task_conflicts = [
                c
                for c in self.samples
                if self._get_field(c, self._map_field("report_id")) in task_reports
            ]
            return task_report["task_id"], task_conflicts
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
        return super().test_can_use_simple_filter_for_object_list(field)


class TestSimpleQualitySettingsFilters(CollectionSimpleFilterTestBase):
    @pytest.fixture(autouse=True)
    def setup(self, restore_db_per_class, admin_user, quality_settings):
        self.user = admin_user
        self.samples = quality_settings

    def _get_endpoint(self, api_client: ApiClient) -> Endpoint:
        return api_client.quality_api.list_settings_endpoint

    @pytest.mark.parametrize("field", ("task_id", "project_id"))
    def test_can_use_simple_filter_for_object_list(self, field):
        return super().test_can_use_simple_filter_for_object_list(field)


@pytest.mark.usefixtures("restore_db_per_class")
class TestListSettings(_PermissionTestBase):
    def _test_list_settings_200(
        self, user: str, *, expected_data: Optional[Dict[str, Any]] = None, **kwargs
    ):
        with make_api_client(user) as api_client:
            (_, response) = api_client.quality_api.list_settings(**kwargs)
            assert response.status == HTTPStatus.OK

        if expected_data is not None:
            assert DeepDiff(expected_data, json.loads(response.data), ignore_order=True) == {}

        return response

    def _test_list_settings_403(self, user: str, **kwargs):
        with make_api_client(user) as api_client:
            (_, response) = api_client.quality_api.list_settings(
                **kwargs, _parse_response=False, _check_status=False
            )
            assert response.status == HTTPStatus.FORBIDDEN

        return response

    @pytest.mark.parametrize(*_PermissionTestBase.user_sandbox_cases)
    def test_user_list_settings_in_sandbox(
        self, quality_settings, tasks, users, is_task_staff, is_staff, allow
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
            settings = [s for s in quality_settings if s["task_id"] == task["id"]]
            self._test_list_settings_200(user, expected_data=settings, task_id=task["id"])
        else:
            self._test_list_settings_403(user)

    @pytest.mark.parametrize(*_PermissionTestBase.user_org_cases)
    def test_user_list_settings_in_org_task(
        self,
        tasks,
        users,
        is_org_member,
        is_task_staff,
        org_role,
        is_staff,
        allow,
        quality_settings,
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

        if allow:
            settings = next(s for s in quality_settings if s["task_id"] == task["id"])
            self._test_list_settings_200(
                user["username"], expected_data=settings, task_id=task["id"]
            )
        else:
            self._test_list_settings_403(user["username"])


@pytest.mark.usefixtures("restore_db_per_class")
class TestGetSettings(_PermissionTestBase):
    def _test_get_settings_200(
        self, user: str, obj_id: int, *, expected_data: Optional[Dict[str, Any]] = None, **kwargs
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

    @pytest.mark.parametrize(*_PermissionTestBase.user_sandbox_cases)
    def test_user_get_settings_in_sandbox_task(
        self, quality_settings, tasks, users, is_task_staff, is_staff, allow
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

        settings = next(s for s in quality_settings if s["task_id"] == task["id"])
        settings_id = settings["id"]

        if allow:
            self._test_get_settings_200(user, settings_id, expected_data=settings)
        else:
            self._test_get_settings_403(user, settings_id)

    @pytest.mark.parametrize(*_PermissionTestBase.user_org_cases)
    def test_user_get_settings_in_org_task(
        self,
        tasks,
        users,
        is_org_member,
        is_task_staff,
        org_role,
        is_staff,
        allow,
        quality_settings,
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

        settings = next(s for s in quality_settings if s["task_id"] == task["id"])
        settings_id = settings["id"]

        if allow:
            self._test_get_settings_200(user["username"], settings_id, expected_data=settings)
        else:
            self._test_get_settings_403(user["username"], settings_id)


@pytest.mark.usefixtures("restore_db_per_function")
class TestPostSettings(_PermissionTestBase):
    def _test_post_settings_201(
        self,
        user: str,
        data: Dict[str, Any],
        **kwargs,
    ):
        with make_api_client(user) as api_client:
            (_, response) = api_client.quality_api.create_settings(
                quality_settings_request=data, **kwargs
            )
            assert response.status == HTTPStatus.CREATED

        response_data = json.loads(response.data)
        assert response_data["task_id"] == data.get("task_id")
        assert response_data["project_id"] == data.get("project_id")

        return response

    def _test_post_settings_403(self, user: str, data: Dict[str, Any], **kwargs):
        with make_api_client(user) as api_client:
            (_, response) = api_client.quality_api.create_settings(
                quality_settings_request=data,
                **kwargs,
                _parse_response=False,
                _check_status=False,
            )
            assert response.status == HTTPStatus.FORBIDDEN

        return response

    def test_can_create_task_settings(self, admin_user, quality_settings, tasks):
        task_id = next(
            t["id"]
            for t in tasks
            if not any(s for s in quality_settings if s.get("task_id") == t["id"])
            and not t["project_id"]
        )
        data = {"task_id": task_id}

        self._test_post_settings_201(admin_user, data)

    def test_can_create_project_settings(self, admin_user, quality_settings, projects):
        project_id = next(
            t["id"]
            for t in projects
            if not any(s for s in quality_settings if s.get("project_id") == t["id"])
        )
        data = {"project_id": project_id}

        self._test_post_settings_201(admin_user, data)

    @pytest.mark.parametrize(*_PermissionTestBase.user_sandbox_cases)
    def test_user_create_settings_in_sandbox_task(
        self, quality_settings, tasks, users, is_task_staff, is_staff, allow
    ):
        task = next(
            t
            for t in tasks
            if t["organization"] is None
            and not users[t["owner"]["id"]]["is_superuser"]
            and not any(s for s in quality_settings if s.get("task_id") == t["id"])
            and not t["project_id"]
        )

        if is_staff:
            user = task["owner"]["username"]
        else:
            user = next(u for u in users if not is_task_staff(u["id"], task["id"]))["username"]

        data = {"task_id": task["id"]}

        if allow:
            self._test_post_settings_201(user, data)
        else:
            self._test_post_settings_403(user, data)

    @pytest.mark.parametrize(*_PermissionTestBase.user_org_cases)
    def test_user_patch_settings_in_org_task(
        self,
        tasks,
        users,
        is_org_member,
        is_task_staff,
        org_role,
        is_staff,
        allow,
        quality_settings,
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
                    and not any(s for s in quality_settings if s.get("task_id") == t["id"])
                    and not t["project_id"]
                ),
                None,
            )
            if task is not None:
                break

        assert task

        data = {"task_id": task["id"]}

        if allow:
            self._test_post_settings_201(user["username"], data)
        else:
            self._test_post_settings_403(user["username"], data)


@pytest.mark.usefixtures("restore_db_per_function")
class TestPatchSettings(_PermissionTestBase):
    def _test_patch_settings_200(
        self,
        user: str,
        obj_id: int,
        data: Dict[str, Any],
        *,
        expected_data: Optional[Dict[str, Any]] = None,
        **kwargs,
    ):
        with make_api_client(user) as api_client:
            (_, response) = api_client.quality_api.partial_update_settings(
                obj_id, patched_quality_settings_request=data, **kwargs
            )
            assert response.status == HTTPStatus.OK

        if expected_data is not None:
            assert DeepDiff(expected_data, json.loads(response.data), ignore_order=True) == {}

        return response

    def _test_patch_settings_403(self, user: str, obj_id: int, data: Dict[str, Any], **kwargs):
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

    def _get_request_data(self, data: Dict[str, Any]) -> Tuple[Dict[str, Any], Dict[str, Any]]:
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

    @pytest.mark.parametrize(*_PermissionTestBase.user_sandbox_cases)
    def test_user_patch_settings_in_sandbox_task(
        self, quality_settings, tasks, users, is_task_staff, is_staff, allow
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

        settings = next(s for s in quality_settings if s["task_id"] == task["id"])
        settings_id = settings["id"]
        data, expected_data = self._get_request_data(settings)

        if allow:
            self._test_patch_settings_200(user, settings_id, data, expected_data=expected_data)
        else:
            self._test_patch_settings_403(user, settings_id, data)

    @pytest.mark.parametrize(*_PermissionTestBase.user_org_cases)
    def test_user_patch_settings_in_org_task(
        self,
        tasks,
        users,
        is_org_member,
        is_task_staff,
        org_role,
        is_staff,
        allow,
        quality_settings,
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
        old_report = next(r for r in quality_reports if r["task_id"])
        task_id = old_report["task_id"]

        new_report = self.create_quality_report(admin_user, task_id)

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
                exclude_paths=["root['created_date']", "root['id']"],
            )
            == {}
        )

    def test_modified_task_produces_different_metrics(
        self, admin_user, quality_reports, jobs, labels
    ):
        gt_job = next(j for j in jobs if j["type"] == "ground_truth")
        task_id = gt_job["task_id"]
        old_report = next(r for r in quality_reports if r["task_id"] == task_id)
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
                "update",
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

        new_report = self.create_quality_report(admin_user, task_id)
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
        ],
    )
    def test_settings_affect_metrics(
        self, admin_user, quality_reports, quality_settings, task_id, parameter
    ):
        old_report = next(r for r in quality_reports if r["task_id"])
        task_id = old_report["task_id"]

        settings = deepcopy(next(s for s in quality_settings if s["task_id"] == task_id))
        if isinstance(settings[parameter], bool):
            settings[parameter] = not settings[parameter]
        elif isinstance(settings[parameter], float):
            settings[parameter] = 1 - settings[parameter]
            if parameter == "group_match_threshold":
                settings[parameter] = 0.9
        else:
            assert False

        with make_api_client(admin_user) as api_client:
            api_client.quality_api.partial_update_settings(
                settings["id"], patched_quality_settings_request=settings
            )

        new_report = self.create_quality_report(admin_user, task_id)
        assert new_report["summary"]["conflict_count"] != old_report["summary"]["conflict_count"]


@pytest.mark.usefixtures("restore_db_per_function")
class TestProjectInteraction(_PermissionTestBase):
    def test_can_create_task_settings_when_not_in_project(
        self, admin_user, tasks, quality_settings
    ):
        task = next(
            t
            for t in tasks
            if not t["project_id"]
            and not any(qs for qs in quality_settings if qs["task_id"] == t["id"])
        )

        with make_api_client(admin_user) as api_client:
            (_, response) = api_client.quality_api.create_settings(
                quality_settings_request=models.QualitySettingsRequest(task_id=task["id"])
            )
            assert response.status == HTTPStatus.CREATED

    def test_cannot_create_task_settings_when_in_project(self, admin_user, tasks, quality_settings):
        task = next(
            t
            for t in tasks
            if t["project_id"]
            and not any(qs for qs in quality_settings if qs["task_id"] == t["id"])
        )

        with make_api_client(admin_user) as api_client:
            (_, response) = api_client.quality_api.create_settings(
                quality_settings_request=models.QualitySettingsRequest(task_id=task["id"]),
                _check_status=False,
                _parse_response=False,
            )

        assert response.status == HTTPStatus.BAD_REQUEST
        assert (
            b"Can't define quality settings for a task if the task is in a project."
            in response.data
        )

    def test_can_create_project_settings(self, admin_user):
        with make_api_client(admin_user) as api_client:
            (project, _) = api_client.projects_api.create(
                models.ProjectWriteRequest(name="test task move")
            )

            (_, response) = api_client.quality_api.create_settings(
                quality_settings_request=models.QualitySettingsRequest(project_id=project.id)
            )
            assert response.status == HTTPStatus.CREATED

    def test_can_create_project_settings_on_report_creation_when_in_project(
        self, admin_user, labels, tasks, quality_reports
    ):
        task_id = next(
            r
            for r in quality_reports
            if r["target"] == "task" and r["task_id"] and not tasks[r["task_id"]]["project_id"]
        )["task_id"]
        task_labels = [l for l in labels if l.get("task_id") == task_id]

        with make_api_client(admin_user) as api_client:
            (project, _) = api_client.projects_api.create(
                models.ProjectWriteRequest(name="test task move", labels=task_labels)
            )

            api_client.tasks_api.partial_update(
                task_id,
                patched_task_write_request=models.PatchedTaskWriteRequest(project_id=project.id),
            )

            (settings_list, _) = api_client.quality_api.list_settings(project_id=project.id)
            assert settings_list.count == 0

            self.create_quality_report(admin_user, task_id)

            (settings_list, _) = api_client.quality_api.list_settings(task_id=task_id)
            assert settings_list.count == 0

            (settings_list, _) = api_client.quality_api.list_settings(project_id=project.id)
            assert settings_list.count == 1
            assert settings_list.results[0].project_id == project.id

    def test_can_delete_task_settings_when_moved_into_project(
        self, admin_user, quality_settings, labels
    ):
        task_id = next(qs for qs in quality_settings if qs["task_id"])["task_id"]
        task_labels = [l for l in labels if l.get("task_id") == task_id]

        with make_api_client(admin_user) as api_client:
            (project, _) = api_client.projects_api.create(
                models.ProjectWriteRequest(name="test task move", labels=task_labels)
            )

            api_client.tasks_api.partial_update(
                task_id,
                patched_task_write_request=models.PatchedTaskWriteRequest(project_id=project.id),
            )

            (settings_list, _) = api_client.quality_api.list_settings(task_id=task_id)
            assert settings_list.count == 0

    def test_can_delete_task_reports_when_moved_into_project(
        self, admin_user, quality_reports, tasks, labels
    ):
        task_id = next(
            r
            for r in quality_reports
            if r["target"] == "task" and r["task_id"] and not tasks[r["task_id"]]["project_id"]
        )["task_id"]
        task_labels = [l for l in labels if l.get("task_id") == task_id]

        self.create_quality_report(admin_user, task_id)

        with make_api_client(admin_user) as api_client:
            (project, _) = api_client.projects_api.create(
                models.ProjectWriteRequest(name="test task move", labels=task_labels)
            )

            api_client.tasks_api.partial_update(
                task_id,
                patched_task_write_request=models.PatchedTaskWriteRequest(project_id=project.id),
            )

            (settings_list, _) = api_client.quality_api.list_settings(task_id=task_id)
            assert settings_list.count == 0

            (reports_list, _) = api_client.quality_api.list_reports(task_id=task_id)
            assert reports_list.count == 0

    @pytest.mark.xfail(
        raises=exceptions.ApiException, reason="Task movement into sandbox is disabled"
    )
    def test_can_delete_task_reports_when_moved_out_of_project(
        self, admin_user, quality_reports, tasks, labels
    ):
        task_id = next(
            r
            for r in quality_reports
            if r["target"] == "task" and r["task_id"] and not tasks[r["task_id"]]["project_id"]
        )["task_id"]
        task_labels = [l for l in labels if l.get("task_id") == task_id]

        with make_api_client(admin_user) as api_client:
            (project, _) = api_client.projects_api.create(
                models.ProjectWriteRequest(name="test task move", labels=task_labels)
            )

            api_client.tasks_api.partial_update(
                task_id,
                patched_task_write_request=models.PatchedTaskWriteRequest(project_id=project.id),
            )
            self.create_quality_report(admin_user, task_id)

            api_client.tasks_api.partial_update(
                task_id, patched_task_write_request=models.PatchedTaskWriteRequest(project_id=None)
            )

            (settings_list, _) = api_client.quality_api.list_settings(task_id=task_id)
            assert settings_list.count == 0

            (reports_list, _) = api_client.quality_api.list_reports(task_id=task_id)
            assert reports_list.count == 0

    def test_can_reuse_task_report_in_project_reports(self, admin_user):
        with make_api_client(admin_user) as api_client:
            (project, _) = api_client.projects_api.create(
                models.ProjectWriteRequest(
                    name="test task report reuse", labels=[dict(name="cat"), dict(name="dog")]
                )
            )

            (task1_id, _) = create_task(
                admin_user,
                spec=dict(name="test task 1", project_id=project.id),
                data=dict(image_quality=70, client_files=generate_image_files(2)),
            )
            self.create_gt_job(admin_user, task1_id)
            task1_jobs = [
                j.id
                for j in get_paginated_collection(
                    api_client.jobs_api.list_endpoint, task_id=task1_id
                )
                if j.type == "annotation"
            ]

            (task2_id, _) = create_task(
                admin_user,
                spec=dict(name="test task 2", project_id=project.id),
                data=dict(image_quality=70, client_files=generate_image_files(2)),
            )
            self.create_gt_job(admin_user, task2_id)
            task2_jobs = [
                j.id
                for j in get_paginated_collection(
                    api_client.jobs_api.list_endpoint, task_id=task2_id
                )
                if j.type == "annotation"
            ]

            self.create_quality_report(admin_user, task1_id)
            self.create_quality_report(admin_user, project_id=project.id)

            self.create_quality_report(admin_user, task2_id)
            self.create_quality_report(admin_user, project_id=project.id)

            (reports_list, _) = api_client.quality_api.list_reports(project_id=project.id)
            assert reports_list.count == 6
            assert Counter((r.job_id, r.task_id, r.project_id) for r in reports_list.results) == {
                **{(jid, None, None): 1 for jid in task1_jobs},
                **{(jid, None, None): 1 for jid in task2_jobs},
                (None, task1_id, None): 1,
                (None, task2_id, None): 1,
                (None, None, project.id): 2,
            }

    @pytest.mark.parametrize(
        "task_count, gt_task_count",
        [(0, 0), (1, 0), (1, 1), (2, 0), (2, 1), (2, 2), (3, 0), (3, 1), (3, 2)],
    )
    def test_can_compute_project_report(self, admin_user, task_count, gt_task_count):
        with make_api_client(admin_user) as api_client:
            (project, _) = api_client.projects_api.create(
                models.ProjectWriteRequest(
                    name="test task report reuse", labels=[dict(name="cat"), dict(name="dog")]
                )
            )

            task_ids = []
            task_jobs = {}
            task_reports = {}
            task_frame_count = 2
            for i in range(task_count):
                (task_id, _) = create_task(
                    admin_user,
                    spec=dict(name="test task", project_id=project.id),
                    data=dict(
                        image_quality=70, client_files=generate_image_files(task_frame_count)
                    ),
                )
                task_ids.append(task_id)
                task_jobs[task_id] = [
                    j
                    for j in get_paginated_collection(
                        api_client.jobs_api.list_endpoint, task_id=task_id
                    )
                    if j.type == "annotation"
                ]

                if i < gt_task_count:
                    self.create_gt_job(admin_user, task_id)

                    task_report = self.create_quality_report(admin_user, task_id)
                    task_reports[task_id] = task_report

            project_report = self.create_quality_report(admin_user, project_id=project.id)
            for param in [
                "error_count",
                "warning_count",
                "conflict_count",
                "gt_count",
                "ds_count",
                "valid_count",
                "frame_count",
                "frames_with_errors",
            ]:
                assert project_report["summary"][param] == sum(
                    r["summary"][param] for r in task_reports.values()
                ), param

            assert project_report["summary"]["total_frames"] == task_count * task_frame_count, param
            assert project_report["summary"]["frame_share"] == (
                project_report["summary"]["frame_count"] / (task_count * task_frame_count or 1)
            ), param
            assert project_report["gt_last_updated"] == max(
                (r["gt_last_updated"] for r in task_reports.values()),
                key=lambda v: datetime.fromisoformat(
                    v.rstrip("Z")  # timezone is not important here
                ),
                default=None,
            )

    def test_project_reports_do_not_display_conflicts(self, admin_user):
        with make_api_client(admin_user) as api_client:
            (project, _) = api_client.projects_api.create(
                models.ProjectWriteRequest(
                    name="test task report reuse", labels=[dict(name="cat"), dict(name="dog")]
                )
            )

            (task_id, _) = create_task(
                admin_user,
                spec=dict(name="test task", project_id=project.id),
                data=dict(image_quality=70, client_files=generate_image_files(2)),
            )
            self.create_gt_job(admin_user, task_id)

            self.create_quality_report(admin_user, task_id)
            project_report = self.create_quality_report(admin_user, project_id=project.id)
            assert project_report["conflicts"] > 0

            (project_conflicts, _) = api_client.quality_api.list_conflicts(
                report_id=project_report["id"]
            )
            assert project_conflicts.count == 0

    def test_task_reports_use_project_settings(self, admin_user):
        with make_api_client(admin_user) as api_client:
            (project, _) = api_client.projects_api.create(
                models.ProjectWriteRequest(
                    name="test task report reuse", labels=[dict(name="cat"), dict(name="dog")]
                )
            )

            (task_id, _) = create_task(
                admin_user,
                spec=dict(name="test task", project_id=project.id),
                data=dict(image_quality=70, client_files=generate_image_files(2)),
            )
            self.create_gt_job(admin_user, task_id)

            (project_settings, _) = api_client.quality_api.create_settings(
                quality_settings_request=models.QualitySettingsRequest(
                    project_id=project.id, iou_threshold=0.001
                )
            )

            task_report = self.create_quality_report(admin_user, task_id)

            (task_report_data, _) = api_client.quality_api.retrieve_report_data(task_report["id"])
            assert task_report_data["parameters"]["iou_threshold"] == project_settings.iou_threshold
