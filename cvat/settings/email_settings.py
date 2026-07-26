# Copyright (C) 2020-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

# Inherit parent config
from cvat.settings.production import *  # pylint: disable=wildcard-import

# https://github.com/pennersr/django-allauth
ACCOUNT_LOGIN_METHODS = {"username", "email"}
ACCOUNT_CONFIRM_EMAIL_ON_GET = True
ACCOUNT_SIGNUP_FIELDS = ["email*", "username*", "password1*", "password2*"]
ACCOUNT_EMAIL_VERIFICATION = "mandatory"

# Email backend settings for Django
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
