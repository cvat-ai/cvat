# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


from datetime import timedelta
from unittest import mock

from django.contrib.auth.models import Group, User
from django.test import override_settings
from django.utils import timezone
from rest_framework import status

from cvat.apps.access_tokens.cron import clear_unusable_access_tokens
from cvat.apps.access_tokens.models import AccessToken
from cvat.apps.engine.tests.utils import ApiTestBase, mock_method


def create_db_users(cls: type[ApiTestBase]):
    (group_admin, _) = Group.objects.get_or_create(name="admin")
    user_admin = User.objects.create_superuser(username="admin", email="", password="admin")
    user_admin.groups.add(group_admin)
    cls.admin = user_admin


class AccessTokenAutomationTest(ApiTestBase):
    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)

    def test_can_disable_stale_tokens(self):
        response = self._post_request(
            "/api/auth/access_tokens", user=self.admin, data={"name": "test token"}
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        token_id = response.json()["id"]

        response = self._get_request(f"/api/auth/access_tokens/{token_id}", user=self.admin)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        with override_settings(ACCESS_TOKEN_STALE_PERIOD=timedelta(seconds=0)):
            response = self._get_request(f"/api/auth/access_tokens/{token_id}", user=self.admin)
            self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        response = self._get_request(f"/api/auth/access_tokens/{token_id}", user=self.admin)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    @override_settings(MAX_ACCESS_TOKENS_PER_USER=2)
    def test_can_limit_maximum_number_of_user_tokens(self):
        for i in range(2):
            response = self._post_request(
                "/api/auth/access_tokens", user=self.admin, data={"name": f"test token {i}"}
            )
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            token_id = response.json()["id"]

        response = self._post_request(
            "/api/auth/access_tokens", user=self.admin, data={"name": f"test extra token"}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(b"You have reached the maximum allowed number" in response.content)

        response = self._delete_request(f"/api/auth/access_tokens/{token_id}", user=self.admin)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # Revoked tokens should not be counted
        response = self._post_request(
            "/api/auth/access_tokens", user=self.admin, data={"name": f"test extra token"}
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(AccessToken.objects.filter(owner=self.admin).count(), 3)

    def test_can_cleanup_old_disabled_tokens(self):
        cleanup_delay = timedelta(days=1)
        stale_delay = 20 * cleanup_delay
        now = timezone.now()

        old_expired_token, _ = AccessToken.objects.create_key(
            owner=self.admin,
            name="old_expired_token",
            expiry_date=now - cleanup_delay,
        )
        AccessToken.objects.filter(id=old_expired_token.id).update(created=now - 2 * cleanup_delay)

        new_expired_token, _ = AccessToken.objects.create_key(
            owner=self.admin,
            name="new_expired_token",
            expiry_date=now - 0.5 * cleanup_delay,
        )
        AccessToken.objects.filter(id=new_expired_token.id).update(created=now - 2 * cleanup_delay)

        old_revoked_token, _ = AccessToken.objects.create_key(
            owner=self.admin,
            name="old_revoked_token",
            revoked=True,
        )
        AccessToken.objects.filter(id=old_revoked_token.id).update(
            created=now - 2 * cleanup_delay,
            updated_date=now - cleanup_delay,
        )

        new_revoked_token, _ = AccessToken.objects.create_key(
            owner=self.admin,
            name="new_revoked_token",
            revoked=True,
        )
        AccessToken.objects.filter(id=new_revoked_token.id).update(
            created=now - 2 * cleanup_delay,
            updated_date=now - 0.5 * cleanup_delay,
        )

        unused_stale_token, _ = AccessToken.objects.create_key(
            owner=self.admin,
            name="unused_stale_token",
        )
        AccessToken.objects.filter(id=unused_stale_token.id).update(
            created=now - cleanup_delay - 2 * stale_delay,
            updated_date=now - cleanup_delay - 2 * stale_delay,
            last_used_date=None,
        )

        used_stale_token, _ = AccessToken.objects.create_key(
            owner=self.admin,
            name="used_stale_token",
        )
        AccessToken.objects.filter(id=used_stale_token.id).update(
            created=now - cleanup_delay - 2 * stale_delay,
            updated_date=now - cleanup_delay - stale_delay,
            last_used_date=now - cleanup_delay - stale_delay,
        )

        alive_token, _ = AccessToken.objects.create_key(
            owner=self.admin,
            name="alive token",
        )
        AccessToken.objects.filter(id=alive_token.id).update(
            created=now - 2 * stale_delay,
            updated_date=now - 0.5 * stale_delay,
            last_used_date=now - 0.5 * stale_delay,
        )

        with override_settings(
            ACCESS_TOKEN_STALE_PERIOD=stale_delay,
            ACCESS_TOKEN_UNUSABLE_TOKEN_TTL=cleanup_delay,
        ):
            clear_unusable_access_tokens()

        expected_remaining_ids = {alive_token.id, new_expired_token.id, new_revoked_token.id}
        self.assertEqual(
            expected_remaining_ids, set(AccessToken.objects.values_list("id", flat=True))
        )

        response = self._get_request("/api/auth/access_tokens", user=self.admin)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["count"], 1)
        self.assertEqual(response.json()["results"][0]["id"], alive_token.id)


class AccessTokenPluginSystemTest(ApiTestBase):
    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)

    def test_can_use_default_fallback_if_no_plugins(self):
        response = self._post_request(
            "/api/auth/access_tokens",
            user=self.admin,
            data={"name": "test token", "read_only": True},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        token_id = response.json()["id"]
        token_value = response.json()["value"]

        with (
            mock.patch(
                "cvat.apps.access_tokens.permissions.AccessTokenPermissionPluginManager.get_plugins",
                return_value=[],
            ) as mock_get_plugins,
            mock_method(
                "cvat.apps.access_tokens.permissions.AccessTokenReadOnlyDefaultPermission",
                "check_access",
            ) as mock_fallback_check_access,
        ):
            response = self.client.patch(
                f"/api/auth/access_tokens/{token_id}",
                headers={"Authorization": f"Bearer {token_value}"},
                data={"name": "newname"},
            )
            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

            mock_get_plugins.assert_called()
            mock_fallback_check_access.assert_called()
