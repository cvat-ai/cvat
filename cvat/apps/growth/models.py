# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from datetime import timedelta, timezone

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
    last_seen_release_notes_version = models.CharField(max_length=64, blank=True, default="")
    last_seen_announcements_date = models.DateTimeField(null=True)

    @classmethod
    def for_user(cls, user: User) -> "UserGrowthData":
        """Get or create the growth data record for this user."""
        registration_day = user.date_joined.astimezone(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        growth_data, _ = cls.objects.get_or_create(
            user=user,
            defaults={
                "github_prompt_shown_at": user.date_joined,
                # Seen markers are exclusive; include posts published exactly at midnight.
                "last_seen_announcements_date": registration_day - timedelta(microseconds=1),
            },
        )
        return growth_data
