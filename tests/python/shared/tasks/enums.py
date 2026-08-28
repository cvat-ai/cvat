# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from enum import Enum, StrEnum


class SourceDataType(Enum):
    images = "images"
    video = "video"


class CacheState(StrEnum):
    ON = "static_cache_on"
    OFF = "static_cache_off"