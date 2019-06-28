# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from .base import *

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

INSTALLED_APPS += [
    'django_extensions',
    'corsheaders',
]

MIDDLEWARE += [
    'corsheaders.middleware.CorsMiddleware',
]

CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = [
    'http://localhost:3000'
]
CORS_ORIGIN_WHITELIST = [
    "http://localhost:3000",
]

ALLOWED_HOSTS.append('testserver')

# Django-sendfile:
# https://github.com/johnsensible/django-sendfile
SENDFILE_BACKEND = 'sendfile.backends.development'

# Database
# https://docs.djangoproject.com/en/2.0/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': os.path.join(BASE_DIR, 'db.sqlite3'),
    }
}
