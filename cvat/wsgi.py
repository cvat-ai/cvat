
# Copyright (C) 2018 Intel Corporation
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
