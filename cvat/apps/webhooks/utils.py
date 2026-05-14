# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import hashlib
import hmac
import json
from http import HTTPStatus

import requests

from cvat.apps.engine.serializers import BasicUserSerializer
from cvat.apps.events.handlers import get_request, get_user
from cvat.utils.http import PROXIES_FOR_UNTRUSTED_URLS, make_requests_session

from .models import Webhook

_WEBHOOK_TIMEOUT = 10
_RESPONSE_SIZE_LIMIT = 1 * 1024 * 1024  # 1 MB


def get_sender(instance) -> dict:
    user = get_user(instance)
    if isinstance(user, dict):
        return user

    return BasicUserSerializer(user, context={"request": get_request(instance)}).data


def perform_webhook_request(webhook: Webhook, payload: dict) -> tuple[int, str]:
    try:
        headers: dict[str, str] = {}
        if webhook.secret:
            headers["X-Signature-256"] = (
                "sha256="
                + hmac.new(
                    webhook.secret.encode("utf-8"),
                    json.dumps(payload).encode("utf-8"),
                    digestmod=hashlib.sha256,
                ).hexdigest()
            )

        with make_requests_session() as session:
            response = session.post(
                webhook.target_url,
                json=payload,
                verify=webhook.enable_ssl,
                headers=headers,
                timeout=_WEBHOOK_TIMEOUT,
                stream=True,
                proxies=PROXIES_FOR_UNTRUSTED_URLS,
            )
            status_code = response.status_code
            response_body = response.raw.read(_RESPONSE_SIZE_LIMIT + 1, decode_content=True)

        response = ""
        if response_body is not None and len(response_body) < _RESPONSE_SIZE_LIMIT + 1:
            response = response_body.decode("utf-8")

        return status_code, response
    except requests.ConnectionError as ex:
        return HTTPStatus.BAD_GATEWAY, str(ex)
    except requests.Timeout as ex:
        return HTTPStatus.GATEWAY_TIMEOUT, str(ex)
