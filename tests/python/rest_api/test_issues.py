# Copyright (C) 2022 Intel Corporation
# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
from copy import deepcopy
from http import HTTPStatus

import pytest
from cvat_sdk import models
from cvat_sdk.api_client import exceptions
from deepdiff import DeepDiff

from shared.utils.config import make_api_client


@pytest.mark.usefixtures("changedb")
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
            assert data["message"] == response_json["comments"][0]["message"]
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


@pytest.mark.usefixtures("changedb")
class TestPatchIssues:
    def _test_check_response(self, user, issue_id, data, is_allow, **kwargs):
        with make_api_client(user) as client:
            (_, response) = client.issues_api.partial_update(
                issue_id,
                patched_issue_write_request=models.PatchedIssueWriteRequest(**data),
                **kwargs,
                _parse_response=False,
                _check_status=False,
            )

        if is_allow:
            assert response.status == HTTPStatus.OK
            assert (
                DeepDiff(
                    data,
                    json.loads(response.data),
                    exclude_regex_paths=r"root\['created_date|updated_date|comments|id|owner'\]",
                )
                == {}
            )
        else:
            assert response.status == HTTPStatus.FORBIDDEN

    @pytest.fixture(scope="class")
    def request_data(self, issues):
        def get_data(issue_id):
            data = deepcopy(issues[issue_id])
            data["resolved"] = not data["resolved"]
            data.pop("comments")
            data.pop("updated_date")
            data.pop("id")
            data.pop("owner")
            return data

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
            ("worker", True, False, False),
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
        request_data,
    ):
        users = find_users(privilege=privilege)
        issues = issues_by_org[org]
        username, issue_id = find_issue_staff_user(issues, users, issue_staff, issue_admin)

        data = request_data(issue_id)
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
            ("worker", True, False, False),
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
        request_data,
    ):
        users = find_users(role=role, org=org)
        issues = issues_by_org[org]
        username, issue_id = find_issue_staff_user(issues, users, issue_staff, issue_admin)

        data = request_data(issue_id)
        self._test_check_response(username, issue_id, data, is_allow, org_id=org)

    @pytest.mark.xfail(
        raises=exceptions.ServiceException,
        reason="server bug, https://github.com/cvat-ai/cvat/issues/122",
    )
    def test_cant_update_message(self, admin_user: str, issues_by_org):
        org = 2
        issue_id = issues_by_org[org][0]["id"]

        with make_api_client(admin_user) as client:
            client.issues_api.partial_update(
                issue_id,
                patched_issue_write_request=models.PatchedIssueWriteRequest(message="foo"),
                org_id=org,
            )


@pytest.mark.usefixtures("changedb")
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

        self._test_check_response(username, issue_id, expect_success, org_id=org)
