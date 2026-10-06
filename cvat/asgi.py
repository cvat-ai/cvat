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

django_http_app = get_asgi_application()


async def application(scope, receive, send):
    if scope.get("type") == "websocket" and scope.get("path", "").startswith("/api/test/ws/"):
        from cvat.apps.test.websocket import handle_websocket_connection
        await handle_websocket_connection(scope, receive, send)
    else:
        await django_http_app(scope, receive, send)

