# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from .dispatch import add_to_queue
from .models import Webhook, WebhookDelivery, WebhookTypeChoice
from .tasks import send_webhook
from .utils import get_sender


def select_webhooks(
    *,
    event: str,
    organization_id: int | None,
    project_id: int | None,
    select_for_org: bool = True,
    select_for_project: bool = True,
) -> list[Webhook]:
    selected_webhooks = []

    if select_for_org and organization_id is not None:
        webhooks = Webhook.objects.filter(
            is_active=True,
            events__contains=event,
            type=WebhookTypeChoice.ORGANIZATION,
            organization=organization_id,
        )
        selected_webhooks += list(webhooks)

    if select_for_project and project_id is not None:
        webhooks = Webhook.objects.filter(
            is_active=True,
            events__contains=event,
            type=WebhookTypeChoice.PROJECT,
            project=project_id,
        )
        selected_webhooks += list(webhooks)

    return selected_webhooks


def redeliver(webhook: Webhook, data: dict) -> None:
    add_to_queue(webhook=webhook, payload=data, redelivery=True)


def ping(serializer) -> WebhookDelivery:
    data = {
        "event": "ping",
        "webhook": serializer.data,
        "sender": get_sender(serializer.instance),
    }
    return send_webhook(webhook=serializer.instance, payload=data, redelivery=False)
