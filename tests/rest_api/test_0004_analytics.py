# Copyright (C) 2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

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

    def test_admin_can_see(self):
        self._test_can_see('admin2')

    def test_business_can_see(self):
        self._test_can_see('business1')

    def test_user_cannot_see_(self):
        self._test_cannot_see('user1')

    def test_worker_cannot_see_(self):
        self._test_cannot_see('worker1')
