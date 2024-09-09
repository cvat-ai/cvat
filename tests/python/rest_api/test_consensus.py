# Copyright (C) 2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
import re
from copy import deepcopy
from http import HTTPStatus
from typing import Any, Dict, List, Optional, Tuple

import pytest
from cvat_sdk.api_client import exceptions, models
from cvat_sdk.api_client.api_client import ApiClient, Endpoint
from cvat_sdk.core.helpers import get_paginated_collection
from deepdiff import DeepDiff

from shared.utils.config import make_api_client

from .utils import CollectionSimpleFilterTestBase


class _PermissionTestBase:
    def create_consensus_report(self, user: str, task_id: int):
        with make_api_client(user) as api_client:
            (_, response) = api_client.consensus_api.create_report(
                consensus_report_create_request=models.ConsensusReportCreateRequest(
                    task_id=task_id
                ),
                _parse_response=False,
            )
            assert response.status == HTTPStatus.ACCEPTED
            rq_id = json.loads(response.data)["rq_id"]

            while True:
                (_, response) = api_client.consensus_api.create_report(
                    rq_id=rq_id, _parse_response=False
                )
                assert response.status in [HTTPStatus.CREATED, HTTPStatus.ACCEPTED]

                if response.status == HTTPStatus.CREATED:
                    break
            print(json.loads(response.data))
            return json.loads(response.data)


@pytest.mark.usefixtures("restore_db_per_class")
class TestListConsensusReports(_PermissionTestBase):
    # TODO: date is different in both response due to difference in seconds
    def _test_list_reports_200(self, user, task_id, *, expected_data=None, **kwargs):
        with make_api_client(user) as api_client:
            results = get_paginated_collection(
                api_client.consensus_api.list_reports_endpoint,
                return_json=True,
                task_id=task_id,
                **kwargs,
            )

            if expected_data is not None:
                assert DeepDiff(expected_data, results) == {}

    def _test_list_reports_403(self, user, task_id, **kwargs):
        with make_api_client(user) as api_client:
            (_, response) = api_client.consensus_api.list_reports(
                task_id=task_id, **kwargs, _parse_response=False, _check_status=False
            )

            assert response.status == HTTPStatus.FORBIDDEN

    def test_can_list_consensus_reports(self, admin_user, consensus_reports):
        parent_report = next(r for r in consensus_reports if r["task_id"])
        task_id = parent_report["task_id"]

        reports = [r for r in consensus_reports if r["task_id"] == task_id]

        self._test_list_reports_200(admin_user, task_id, expected_data=reports)

    @pytest.mark.usefixtures("restore_db_per_function")
    @pytest.mark.parametrize("is_staff, allow", [(True, True), (False, False)])
    def test_user_list_reports_in_sandbox_task(
        self, tasks, jobs, users, is_task_staff, is_staff, allow, admin_user
    ):
        task = next(
            t
            for t in tasks
            if t["organization"] is None
            and any(j for j in jobs if j["task_id"] == t["id"] and j["type"] == "consensus")
        )

        if is_staff:
            user = task["owner"]["username"]
        else:
            user = next(u for u in users if not is_task_staff(u["id"], task["id"]))["username"]

        print(task["id"])

        report = self.create_consensus_report(admin_user, task["id"])

        if allow:
            self._test_list_reports_200(user, task["id"], expected_data=[report], target="task")
        else:
            self._test_list_reports_403(user, task["id"])

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
                    and any(j for j in jobs if j["task_id"] == t["id"] and j["type"] == "consensus")
                ),
                None,
            )
            if task is not None:
                break

        assert task

        report = self.create_consensus_report(admin_user, task["id"])

        if allow:
            self._test_list_reports_200(
                user["username"], task["id"], expected_data=[report], target="task"
            )
        else:
            self._test_list_reports_403(user["username"], task["id"])


@pytest.mark.usefixtures("restore_db_per_class")
class TestGetConsensusReports(_PermissionTestBase):
    def _test_get_report_200(
        self, user: str, obj_id: int, *, expected_data: Optional[Dict[str, Any]] = None, **kwargs
    ):
        with make_api_client(user) as api_client:
            (_, response) = api_client.consensus_api.retrieve_report(obj_id, **kwargs)
            assert response.status == HTTPStatus.OK

        if expected_data is not None:
            assert DeepDiff(expected_data, json.loads(response.data), ignore_order=True) == {}

        return response

    def _test_get_report_403(self, user: str, obj_id: int, **kwargs):
        with make_api_client(user) as api_client:
            (_, response) = api_client.consensus_api.retrieve_report(
                obj_id, **kwargs, _parse_response=False, _check_status=False
            )
            assert response.status == HTTPStatus.FORBIDDEN

        return response

    @pytest.mark.usefixtures("restore_db_per_function")
    @pytest.mark.parametrize("is_staff, allow", [(True, True), (False, False)])
    def test_user_get_report_in_sandbox_task(
        self, tasks, jobs, users, is_task_staff, is_staff, allow, admin_user
    ):
        task = next(
            t
            for t in tasks
            if t["organization"] is None
            and not users[t["owner"]["id"]]["is_superuser"]
            and any(j for j in jobs if j["task_id"] == t["id"] and j["type"] == "consensus")
        )

        if is_staff:
            user = task["owner"]["username"]
        else:
            user = next(u for u in users if not is_task_staff(u["id"], task["id"]))["username"]

        report = self.create_consensus_report(admin_user, task["id"])

        if allow:
            self._test_get_report_200(user, report["id"], expected_data=report)
        else:
            self._test_get_report_403(user, report["id"])

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
                    and any(j for j in jobs if j["task_id"] == t["id"] and j["type"] == "consensus")
                ),
                None,
            )
            if task is not None:
                break

        assert task

        report = self.create_consensus_report(admin_user, task["id"])

        if allow:
            self._test_get_report_200(user["username"], report["id"], expected_data=report)
        else:
            self._test_get_report_403(user["username"], report["id"])


@pytest.mark.usefixtures("restore_db_per_class")
class TestGetConsensusReportData(_PermissionTestBase):
    def _test_get_report_data_200(
        self, user: str, obj_id: int, *, expected_data: Optional[Dict[str, Any]] = None, **kwargs
    ):
        with make_api_client(user) as api_client:
            (_, response) = api_client.consensus_api.retrieve_report_data(obj_id, **kwargs)
            assert response.status == HTTPStatus.OK

        if expected_data is not None:
            assert DeepDiff(expected_data, json.loads(response.data), ignore_order=True) == {}

        return response

    def _test_get_report_data_403(self, user: str, obj_id: int, **kwargs):
        with make_api_client(user) as api_client:
            (_, response) = api_client.consensus_api.retrieve_report_data(
                obj_id, **kwargs, _parse_response=False, _check_status=False
            )
            assert response.status == HTTPStatus.FORBIDDEN

        return response

    @pytest.mark.parametrize("target", ["task", "job"])
    def test_can_get_full_report_data(self, admin_user, target, consensus_reports):
        report = next(
            r for r in consensus_reports if (r["job_id"] is not None) == (target == "job")
        )
        report_id = report["id"]

        with make_api_client(admin_user) as api_client:
            (report_data, response) = api_client.consensus_api.retrieve_report_data(report_id)
            assert response.status == HTTPStatus.OK

        # Just check several keys exist
        for key in ["parameters", "comparison_summary", "frame_results"]:
            assert key in report_data.keys(), key

    @pytest.mark.usefixtures("restore_db_per_function")
    @pytest.mark.parametrize("is_staff, allow", [(True, True), (False, False)])
    def test_user_get_report_data_in_sandbox_task(
        self, tasks, jobs, users, is_task_staff, is_staff, allow, admin_user
    ):
        task = next(
            t
            for t in tasks
            if t["organization"] is None
            and not users[t["owner"]["id"]]["is_superuser"]
            and any(j for j in jobs if j["task_id"] == t["id"] and j["type"] == "consensus")
        )

        if is_staff:
            user = task["owner"]["username"]
        else:
            user = next(u for u in users if not is_task_staff(u["id"], task["id"]))["username"]

        report = self.create_consensus_report(admin_user, task["id"])
        report_data = json.loads(self._test_get_report_data_200(admin_user, report["id"]).data)

        if allow:
            self._test_get_report_data_200(user, report["id"], expected_data=report_data)
        else:
            self._test_get_report_data_403(user, report["id"])

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
                    and any(j for j in jobs if j["task_id"] == t["id"] and j["type"] == "consensus")
                ),
                None,
            )
            if task is not None:
                break

        assert task

        report = self.create_consensus_report(admin_user, task["id"])
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
        consensus_job = next(
            j
            for j in jobs
            if j["type"] == "consensus" and j["stage"] == "acceptance" and j["state"] == "completed"
        )
        task_id = consensus_job["task_id"]

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

        task_report = self.create_consensus_report(admin_user, task_id)

        with make_api_client(admin_user) as api_client:
            job_report = api_client.consensus_api.list_reports(
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
class TestPostConsensusReports(_PermissionTestBase):
    def test_can_create_report(self, admin_user, jobs):
        consensus_job = next(
            j
            for j in jobs
            if j["type"] == "consensus" and j["stage"] == "acceptance" and j["state"] == "completed"
        )
        task_id = consensus_job["task_id"]

        report = self.create_consensus_report(admin_user, task_id)
        assert models.ConsensusReport._from_openapi_data(**report)

    @pytest.mark.parametrize("has_assignee", [False, True])
    def test_can_create_report_with_job_assignees(
        self, admin_user, jobs, users_by_name, has_assignee
    ):
        gt_job = next(
            j
            for j in jobs
            if j["type"] == "consensus" and j["stage"] == "acceptance" and j["state"] == "completed"
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

        report = self.create_consensus_report(admin_user, task_id)
        assert models.ConsensusReport._from_openapi_data(**report)

    def test_cannot_create_report_without_consensus_job(self, admin_user, tasks):
        task_id = next(t["id"] for t in tasks if t["consensus_jobs_per_regular_job"] == 0)

        with pytest.raises(exceptions.ApiException) as capture:
            self.create_consensus_report(admin_user, task_id)

        pattern = r"No annotated consensus jobs found or no regular jobs in annotation stage"
        assert re.search(pattern, capture.value.body)


class TestSimpleConsensusReportsFilters(CollectionSimpleFilterTestBase):
    @pytest.fixture(autouse=True)
    def setup(self, restore_db_per_class, admin_user, consensus_reports, jobs, tasks):
        self.user = admin_user
        self.samples = consensus_reports
        self.job_samples = jobs
        self.task_samples = tasks

    def _get_endpoint(self, api_client: ApiClient) -> Endpoint:
        return api_client.consensus_api.list_reports_endpoint

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
        ("task_id", "job_id", "parent_id", "target", "org_id"),
    )
    def test_can_use_simple_filter_for_object_list(self, field):
        return super()._test_can_use_simple_filter_for_object_list(field)


@pytest.mark.usefixtures("restore_db_per_class")
class TestListConsensusConflicts(_PermissionTestBase):
    def _test_list_conflicts_200(self, user, report_id, *, expected_data=None, **kwargs):
        with make_api_client(user) as api_client:
            results = get_paginated_collection(
                api_client.consensus_api.list_conflicts_endpoint,
                return_json=True,
                report_id=report_id,
                **kwargs,
            )

            if expected_data is not None:
                assert DeepDiff(expected_data, results) == {}

        return results

    def _test_list_conflicts_403(self, user, report_id, **kwargs):
        with make_api_client(user) as api_client:
            (_, response) = api_client.consensus_api.list_conflicts(
                report_id=report_id, **kwargs, _parse_response=False, _check_status=False
            )

            assert response.status == HTTPStatus.FORBIDDEN

    def test_can_list_job_report_conflicts(
        self, admin_user, consensus_reports, consensus_conflicts
    ):
        report = next(r for r in consensus_reports if r["job_id"])
        conflicts = [c for c in consensus_conflicts if c["report_id"] == report["id"]]

        self._test_list_conflicts_200(admin_user, report["id"], expected_data=conflicts)

    @pytest.mark.usefixtures("restore_db_per_function")
    @pytest.mark.parametrize("is_staff, allow", [(True, True), (False, False)])
    def test_user_list_conflicts_in_sandbox_task(
        self, tasks, jobs, users, is_task_staff, is_staff, allow, admin_user
    ):
        task = next(
            t
            for t in tasks
            if t["organization"] is None
            and not users[t["owner"]["id"]]["is_superuser"]
            and any(j for j in jobs if j["task_id"] == t["id"] and j["type"] == "consensus")
        )

        if is_staff:
            user = task["owner"]["username"]
        else:
            user = next(u for u in users if not is_task_staff(u["id"], task["id"]))["username"]

        report = self.create_consensus_report(admin_user, task["id"])
        conflicts = self._test_list_conflicts_200(admin_user, report_id=report["id"])
        assert conflicts

        if allow:
            self._test_list_conflicts_200(user, report["id"], expected_data=conflicts)
        else:
            self._test_list_conflicts_403(user, report["id"])

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
                    and any(j for j in jobs if j["task_id"] == t["id"] and j["type"] == "consensus")
                ),
                None,
            )
            if task is not None:
                break

        assert task
        user = user["username"]

        report = self.create_consensus_report(admin_user, task["id"])
        conflicts = self._test_list_conflicts_200(admin_user, report_id=report["id"])
        assert conflicts

        if allow:
            self._test_list_conflicts_200(user, report["id"], expected_data=conflicts)
        else:
            self._test_list_conflicts_403(user, report["id"])


class TestSimpleConsensusConflictsFilters(CollectionSimpleFilterTestBase):
    @pytest.fixture(autouse=True)
    def setup(
        self, restore_db_per_class, admin_user, consensus_conflicts, consensus_reports, jobs, tasks
    ):
        self.user = admin_user
        self.samples = consensus_conflicts
        self.report_samples = consensus_reports
        self.task_samples = tasks
        self.job_samples = jobs

    def _get_endpoint(self, api_client: ApiClient) -> Endpoint:
        return api_client.consensus_api.list_conflicts_endpoint

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
            task_id = self._find_valid_field_value(self.report_samples, field_path=["task_id"])
            task_reports = [r for r in self.report_samples if r["task_id"] == task_id]
            task_report_ids = {r["id"] for r in task_reports}
            task_conflicts = [
                c
                for c in self.samples
                if self._get_field(c, self._map_field("report_id")) in task_report_ids
            ]
            return task_reports[0]["task_id"], task_conflicts
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
        ("report_id", "type", "frame", "job_id", "task_id", "org_id"),
    )
    def test_can_use_simple_filter_for_object_list(self, field):
        return super()._test_can_use_simple_filter_for_object_list(field)


class TestSimpleConsensusSettingsFilters(CollectionSimpleFilterTestBase):
    @pytest.fixture(autouse=True)
    def setup(self, restore_db_per_class, admin_user, consensus_settings):
        self.user = admin_user
        self.samples = consensus_settings

    def _get_endpoint(self, api_client: ApiClient) -> Endpoint:
        return api_client.consensus_api.list_settings_endpoint

    @pytest.mark.parametrize("field", ("task_id",))
    def test_can_use_simple_filter_for_object_list(self, field):
        return super()._test_can_use_simple_filter_for_object_list(field)


@pytest.mark.usefixtures("restore_db_per_class")
class TestListSettings(_PermissionTestBase):
    def _test_list_settings_200(
        self, user: str, task_id: int, *, expected_data: Optional[Dict[str, Any]] = None, **kwargs
    ):
        with make_api_client(user) as api_client:
            actual = get_paginated_collection(
                api_client.consensus_api.list_settings_endpoint,
                task_id=task_id,
                **kwargs,
                return_json=True,
            )

        if expected_data is not None:
            assert DeepDiff(expected_data, actual, ignore_order=True) == {}

    def _test_list_settings_403(self, user: str, task_id: int, **kwargs):
        with make_api_client(user) as api_client:
            (_, response) = api_client.consensus_api.list_settings(
                task_id=task_id, **kwargs, _parse_response=False, _check_status=False
            )
            assert response.status == HTTPStatus.FORBIDDEN

        return response

    @pytest.mark.parametrize("is_staff, allow", [(True, True), (False, False)])
    def test_user_list_settings_in_sandbox(
        self, consensus_settings, tasks, users, is_task_staff, is_staff, allow
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

        settings = [s for s in consensus_settings if s["task_id"] == task["id"]]

        if allow:
            self._test_list_settings_200(user, task_id=task["id"], expected_data=settings)
        else:
            self._test_list_settings_403(user, task_id=task["id"])

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
    def test_user_list_settings_in_org_task(
        self,
        tasks,
        users,
        is_org_member,
        is_task_staff,
        org_role,
        is_staff,
        allow,
        consensus_settings,
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

        settings = [s for s in consensus_settings if s["task_id"] == task["id"]]
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
        self, user: str, obj_id: int, *, expected_data: Optional[Dict[str, Any]] = None, **kwargs
    ):
        with make_api_client(user) as api_client:
            (_, response) = api_client.consensus_api.retrieve_settings(obj_id, **kwargs)
            assert response.status == HTTPStatus.OK

        if expected_data is not None:
            assert DeepDiff(expected_data, json.loads(response.data), ignore_order=True) == {}

        return response

    def _test_get_settings_403(self, user: str, obj_id: int, **kwargs):
        with make_api_client(user) as api_client:
            (_, response) = api_client.consensus_api.retrieve_settings(
                obj_id, **kwargs, _parse_response=False, _check_status=False
            )
            assert response.status == HTTPStatus.FORBIDDEN

        return response

    def test_can_get_settings(self, admin_user, consensus_settings):
        settings = next(iter(consensus_settings))
        settings_id = settings["id"]
        self._test_get_settings_200(admin_user, settings_id, expected_data=settings)

    @pytest.mark.parametrize("is_staff, allow", [(True, True), (False, False)])
    def test_user_get_settings_in_sandbox_task(
        self, consensus_settings, tasks, users, is_task_staff, is_staff, allow
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

        settings = next(s for s in consensus_settings if s["task_id"] == task["id"])
        settings_id = settings["id"]

        if allow:
            self._test_get_settings_200(user, settings_id, expected_data=settings)
        else:
            self._test_get_settings_403(user, settings_id)

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
    def test_user_get_settings_in_org_task(
        self,
        tasks,
        users,
        is_org_member,
        is_task_staff,
        org_role,
        is_staff,
        allow,
        consensus_settings,
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

        settings = next(s for s in consensus_settings if s["task_id"] == task["id"])
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
        data: Dict[str, Any],
        *,
        expected_data: Optional[Dict[str, Any]] = None,
        **kwargs,
    ):
        with make_api_client(user) as api_client:
            (_, response) = api_client.consensus_api.partial_update_settings(
                obj_id, patched_consensus_settings_request=data, **kwargs
            )
            assert response.status == HTTPStatus.OK

        if expected_data is not None:
            assert DeepDiff(expected_data, json.loads(response.data), ignore_order=True) == {}

        return response

    def _test_patch_settings_403(self, user: str, obj_id: int, data: Dict[str, Any], **kwargs):
        with make_api_client(user) as api_client:
            (_, response) = api_client.consensus_api.partial_update_settings(
                obj_id,
                patched_consensus_settings_request=data,
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

    def test_can_patch_settings(self, admin_user, consensus_settings):
        settings = next(iter(consensus_settings))
        settings_id = settings["id"]
        data, expected_data = self._get_request_data(settings)
        self._test_patch_settings_200(admin_user, settings_id, data, expected_data=expected_data)

    @pytest.mark.parametrize("is_staff, allow", [(True, True), (False, False)])
    def test_user_patch_settings_in_sandbox_task(
        self, consensus_settings, tasks, users, is_task_staff, is_staff, allow
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

        settings = next(s for s in consensus_settings if s["task_id"] == task["id"])
        settings_id = settings["id"]
        data, expected_data = self._get_request_data(settings)

        if allow:
            self._test_patch_settings_200(user, settings_id, data, expected_data=expected_data)
        else:
            self._test_patch_settings_403(user, settings_id, data)

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
    def test_user_patch_settings_in_org_task(
        self,
        tasks,
        users,
        is_org_member,
        is_task_staff,
        org_role,
        is_staff,
        allow,
        consensus_settings,
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

        settings = next(s for s in consensus_settings if s["task_id"] == task["id"])
        settings_id = settings["id"]
        data, expected_data = self._get_request_data(settings)

        if allow:
            self._test_patch_settings_200(
                user["username"], settings_id, data, expected_data=expected_data
            )
        else:
            self._test_patch_settings_403(user["username"], settings_id, data)


@pytest.mark.usefixtures("restore_db_per_function")
class TestConsensusReportMetrics(_PermissionTestBase):
    demo_task_id = 26  # this task reproduces all the checkable cases

    @pytest.mark.parametrize("task_id", [demo_task_id])
    def test_report_summary(self, task_id, tasks, jobs, consensus_reports):
        consensus_job = next(
            j for j in jobs if j["task_id"] == task_id and j["type"] == "consensus"
        )
        report = next(r for r in consensus_reports if r["task_id"] == task_id)

        summary = report["summary"]
        assert 0 < summary["conflict_count"]
        assert all(summary["conflicts_by_type"].values())
        assert summary["conflict_count"] == sum(summary["conflicts_by_type"].values())
        assert summary["frame_count"] == consensus_job["frame_count"]

    def test_unmodified_task_produces_the_same_metrics(self, admin_user, consensus_reports):
        old_report = max(
            (r for r in consensus_reports if r["task_id"] == self.demo_task_id),
            key=lambda r: r["id"],
        )
        task_id = old_report["task_id"]

        new_report = self.create_consensus_report(admin_user, task_id)

        with make_api_client(admin_user) as api_client:
            (old_report_data, _) = api_client.consensus_api.retrieve_report_data(old_report["id"])
            (new_report_data, _) = api_client.consensus_api.retrieve_report_data(new_report["id"])

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
        self, admin_user, consensus_reports, jobs, labels
    ):
        consensus_job = next(
            j for j in jobs if j["type"] == "consensus" and j["task_id"] == self.demo_task_id
        )
        task_id = consensus_job["task_id"]
        old_report = max(
            (r for r in consensus_reports if r["task_id"] == task_id), key=lambda r: r["id"]
        )
        job_labels = [
            l
            for l in labels
            if l.get("task_id") == task_id
            or consensus_job.get("project_id")
            and l.get("project_id") == consensus_job.get("project_id")
        ]

        with make_api_client(admin_user) as api_client:
            api_client.jobs_api.partial_update_annotations(
                "update",
                consensus_job["id"],
                patched_labeled_data_request=dict(
                    shapes=[
                        dict(
                            frame=consensus_job["start_frame"],
                            label_id=job_labels[0]["id"],
                            type="rectangle",
                            points=[1, 1, 2, 2],
                        ),
                    ],
                ),
            )

        new_report = self.create_consensus_report(admin_user, task_id)
        assert new_report["summary"]["conflict_count"] > old_report["summary"]["conflict_count"]

    @pytest.mark.parametrize("task_id", [demo_task_id])
    @pytest.mark.parametrize(
        "parameter",
        [
            "iou_threshold",
            "line_thickness",
            "agreement_score_threshold",
            "sigma",
        ],
    )
    def test_settings_affect_metrics(
        self, admin_user, consensus_reports, consensus_settings, task_id, parameter
    ):
        old_report = max(
            (r for r in consensus_reports if r["task_id"] == task_id), key=lambda r: r["id"]
        )
        task_id = old_report["task_id"]

        settings = deepcopy(next(s for s in consensus_settings if s["task_id"] == task_id))
        if isinstance(settings[parameter], float):
            settings[parameter] = 1 - settings[parameter]
        else:
            assert False

        with make_api_client(admin_user) as api_client:
            api_client.consensus_api.partial_update_settings(
                settings["id"], patched_consensus_settings_request=settings
            )

        new_report = self.create_consensus_report(admin_user, task_id)
        assert new_report["summary"]["conflict_count"] != old_report["summary"]["conflict_count"]

    @pytest.mark.parametrize("task_id", [26])
    def test_can_merge_if_non_skeleton_label_follows_skeleton_label(
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
                task_annotations_update_request={
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

        report = self.create_consensus_report(admin_user, task_id)
        with make_api_client(admin_user) as api_client:
            (_, response) = api_client.consensus_api.retrieve_report_data(report["id"])
            assert response.status == HTTPStatus.OK


@pytest.mark.usefixtures("restore_db_per_class")
class TestListAssigneeConsensusReports(_PermissionTestBase):
    def _test_get_assignee_consensus_report_200(
        self, user: str, obj_id: int, *, expected_data: Optional[Dict[str, Any]] = None, **kwargs
    ):
        with make_api_client(user) as api_client:
            (_, response) = api_client.consensus_api.assignee_consensus_retrieve_report(
                obj_id, **kwargs
            )
            assert response.status == HTTPStatus.OK

        if expected_data is not None:
            assert DeepDiff(expected_data, json.loads(response.data), ignore_order=True) == {}

        return response

    def _test_get_assignee_consensus_report_403(self, user: str, obj_id: int, **kwargs):
        with make_api_client(user) as api_client:
            (_, response) = api_client.consensus_api.assignee_consensus_retrieve_report(
                obj_id, **kwargs, _parse_response=False, _check_status=False
            )
            assert response.status == HTTPStatus.FORBIDDEN

        return response

    def test_can_list_assignee_consensus_reports(self, admin_user, consensus_reports):
        parent_report = next(r for r in consensus_reports if r["task_id"])
        task_id = parent_report["task_id"]

        reports = [r for r in consensus_reports if r["task_id"] == task_id]

        self._test_get_assignee_consensus_report_200(admin_user, task_id, expected_data=reports)

    @pytest.mark.usefixtures("restore_db_per_function")
    @pytest.mark.parametrize("is_staff, allow", [(True, True), (False, False)])
    def test_user_list_assignee_consensus_reports_in_sandbox_task(
        self, tasks, jobs, users, is_task_staff, is_staff, allow, admin_user
    ):
        task = next(
            t
            for t in tasks
            if t["organization"] is None
            and any(j for j in jobs if j["task_id"] == t["id"] and j["type"] == "consensus")
        )

        if is_staff:
            user = task["owner"]["username"]
        else:
            user = next(u for u in users if not is_task_staff(u["id"], task["id"]))["username"]

        print(task["id"])

        report = self.create_consensus_report(admin_user, task["id"])

        if allow:
            self._test_get_assignee_consensus_report_200(user, task["id"], expected_data=[report], target="task")
        else:
            self._test_get_assignee_consensus_report_403(user, task["id"])

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
                    and any(j for j in jobs if j["task_id"] == t["id"] and j["type"] == "consensus")
                ),
                None,
            )
            if task is not None:
                break

        assert task

        report = self.create_consensus_report(admin_user, task["id"])

        if allow:
            self._test_get_assignee_consensus_report_200(
                user["username"], task["id"], expected_data=[report], target="task"
            )
        else:
            self._test_get_assignee_consensus_report_403(user["username"], task["id"])


@pytest.mark.usefixtures("restore_db_per_class")
class TestGetAssigneeConsensusReports(_PermissionTestBase):
    def _test_get_assignee_consensus_report_200(
        self, user: str, obj_id: int, *, expected_data: Optional[Dict[str, Any]] = None, **kwargs
    ):
        with make_api_client(user) as api_client:
            (_, response) = api_client.consensus_api.assignee_consensus_retrieve_report(
                obj_id, **kwargs
            )
            assert response.status == HTTPStatus.OK

        if expected_data is not None:
            assert DeepDiff(expected_data, json.loads(response.data), ignore_order=True) == {}

        return response

    def _test_get_assignee_consensus_report_403(self, user: str, obj_id: int, **kwargs):
        with make_api_client(user) as api_client:
            (_, response) = api_client.consensus_api.assignee_consensus_retrieve_report(
                obj_id, **kwargs, _parse_response=False, _check_status=False
            )
            assert response.status == HTTPStatus.FORBIDDEN

        return response

    @pytest.mark.usefixtures("restore_db_per_function")
    @pytest.mark.parametrize("is_staff, allow", [(True, True), (False, False)])
    def test_user_get_assignee_consensus_report_in_sandbox_task(
        self, tasks, jobs, users, is_task_staff, is_staff, allow, admin_user
    ):
        task = next(
            t
            for t in tasks
            if t["organization"] is None
            and not users[t["owner"]["id"]]["is_superuser"]
            and any(j for j in jobs if j["task_id"] == t["id"] and j["type"] == "consensus")
        )

        if is_staff:
            user = task["owner"]["username"]
        else:
            user = next(u for u in users if not is_task_staff(u["id"], task["id"]))["username"]

        report = self.create_consensus_report(admin_user, task["id"])
        assignee_consensus_report = self._test_get_assignee_consensus_report_200(
            admin_user, report["id"]
        )

        if allow:
            self._test_get_assignee_consensus_report_200(
                user, report["id"], expected_data=assignee_consensus_report
            )
        else:
            self._test_get_assignee_consensus_report_403(user, report["id"])

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
    def test_user_get_assignee_consensus_report_in_org_task(
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
                    and any(j for j in jobs if j["task_id"] == t["id"] and j["type"] == "consensus")
                ),
                None,
            )
            if task is not None:
                break

        assert task

        report = self.create_consensus_report(admin_user, task["id"])
        assignee_consensus_report = self._test_get_assignee_consensus_report_200(
            admin_user, report["id"]
        )

        if allow:
            self._test_get_assignee_consensus_report_200(
                user, report["id"], expected_data=assignee_consensus_report
            )
        else:
            self._test_get_assignee_consensus_report_403(user, report["id"])
