# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from cvat.apps.engine.models import Project
from cvat.apps.iam.models import User
from cvat.apps.webhooks.models import (
    Webhook,
    WebhookContentTypeChoice,
    WebhookTypeChoice,
)


def make_webhook(is_active: bool = True) -> Webhook:
    owner = User.objects.create(username="owner")
    project = Project.objects.create(name="p", owner=owner)
    return Webhook.objects.create(
        target_url="http://example.invalid/payload",
        owner=owner,
        project=project,
        type=WebhookTypeChoice.PROJECT.value,
        content_type=WebhookContentTypeChoice.JSON.value,
        events="update:project",
        is_active=is_active,
    )


def payload() -> dict:
    return {"event": "update:project", "project": {}, "sender": {}}
