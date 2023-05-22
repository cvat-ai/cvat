# Copyright (C) 2018-2022 Intel Corporation
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
        from sentry_sdk.integrations.rq import RqIntegration

        logging.info('Initializing sentry...')
        sentry_sdk.init(
            dsn="https://acc5a0b8c5f14f379c6aaa5baba2dc76@o29828.ingest.sentry.io/6420408",
            integrations=[DjangoIntegration(), RqIntegration()],
            send_default_pii=True,
            release=VERSION,
            environment=ENVIRONMENT,
        )
    except Exception as e:
        print(e)
else:
    logging.info('Sentry usage is disabled.')

EMAIL_BACKEND = 'django_ses.SESBackend'

AWS_SES_REGION_NAME = os.getenv('AWS_SES_REGION_NAME', 'us-west-2')
AWS_SES_DOMAIN = os.getenv('AWS_SES_DOMAIN', 'amazonaws.com')
AWS_SES_REGION_ENDPOINT = os.getenv('AWS_SES_REGION_ENDPOINT', f'email.{AWS_SES_REGION_NAME}.{AWS_SES_DOMAIN}')
DEFAULT_FROM_EMAIL = 'reboticsnoreply@retechlabs.com'
ACCOUNT_EMAIL_VERIFICATION = os.getenv('ACCOUNT_EMAIL_VERIFICATION', 'mandatory')
