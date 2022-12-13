
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

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "cvat.settings.{}" \
    .format(os.environ.get("DJANGO_CONFIGURATION", "development")))

application = get_wsgi_application()


if os.environ.get('CVAT_DEBUG_ENABLED') == 'yes':
    import debugpy

    class Debugger:
        """
        Support for VS code debugger

        Read docs: https://github.com/microsoft/debugpy
        Read more: https://modwsgi.readthedocs.io/en/develop/user-guides/debugging-techniques.html
        """

        ENV_VAR_PORT = 'CVAT_DEBUG_PORT'
        ENV_VAR_WAIT = 'CVAT_DEBUG_WAIT'

        def __init__(self, obj):
            self.__object = obj

            port = int(os.environ[self.ENV_VAR_PORT])

            # The only intended use is in Docker.
            # Using 127.0.0.1 will not allow host connections
            addr = ('0.0.0.0', port)  # nosec - B104:hardcoded_bind_all_interfaces

            try:
                # Debugpy is a singleton
                # We put it in the main thread of the process and then report new threads
                debugpy.listen(addr)

                # In most cases it makes no sense to debug subprocesses
                # Feel free to enable if needed.
                debugpy.configure({"subProcess": False})

                if os.environ.get(self.ENV_VAR_WAIT) == 'yes':
                    debugpy.wait_for_client()
            except Exception as ex:
                print("failed to set debugger:", ex)

        def __call__(self, *args, **kwargs):
            debugpy.debug_this_thread()

            return self.__object(*args, **kwargs)

    application = Debugger(application)
