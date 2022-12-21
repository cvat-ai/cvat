# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.db import models
from django.contrib.auth.models import User
from cvat.apps.organizations.models import Organization


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

    lambda_requests = models.PositiveIntegerField(default=0, null=True)
