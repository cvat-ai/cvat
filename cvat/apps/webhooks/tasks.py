# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from http import HTTPStatus

from cvat.apps.redis_handler.utils import get_current_job_attempt

from . import services
from .exceptions import WebhookDeliveryError
from .models import Webhook, WebhookDelivery


def send_webhook(
    webhook_id: int,
    payload: dict,
    redelivery: bool = False,
) -> WebhookDelivery | None:
    webhook = Webhook.objects.filter(pk=webhook_id, is_active=True).first()
    if webhook is None:
        return None

    delivery = services.send_webhook(
        webhook=webhook,
        payload=payload,
        attempt=get_current_job_attempt(),
        redelivery=redelivery,
    )

    if delivery.status_code >= 500 or delivery.status_code in (
        HTTPStatus.REQUEST_TIMEOUT,
        HTTPStatus.TOO_MANY_REQUESTS,
    ):
        raise WebhookDeliveryError(
            f"webhook {webhook.id} attempt failed with status {delivery.status_code}"
        )

    return delivery
