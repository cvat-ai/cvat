# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from . import utils
from .dispatch import add_to_queue
from .models import Webhook, WebhookDelivery, WebhookTypeChoice


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


def send_webhook(webhook: Webhook, payload: dict, redelivery: bool = False) -> WebhookDelivery:
    status_code, response = utils.perform_webhook_request(webhook=webhook, payload=payload)
    return WebhookDelivery.objects.create(
        webhook_id=webhook.id,
        event=payload["event"],
        status_code=status_code,
        changed_fields=",".join(list(payload.get("before_update", {}).keys())),
        redelivery=redelivery,
        request=payload,
        response=response,
    )


def ping(serializer) -> WebhookDelivery:
    data = {
        "event": "ping",
        "webhook": serializer.data,
        "sender": utils.get_sender(instance=serializer.instance),
    }
    delivery = send_webhook(webhook=serializer.instance, payload=data, redelivery=False)
    return delivery
