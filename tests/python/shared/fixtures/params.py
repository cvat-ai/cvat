# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import pytest

from cvat_sdk.api_client import models

_STORAGE_METHOD_VALUES: dict = models.StorageMethod.allowed_values[("value",)]
CACHE_VALUE = _STORAGE_METHOD_VALUES["CACHE"]
FILE_SYSTEM_VALUE = _STORAGE_METHOD_VALUES["FILE_SYSTEM"]

def _cache_param(storage_method: models.StorageMethod):
    """
    For explicit test-level use with @pytest.mark.parametrize
    ex: @pytest.mark.parametrize("use_cache", CACHE/FILE_SYSTEM)
    """

    value = storage_method.value
    use_cache: bool = value == CACHE_VALUE
    return pytest.param(use_cache, id=value, marks=getattr(pytest.mark, value))


CACHE = (_cache_param(models.StorageMethod(CACHE_VALUE)),)
FILE_SYSTEM = (_cache_param(models.StorageMethod(FILE_SYSTEM_VALUE)),)
STORAGE_METHODS = CACHE + FILE_SYSTEM
