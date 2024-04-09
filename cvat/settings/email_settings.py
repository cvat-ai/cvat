# Copyright (C) 2020-2022 Intel Corporation
# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from cvat.settings.production import *


# https://github.com/pennersr/django-allauth
ACCOUNT_AUTHENTICATION_METHOD = 'username_email'
ACCOUNT_CONFIRM_EMAIL_ON_GET = True
ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_EMAIL_VERIFICATION = 'mandatory'

# Email backend settings for Django
# EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_USE_TLS = True
EMAIL_HOST = 'email-smtp.ap-south-1.amazonaws.com'  # Replace <region> with your AWS SES region (e.g., us-west-2)
EMAIL_PORT = 587  # Default SMTP port for AWS SES
EMAIL_HOST_USER = 'AKIA2UC3C3VMJ2ZG755K'  # Your SMTP username
EMAIL_HOST_PASSWORD = 'BC+aUdCZGi/dEyW+lQwyTNIT/I+nbkI+4yqElBH55U+z'  # Your SMTP password
