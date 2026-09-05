# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os

from django.core.exceptions import ImproperlyConfigured

MAX_QUALITY_REQUIREMENTS_PER_SETTINGS = int(
    os.getenv("CVAT_MAX_QUALITY_REQUIREMENTS_PER_SETTINGS", 100)
)

if MAX_QUALITY_REQUIREMENTS_PER_SETTINGS < 1:
    raise ImproperlyConfigured(
        "MAX_QUALITY_REQUIREMENTS_PER_SETTINGS must be >= 1, "
        f"got {MAX_QUALITY_REQUIREMENTS_PER_SETTINGS}"
    )
