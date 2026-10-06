# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""
ASGI config for CVAT project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/3.2/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application
from django.core.handlers.asgi import ASGIHandler

import cvat.utils.remote_debugger as debug

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "cvat.settings.development")

django_application = get_asgi_application()


async def application(scope, receive, send):
    if scope["type"] == "websocket":
        path = scope.get("path", "")
        if path.startswith("/api/test/ws/"):
            from cvat.apps.test.websocket import class_counts_websocket

            await class_counts_websocket(scope, receive, send)
            return
        await send({"type": "websocket.close", "code": 4404})
        return

    await django_application(scope, receive, send)


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

    # Keep debugger HTTP path; websockets still go through ``application`` above.
    _debug_http = DebuggerApp()

    async def application(scope, receive, send):  # noqa: F811
        if scope["type"] == "websocket":
            path = scope.get("path", "")
            if path.startswith("/api/test/ws/"):
                from cvat.apps.test.websocket import class_counts_websocket

                await class_counts_websocket(scope, receive, send)
                return
            await send({"type": "websocket.close", "code": 4404})
            return
        await _debug_http(scope, receive, send)
