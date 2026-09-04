# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import pytest

from shared.tasks.enums import CacheMode


def _cache_param(mode: CacheMode):
    """
    For explicit test-level use with @pytest.mark.parametrize
    ex: @pytest.mark.parametrize("use_cache", DYNAMIC/STATIC)
    """
    return pytest.param(mode.use_cache, id=mode.value, marks=getattr(pytest.mark, mode.value))


DYNAMIC_CACHE = (_cache_param(CacheMode.DYNAMIC),)
STATIC_CACHE = (_cache_param(CacheMode.STATIC),)
CACHE_MODES = DYNAMIC_CACHE + STATIC_CACHE
