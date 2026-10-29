# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import asyncio
import logging
import re
from http.cookies import SimpleCookie
from importlib import import_module
from urllib.parse import urlsplit

from asgiref.sync import sync_to_async
from django.conf import settings
from django.contrib.auth import get_user
from django.http import HttpRequest
from redis.asyncio import Redis
from redis.exceptions import RedisError

from cvat.apps.engine.models import Task
from cvat.apps.engine.permissions import TaskPermission
from cvat.apps.iam.middleware import get_organization
from cvat.apps.iam.permissions import get_iam_context

from .annotation_events import ANNOTATION_COUNTS_CHANNEL

logger = logging.getLogger(__name__)

_TASK_COUNTS_PATH = re.compile(r"^/api/ws/tasks/(?P<task_id>\d+)/annotation_counts/?$")


def _headers(scope) -> dict[str, str]:
    return {
        key.decode("latin1").lower(): value.decode("latin1")
        for key, value in scope.get("headers", [])
    }


def _is_same_origin(scope, headers: dict[str, str]) -> bool:
    origin = headers.get("origin")
    host = headers.get("host")
    if not origin or not host:
        return False

    parsed_origin = urlsplit(origin)
    expected_scheme = "https" if scope.get("scheme") == "wss" else "http"
    return (
        parsed_origin.scheme == expected_scheme
        and parsed_origin.netloc.casefold() == host.casefold()
        and parsed_origin.username is None
        and parsed_origin.password is None
    )


def _request_from_scope(scope, headers: dict[str, str]) -> HttpRequest:
    request = HttpRequest()
    request.path_info = scope["path"]
    request.META = {
        "REQUEST_METHOD": "GET",
        "QUERY_STRING": scope.get("query_string", b"").decode("latin1"),
        "HTTP_HOST": headers.get("host", ""),
        "wsgi.url_scheme": "https" if scope.get("scheme") == "wss" else "http",
    }

    for header, value in headers.items():
        if header.startswith("x-"):
            request.META[f"HTTP_{header.upper().replace('-', '_')}"] = value

    cookie = SimpleCookie()
    cookie.load(headers.get("cookie", ""))
    session_cookie = cookie.get(settings.SESSION_COOKIE_NAME)
    if session_cookie is None:
        return request

    session_store = import_module(settings.SESSION_ENGINE).SessionStore
    request.session = session_store(session_cookie.value)
    request.user = get_user(request)
    request.iam_context = get_organization(request)
    return request


def _authorize_task_socket(scope, headers: dict[str, str], task_id: int) -> int | None:
    request = _request_from_scope(scope, headers)
    if not getattr(request, "user", None) or not request.user.is_authenticated:
        return 4401

    try:
        task = Task.objects.select_related("organization", "project").get(pk=task_id)
    except Task.DoesNotExist:
        return 4404

    permission = TaskPermission.create_scope_view(
        request,
        task,
        iam_context=get_iam_context(request, task),
    )
    return None if permission.check_access().allow else 4403


async def _close(send, code: int) -> None:
    await send({"type": "websocket.close", "code": code})


async def application(scope, receive, send) -> None:
    connect_event = await receive()
    if connect_event["type"] != "websocket.connect":
        return

    match = _TASK_COUNTS_PATH.fullmatch(scope.get("path", ""))
    if scope.get("type") != "websocket" or match is None:
        await _close(send, 4404)
        return

    headers = _headers(scope)
    if not _is_same_origin(scope, headers):
        await _close(send, 4403)
        return

    task_id = int(match.group("task_id"))
    close_code = await sync_to_async(_authorize_task_socket, thread_sensitive=True)(
        scope, headers, task_id
    )
    if close_code is not None:
        await _close(send, close_code)
        return

    redis_settings = settings.REDIS_INMEM_SETTINGS
    client = Redis(
        host=redis_settings["HOST"],
        port=redis_settings["PORT"],
        db=int(settings.REDIS_INMEM_DATABASES.CACHE),
        password=redis_settings["PASSWORD"],
        decode_responses=True,
        socket_connect_timeout=5,
    )
    channel = ANNOTATION_COUNTS_CHANNEL.format(task_id=task_id)
    pubsub = client.pubsub()
    receive_task = None
    message_task = None

    try:
        await pubsub.subscribe(channel)
        await send({"type": "websocket.accept"})
        receive_task = asyncio.create_task(receive())
        message_task = asyncio.create_task(
            pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
        )

        while True:
            done, _ = await asyncio.wait(
                (receive_task, message_task),
                return_when=asyncio.FIRST_COMPLETED,
            )

            if receive_task in done:
                message = receive_task.result()
                if message["type"] == "websocket.disconnect":
                    break
                receive_task = asyncio.create_task(receive())

            if message_task in done:
                message = message_task.result()
                if message is not None:
                    await send({"type": "websocket.send", "text": message["data"]})
                message_task = asyncio.create_task(
                    pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                )
    except RedisError:
        logger.exception("Annotation count WebSocket Redis subscription failed")
        await _close(send, 1011)
    finally:
        for task in (receive_task, message_task):
            if task is not None and not task.done():
                task.cancel()
        tasks = [task for task in (receive_task, message_task) if task is not None]
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
        try:
            await pubsub.unsubscribe(channel)
        except RedisError:
            logger.exception("Could not unsubscribe annotation count WebSocket from Redis")
        await pubsub.aclose()
        await client.aclose()
