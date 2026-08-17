# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from datetime import timedelta

from django.contrib.auth.models import User
from django.test import override_settings
from django.utils.timezone import now
from rest_framework import status
from rest_framework.test import APITestCase

from cvat.apps.engine.tests.utils import ForceLogin
from cvat.apps.growth.models import UserGrowthData


class UserGrowthDataAPITestCase(APITestCase):
    def setUp(self) -> None:
        self.user = User.objects.create_user(username="user", password="password")
        self.growth_data = UserGrowthData.objects.get(user=self.user)
        self.growth_data.github_prompt_shown_at = None
        self.growth_data.save(update_fields=["github_prompt_shown_at"])

    def _get_prompt_enabled(self) -> bool:
        with ForceLogin(self.user, self.client):
            response = self.client.get("/api/growth", query_params={"user_id": self.user.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(response.data["count"], 1)

        return response.data["results"][0]["github_prompt_enabled"]

    @override_settings(
        GITHUB_STAR_PROMPT_POLICY="cvat.apps.growth.policies.EnabledGitHubStarPromptPolicy"
    )
    def test_enabled_policy(self) -> None:
        self.assertTrue(self._get_prompt_enabled())

    @override_settings(
        GITHUB_STAR_PROMPT_POLICY="cvat.apps.growth.policies.DisabledGitHubStarPromptPolicy"
    )
    def test_disabled_policy(self) -> None:
        self.assertFalse(self._get_prompt_enabled())

    @override_settings(
        GITHUB_STAR_PROMPT_POLICY="cvat.apps.growth.policies.EnabledGitHubStarPromptPolicy"
    )
    def test_user_state_disables_prompt(self) -> None:
        for fields in (
            {"promotion_notifications_allowed": False},
            {"github_prompt_support_clicked": True},
            {"github_prompt_shown_at": now()},
        ):
            with self.subTest(fields=fields):
                UserGrowthData.objects.filter(pk=self.growth_data.pk).update(
                    **{
                        "promotion_notifications_allowed": True,
                        "github_prompt_support_clicked": False,
                        "github_prompt_shown_at": None,
                        **fields,
                    }
                )
                self.assertFalse(self._get_prompt_enabled())

    @override_settings(
        GITHUB_STAR_PROMPT_POLICY="cvat.apps.growth.policies.EnabledGitHubStarPromptPolicy",
        GITHUB_STAR_PROMPT_COOLDOWN=timedelta(days=30),
    )
    def test_prompt_is_enabled_after_cooldown(self) -> None:
        UserGrowthData.objects.filter(pk=self.growth_data.pk).update(
            github_prompt_shown_at=now() - timedelta(days=31),
        )

        self.assertTrue(self._get_prompt_enabled())
