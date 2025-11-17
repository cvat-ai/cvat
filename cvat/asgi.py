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

import django
from django.core.asgi import get_asgi_application
from django.core.handlers.asgi import ASGIHandler

import cvat.utils.remote_debugger as debug

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "cvat.settings.development")

class ProfilingApp(ASGIHandler):
    def __init__(self) -> None:
        import memray
        import os
        from django.utils.timezone import now

        pid = os.getpid()
        timestamp = now().timestamp()
        filename = f"memray-pid{pid}-{timestamp}.bin"
        self.__tracker = memray.Tracker(filename, trace_python_allocators=True, native_traces=True)
        self.__tracker.__enter__()

        super().__init__()

    def __del__(self):
        if self.__tracker:
            self.__tracker.__exit__(None, None, None)
            self.__tracker = None
django.setup(set_prefix=False)
application = ProfilingApp()


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

    application = DebuggerApp()
