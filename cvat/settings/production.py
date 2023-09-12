# Copyright (C) 2018-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

from .base import *

DEBUG = False

NUCLIO['HOST'] = os.getenv('CVAT_NUCLIO_HOST', 'nuclio')

# Django-sendfile:
# https://github.com/moggers87/django-sendfile2
SENDFILE_BACKEND = 'django_sendfile.backends.nginx'
SENDFILE_URL = '/'
