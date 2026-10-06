# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import asyncio
import json
import logging
import re
from django.conf import settings
import redis.asyncio as aioredis

logger = logging.getLogger(__name__)

TASK_WS_PATTERN = re.compile(r"^/api/test/ws/tasks/(?P<task_id>\d+)/?$")


async def get_async_redis_client():
    host = getattr(settings, "CVAT_REDIS_INMEM_HOST", "cvat_redis_inmem")
    port = getattr(settings, "CVAT_REDIS_INMEM_PORT", 6379)
    password = getattr(settings, "CVAT_REDIS_INMEM_PASSWORD", "")
    return aioredis.Redis(
        host=host,
        port=port,
        password=password if password else None,
        db=0,
    )


async def handle_websocket_connection(scope, receive, send):
    """
    ASGI WebSocket handler for live annotation count sync.
    Subscribes to Redis pub/sub channel for task annotation events and broadcasts to client.
    """
    path = scope.get("path", "")
    match = TASK_WS_PATTERN.match(path)
    if not match:
        await send({"type": "websocket.close", "code": 4004})
        return

    task_id = int(match.group("task_id"))
    channel_name = f"task_{task_id}_annotations"

    # Accept WebSocket handshake
    await send({"type": "websocket.accept"})
    logger.info(f"WebSocket client connected for task {task_id}")

    # Send initial connection confirmation
    await send({
        "type": "websocket.send",
        "text": json.dumps({
            "event": "connected",
            "task_id": task_id,
            "message": "Live annotation synchronization established",
        }),
    })

    redis_client = None
    pubsub = None
    listen_task = None

    try:
        redis_client = await get_async_redis_client()
        pubsub = redis_client.pubsub()
        await pubsub.subscribe(channel_name)

        async def redis_listener():
            try:
                async for message in pubsub.listen():
                    if message and message.get("type") == "message":
                        data = message.get("data")
                        if isinstance(data, bytes):
                            data = data.decode("utf-8")
                        await send({"type": "websocket.send", "text": data})
            except asyncio.CancelledError:
                pass
            except Exception as e:
                logger.warning(f"Redis listener error for task {task_id}: {e}")

        listen_task = asyncio.create_task(redis_listener())

        # Receive loop for client pings and disconnect signals
        while True:
            message = await receive()
            msg_type = message.get("type")
            if msg_type == "websocket.disconnect":
                break
            elif msg_type == "websocket.receive":
                text_data = message.get("text", "")
                if text_data == "ping":
                    await send({"type": "websocket.send", "text": json.dumps({"event": "pong"})})
    except Exception as e:
        logger.error(f"WebSocket handler error for task {task_id}: {e}")
    finally:
        if listen_task:
            listen_task.cancel()
        if pubsub:
            try:
                await pubsub.unsubscribe(channel_name)
                await pubsub.close()
            except Exception:
                pass
        if redis_client:
            try:
                await redis_client.close()
            except Exception:
                pass
        logger.info(f"WebSocket client disconnected for task {task_id}")
