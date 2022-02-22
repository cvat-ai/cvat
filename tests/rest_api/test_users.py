# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

from http import HTTPStatus
from deepdiff import DeepDiff

from .utils.config import get_method

class TestGetUsers:
    def _test_can_see(self, user, data, endpoint='users', exclude_paths='', **kwargs):
        response = get_method(user, endpoint, **kwargs)
        response_data = response.json()
        response_data = response_data.get('results', response_data)

        assert response.status_code == HTTPStatus.OK
        assert DeepDiff(data, response_data, ignore_order=True,
            exclude_paths=exclude_paths) == {}

    def _test_cannot_see(self, user, endpoint='users', **kwargs):
        response = get_method(user, endpoint, **kwargs)

        assert response.status_code == HTTPStatus.FORBIDDEN

    def test_admin_can_see_all_others(self, users):
        exclude_paths = [f"root[{i}]['last_login']" for i in range(len(users))]
        self._test_can_see('admin2', users.raw, exclude_paths=exclude_paths,
            page_size="all")

    def test_everybody_can_see_self(self, users_by_name):
        for user, data in users_by_name.items():
            self._test_can_see(user, data, "users/self", "root['last_login']")

    def test_non_members_cannot_see_list_of_members(self):
        self._test_cannot_see('user2', org='org1')

    def test_non_admin_cannot_see_others(self, users):
        non_admins = (v for v in users if not v['is_superuser'])
        user = next(non_admins)['username']
        user_id = next(non_admins)['id']

        self._test_cannot_see(user, f"users/{user_id}")

    def test_all_members_can_see_list_of_members(self, find_users, users):
        org_members = [user['username'] for user in find_users(org=1)]
        available_fields = ['url', 'id', 'username', 'first_name', 'last_name']

        data = [dict(filter(lambda row: row[0] in available_fields, user.items()))
            for user in users if user['username'] in org_members]

        for member in org_members:
            self._test_can_see(member, data, org='org1')
