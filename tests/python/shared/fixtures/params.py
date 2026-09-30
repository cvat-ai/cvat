# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import pytest

CACHE = (pytest.param(True, id="cache", marks=pytest.mark.cache),)
FILE_SYSTEM = (pytest.param(False),)
STORAGE_METHODS = CACHE + FILE_SYSTEM
