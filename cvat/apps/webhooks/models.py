# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from enum import Enum

from django.contrib.auth.models import User
from django.db import models

from cvat.apps.engine.models import Project, TimestampedModel
from cvat.apps.organizations.models import Organization


class WebhookTypeChoice(str, Enum):
    ORGANIZATION = "organization"
    PROJECT = "project"

    @classmethod
    def choices(cls):
        return tuple((x.value, x.name) for x in cls)

    def __str__(self):
        return self.value


class WebhookContentTypeChoice(str, Enum):
    JSON = "application/json"

    @classmethod
    def choices(cls):
        return tuple((x.value, x.name) for x in cls)

    def __str__(self):
        return self.value


class Webhook(TimestampedModel):
    target_url = models.URLField(max_length=8192)
    description = models.CharField(max_length=128, default="", blank=True)

    events = models.CharField(max_length=4096, default="")
    type = models.CharField(max_length=16, choices=WebhookTypeChoice.choices())
    content_type = models.CharField(
        max_length=64,
        choices=WebhookContentTypeChoice.choices(),
        default=WebhookContentTypeChoice.JSON,
    )
    secret = models.CharField(max_length=64, blank=True, default="")

    is_active = models.BooleanField(default=True)
    enable_ssl = models.BooleanField(default=True)

    owner = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    project = models.ForeignKey(
        Project, null=True, on_delete=models.CASCADE, related_name="+"
    )
    organization = models.ForeignKey(
        Organization, null=True, on_delete=models.CASCADE, related_name="+"
    )

    class Meta:
        default_permissions = ()
        constraints = [
            models.CheckConstraint(
                name="webhooks_project_or_organization",
                check=(
                    models.Q(
                        type=WebhookTypeChoice.PROJECT.value, project_id__isnull=False
                    )
                    | models.Q(
                        type=WebhookTypeChoice.ORGANIZATION.value,
                        project_id__isnull=True,
                        organization_id__isnull=False,
                    )
                ),
            )
        ]


class WebhookDelivery(TimestampedModel):
    webhook = models.ForeignKey(
        Webhook, on_delete=models.CASCADE, related_name="deliveries"
    )
    event = models.CharField(max_length=64)

    status_code = models.PositiveIntegerField(null=True, default=None)
    redelivery = models.BooleanField(default=False)

    changed_fields = models.CharField(max_length=4096, default="")

    request = models.JSONField(default=dict)
    response = models.JSONField(default=dict)

    class Meta:
        default_permissions = ()
