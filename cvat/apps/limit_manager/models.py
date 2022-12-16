# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from enum import auto

from django.db import models
from django.contrib.auth.models import User
from cvat.apps.organizations.models import Organization


class ConsumableCapability(models.TextChoices):
    TASK_CREATE = auto()
    PROJECT_CREATE = auto()
    ORG_CREATE = auto()
    CLOUD_STORAGE_CREATE = auto()
    WEBHOOK_CREATE = auto()


# TO-DO:
#  - add validation user__isnull ^ org__isnull
class Limitation(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True)
    org = models.ForeignKey(Organization, on_delete=models.CASCADE, null=True)

    # List of limitations:
    #   - null means unlimited
    #   - blank means that certain limit not applicable
    memberships = models.PositiveIntegerField(default=3, null=True, blank=True)

    organizations = models.PositiveIntegerField(default=1, null=True, blank=True)
    tasks = models.PositiveIntegerField(default=10, null=True)
    projects = models.PositiveIntegerField(default=3, null=True)
    cloud_storages = models.PositiveIntegerField(default=10, null=True)

    tasks_per_project = models.PositiveIntegerField(default=5, null=True)
    webhooks_per_project = models.PositiveIntegerField(default=10, null=True)
    webhooks_per_organization = models.PositiveIntegerField(
        default=10, null=True, blank=True
    )

    view_analytics = models.BooleanField(default=False)
    lambda_requests = models.BooleanField(default=False)
