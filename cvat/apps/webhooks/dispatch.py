# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from copy import deepcopy

import django_rq
from django.conf import settings

from .models import Webhook
from .tasks import send_webhook


def add_to_queue(webhook: Webhook, payload: dict, redelivery: bool = False) -> None:
    queue = django_rq.get_queue(settings.CVAT_QUEUES.WEBHOOKS.value)
    queue.enqueue_call(
        func=send_webhook,
        kwargs={"webhook": webhook, "payload": payload, "redelivery": redelivery},
    )


def batch_add_to_queue(webhooks: list | dict, data: dict | None) -> None:
    # webhooks batch with different events; webhooks are grouped by them
    if isinstance(webhooks, dict):
        for event_type, webhooks_data in webhooks.items():
            payload = deepcopy(webhooks_data["event_data"])
            for webhook in webhooks_data["webhooks"]:
                add_to_queue(
                    webhook=webhook,
                    payload={
                        **payload,
                        "webhook_id": webhook.id,
                        "event": event_type,
                    },
                )
        return

    payload = deepcopy(data)
    for webhook in webhooks:
        payload["webhook_id"] = webhook.id
        add_to_queue(webhook=webhook, payload=payload)
