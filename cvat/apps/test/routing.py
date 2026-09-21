# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""
ASGI routing for the analytics test WebSocket endpoint.

This module provides a minimal ASGI application that routes:
  /ws/test/class-counts  →  consumers.websocket_consumer
"""

import re

from .consumers import websocket_consumer

# Route table: list of (path_regex, asgi_app) tuples
_ROUTES = [
    (re.compile(r"^/ws/test/class-counts/?$"), websocket_consumer),
]


async def websocket_application(scope, receive, send):
    """
    ASGI sub-application that handles all /ws/test/* routes.
    """
    path = scope.get("path", "")
    for pattern, handler in _ROUTES:
        if pattern.match(path):
            await handler(scope, receive, send)
            return

    # Unknown WS path — reject
    event = await receive()  # consume the connect event
    if event.get("type") == "websocket.connect":
        await send({"type": "websocket.close", "code": 4004})
