# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from cvat.apps.engine.models import Project
from cvat.apps.iam.models import User
from cvat.apps.webhooks.models import Webhook, WebhookContentTypeChoice


def make_webhook(
    _type: str,
    events: str,
    owner: User,
    project: Project | None,
    is_active: bool = True,
) -> Webhook:
    return Webhook.objects.create(
        target_url="http://example.invalid/payload",
        owner=owner,
        project=project,
        type=_type,
        content_type=WebhookContentTypeChoice.JSON.value,
        events=events,
        is_active=is_active,
    )


def payload() -> dict:
    return {"event": "update:project", "project": {}, "sender": {}}
