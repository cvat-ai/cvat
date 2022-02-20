# Copyright (C) 2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

import pytest
from http import HTTPStatus
from .utils.config import server_get

class TestGetAnalytics:
    endpoint = 'analytics/app/kibana'
    def _test_can_see(self, user):
        response = server_get(user, self.endpoint)

        assert response.status_code == HTTPStatus.OK

    def _test_cannot_see(self, user):
        response = server_get(user, self.endpoint)

        assert response.status_code == HTTPStatus.FORBIDDEN

    @pytest.mark.parametrize('privilege, is_allow', [
        ('admin', True), ('business', True),
        ('worker', False), ('user', False)
    ])
    def test_can_see(self, privilege, is_allow, find_users):
        user = find_users(privilege=privilege)[0]['username']

        if is_allow:
            self._test_can_see(user)
        else:
            self._test_cannot_see(user)
