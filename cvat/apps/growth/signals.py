# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import UserGrowthData


@receiver(post_save, sender=User)
def create_user_growth_data(instance: User, created: bool, raw: bool, **kwargs) -> None:
    if created and not raw:
        UserGrowthData.objects.get_or_create(
            user=instance,
            defaults={"github_prompt_shown_at": instance.date_joined},
        )
