# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

# Inherit parent config
from cvat.settings.production import *  # pylint: disable=wildcard-import

# We use MD5 password hasher instead of default PBKDF2 here to speed up REST API tests,
# because the current implementation of the tests requires authentication in each test case
# so using the PBKDF2 hasher slows them.
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]

REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]["anon"] = "300/minute"

# The tests should not fail due to high disk utilization of CI infrastructure that we have no control over
# But let's keep this check enabled
HEALTH_CHECK = {
    "DISK_USAGE_MAX": 100,  # percent
}

EXPORT_JOB_RETRY_INTERVALS = [1, 1, 1]
IMPORT_JOB_RETRY_INTERVALS = [1, 1, 1]
