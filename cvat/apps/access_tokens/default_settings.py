# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os
from datetime import timedelta

ACCESS_TOKEN_STALE_PERIOD = timedelta(
    seconds=int(os.getenv("CVAT_ACCESS_TOKEN_STALE_PERIOD", 6 * 30 * 24 * 60 * 60))
)
"""The time period after which unused API access tokens automatically become invalid."""

ACCESS_TOKEN_UNUSABLE_TOKEN_TTL = timedelta(
    seconds=int(os.getenv("CVAT_ACCESS_TOKEN_UNUSABLE_TOKEN_TTL", 3 * 30 * 24 * 60 * 60))
)
"""
The time period after which unusable (expired, revoked or stale) API access tokens
are automatically removed.
"""

ACCESS_TOKEN_LAST_USE_UPDATE_MIN_INTERVAL = timedelta(
    seconds=int(os.getenv("CVAT_ACCESS_TOKEN_LAST_USE_UPDATE_MIN_INTERVAL", 2 * 60 * 60))
)
"""
The minimal time period between the token last use updates.
The recommended value range is from 5 minutes up to 4 hours.
"""

MAX_ACCESS_TOKENS_PER_USER = int(os.getenv("CVAT_MAX_ACCESS_TOKENS_PER_USER", 50))
"""The maximum number of Personal Access Tokens per user. Set to -1 to disable the restriction"""
