# Copyright (C) 2018-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

from .base import *
import os

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = bool(int(os.getenv('DJANGO_DEBUG', 1)))

INSTALLED_APPS += [
    'django_extensions',
]

ALLOWED_HOSTS.append('testserver')

# Django-sendfile:
# https://github.com/moggers87/django-sendfile2
SENDFILE_BACKEND = 'django_sendfile.backends.development'

# Cross-Origin Resource Sharing settings for CVAT UI
UI_SCHEME = os.environ.get('UI_SCHEME', 'http')
UI_HOST = os.environ.get('UI_HOST', 'localhost')
UI_PORT = int(os.environ.get('UI_PORT', 3000))
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = [UI_HOST]
UI_URL = '{}://{}'.format(UI_SCHEME, UI_HOST)

if UI_PORT and UI_PORT != 80:
    UI_URL += ':{}'.format(UI_PORT)
# set UI url to redirect to after successful e-mail confirmation
ACCOUNT_EMAIL_CONFIRMATION_ANONYMOUS_REDIRECT_URL = '{}/auth/email-confirmation'.format(UI_URL)

CORS_ORIGIN_WHITELIST = [UI_URL]
CORS_REPLACE_HTTPS_REFERER = True
