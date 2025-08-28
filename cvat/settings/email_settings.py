# Copyright (C) 2020-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

# Inherit parent config
from cvat.settings.production import *  # pylint: disable=wildcard-import

# https://github.com/pennersr/django-allauth
ACCOUNT_AUTHENTICATION_METHOD = "username_email"
ACCOUNT_CONFIRM_EMAIL_ON_GET = True
ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_EMAIL_VERIFICATION = "mandatory"

EMAIL_BACKEND = os.getenv('EMAIL_BACKEND', 'django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = os.getenv('EMAIL_PORT', 587)
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', True)
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', 'sara.silva@digitalsense.ai')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', 'voeupjleluxyjpti')
EMAIL_FROM = os.getenv('EMAIL_FROM', 'noreply@digitalsense.ai')

SITE_ID = 3

