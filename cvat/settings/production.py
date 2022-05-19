# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from .base import *

DEBUG = bool(int(os.getenv('DJANGO_DEBUG', 0)))

INSTALLED_APPS += [
    'mod_wsgi.server',
]

# Django-sendfile:
# https://github.com/moggers87/django-sendfile2
SENDFILE_BACKEND = 'django_sendfile.backends.xsendfile'

# Security settings.
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
