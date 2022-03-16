# Copyright (C) 2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

from http import HTTPStatus
from deepdiff import DeepDiff
import pytest

from .utils.config import post_method

class TestPostIssues:
    def _test_check_response(self, user, data, is_allow, **kwargs):
        response = post_method(user, 'issues', data, **kwargs)

        if is_allow:
            assert response.status_code == HTTPStatus.CREATED
            assert user == response.json()['owner']['username']
            assert data['message'] == response.json()['comments'][0]['message']
            assert DeepDiff(data, response.json(),
                exclude_regex_paths="root\['created_date|updated_date|comments|id|owner|message'\]") == {}
        else:
            assert response.status_code == HTTPStatus.FORBIDDEN

    @pytest.mark.parametrize('org', [''])
    @pytest.mark.parametrize('privilege, job_staff, is_allow', [
        ('admin',    True, True), ('admin',    False, True),
        ('business', True, True), ('business', False, False),
        ('worker',   True, True), ('worker',   False, False),
        ('user',     True, True), ('user',     False, False)
    ])
    def test_user_create_issue(self, org, privilege, job_staff, is_allow,
        find_job_staff_user, find_users, jobs_by_org):
        users = find_users(privilege=privilege)
        jobs = jobs_by_org[org]
        username, jid = find_job_staff_user(jobs, users, job_staff)
        job, = filter(lambda job: job['id'] == jid, jobs)

        data = {
            "assignee": None,
            "comments": [],
            "job": jid,
            "frame": job['start_frame'],
            "position": [
                0., 0., 1., 1.,
            ],
            "resolved": False,
            "message": "lorem ipsum",
        }

        self._test_check_response(username, data, is_allow)


    @pytest.mark.parametrize('org', [2])
    @pytest.mark.parametrize('role, job_staff, is_allow', [
        ('maintainer', False, True),  ('owner',  False, True),
        ('supervisor', False, False), ('worker', False, False),
        ('maintainer', True, True), ('owner',  True, True),
        ('supervisor', True, True), ('worker', True, True)
    ])
    def test_member_create_issue(self, org, role, job_staff, is_allow,
            find_job_staff_user, find_users, jobs_by_org):
        users = find_users(role=role, org=org)
        jobs = jobs_by_org[org]
        username, jid = find_job_staff_user(jobs, users, job_staff)
        job, = filter(lambda job: job['id'] == jid, jobs)

        data = {
            "assignee": None,
            "comments": [],
            "job": jid,
            "frame": job['start_frame'],
            "position": [
                0., 0., 1., 1.,
            ],
            "resolved": False,
            "message": "lorem ipsum",
        }

        self._test_check_response(username, data, is_allow, org_id=org)
