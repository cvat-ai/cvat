# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import asyncio
from urllib.parse import parse_qsl

from channels.db import database_sync_to_async
from channels.exceptions import DenyConnection
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from rest_framework.exceptions import ValidationError

from cvat.apps.engine.permissions import TaskPermission
from cvat.apps.iam.middleware import get_organization
from cvat.apps.iam.permissions import build_iam_context, get_membership

from .analytics import get_class_wise_image_counts


def group_name_for_task(task_id: int) -> str:
    return f"class_counts_task_{task_id}"


class _AsgiRequestAdapter:
    """
    Minimal request-like shim so the existing IAM helpers (written for Django
    HTTP requests) can be reused from an ASGI WebSocket scope, instead of
    reimplementing organization/permission resolution for websockets.
    """

    def __init__(self, scope: dict):
        self.user = scope["user"]
        self.GET = dict(parse_qsl((scope.get("query_string") or b"").decode()))
        self.headers = {
            key.decode("latin1"): value.decode("latin1") for key, value in scope.get("headers", [])
        }


class ClassCountsConsumer(AsyncJsonWebsocketConsumer):
    """
    Streams class-wise image counts for one task to every connected viewer of
    that task's analytics page, sending the current counts on connect and again
    whenever cvat.apps.events.handlers.annotations_changed fires for that task.
    """

    # Sent periodically so the connection is never actually idle. Without this,
    # any intermediate proxy (nginx, a load balancer, etc.) with its own idle
    # timeout can silently drop a perfectly healthy connection after a period
    # of no annotation activity, which then looks like a spurious disconnect.
    HEARTBEAT_INTERVAL_SECONDS = 25

    task_id: int
    group_name: str
    _heartbeat_task: asyncio.Task | None

    async def connect(self):
        self.task_id = int(self.scope["url_route"]["kwargs"]["task_id"])
        self.group_name = group_name_for_task(self.task_id)
        self._heartbeat_task = None

        if not await self._can_view_task():
            raise DenyConnection("You do not have permission to view this task")

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        counts = await database_sync_to_async(get_class_wise_image_counts)(self.task_id)
        await self.send_json({"task_id": self.task_id, "counts": counts})

        self._heartbeat_task = asyncio.create_task(self._send_heartbeats())

    async def disconnect(self, code):
        if self._heartbeat_task is not None:
            self._heartbeat_task.cancel()

        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def _send_heartbeats(self):
        try:
            while True:
                await asyncio.sleep(self.HEARTBEAT_INTERVAL_SECONDS)
                await self.send_json({"type": "ping"})
        except asyncio.CancelledError:
            pass

    async def class_counts_update(self, event: dict):
        await self.send_json({"task_id": event["task_id"], "counts": event["counts"]})

    @database_sync_to_async
    def _can_view_task(self) -> bool:
        user = self.scope.get("user")
        if user is None or not user.is_authenticated:
            return False

        request = _AsgiRequestAdapter(self.scope)
        organization_data = get_organization(request)
        request.iam_context = organization_data
        membership = get_membership(request, organization_data["organization"])
        iam_context = build_iam_context(request, organization_data["organization"], membership)

        try:
            perm = TaskPermission.create_scope_view(None, self.task_id, iam_context=iam_context)
        except ValidationError:
            # task does not exist
            return False

        return perm.check_access().allow
