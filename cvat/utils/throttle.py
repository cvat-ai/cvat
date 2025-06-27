# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.core.cache import caches
from rest_framework.throttling import AnonRateThrottle


class SharedCacheThrottle(AnonRateThrottle):
    cache = caches["shared"]


class CVATAnonRateThrottle(SharedCacheThrottle, AnonRateThrottle):
    pass
