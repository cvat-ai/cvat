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

# Checking for disk usage should be the user responsibility
# https://django-health-check.readthedocs.io/en/stable/settings.html
HEALTH_CHECK = {
    'DISK_USAGE_MAX': None,
}
