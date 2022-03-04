# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

import pytest
from http import HTTPStatus
from deepdiff import DeepDiff

from .utils.config import get_method, patch_method

class TestGetMemberships:
    def _test_can_see_memberships(self, user, data, **kwargs):
        response = get_method(user, 'memberships', **kwargs)

        assert response.status_code == HTTPStatus.OK
        assert DeepDiff(data, response.json()['results']) == {}

    def _test_cannot_see_memberships(self, user, **kwargs):
        response = get_method(user, 'memberships', **kwargs)

        assert response.status_code == HTTPStatus.FORBIDDEN

    def test_admin_can_see_all_memberships(self, memberships):
        self._test_can_see_memberships('admin2', memberships.raw, page_size='all')

    def test_non_admin_can_see_only_self_memberships(self, memberships):
        non_admins= ['business1', 'user1', 'dummy1','worker2']
        for username in non_admins:
            data = [obj for obj in memberships
                if obj['user']['username'] == username]
            self._test_can_see_memberships(username, data)

    def test_all_members_can_see_other_members_membership(self, memberships):
        data = [obj for obj in memberships if obj['organization'] == 1]
        for membership in data:
            self._test_can_see_memberships(membership['user']['username'],
                data, org_id=1)

    def test_non_members_cannot_see_members_membership(self):
        non_org1_users = ['user2', 'worker3']
        for user in non_org1_users:
            self._test_cannot_see_memberships(user, org_id=1)


class TestPatchMemberships:
    _ORG = 2

    def _test_can_change_membership(self, user, membership_id, new_role):
        response = patch_method(user, f"memberships/{membership_id}",
            {'role': new_role}, org_id=self._ORG)

        assert response.status_code == HTTPStatus.OK
        assert response.json()['role'] == new_role

    def _test_cannot_change_membership(self, user, membership_id, new_role):
        response = patch_method(user, f"memberships/{membership_id}",
            {'role': new_role}, org_id=self._ORG)

        assert response.status_code == HTTPStatus.FORBIDDEN

    @pytest.mark.parametrize('who, whom, new_role, is_allow', [
        ('supervisor', 'worker',     'supervisor', False),
        ('supervisor', 'maintainer', 'supervisor', False),
        ('worker',     'supervisor', 'worker',     False),
        ('worker',     'maintainer', 'worker',     False),
        ('maintainer', 'maintainer', 'worker',     False),
        ('maintainer', 'supervisor', 'worker',     True),
        ('maintainer', 'worker',     'supervisor', True),
        ('owner',      'maintainer', 'worker',     True),
        ('owner',      'supervisor', 'worker',     True),
        ('owner',      'worker',     'supervisor', True),
    ])
    def test_user_can_change_role_of_member(self, who, whom, new_role, is_allow, find_users):
        user = find_users(org=self._ORG, role=who)[0]['username']
        membership_id = find_users(org=self._ORG, role=whom)[1]['membership_id']

        if is_allow:
            self._test_can_change_membership(user, membership_id, new_role)
        else:
            self._test_cannot_change_membership(user, membership_id, new_role)
