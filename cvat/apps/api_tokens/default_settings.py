# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os
from datetime import timedelta

API_TOKEN_STALE_PERIOD = timedelta(
    seconds=int(os.getenv("CVAT_API_TOKEN_STALE_PERIOD", 6 * 30 * 24 * 60 * 60))
)
"""The time period after which unused API tokens automatically become invalid."""

API_TOKEN_UNUSABLE_TOKEN_TTL = timedelta(
    seconds=int(os.getenv("CVAT_API_TOKEN_UNUSABLE_TOKEN_TTL", 3 * 30 * 24 * 60 * 60))
)
"""
The time period after which unusable (expired, revoked or stale) API tokens
are automatically removed.
"""

API_TOKEN_LAST_USE_UPDATE_MIN_INTERVAL = timedelta(
    seconds=int(os.getenv("CVAT_API_TOKEN_LAST_USE_UPDATE_MIN_INTERVAL", 2 * 60 * 60))
)
"""The minimal time period between the token last use updates."""
