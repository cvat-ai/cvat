# Copyright (C) 2018-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

from .base import *

DEBUG = False

INSTALLED_APPS += [
    'mod_wsgi.server',
]

NUCLIO['HOST'] = os.getenv('CVAT_NUCLIO_HOST', 'nuclio')
for key in RQ_QUEUES:
    RQ_QUEUES[key]['HOST'] = os.getenv('CVAT_REDIS_HOST', 'cvat_redis')
    RQ_QUEUES[key]['PASSWORD'] = os.getenv('CVAT_REDIS_PASSWORD', '')

# Django-sendfile:
# https://github.com/moggers87/django-sendfile2
SENDFILE_BACKEND = 'django_sendfile.backends.xsendfile'
