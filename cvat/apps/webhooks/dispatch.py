# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


import django_rq
from django.conf import settings
from rq import Retry
from rq.types import JobDependencyType

from .models import Webhook


def add_to_queue(
    webhook: Webhook,
    payload: dict,
    redelivery: bool = False,
    depends_on: JobDependencyType | None = None,
) -> None:
    from .tasks import send_webhook

    queue = django_rq.get_queue(settings.CVAT_QUEUES.WEBHOOKS.value)
    retry_intervals = settings.SEND_WEBHOOK_TASK_RETRIES
    queue.enqueue_call(
        func=send_webhook,
        args=(webhook.id, payload, redelivery),
        retry=Retry(max=len(retry_intervals), interval=retry_intervals),
        failure_ttl=7 * 24 * 60 * 60,
        depends_on=depends_on,
    )


def batch_add_webhooks_to_queue(
    webhook_payload_pairs: list[tuple[Webhook, dict]],
    depends_on: JobDependencyType | None = None,
) -> None:
    for webhook, payload in webhook_payload_pairs:
        add_to_queue(webhook=webhook, payload=payload, depends_on=depends_on)
