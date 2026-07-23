# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import time

from django.db.models import Q

from . import utils
from .dispatch import add_to_queue
from .models import (
    Webhook,
    WebhookDelivery,
    WebhookTypeChoice,
)


def select_webhooks(
    *,
    event_key: str,
    organization_id: int | None,
    project_id: int | None,
    select_for_org: bool = True,
    select_for_project: bool = True,
) -> list[Webhook]:
    selected_webhooks = []

    queryset = Webhook.objects.filter(
        Q(events=event_key)
        | Q(events__startswith=f"{event_key},")
        | Q(events__endswith=f",{event_key}")
        | Q(events__contains=f",{event_key},"),
        is_active=True,
    )

    if select_for_org and organization_id is not None:
        organization_webhooks = queryset.filter(
            type=WebhookTypeChoice.ORGANIZATION,
            organization=organization_id,
        )
        selected_webhooks += list(organization_webhooks)

    if select_for_project and project_id is not None:
        project_webhooks = queryset.filter(
            type=WebhookTypeChoice.PROJECT,
            project=project_id,
        )
        selected_webhooks += list(project_webhooks)

    return selected_webhooks


def redeliver(webhook: Webhook, data: dict) -> None:
    add_to_queue(webhook=webhook, payload=data, redelivery=True)


def send_webhook(
    webhook: Webhook, payload: dict, attempt: int, redelivery: bool = False
) -> WebhookDelivery:
    start = time.perf_counter()
    status_code, response = utils.perform_webhook_request(webhook=webhook, payload=payload)
    request_duration = int((time.perf_counter() - start) * 1000)

    return WebhookDelivery.objects.create(
        webhook_id=webhook.id,
        event=payload["event"],
        status_code=status_code,
        changed_fields=",".join(list(payload.get("before_update", {}).keys())),
        redelivery=redelivery,
        request=payload,
        response=response,
        attempt=attempt,
        request_duration=request_duration,
    )


def ping(serializer) -> WebhookDelivery:
    webhook = serializer.instance
    payload = {
        "event": "ping",
        "webhook": serializer.data,
        "sender": utils.get_sender(instance=webhook),
    }
    delivery = send_webhook(webhook=webhook, payload=payload, attempt=1)
    return delivery
