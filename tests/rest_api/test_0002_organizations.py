# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
from http import HTTPStatus
import json
import pytest
from .utils.config import get_method, ASSETS_DIR
from deepdiff import DeepDiff

def compare_organizations(org_id, response):
    assert response.status_code == HTTPStatus.OK
    with open(os.path.join(ASSETS_DIR, 'organizations.json')) as f:
        org = next(filter(lambda org: org['id'] == org_id, json.load(f)))
    DeepDiff(org, response.json())

class TestGetOrganizations:
    _ORG = 2

    def _test_can_see_organization(self, user, endpoint, **kwargs):
        response = get_method(user, endpoint, **kwargs)

        assert response.status_code == HTTPStatus.OK

    def _test_cannot_see_organization(self, user, endpoint, **kwargs):
        response = get_method(user, endpoint, **kwargs)

        assert response.status_code == HTTPStatus.FORBIDDEN

    @pytest.mark.parametrize('privilege, role, org, is_allow', [
        ('admin',    None,         None, True),
        ('user',     None,         1,    False),
        ('business', None,         1,    False),
        ('worker',   None,         1,    False),
        (None,       'owner',      2,    True),
        (None,       'maintainer', 2,    True),
        (None,       'worker',     2,    True),
        (None,       'supervisor', 2,    True),
    ])
    def test_can_see_specific_organization(self, privilege, role, org, is_allow, find_users):
        user = find_users(privilege=privilege, role=role, org=org)[0]
        if is_allow:
            self._test_can_see_organization(user['username'], f'organizations/{self._ORG}')
        else:
            self._test_cannot_see_organization(user['username'], f'organizations/{self._ORG}')