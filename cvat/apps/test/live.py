# SPDX-License-Identifier: MIT

"""
Live updates for the annotation counts page.

The browser keeps a WebSocket open at /api/test/tasks/<id>/annotation-counts/ws.
When the task's annotations change, the server sends one short "changed" message
and the page reloads the counts through the normal API.
"""

import asyncio
import re

import redis
import redis.asyncio
from django.conf import settings
from django.db import transaction

WEBSOCKET_PATH = re.compile(r"^/api/test/tasks/(?P<task_id>\d+)/annotation-counts/ws$")
CHANGED_MESSAGE = '{"event": "changed"}'


def _channel(task_id: int) -> str:
    return f"cvat:annotation-counts:task:{task_id}"


def _redis_settings() -> dict:
    return {
        "host": settings.REDIS_INMEM_SETTINGS["HOST"],
        "port": settings.REDIS_INMEM_SETTINGS["PORT"],
        "password": settings.REDIS_INMEM_SETTINGS["PASSWORD"] or None,
    }


def notify_task_changed(task_id: int) -> None:
    """Tells every open page of this task that its annotations changed (after the save commits)."""

    def publish():
        with redis.Redis(**_redis_settings()) as connection:
            connection.publish(_channel(task_id), CHANGED_MESSAGE)

    transaction.on_commit(publish)


class AnnotationCountsWebSocket:
    """
    ASGI wrapper: serves the live updates WebSocket and passes every other request to `app`.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        match = WEBSOCKET_PATH.match(scope["path"]) if scope["type"] == "websocket" else None
        if not match:
            return await self.app(scope, receive, send)

        task_id = int(match["task_id"])
        if (await receive())["type"] != "websocket.connect":
            return

        if not await self._is_allowed(task_id, scope):
            await send({"type": "websocket.close", "code": 4403})  # refuses the connection
            return

        await send({"type": "websocket.accept"})
        await self._forward_changes(task_id, receive, send)

    async def _is_allowed(self, task_id: int, scope) -> bool:
        # Ask the counts API itself, as the same user (same cookies and organization).
        # This way the WebSocket follows exactly the API's login and access rules.
        api_path = f"/api/test/tasks/{task_id}/annotation-counts"
        http_scope = {
            **scope,
            "type": "http",
            "method": "GET",
            "scheme": "https" if scope.get("scheme") == "wss" else "http",
            "path": api_path,
            "raw_path": api_path.encode(),
        }
        response_status = None
        request_sent = False

        async def receive_request():
            nonlocal request_sent
            if not request_sent:
                request_sent = True
                return {"type": "http.request", "body": b"", "more_body": False}
            # Django then waits for the client to disconnect; this internal request never does
            await asyncio.Event().wait()

        async def capture_status(message):
            nonlocal response_status
            if message["type"] == "http.response.start":
                response_status = message["status"]

        await self.app(http_scope, receive_request, capture_status)
        return response_status == 200

    async def _forward_changes(self, task_id: int, receive, send):
        connection = redis.asyncio.Redis(**_redis_settings())
        pubsub = connection.pubsub()
        await pubsub.subscribe(_channel(task_id))

        async def forward():
            async for message in pubsub.listen():
                if message["type"] == "message":
                    await send({"type": "websocket.send", "text": CHANGED_MESSAGE})

        forwarding = asyncio.create_task(forward())
        try:
            while (await receive())["type"] != "websocket.disconnect":
                pass  # the page sends nothing; we only wait for it to close
        finally:
            forwarding.cancel()
            await pubsub.aclose()
            await connection.aclose()
