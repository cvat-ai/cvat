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
