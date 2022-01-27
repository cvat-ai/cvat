# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

from http import HTTPStatus
import pytest
from .utils.config import get_method

class TestGetOrganizations:
    _ORG = 2

    def _test_can_see_organization(self, user, endpoint, **kwargs):
        response = get_method(user, endpoint, **kwargs)

        assert response.status_code == HTTPStatus.OK

    def _test_cannot_see_organization(self, user, endpoint, **kwargs):
        response = get_method(user, endpoint, **kwargs)

        assert response.status_code == HTTPStatus.NOT_FOUND

    @pytest.mark.parametrize('privilege, role, is_member, is_allow', [
        ('admin',    None,         None,  True),
        ('user',     None,         False, False),
        ('business', None,         False, False),
        ('worker',   None,         False, False),
        (None,       'owner',      True,  True),
        (None,       'maintainer', True,  True),
        (None,       'worker',     True,  True),
        (None,       'supervisor', True,  True),
    ])
    def test_can_see_specific_organization(self, privilege, role, is_member, is_allow, find_users):
        exclude_org = None if is_member else self._ORG
        org = self._ORG if is_member else None
        user = find_users(privilege=privilege, role=role, org=org,
            exclude_org=exclude_org)[0]
        if is_allow:
            self._test_can_see_organization(user['username'], f'organizations/{self._ORG}')
        else:
            self._test_cannot_see_organization(user['username'], f'organizations/{self._ORG}')