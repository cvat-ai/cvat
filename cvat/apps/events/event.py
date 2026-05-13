# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
from datetime import datetime, timezone

from django.db import transaction
from django.http import HttpRequest
from rest_framework.renderers import JSONRenderer
from rest_framework.request import Request
from rest_framework.throttling import BaseThrottle

from cvat.apps.engine.log import vlogger


def event_scope(action, resource):
    return f"{action}:{resource}"


class EventScopes:
    RESOURCES = {
        "accesstoken": ["create", "update", "delete"],
        "project": ["create", "update", "delete"],
        "task": ["create", "update", "delete"],
        "job": ["create", "update", "delete"],
        "organization": ["create", "update", "delete"],
        "membership": ["create", "update", "delete"],
        "invitation": ["create", "delete"],
        "user": ["create", "update", "delete"],
        "cloudstorage": ["create", "update", "delete"],
        "issue": ["create", "update", "delete"],
        "comment": ["create", "update", "delete"],
        "annotations": ["create", "update", "delete"],
        "label": ["create", "update", "delete"],
        "dataset": ["export", "import"],
        "function": ["call"],
        "webhook": ["create", "update", "delete"],
    }

    @classmethod
    def select(cls, resources):
        return [
            f"{event_scope(action, resource)}"
            for resource in resources
            for action in cls.RESOURCES.get(resource, [])
        ]


def get_remote_addr(request) -> str | None:
    if isinstance(request, Request):
        request = request._request

    if not isinstance(request, HttpRequest):
        return None

    try:
        return BaseThrottle().get_ident(request)
    except Exception:
        return None


def add_remote_addr_to_payload(payload: str | None, remote_addr: str) -> str | None:
    try:
        data = json.loads(payload or "{}")
    except (TypeError, json.JSONDecodeError):
        return payload

    if not isinstance(data, dict):
        return payload

    request = data.get("request")
    if not isinstance(request, dict):
        request = {}

    data["request"] = {
        **request,
        "remote_addr": remote_addr,
    }

    return json.dumps(data)


def record_server_event(
    *,
    scope: str,
    request_info: dict[str, str],
    payload: dict | None = None,
    on_commit: bool = False,
    **kwargs,
) -> None:
    payload = payload or {}

    access_token_id = request_info.pop("access_token_id", None)
    if access_token_id is not None:
        kwargs.setdefault("access_token_id", access_token_id)

    payload_with_request_info = {
        **payload,
        "request": {
            **payload.get("request", {}),
            **request_info,
        },
    }

    data = {
        "scope": scope,
        "timestamp": str(datetime.now(timezone.utc).timestamp()),
        "source": "server",
        "payload": JSONRenderer().render(payload_with_request_info).decode("UTF-8"),
        **kwargs,
    }

    rendered_data = JSONRenderer().render(data).decode("UTF-8")

    if on_commit:
        transaction.on_commit(lambda: vlogger.info(rendered_data), robust=True)
    else:
        vlogger.info(rendered_data)


class EventScopeChoice:
    @classmethod
    def choices(cls):
        return sorted((val, val.upper()) for val in AllEvents.events)


class AllEvents:
    events = list(
        event_scope(action, resource)
        for resource, actions in EventScopes.RESOURCES.items()
        for action in actions
    )
