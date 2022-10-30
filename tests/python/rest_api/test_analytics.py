# Copyright (C) 2022 Intel Corporation
# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from http import HTTPStatus

import pytest

from cvat.tests.python.enums.user_enums import AccessRights
from shared.utils.config import server_get


@pytest.mark.usefixtures("restore_db_per_class")
class TestGetAnalytics:
    endpoint = "analytics/app/kibana"

    def _test_can_see(self, user):
        response = server_get(user, self.endpoint)

        assert response.status_code == HTTPStatus.OK

    def _test_cannot_see(self, user):
        response = server_get(user, self.endpoint)

        assert response.status_code == HTTPStatus.FORBIDDEN

    @pytest.mark.parametrize(
        "privilege, is_allow",
        AccessRights.list()
    )
    def test_can_see(self, privilege, is_allow, find_users):
        user = find_users(privilege=privilege)[0]["username"]

        if is_allow:
            self._test_can_see(user)
        else:
            pass

    @pytest.mark.parametrize(
        "privilege, is_allow",
        AccessRights.list()
    )
    def test_cant_see(self, privilege, is_allow, find_users):
        user = find_users(privilege=privilege)[0]["username"]

        if not is_allow:
            self._test_cannot_see(user)
        else:
            pass
