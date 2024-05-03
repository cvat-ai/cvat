# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from cvat.settings.production import *

# We use MD5 password hasher instead of default PBKDF2 here to speed up REST API tests,
# because the current implementation of the tests requires authentication in each test case
# so using the PBKDF2 hasher slows them.
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]

# Avoid quality updates during test runs.
# Note that DB initialization triggers server signals,
# so quality report updates are scheduled for applicable jobs.
QUALITY_CHECK_JOB_DELAY = 10000

IMPORT_CACHE_CLEAN_DELAY = timedelta(seconds=30)

# The tests should not fail due to high disk utilization of CI infrastructure that we have no control over
# But let's keep this check enabled
HEALTH_CHECK = {
    'DISK_USAGE_MAX': 100,  # percent
}
