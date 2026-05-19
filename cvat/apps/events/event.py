# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from datetime import datetime, timezone

from django.db import transaction
from django.http import HttpRequest
from rest_framework.renderers import JSONRenderer
from rest_framework.request import Request
from rest_framework.settings import api_settings
from rest_framework.throttling import BaseThrottle

from cvat.apps.engine.log import ServerLogManager, vlogger

slogger = ServerLogManager(__name__)


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
        remote_addr = BaseThrottle().get_ident(request)
    except Exception:
        slogger.glob.debug("Failed to resolve remote address", exc_info=True)
        return None

    if not remote_addr:
        slogger.glob.debug(
            "Resolved empty remote address. "
            "X-Forwarded-For=%r, REMOTE_ADDR=%r, NUM_PROXIES=%r",
            request.META.get("HTTP_X_FORWARDED_FOR"),
            request.META.get("REMOTE_ADDR"),
            api_settings.NUM_PROXIES,
        )

    return remote_addr


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

    remote_addr = request_info.pop("remote_addr", None)
    if remote_addr is not None:
        kwargs.setdefault("remote_addr", remote_addr)

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
