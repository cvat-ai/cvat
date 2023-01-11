
# Copyright (C) 2018-2022 Intel Corporation
# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""
WSGI config for CVAT project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/2.0/howto/deployment/wsgi/
"""

import os
from django.core.wsgi import get_wsgi_application

import cvat.utils.remote_debugger as debug


os.environ.setdefault("DJANGO_SETTINGS_MODULE", "cvat.settings.{}" \
    .format(os.environ.get("DJANGO_CONFIGURATION", "development")))

application = get_wsgi_application()


if debug.is_debugging_enabled():
    class DebuggerApp:
        """
        Support for VS code debugger
        """

        def __init__(self, obj):
            self.__object = obj
            self.__debugger = debug.RemoteDebugger()

        def __call__(self, *args, **kwargs):
            self.__debugger.attach_current_thread()

            return self.__object(*args, **kwargs)

    application = DebuggerApp(application)
