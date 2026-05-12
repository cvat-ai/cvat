# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.db.models import Model

from cvat.apps.events.handlers import organization_id, project_id

from .dispatch import add_to_queue
from .models import Webhook, WebhookDelivery, WebhookTypeChoice
from .tasks import send_webhook
from .utils import get_sender


def select_webhooks(
    instance: Model,
    event: str,
    select_for_org: bool = True,
    select_for_project: bool = True,
) -> list[Webhook]:
    selected_webhooks = []

    if select_for_org and (oid := organization_id(instance)) is not None:
        webhooks = Webhook.objects.filter(
            is_active=True,
            events__contains=event,
            type=WebhookTypeChoice.ORGANIZATION,
            organization=oid,
        )
        selected_webhooks += list(webhooks)

    if select_for_project and (pid := project_id(instance)) is not None:
        webhooks = Webhook.objects.filter(
            is_active=True,
            events__contains=event,
            type=WebhookTypeChoice.PROJECT,
            project=pid,
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
