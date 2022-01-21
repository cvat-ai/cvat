# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
from http import HTTPStatus
import json
import pytest
from tests.rest_api.conftest import roles_by_org
from .utils.config import get_method, ASSETS_DIR
from deepdiff import DeepDiff

def compare_organizations(org_id, response):
    assert response.status_code == HTTPStatus.OK
    with open(os.path.join(ASSETS_DIR, 'organizations.json')) as f:
        org = next(filter(lambda org: org['id'] == org_id, json.load(f)))
    DeepDiff(org, response.json())

class TestGetOrganizations:
    _ORG = 1

    def test_admin1_get_organization_id_1():
        response = get_method('admin1', 'organizations/1')
        assert response.status_code == HTTPStatus.OK

    def test_user1_get_organization_id_1():
        response = get_method('user1', 'organizations/1')
        assert response.status_code == HTTPStatus.OK

    @pytest.mark.parametrize('privilege', 'role', 'is_allow', [
        ('admin',    None,         True),
        ('user',     None,         False),
        ('business', None,         False),
        ('worker',   None,         False),
        (None,       'owner',      True),
        (None,       'maintainer', True),
        (None,       'worker',     True),
        (None,       'supervisor', True),
    ])
    def test_can_see_get_spicific_organization(self, privilege, role, is_allow, find_user):
        user = find_user(privilege=privilege, org=self._ORG, role=role)['username']
        if is_allow:
            self._test_can_see(user, f'organization/{self._ORG}')
        else:
            self._test_cannot_see(user, f'organization/{self._ORG}')


