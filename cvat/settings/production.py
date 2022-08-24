# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from .base import *
import logging
import os


DEBUG = bool(int(os.getenv('DEBUG', 0)))

INSTALLED_APPS += [
    'mod_wsgi.server',
]

# Django-sendfile:
# https://github.com/moggers87/django-sendfile2
SENDFILE_BACKEND = 'django_sendfile.backends.xsendfile'


# Sentry setup.
USE_SENTRY = bool(int(os.getenv('USE_SENTRY', 1)))
if USE_SENTRY:
    try:
        import sentry_sdk
        from sentry_sdk.integrations.django import DjangoIntegration

        logging.info('Initializing sentry...')
        sentry_sdk.init(
            dsn="https://acc5a0b8c5f14f379c6aaa5baba2dc76@o29828.ingest.sentry.io/6420408",
            integrations=[DjangoIntegration()],
            send_default_pii=True,
            release=VERSION,
            environment=ENVIRONMENT,
        )
    except Exception as e:
        print(e)
else:
    logging.info('Sentry usage is disabled.')
