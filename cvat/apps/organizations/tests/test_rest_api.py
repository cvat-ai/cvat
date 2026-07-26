# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.test import override_settings

from cvat.apps.engine.tests.test_rest_api import create_db_users
from cvat.apps.engine.tests.utils import ApiTestBase, ForceLogin


class OrganizationCreateAPITestCase(ApiTestBase):
    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)

    def _run_api(self, user, data):
        with ForceLogin(user, self.client):
            return self.client.post("/api/organizations", data=data, format="json")

    def test_default_permissions(self):
        for user, expected_status in [(self.admin, 201), (self.owner, 201), (self.annotator, 403)]:
            response = self._run_api(user, {"slug": user.username + "org"})
            self.assertEqual(response.status_code, expected_status, response.content)

    @override_settings(ORGANIZATIONS_MIN_ROLE_TO_CREATE="admin")
    def test_overridden_permissions(self):
        for user, expected_status in [(self.admin, 201), (self.owner, 403), (self.annotator, 403)]:
            response = self._run_api(user, {"slug": user.username + "org"})
            self.assertEqual(response.status_code, expected_status, response.content)
