# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""
Native ASGI WebSocket consumer for the class-counts analytics stream.

Why no Django Channels?
  Django Channels is not installed in this repo (verified in requirements).
  Django 3.1+ supports WebSocket natively via the ASGI interface, and uvicorn
  (the ASGI server used here) handles the WebSocket upgrade protocol.
  We implement a minimal ASGI WebSocket application without Channels.

Authentication:
  Browsers cannot set custom HTTP headers on WebSocket connections.
  We accept the DRF auth token via the ?token= query parameter.
  Session-based auth is also supported via the session cookie.

URL pattern:
  ws://host/ws/test/class-counts?[project_id|task_id|job_id]=N&token=<TOKEN>

Reconnection:
  The client (frontend) is responsible for reconnection with exponential
  backoff.  The server sends a "heartbeat" every 30 seconds so the client
  can detect stale connections.

Message schema (sent to client):
  {"type": "class_counts", "version": 1, "scope": {...}, "data": [...], "ts": "ISO"}

  {"type": "heartbeat", "ts": "ISO"}

  {"type": "error", "message": "...", "code": 4001}  -- then close

Close codes:
  4001 — authentication failed
  4002 — authorization failed (no permission for the resource)
  4003 — bad parameters (missing / ambiguous scope)
"""

import asyncio
import json
import logging
from datetime import datetime, timezone
from urllib.parse import parse_qs

import redis.asyncio as aioredis
from django.conf import settings

logger = logging.getLogger(__name__)

HEARTBEAT_INTERVAL = 30  # seconds


def _parse_qs_single(qs: dict, key: str) -> str | None:
    values = qs.get(key, [])
    return values[0] if values else None


async def _authenticate(scope) -> tuple[object | None, str | None]:
    """
    Returns (user, error_message).
    Tries token auth then session auth.
    """
    from django.contrib.auth.models import AnonymousUser
    from rest_framework.authtoken.models import Token

    qs = parse_qs(scope.get("query_string", b"").decode())
    token_key = _parse_qs_single(qs, "token")

    if token_key:
        try:
            # Run sync ORM in thread pool
            loop = asyncio.get_event_loop()
            token = await loop.run_in_executor(
                None,
                lambda: Token.objects.select_related("user").get(key=token_key),
            )
            return token.user, None
        except Token.DoesNotExist:
            return None, "Invalid authentication token"

    # Try session cookie
    for name, value in scope.get("headers", []):
        if name == b"cookie":
            cookie_str = value.decode()
            cookies = {}
            for part in cookie_str.split(";"):
                part = part.strip()
                if "=" in part:
                    k, v = part.split("=", 1)
                    cookies[k.strip()] = v.strip()

            session_key = cookies.get("sessionid")
            if session_key:
                try:
                    from django.contrib.sessions.backends.db import SessionStore
                    loop = asyncio.get_event_loop()

                    def _get_user():
                        session = SessionStore(session_key)
                        uid = session.get("_auth_user_id")
                        if uid is None:
                            return None
                        from django.contrib.auth import get_user_model
                        User = get_user_model()
                        try:
                            return User.objects.get(pk=uid)
                        except User.DoesNotExist:
                            return None

                    user = await loop.run_in_executor(None, _get_user)
                    if user:
                        return user, None
                except Exception:
                    pass

    return AnonymousUser(), "Authentication required"


async def _authorize(user, qs: dict) -> tuple[dict | None, str | None]:
    """
    Returns (scope_dict, error_message).
    scope_dict: e.g. {"project_id": 1} or {"task_id": 5} or {"job_id": 9}
    """
    if not user or not getattr(user, "is_authenticated", False):
        return None, "Authentication required"

    project_id_s = _parse_qs_single(qs, "project_id")
    task_id_s = _parse_qs_single(qs, "task_id")
    job_id_s = _parse_qs_single(qs, "job_id")

    try:
        project_id = int(project_id_s) if project_id_s else None
        task_id = int(task_id_s) if task_id_s else None
        job_id = int(job_id_s) if job_id_s else None
    except ValueError:
        return None, "Invalid scope parameter"

    provided = [x for x in (project_id, task_id, job_id) if x is not None]
    if len(provided) == 0:
        return None, "One of project_id, task_id, or job_id is required"
    if len(provided) > 1:
        return None, "Only one scope parameter is allowed"

    # Authorization check (reuse permission logic from permissions.py)
    loop = asyncio.get_event_loop()

    def _check_perm():
        from cvat.apps.test.permissions import ClassCountPermission

        class _FakeRequest:
            pass

        class _FakeView:
            pass

        req = _FakeRequest()
        req.user = user
        req.query_params = {}
        if project_id:
            req.query_params["project_id"] = str(project_id)
        elif task_id:
            req.query_params["task_id"] = str(task_id)
        else:
            req.query_params["job_id"] = str(job_id)

        perm = ClassCountPermission()
        return perm.has_permission(req, _FakeView())

    allowed = await loop.run_in_executor(None, _check_perm)
    if not allowed:
        return None, "Permission denied for this resource"

    if project_id:
        return {"project_id": project_id}, None
    if task_id:
        return {"task_id": task_id}, None
    return {"job_id": job_id}, None


def _scope_to_channel(scope_dict: dict) -> str:
    if "project_id" in scope_dict:
        return f"analytics:project:{scope_dict['project_id']}"
    if "task_id" in scope_dict:
        return f"analytics:task:{scope_dict['task_id']}"
    return f"analytics:job:{scope_dict['job_id']}"


async def websocket_consumer(scope, receive, send):
    """
    Main ASGI WebSocket handler for /ws/test/class-counts
    """
    # Wait for connection request
    event = await receive()
    if event["type"] != "websocket.connect":
        return

    qs = parse_qs(scope.get("query_string", b"").decode())

    # Authenticate
    user, auth_error = await _authenticate(scope)
    if auth_error and (not user or not getattr(user, "is_authenticated", False)):
        await send({"type": "websocket.accept"})
        await send({
            "type": "websocket.send",
            "text": json.dumps({"type": "error", "message": auth_error, "code": 4001}),
        })
        await send({"type": "websocket.close", "code": 4001})
        return

    # Authorize
    scope_dict, authz_error = await _authorize(user, qs)
    if authz_error:
        await send({"type": "websocket.accept"})
        await send({
            "type": "websocket.send",
            "text": json.dumps({"type": "error", "message": authz_error, "code": 4002}),
        })
        await send({"type": "websocket.close", "code": 4002})
        return

    # Accept connection
    await send({"type": "websocket.accept"})

    # Send initial data immediately
    loop = asyncio.get_event_loop()

    async def _send_current_counts():
        from cvat.apps.test.service import get_class_counts
        counts = await loop.run_in_executor(
            None,
            lambda: get_class_counts(**scope_dict),
        )
        ts = datetime.now(tz=timezone.utc).isoformat()
        msg = json.dumps({
            "type": "class_counts",
            "version": 1,
            "scope": scope_dict,
            "data": counts,
            "ts": ts,
        })
        await send({"type": "websocket.send", "text": msg})

    await _send_current_counts()

    # Set up Redis pub/sub subscription
    channel = _scope_to_channel(scope_dict)
    redis_url = (
        f"redis://{getattr(settings, 'CVAT_REDIS_INMEM_HOST', 'localhost')}:"
        f"{getattr(settings, 'CVAT_REDIS_INMEM_PORT', 6379)}/0"
    )

    redis_client = aioredis.from_url(redis_url)
    pubsub = redis_client.pubsub()
    await pubsub.subscribe(channel)

    # Two concurrent tasks: receive client messages (pings/disconnect) and
    # relay Redis pub/sub messages.
    async def _relay_pubsub():
        """Read from Redis and forward to WS client."""
        async for message in pubsub.listen():
            if message["type"] == "message":
                data = message["data"]
                if isinstance(data, bytes):
                    data = data.decode()
                await send({"type": "websocket.send", "text": data})

    async def _heartbeat():
        """Send periodic heartbeats so clients detect stale connections."""
        while True:
            await asyncio.sleep(HEARTBEAT_INTERVAL)
            ts = datetime.now(tz=timezone.utc).isoformat()
            await send({
                "type": "websocket.send",
                "text": json.dumps({"type": "heartbeat", "ts": ts}),
            })

    async def _receive_loop():
        """Handle client messages and disconnect."""
        while True:
            event = await receive()
            if event["type"] in ("websocket.disconnect", "websocket.close"):
                return

    try:
        # Run all tasks concurrently; stop when any of them returns/raises
        tasks = [
            asyncio.create_task(_relay_pubsub()),
            asyncio.create_task(_heartbeat()),
            asyncio.create_task(_receive_loop()),
        ]
        done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
        for task in pending:
            task.cancel()
        # Propagate exceptions from completed tasks (if any)
        for task in done:
            task.result()

    except Exception:  # noqa: BLE001
        logger.exception("WebSocket consumer error for scope %s", scope_dict)

    finally:
        await pubsub.unsubscribe(channel)
        await redis_client.aclose()
        try:
            await send({"type": "websocket.close", "code": 1000})
        except Exception:
            pass
