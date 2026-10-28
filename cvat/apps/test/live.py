# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""
Live "counts changed" notifications for the annotation stats page.

Annotation writes call Task.touch(); a signal publishes the task id to Redis pub/sub after the
transaction commits. Writes happen in any uvicorn process or RQ worker, so Redis is what carries
the event to the process that holds the browser's WebSocket. The socket only says "changed";
the page re-fetches the counts over REST, which re-checks access every time.

The WebSocket cannot run DRF/OPA permission checks itself, so the REST response hands out a
short-lived signed ticket for the task, and the socket accepts only a valid ticket.
"""

import asyncio
import functools
import json
import logging
import re
from urllib.parse import parse_qs

import redis
import redis.asyncio
from django.conf import settings
from django.core import signing

logger = logging.getLogger(__name__)

TICKET_SALT = "cvat.apps.test.annotation-stats-ws"
TICKET_MAX_AGE_SECONDS = 60
WEBSOCKET_PATH = re.compile(r"/api/annotation-stats/(?P<task_id>\d+)/ws")
CHANGED_MESSAGE = json.dumps({"type": "changed"})


def channel_name(task_id: int) -> str:
    return f"annotation-stats:task:{task_id}"


def make_ticket(task_id: int) -> str:
    return signing.dumps({"task_id": task_id}, salt=TICKET_SALT)


def is_valid_ticket(ticket: str, task_id: int) -> bool:
    try:
        payload = signing.loads(ticket, salt=TICKET_SALT, max_age=TICKET_MAX_AGE_SECONDS)
    except signing.BadSignature:
        return False
    return payload["task_id"] == task_id


def _redis_kwargs() -> dict:
    redis_settings = settings.REDIS_INMEM_SETTINGS
    return {
        "host": redis_settings["HOST"],
        "port": int(redis_settings["PORT"]),
        "password": redis_settings["PASSWORD"] or None,
    }


@functools.cache
def _publisher() -> redis.Redis:
    return redis.Redis(**_redis_kwargs())


def publish_task_changed(task_id: int) -> None:
    # A lost notification only delays the page; it must never fail the annotation save
    try:
        _publisher().publish(channel_name(task_id), "")
    except redis.RedisError:
        logger.exception("Could not publish annotation stats change for task %s", task_id)


async def annotation_stats_websocket(scope, receive, send) -> None:
    await receive()  # websocket.connect

    match = WEBSOCKET_PATH.fullmatch(scope["path"])
    ticket = parse_qs(scope["query_string"].decode()).get("ticket", [""])[0]
    if not match or not is_valid_ticket(ticket, int(match["task_id"])):
        await send({"type": "websocket.close", "code": 4403})
        return

    await send({"type": "websocket.accept"})
    client = redis.asyncio.Redis(**_redis_kwargs())
    pubsub = client.pubsub()

    async def forward_changes():
        await pubsub.subscribe(channel_name(int(match["task_id"])))
        async for message in pubsub.listen():
            if message["type"] == "message":
                await send({"type": "websocket.send", "text": CHANGED_MESSAGE})

    async def wait_for_disconnect():
        while (await receive())["type"] != "websocket.disconnect":
            pass

    forwarder = asyncio.create_task(forward_changes())
    disconnect = asyncio.create_task(wait_for_disconnect())
    try:
        await asyncio.wait({forwarder, disconnect}, return_when=asyncio.FIRST_COMPLETED)
        if not disconnect.done():
            # Redis went away: close so the page reconnects and re-fetches
            logger.warning("Annotation stats subscription ended: %r", forwarder.exception())
            await send({"type": "websocket.close", "code": 1011})
    finally:
        forwarder.cancel()
        disconnect.cancel()
        await pubsub.aclose()
        await client.aclose()


def with_annotation_stats_websocket(http_application):
    async def application(scope, receive, send):
        if scope["type"] == "websocket":
            await annotation_stats_websocket(scope, receive, send)
        else:
            await http_application(scope, receive, send)

    return application
