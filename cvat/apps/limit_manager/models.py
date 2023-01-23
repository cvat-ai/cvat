# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from enum import Enum
from django.db import models
from django.contrib.auth.models import User
from cvat.apps.organizations.models import Organization

class LimitationTypeChoice(str, Enum):
    DEFAULT = 'default'
    PAID = 'paid'
    MANUALLY = 'manually'

    @classmethod
    def choices(cls):
        return tuple((x.value, x.name) for x in cls)

    def __str__(self):
        return self.value

# TO-DO:
#  - add validation user__isnull ^ org__isnull
class Limitation(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True)
    org = models.ForeignKey(Organization, on_delete=models.CASCADE, null=True)
    type = models.CharField(max_length=32, choices=LimitationTypeChoice.choices(),
        default=LimitationTypeChoice.DEFAULT)

    # List of limitations:
    #   - null means unlimited
    #   - blank means that certain limit not applicable
    memberships = models.PositiveIntegerField(null=True, blank=True)

    organizations = models.PositiveIntegerField(null=True, blank=True)
    tasks = models.PositiveIntegerField(null=True)
    projects = models.PositiveIntegerField(null=True)
    cloud_storages = models.PositiveIntegerField(null=True)

    tasks_per_project = models.PositiveIntegerField(null=True)
    webhooks_per_project = models.PositiveIntegerField(null=True)
    webhooks_per_organization = models.PositiveIntegerField(null=True, blank=True)

    lambda_requests = models.PositiveIntegerField(null=True)
