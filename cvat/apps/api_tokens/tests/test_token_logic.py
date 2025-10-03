# Copyright (C) 2020-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


from datetime import timedelta
from unittest import mock

from django.contrib.auth.models import Group, User
from django.test import override_settings
from django.utils import timezone
from rest_framework import status

from cvat.apps.api_tokens.cron import clear_unusable_api_tokens
from cvat.apps.api_tokens.models import ApiToken
from cvat.apps.engine.tests.utils import ApiTestBase, mock_method


def create_db_users(cls: type[ApiTestBase]):
    (group_admin, _) = Group.objects.get_or_create(name="admin")
    user_admin = User.objects.create_superuser(username="admin", email="", password="admin")
    user_admin.groups.add(group_admin)
    cls.admin = user_admin


class ApiTokenAutomationTest(ApiTestBase):
    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)

    def test_can_disable_stale_tokens(self):
        response = self._post_request(
            "/api/auth/api_tokens", user=self.admin, data={"name": "test token"}
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        token_id = response.json()["id"]

        response = self._get_request(f"/api/auth/api_tokens/{token_id}", user=self.admin)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        with override_settings(API_TOKEN_STALE_PERIOD=timedelta(seconds=0)):
            response = self._get_request(f"/api/auth/api_tokens/{token_id}", user=self.admin)
            self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        response = self._get_request(f"/api/auth/api_tokens/{token_id}", user=self.admin)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_can_cleanup_old_disabled_tokens(self):
        cleanup_delay = timedelta(days=1)
        stale_delay = 20 * cleanup_delay
        now = timezone.now()

        old_expired_token, _ = ApiToken.objects.create_key(
            owner=self.admin,
            name="old_expired_token",
            expiry_date=now - cleanup_delay,
        )
        ApiToken.objects.filter(id=old_expired_token.id).update(created=now - 2 * cleanup_delay)

        new_expired_token, _ = ApiToken.objects.create_key(
            owner=self.admin,
            name="new_expired_token",
            expiry_date=now - 0.5 * cleanup_delay,
        )
        ApiToken.objects.filter(id=new_expired_token.id).update(created=now - 2 * cleanup_delay)

        old_revoked_token, _ = ApiToken.objects.create_key(
            owner=self.admin,
            name="old_revoked_token",
            revoked=True,
        )
        ApiToken.objects.filter(id=old_revoked_token.id).update(
            created=now - 2 * cleanup_delay,
            updated_date=now - cleanup_delay,
        )

        new_revoked_token, _ = ApiToken.objects.create_key(
            owner=self.admin,
            name="new_revoked_token",
            revoked=True,
        )
        ApiToken.objects.filter(id=new_revoked_token.id).update(
            created=now - 2 * cleanup_delay,
            updated_date=now - 0.5 * cleanup_delay,
        )

        unused_stale_token, _ = ApiToken.objects.create_key(
            owner=self.admin,
            name="unused_stale_token",
        )
        ApiToken.objects.filter(id=unused_stale_token.id).update(
            created=now - cleanup_delay - 2 * stale_delay,
            updated_date=now - cleanup_delay - 2 * stale_delay,
            last_used_date=None,
        )

        used_stale_token, _ = ApiToken.objects.create_key(
            owner=self.admin,
            name="used_stale_token",
        )
        ApiToken.objects.filter(id=used_stale_token.id).update(
            created=now - cleanup_delay - 2 * stale_delay,
            updated_date=now - cleanup_delay - stale_delay,
            last_used_date=now - cleanup_delay - stale_delay,
        )

        alive_token, _ = ApiToken.objects.create_key(
            owner=self.admin,
            name="alive token",
        )
        ApiToken.objects.filter(id=alive_token.id).update(
            created=now - 2 * stale_delay,
            updated_date=now - 0.5 * stale_delay,
            last_used_date=now - 0.5 * stale_delay,
        )

        with override_settings(
            API_TOKEN_STALE_PERIOD=stale_delay,
            API_TOKEN_UNUSABLE_TOKEN_TTL=cleanup_delay,
        ):
            clear_unusable_api_tokens()

        expected_remaining_ids = {alive_token.id, new_expired_token.id, new_revoked_token.id}
        self.assertEqual(expected_remaining_ids, set(ApiToken.objects.values_list("id", flat=True)))

        response = self._get_request("/api/auth/api_tokens", user=self.admin)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["count"], 1)
        self.assertEqual(response.json()["results"][0]["id"], alive_token.id)


class ApiTokenPluginSystemTest(ApiTestBase):
    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)

    def test_can_use_default_fallback_if_no_plugins(self):
        response = self._post_request(
            "/api/auth/api_tokens", user=self.admin, data={"name": "test token", "read_only": True}
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        token_id = response.json()["id"]
        token_value = response.json()["value"]

        with (
            mock.patch(
                "cvat.apps.api_tokens.permissions.ApiTokenPermissionPluginManager.get_plugins",
                return_value=[],
            ) as mock_get_plugins,
            mock_method(
                "cvat.apps.api_tokens.permissions.ApiTokenReadOnlyDefaultPermission", "check_access"
            ) as mock_fallback_check_access,
        ):
            response = self.client.patch(
                f"/api/auth/api_tokens/{token_id}",
                headers={"Authorization": f"Bearer {token_value}"},
                data={"name": "newname"},
            )
            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

            mock_get_plugins.assert_called()
            mock_fallback_check_access.assert_called()
