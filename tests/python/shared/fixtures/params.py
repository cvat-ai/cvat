# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import pytest

from shared.tasks.enums import CacheMode
from cvat.apps.engine.models import StorageMethodChoice


def _cache_param(mode: StorageMethodChoice):
    """
    For explicit test-level use with @pytest.mark.parametrize
    ex: @pytest.mark.parametrize("use_cache", DYNAMIC/STATIC)
    """
    str_value = str(mode)
    use_cache: bool = (str_value == str(StorageMethodChoice.CACHE))
    return pytest.param(use_cache, id=str_value, marks=getattr(pytest.mark, str_value))


CACHE = (_cache_param(StorageMethodChoice.CACHE),)
FILE_SYSTEM = (_cache_param(StorageMethodChoice.FILE_SYSTEM),)
STORAGE_METHODS = CACHE + FILE_SYSTEM
