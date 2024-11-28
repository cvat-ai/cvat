# Copyright (C) 2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os

from attrs.converters import to_bool

MEDIA_CACHE_ALLOW_STATIC_CACHE = to_bool(os.getenv("CVAT_ALLOW_STATIC_CACHE", False))
"""
Allow or disallow static media cache.
If disabled, CVAT will only use the dynamic media cache. New tasks requesting static media cache
will be automatically switched to the dynamic cache.
When enabled, this option can increase data access speed and reduce server load,
but significantly increase disk space occupied by tasks.
"""

CVAT_CHUNK_CREATE_TIMEOUT = 50
"""
Sets the chunk preparation timeout in seconds after which the backend will respond with 429 code.
"""

CVAT_CHUNK_CREATE_CHECK_INTERVAL = 0.2
"""
Sets the frequency of checking the readiness of the chunk
"""
