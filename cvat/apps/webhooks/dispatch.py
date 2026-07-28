# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from copy import deepcopy

import django_rq
from django.conf import settings
from rq import Retry

from .models import Webhook


def add_to_queue(webhook: Webhook, payload: dict, redelivery: bool = False) -> None:
    from .tasks import send_webhook

    queue = django_rq.get_queue(settings.CVAT_QUEUES.WEBHOOKS.value)
    retry_intervals = settings.SEND_WEBHOOK_TASK_RETRIES
    queue.enqueue_call(
        func=send_webhook,
        args=(webhook.id, payload, redelivery),
        retry=Retry(max=len(retry_intervals), interval=retry_intervals),
        failure_ttl=7 * 24 * 60 * 60,
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
