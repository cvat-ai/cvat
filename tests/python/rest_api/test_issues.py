# Copyright (C) 2022 Intel Corporation
# Copyright (C) 2022-2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
from copy import deepcopy
from http import HTTPStatus
from typing import Any, Dict, List, Tuple

import pytest
from cvat_sdk import models
from cvat_sdk.api_client.api_client import ApiClient, Endpoint
from deepdiff import DeepDiff

from shared.utils.config import get_method, make_api_client

from .utils import CollectionSimpleFilterTestBase


@pytest.mark.usefixtures("restore_db_per_function")
class TestPostIssues:
    def _test_check_response(self, user, data, is_allow, **kwargs):
        with make_api_client(user) as client:
            (_, response) = client.issues_api.create(
                models.IssueWriteRequest(**data),
                **kwargs,
                _parse_response=False,
                _check_status=False,
            )

        if is_allow:
            assert response.status == HTTPStatus.CREATED
            response_json = json.loads(response.data)
            assert user == response_json["owner"]["username"]

            with make_api_client(user) as client:
                (comments, _) = client.comments_api.list(issue_id=response_json["id"])
            assert data["message"] == comments.results[0].message

            assert (
                DeepDiff(
                    data,
                    response_json,
                    exclude_regex_paths=r"root\['created_date|updated_date|comments|id|owner|message'\]",
                )
                == {}
            )
        else:
            assert response.status == HTTPStatus.FORBIDDEN

    @pytest.mark.parametrize("org", [""])
    @pytest.mark.parametrize(
        "privilege, job_staff, is_allow",
        [
            ("admin", True, True),
            ("admin", False, True),
            ("business", True, True),
            ("business", False, False),
            ("worker", True, True),
            ("worker", False, False),
            ("user", True, True),
            ("user", False, False),
        ],
    )
    def test_user_create_issue(
        self, org, privilege, job_staff, is_allow, find_job_staff_user, find_users, jobs_by_org
    ):
        users = find_users(privilege=privilege)
        jobs = jobs_by_org[org]
        username, jid = find_job_staff_user(jobs, users, job_staff)
        (job,) = filter(lambda job: job["id"] == jid, jobs)

        data = {
            "assignee": None,
            "comments": [],
            "job": jid,
            "frame": job["start_frame"],
            "position": [
                0.0,
                0.0,
                1.0,
                1.0,
            ],
            "resolved": False,
            "message": "lorem ipsum",
        }

        self._test_check_response(username, data, is_allow)

    @pytest.mark.parametrize("org", [2])
    @pytest.mark.parametrize(
        "role, job_staff, is_allow",
        [
            ("maintainer", False, True),
            ("owner", False, True),
            ("supervisor", False, False),
            ("worker", False, False),
            ("maintainer", True, True),
            ("owner", True, True),
            ("supervisor", True, True),
            ("worker", True, True),
        ],
    )
    def test_member_create_issue(
        self, org, role, job_staff, is_allow, find_job_staff_user, find_users, jobs_by_org, jobs
    ):
        users = find_users(role=role, org=org)
        username, jid = find_job_staff_user(jobs_by_org[org], users, job_staff)
        job = jobs[jid]

        data = {
            "assignee": None,
            "comments": [],
            "job": jid,
            "frame": job["start_frame"],
            "position": [
                0.0,
                0.0,
                1.0,
                1.0,
            ],
            "resolved": False,
            "message": "lorem ipsum",
        }

        self._test_check_response(username, data, is_allow, org_id=org)


@pytest.mark.usefixtures("restore_db_per_function")
class TestPatchIssues:
    def _test_check_response(self, user, issue_id, data, is_allow, **kwargs):
        request_data, expected_response_data = data
        with make_api_client(user) as client:
            (_, response) = client.issues_api.partial_update(
                issue_id,
                patched_issue_write_request=models.PatchedIssueWriteRequest(**request_data),
                **kwargs,
                _parse_response=False,
                _check_status=False,
            )

        if is_allow:
            assert response.status == HTTPStatus.OK
            assert (
                DeepDiff(
                    expected_response_data,
                    json.loads(response.data),
                    exclude_regex_paths=r"root\['created_date|updated_date|comments|id|owner'\]",
                )
                == {}
            )
        else:
            assert response.status == HTTPStatus.FORBIDDEN

    @pytest.fixture(scope="class")
    def request_and_response_data(self, issues, users):
        def get_data(issue_id, *, username: str = None):
            request_data = deepcopy(issues[issue_id])
            request_data["resolved"] = not request_data["resolved"]

            response_data = deepcopy(request_data)

            request_data.pop("comments")
            request_data.pop("updated_date")
            request_data.pop("id")
            request_data.pop("owner")

            if username:
                assignee = next(u for u in users if u["username"] == username)
                request_data["assignee"] = assignee["id"]
                response_data["assignee"] = {
                    k: assignee[k] for k in ["id", "username", "url", "first_name", "last_name"]
                }
            else:
                request_data["assignee"] = None

            return request_data, response_data

        return get_data

    @pytest.mark.parametrize("org", [""])
    @pytest.mark.parametrize(
        "privilege, issue_staff, issue_admin, is_allow",
        [
            ("admin", True, None, True),
            ("admin", False, None, True),
            ("business", True, None, True),
            ("business", False, None, False),
            ("user", True, None, True),
            ("user", False, None, False),
            ("worker", False, True, True),
            ("worker", True, False, True),
            ("worker", False, False, False),
        ],
    )
    def test_user_update_issue(
        self,
        org,
        privilege,
        issue_staff,
        issue_admin,
        is_allow,
        find_issue_staff_user,
        find_users,
        issues_by_org,
        request_and_response_data,
    ):
        users = find_users(privilege=privilege)
        issues = issues_by_org[org]
        username, issue_id = find_issue_staff_user(issues, users, issue_staff, issue_admin)

        data = request_and_response_data(issue_id, username=username)
        self._test_check_response(username, issue_id, data, is_allow)

    @pytest.mark.parametrize("org", [2])
    @pytest.mark.parametrize(
        "role, issue_staff, issue_admin, is_allow",
        [
            ("maintainer", True, None, True),
            ("maintainer", False, None, True),
            ("supervisor", True, None, True),
            ("supervisor", False, None, False),
            ("owner", True, None, True),
            ("owner", False, None, True),
            ("worker", False, True, True),
            ("worker", True, False, True),
            ("worker", False, False, False),
        ],
    )
    def test_member_update_issue(
        self,
        org,
        role,
        issue_staff,
        issue_admin,
        is_allow,
        find_issue_staff_user,
        find_users,
        issues_by_org,
        request_and_response_data,
    ):
        users = find_users(role=role, org=org)
        issues = issues_by_org[org]
        username, issue_id = find_issue_staff_user(issues, users, issue_staff, issue_admin)

        data = request_and_response_data(issue_id, username=username)
        self._test_check_response(username, issue_id, data, is_allow)


@pytest.mark.usefixtures("restore_db_per_function")
class TestDeleteIssues:
    def _test_check_response(self, user, issue_id, expect_success, **kwargs):
        with make_api_client(user) as client:
            (_, response) = client.issues_api.destroy(
                issue_id,
                **kwargs,
                _parse_response=False,
                _check_status=False,
            )

        if expect_success:
            assert response.status == HTTPStatus.NO_CONTENT

            (_, response) = client.issues_api.retrieve(
                issue_id, _parse_response=False, _check_status=False
            )
            assert response.status == HTTPStatus.NOT_FOUND
        else:
            assert response.status == HTTPStatus.FORBIDDEN

    @pytest.mark.parametrize("org", [""])
    @pytest.mark.parametrize(
        "privilege, issue_staff, issue_admin, expect_success",
        [
            ("admin", True, None, True),
            ("admin", False, None, True),
            ("business", True, None, True),
            ("business", False, None, False),
            ("user", True, None, True),
            ("user", False, None, False),
            ("worker", False, True, True),
            ("worker", True, False, False),
            ("worker", False, False, False),
        ],
    )
    def test_user_delete_issue(
        self,
        org,
        privilege,
        issue_staff,
        issue_admin,
        expect_success,
        find_issue_staff_user,
        find_users,
        issues_by_org,
    ):
        users = find_users(privilege=privilege)
        issues = issues_by_org[org]
        username, issue_id = find_issue_staff_user(issues, users, issue_staff, issue_admin)

        self._test_check_response(username, issue_id, expect_success)

    @pytest.mark.parametrize("org", [2])
    @pytest.mark.parametrize(
        "role, issue_staff, issue_admin, expect_success",
        [
            ("maintainer", True, None, True),
            ("maintainer", False, None, True),
            ("supervisor", True, None, True),
            ("supervisor", False, None, False),
            ("owner", True, None, True),
            ("owner", False, None, True),
            ("worker", False, True, True),
            ("worker", True, False, False),
            ("worker", False, False, False),
        ],
    )
    def test_org_member_delete_issue(
        self,
        org,
        role,
        issue_staff,
        issue_admin,
        expect_success,
        find_issue_staff_user,
        find_users,
        issues_by_org,
    ):
        users = find_users(role=role, org=org)
        issues = issues_by_org[org]
        username, issue_id = find_issue_staff_user(issues, users, issue_staff, issue_admin)

        self._test_check_response(username, issue_id, expect_success)


class TestIssuesListFilters(CollectionSimpleFilterTestBase):
    field_lookups = {
        "owner": ["owner", "username"],
        "assignee": ["assignee", "username"],
        "job_id": ["job"],
        "frame_id": ["frame"],
    }

    @pytest.fixture(autouse=True)
    def setup(self, restore_db_per_class, admin_user, issues):
        self.user = admin_user
        self.samples = issues

    def _get_endpoint(self, api_client: ApiClient) -> Endpoint:
        return api_client.issues_api.list_endpoint

    @pytest.mark.parametrize(
        "field",
        ("owner", "assignee", "job_id", "resolved", "frame_id"),
    )
    def test_can_use_simple_filter_for_object_list(self, field):
        return super().test_can_use_simple_filter_for_object_list(field)


class TestCommentsListFilters(CollectionSimpleFilterTestBase):
    field_lookups = {
        "owner": ["owner", "username"],
        "issue_id": ["issue"],
    }

    @pytest.fixture(autouse=True)
    def setup(self, restore_db_per_class, admin_user, comments, issues):
        self.user = admin_user
        self.samples = comments
        self.sample_issues = issues

    def _get_endpoint(self, api_client: ApiClient) -> Endpoint:
        return api_client.comments_api.list_endpoint

    def _get_field_samples(self, field: str) -> Tuple[Any, List[Dict[str, Any]]]:
        if field == "job_id":
            issue_id, issue_comments = super()._get_field_samples("issue_id")
            issue = next((s for s in self.sample_issues if s["id"] == issue_id))
            return issue["job"], issue_comments
        elif field == "frame_id":
            frame_id = self._find_valid_field_value(self.sample_issues, ["frame"])
            issues = [s["id"] for s in self.sample_issues if s["frame"] == frame_id]
            comments = [
                s for s in self.samples if self._get_field(s, self._map_field("issue_id")) in issues
            ]
            return frame_id, comments
        else:
            return super()._get_field_samples(field)

    @pytest.mark.parametrize(
        "field",
        ("owner", "issue_id", "job_id", "frame_id"),
    )
    def test_can_use_simple_filter_for_object_list(self, field):
        return super().test_can_use_simple_filter_for_object_list(field)


@pytest.mark.usefixtures("restore_db_per_class")
class TestListIssues:
    def _test_can_see_issues(self, user, data, **kwargs):
        response = get_method(user, "issues", **kwargs)

        assert response.status_code == HTTPStatus.OK
        assert DeepDiff(data, response.json()["results"]) == {}

    def test_admin_can_see_all_issues(self, issues):
        self._test_can_see_issues("admin2", issues.raw, page_size="all")

    @pytest.mark.parametrize("field_value, query_value", [(1, 1), (None, "")])
    def test_can_filter_by_org_id(self, field_value, query_value, issues, jobs):
        issues = filter(lambda i: jobs[i["job"]]["organization"] == field_value, issues)
        self._test_can_see_issues("admin2", list(issues), page_size="all", org_id=query_value)
