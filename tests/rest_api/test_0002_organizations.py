# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

from http import HTTPStatus
import pytest
from .utils.config import get_method, patch_method, delete_method
from deepdiff import DeepDiff

class TestGetOrganizations:
    _ORG = 2

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
    def test_can_see_specific_organization(self, privilege, role, is_member,
            is_allow, find_users, organizations):
        exclude_org = None if is_member else self._ORG
        org = self._ORG if is_member else None
        user = find_users(privilege=privilege, role=role, org=org,
            exclude_org=exclude_org)[0]['username']

        response = get_method(user, f'organizations/{self._ORG}')
        if is_allow:
            assert response.status_code == HTTPStatus.OK
            assert DeepDiff(organizations[self._ORG], response.json()) == {}
        else:
            assert response.status_code == HTTPStatus.NOT_FOUND

class TestPatchOrganizations:
    _ORG = 2

    @pytest.fixture(scope='class')
    def request_data(self):
        return {'slug': 'new', 'name': 'new', 'description': 'new',
            'contact': {'email': 'new@cvat.org'}}

    @pytest.fixture(scope='class')
    def expected_data(self, organizations, request_data):
        data = organizations[self._ORG].copy()
        data.update(request_data)
        return data

    @pytest.mark.parametrize('privilege, role, is_member, is_allow', [
        ('admin',    None,         None,  True),
        ('user',     None,         False, False),
        ('business', None,         False, False),
        ('worker',   None,         False, False),
        (None,       'owner',      True,  True),
        (None,       'maintainer', True,  True),
        (None,       'worker',     True,  False),
        (None,       'supervisor', True,  False),
    ])
    def test_can_update_specific_organization(self, privilege, role, is_member,
            is_allow, find_users, request_data, expected_data):
        exclude_org = None if is_member else self._ORG
        org = self._ORG if is_member else None
        user = find_users(privilege=privilege, role=role, org=org,
            exclude_org=exclude_org)[0]['username']

        response = patch_method(user, f'organizations/{self._ORG}', request_data)

        if is_allow:
            assert response.status_code == HTTPStatus.OK
            assert DeepDiff(expected_data, response.json(),
                exclude_paths="root['updated_date']") == {}
        else:
            assert response.status_code != HTTPStatus.OK

class TestDeleteOrganizations:
    _ORG = 2

    @pytest.mark.parametrize('privilege, role, is_member, is_allow', [
        ('admin',    None,         None,  True),
        (None,       'owner',      True,  True),
        (None,       'maintainer', True,  False),
        (None,       'worker',     True,  False),
        (None,       'supervisor', True,  False),
        ('user',     None,         False, False),
        ('business', None,         False, False),
        ('worker',   None,         False, False),
    ])
    def test_can_delete(self, privilege, role, is_member,
            is_allow, find_users):
        exclude_org = None if is_member else self._ORG
        org = self._ORG if is_member else None
        user = find_users(privilege=privilege, role=role, org=org,
            exclude_org=exclude_org)[0]['username']

        response = delete_method(user, f'organizations/{self._ORG}')

        if is_allow:
            assert response.status_code == HTTPStatus.NO_CONTENT
        else:
            assert response.status_code != HTTPStatus.OK
