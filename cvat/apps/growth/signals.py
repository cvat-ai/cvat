# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.db.models.signals import post_save
from django.dispatch import receiver

from cvat.apps.iam.models import User

from .models import UserGrowthData


@receiver(post_save, sender=User)
def create_user_growth_data(instance: User, created: bool, raw: bool, **kwargs) -> None:
    if created and not raw:
        UserGrowthData.for_user(instance)
