# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import enum

from cvat_sdk.models import LocationEnum as RawLocationEnum


class Location(str, enum.Enum):
    LOCAL = "local"
    CLOUD_STORAGE = "cloud_storage"

    def __str__(self) -> str:
        return self.value


assert all(
    [getattr(Location, k) == v for k, v in RawLocationEnum.allowed_values[("value",)].items()]
), 'SDK "Location" enum should be updated'
