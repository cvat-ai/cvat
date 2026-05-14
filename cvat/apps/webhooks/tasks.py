# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import hashlib
import hmac
import json
from http import HTTPStatus

import requests

from cvat.utils.http import PROXIES_FOR_UNTRUSTED_URLS, make_requests_session

from .models import Webhook, WebhookDelivery

WEBHOOK_TIMEOUT = 10
RESPONSE_SIZE_LIMIT = 1 * 1024 * 1024  # 1 MB


def send_webhook(webhook: Webhook, payload: dict, redelivery: bool = False) -> WebhookDelivery:
    headers = {}
    if webhook.secret:
        headers["X-Signature-256"] = (
            "sha256="
            + hmac.new(
                webhook.secret.encode("utf-8"),
                json.dumps(payload).encode("utf-8"),
                digestmod=hashlib.sha256,
            ).hexdigest()
        )

    response_body = None
    try:
        with make_requests_session() as session:
            response = session.post(
                webhook.target_url,
                json=payload,
                verify=webhook.enable_ssl,
                headers=headers,
                timeout=WEBHOOK_TIMEOUT,
                stream=True,
                proxies=PROXIES_FOR_UNTRUSTED_URLS,
            )
            status_code = response.status_code
            response_body = response.raw.read(RESPONSE_SIZE_LIMIT + 1, decode_content=True)
    except requests.ConnectionError:
        status_code = HTTPStatus.BAD_GATEWAY
    except requests.Timeout:
        status_code = HTTPStatus.GATEWAY_TIMEOUT

    response = ""
    if response_body is not None and len(response_body) < RESPONSE_SIZE_LIMIT + 1:
        response = response_body.decode("utf-8")

    delivery = WebhookDelivery.objects.create(
        webhook_id=webhook.id,
        event=payload["event"],
        status_code=status_code,
        changed_fields=",".join(list(payload.get("before_update", {}).keys())),
        redelivery=redelivery,
        request=payload,
        response=response,
    )

    return delivery
