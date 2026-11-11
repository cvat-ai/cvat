# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.conf import settings
from django.db import models

from cvat.apps.iam.models import User


class UserGrowthData(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="growth_data",
    )
    github_prompt_shown_at = models.DateTimeField(null=True, blank=True)
    github_prompt_support_clicked = models.BooleanField(default=False)
    promotion_notifications_allowed = models.BooleanField(default=True)
    last_seen_release_notes_version = models.CharField(max_length=64, null=True)
    last_seen_announcements_date = models.DateTimeField(null=True)

    @classmethod
    def for_user(cls, user: User) -> "UserGrowthData":
        """Return shared user state, initializing it for accounts without a record."""
        growth_data, _ = cls.objects.get_or_create(
            user=user,
            defaults={"github_prompt_shown_at": user.date_joined},
        )
        return growth_data
