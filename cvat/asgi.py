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

# Django apps must be set up (by get_asgi_application()) before anything that
# imports models/consumers, so the websocket routing import happens below.
http_application = get_asgi_application()


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

    http_application = DebuggerApp()

from channels.auth import AuthMiddlewareStack  # noqa: E402
from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402

from cvat.apps.test.routing import websocket_urlpatterns  # noqa: E402

application = ProtocolTypeRouter({
    "http": http_application,
    "websocket": AuthMiddlewareStack(URLRouter(websocket_urlpatterns)),
})
