# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import hashlib
import hmac
import json
from http import HTTPStatus

import requests

from cvat.apps.consensus.rq import ConsensusRequestId
from cvat.apps.engine.models import RequestAction, RequestSubresource
from cvat.apps.engine.rq import ExportRequestId, ImportRequestId
from cvat.apps.engine.serializers import BasicUserSerializer
from cvat.apps.events.handlers import get_request, get_user
from cvat.apps.quality_control.rq import QualityRequestId
from cvat.apps.redis_handler.utils import RequestStatusEnum
from cvat.utils.http import PROXIES_FOR_UNTRUSTED_URLS, make_requests_session

from .event_type import event_name
from .models import Webhook

_WEBHOOK_TIMEOUT = 10
_RESPONSE_SIZE_LIMIT = 1 * 1024 * 1024  # 1 MB


def get_sender(instance) -> dict:
    user = get_user(instance)
    if isinstance(user, dict):
        return user

    return BasicUserSerializer(user, context={"request": get_request(instance)}).data


def get_event_name_and_webhook_payload_from_export_request(
    request: ExportRequestId,
    status: RequestStatusEnum,
    message: str,
) -> tuple[str, dict]:
    match request.subresource:
        case RequestSubresource.DATASET | RequestSubresource.ANNOTATIONS:
            _event_name = event_name(action="create", resource="dataset_export")
            subresource_data = {"format": request.format}
        case RequestSubresource.BACKUP:
            _event_name = event_name(action="create", resource="backup_export")
            # NOTE @sosov: RequestId omits falsey fields, but webhook payloads should
            # preserve the default regular-backup value as false.
            subresource_data = {
                "lightweight": (request.lightweight if request.lightweight is not None else False)
            }
        case _:
            raise ValueError(f"Unexpected request subresource: {request.subresource}")

    webhook_payload = {
        "event": _event_name,
        "status": status.value,
        "target": request.target,
        "target_id": request.target_id,
        "rq_id": request.render(),
        "message": message,
        "subresource": request.subresource.value,
        **subresource_data,
    }

    return _event_name, webhook_payload


def get_event_name_and_webhook_payload_from_import_request(
    request: ImportRequestId,
    status: RequestStatusEnum,
    message: str,
) -> tuple[str, dict]:
    match request.action:
        case RequestAction.IMPORT:
            match request.subresource:
                case RequestSubresource.DATASET | RequestSubresource.ANNOTATIONS:
                    _event_name = event_name(action="create", resource="dataset_import")
                    webhook_payload = {
                        "event": _event_name,
                        "rq_id": request.render(),
                        "status": status.value,
                        "target": request.target,
                        "target_id": request.target_id,
                        "message": message,
                        "subresource": request.subresource.value,
                    }
                case RequestSubresource.BACKUP:
                    _event_name = event_name(action="create", resource="backup_import")
                    webhook_payload = {
                        "event": _event_name,
                        "rq_id": request.render(),
                        "target": request.target,
                        "status": status.value,
                        "message": message,
                        "subresource": request.subresource.value,
                    }
                case _:
                    raise ValueError(f"Unexpected request subresource: {request.subresource}")

        case RequestAction.CREATE:
            _event_name = event_name(action="create", resource="task_initialization")
            webhook_payload = {
                "event": _event_name,
                "rq_id": request.render(),
                "target": request.target,
                "target_id": request.target_id,
                "status": status.value,
                "message": message,
            }
        case _:
            raise ValueError(f"Unexpected request action: {request.action}")

    return _event_name, webhook_payload


def get_event_name_and_webhook_payload_from_quality_request(
    request: QualityRequestId,
    status: RequestStatusEnum,
    message: str,
) -> tuple[str, dict]:
    _event_name = event_name(action="create", resource="quality_report")
    webhook_payload = {
        "event": _event_name,
        "rq_id": request.render(),
        "status": status.value,
        "target": request.target,
        "target_id": request.target_id,
        "message": message,
    }

    return _event_name, webhook_payload


def get_event_name_and_webhook_payload_from_consensus_requests(
    request: ConsensusRequestId,
    status: RequestStatusEnum,
    message: str,
) -> tuple[str, dict]:
    _event_name = event_name(action="create", resource="consensus_merge")
    webhook_payload = {
        "event": _event_name,
        "rq_id": request.render(),
        "status": status.value,
        "target": request.target,
        "target_id": request.target_id,
        "message": message,
    }

    return _event_name, webhook_payload


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
            response = response_body.decode("utf-8", errors="replace")

        return status_code, response
    except requests.ConnectionError as ex:
        return HTTPStatus.BAD_GATEWAY, str(ex)
    except requests.Timeout as ex:
        return HTTPStatus.GATEWAY_TIMEOUT, str(ex)
