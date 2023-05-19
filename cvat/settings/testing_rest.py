# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from cvat.settings.production import *

# We use MD5 password hasher instead of default PBKDF2 here to speed up REST API tests,
# because the current implementation of the tests requires a authorization in each test case
# so using the PBKDF2 hasher slows them.
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]
