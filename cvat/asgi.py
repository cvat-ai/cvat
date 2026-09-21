# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""
ASGI config for CVAT project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/3.2/howto/deployment/asgi/

WebSocket routing:
  /ws/test/class-counts  →  cvat.apps.test.consumers.websocket_consumer
  All other paths        →  Standard Django ASGI HTTP handler
"""

import os

from django.core.asgi import get_asgi_application
from django.core.handlers.asgi import ASGIHandler

import cvat.utils.remote_debugger as debug

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "cvat.settings.development")

# Must be called before any other Django imports that touch the ORM
_django_http_app = get_asgi_application()


async def application(scope, receive, send):
    """
    Top-level ASGI application router.

    Routes WebSocket upgrade requests to the analytics WebSocket application.
    All HTTP requests go to the standard Django ASGI handler.
    """
    if scope["type"] == "websocket" and scope.get("path", "").startswith("/ws/"):
        # Lazy import to ensure Django is fully initialized first
        from cvat.apps.test.routing import websocket_application
        await websocket_application(scope, receive, send)
    else:
        await _django_http_app(scope, receive, send)


if debug.is_debugging_enabled():

    class DebuggerApp(ASGIHandler):
        """
        Support for VS code debugger
        """

        def __init__(self) -> None:
            super().__init__()
            self.__debugger = debug.RemoteDebugger()

        async def handle(self, *args, **kwargs):
            self.__debugger.attach_current_thread()
            return await super().handle(*args, **kwargs)

    _debug_http_app = DebuggerApp()

    async def application(scope, receive, send):  # noqa: F811
        if scope["type"] == "websocket" and scope.get("path", "").startswith("/ws/"):
            from cvat.apps.test.routing import websocket_application
            await websocket_application(scope, receive, send)
        else:
            await _debug_http_app(scope, receive, send)
