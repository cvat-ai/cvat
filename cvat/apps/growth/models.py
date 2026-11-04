# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.conf import settings
from django.db import models


class UserGrowthData(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="growth_data",
    )
    github_prompt_shown_at = models.DateTimeField(null=True, blank=True)
    github_prompt_support_clicked = models.BooleanField(default=False)
    promotion_notifications_allowed = models.BooleanField(default=True)
