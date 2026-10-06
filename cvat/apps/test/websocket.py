# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""ASGI WebSocket endpoint: /api/test/ws/tasks/{task_id}/class-counts"""

from __future__ import annotations

import asyncio
import json
import logging
import re
from http.cookies import SimpleCookie

from asgiref.sync import sync_to_async

logger = logging.getLogger(__name__)

PATH_RE = re.compile(r"^/api/test/ws/tasks/(?P<task_id>\d+)/class-counts/?$")


def _headers_dict(scope: dict) -> dict[str, str]:
    return {
        key.decode("latin1").lower(): value.decode("latin1")
        for key, value in scope.get("headers", [])
    }


def _session_key_from_scope(scope: dict) -> str | None:
    cookie_header = _headers_dict(scope).get("cookie", "")
    if not cookie_header:
        return None
    cookie = SimpleCookie()
    cookie.load(cookie_header)
    morsel = cookie.get("sessionid")
    return morsel.value if morsel else None


@sync_to_async
def _resolve_user(session_key: str | None):
    from django.contrib.auth import get_user_model
    from django.contrib.auth.models import AnonymousUser
    from django.contrib.sessions.backends.db import SessionStore

    if not session_key:
        return AnonymousUser()
    session = SessionStore(session_key=session_key)
    user_id = session.get("_auth_user_id")
    if not user_id:
        return AnonymousUser()
    User = get_user_model()
    try:
        return User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return AnonymousUser()


@sync_to_async
def _user_can_view_annotations(user, task_id: int) -> bool:
    from django.conf import settings
    from django.contrib.auth.models import AnonymousUser

    from cvat.apps.engine.models import Task
    from cvat.apps.engine.permissions import TaskPermission
    from cvat.apps.iam.permissions import build_iam_context, get_membership

    if isinstance(user, AnonymousUser) or not getattr(user, "is_authenticated", False):
        return False

    try:
        task = Task.objects.select_related("organization", "project").get(pk=task_id)
    except Task.DoesNotExist:
        return False

    IAM_ROLES = {role: priority for priority, role in enumerate(settings.IAM_ROLES)}
    groups = list(user.groups.filter(name__in=list(IAM_ROLES.keys())))
    groups.sort(key=lambda group: IAM_ROLES[group.name])
    privilege = groups[0] if groups else None

    organization = task.organization or (
        task.project.organization if task.project_id else None
    )

    class _Request:
        def __init__(self, u, priv, org):
            self.user = u
            self.query_params = {}
            self.data = {}
            self.method = "GET"
            self.iam_context = {
                "organization": org,
                "organization_specified": org is not None,
                "privilege": getattr(priv, "name", None),
            }

    request = _Request(user, privilege, organization)
    try:
        membership = get_membership(request, organization)
        iam_context = build_iam_context(request, organization, membership)
        perm = TaskPermission.create_base_perm(
            request,
            None,
            TaskPermission.Scopes.VIEW_ANNOTATIONS,
            iam_context,
            obj=task,
        )
        return bool(perm.check_access().allow)
    except Exception:  # noqa: BLE001
        logger.exception("WS permission check failed for task %s", task_id)
        return False


async def class_counts_websocket(scope: dict, receive, send) -> None:
    path = scope.get("path", "")
    match = PATH_RE.match(path)
    if not match:
        await send({"type": "websocket.close", "code": 4404})
        return

    task_id = int(match.group("task_id"))
    user = await _resolve_user(_session_key_from_scope(scope))
    if not await _user_can_view_annotations(user, task_id):
        await send({"type": "websocket.close", "code": 4403})
        return

    await send({"type": "websocket.accept"})
    await send(
        {
            "type": "websocket.send",
            "text": json.dumps(
                {
                    "type": "connected",
                    "task_id": task_id,
                    "message": "listening for annotation changes",
                }
            ),
        }
    )

    import redis.asyncio as aioredis

    from cvat.apps.test.realtime import channel_for_task, redis_url

    client = aioredis.from_url(redis_url(), decode_responses=True)
    pubsub = client.pubsub()
    channel = channel_for_task(task_id)
    await pubsub.subscribe(channel)

    async def pump_client() -> None:
        while True:
            message = await receive()
            if message["type"] == "websocket.disconnect":
                return
            # Ignore client payloads (keep-alives, etc.)

    async def pump_redis() -> None:
        while True:
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if message and message.get("type") == "message" and message.get("data"):
                await send({"type": "websocket.send", "text": message["data"]})
            else:
                await asyncio.sleep(0.05)

    client_task = asyncio.create_task(pump_client())
    redis_task = asyncio.create_task(pump_redis())
    try:
        done, pending = await asyncio.wait(
            {client_task, redis_task},
            return_when=asyncio.FIRST_COMPLETED,
        )
        for task in pending:
            task.cancel()
        for task in done:
            exc = task.exception()
            if exc:
                raise exc
    except Exception:  # noqa: BLE001
        logger.exception("WebSocket class-counts handler error for task %s", task_id)
    finally:
        try:
            await pubsub.unsubscribe(channel)
            await pubsub.aclose()
            await client.aclose()
        except Exception:  # noqa: BLE001
            pass
