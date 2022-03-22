# Copyright (C) 2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

from cgi import print_arguments
from http import HTTPStatus
from deepdiff import DeepDiff
import pytest

from .utils.config import get_method, post_method, patch_method


class TestGetProjects:

    def _test_response_200(self, username, project_id):
        response = get_method(username, f'projects/{project_id}')
        assert response.status_code == HTTPStatus.OK
        project = response.json()
        assert project_id == project['id']

    # [sandbox] Admin can see any project even he has no ownerships for this project (GET /projects/{id}).
    def test_project_admin_accessibility(self, users, projects, find_users):
        admins = find_users(privilege='admin')
        assert len(admins)

        for admin in admins:
            for project in projects:
                self._test_response_200(admin['username'], project['id'])
