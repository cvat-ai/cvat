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
        self._test_can_see('admin2', users, exclude_paths=exclude_paths,
            page_size="all")

    def test_everybody_can_see_self(self, users_by_name):
        for user, data in users_by_name.items():
            self._test_can_see(user, data, "users/self", "root['last_login']")

    def test_non_members_cannot_see_list_of_members(self):
        self._test_cannot_see('user2', org='org1')

    def test_non_admin_cannot_see_others(self, users):
        non_admins = (v for v in users if not v['is_superuser'])
        user = next(non_admins)['username']
        id = next(non_admins)['id']

        self._test_cannot_see(user, f"users/{id}")

    def test_all_members_can_see_list_of_members(self, members, users_by_name):
        org_id = 1
        available_fields = ['url', 'id', 'username', 'first_name', 'last_name']
        data = [dict(filter(lambda row: row[0] in available_fields, data.items()))
            for user, data in users_by_name.items() if user in members[org_id]]

        for username in members[org_id]:
            self._test_can_see(username, data, org='org1')
