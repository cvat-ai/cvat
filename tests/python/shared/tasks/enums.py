# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from enum import Enum


class SourceDataType(Enum):
    images = "images"
    video = "video"


class CacheMode(Enum):
    DYNAMIC = "dynamic_cache"
    STATIC = "static_cache"

    @property
    def use_cache(self) -> bool:
        return self is CacheMode.DYNAMIC