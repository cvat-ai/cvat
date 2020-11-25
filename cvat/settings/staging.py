# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from .production import *

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

INSTALLED_APPS += [
    'silk'
]

MIDDLEWARE += [
    'silk.middleware.SilkyMiddleware',
]

# Django profiler
# https://github.com/jazzband/django-silk
SILKY_PYTHON_PROFILER = True
SILKY_PYTHON_PROFILER_BINARY = True
SILKY_PYTHON_PROFILER_RESULT_PATH = os.path.join(BASE_DIR, 'profiles/')
os.makedirs(SILKY_PYTHON_PROFILER_RESULT_PATH, exist_ok=True)
SILKY_AUTHENTICATION = True
SILKY_AUTHORISATION = True
SILKY_MAX_REQUEST_BODY_SIZE = 1024
SILKY_MAX_RESPONSE_BODY_SIZE = 1024
SILKY_IGNORE_PATHS = ['/admin', '/documentation', '/django-rq', '/auth']
SILKY_MAX_RECORDED_REQUESTS = 10**4
def SILKY_INTERCEPT_FUNC(request):
    # Ignore all requests which try to get a frame (too many of them)
    if request.method == 'GET' and '/frames/' in request.path:
        return False

    return True

SILKY_INTERCEPT_FUNC = SILKY_INTERCEPT_FUNC
