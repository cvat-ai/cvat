# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from enum import Enum
from typing import Any

import attrs

from cvat.apps.engine.models import Job, Location, Project, Storage, Task


class StorageType(str, Enum):
    TARGET = "target_storage"
    SOURCE = "source_storage"

    def __str__(self):
        return self.value


@attrs.frozen(kw_only=True)
class LocationConfig:
    is_default: bool = attrs.field(validator=attrs.validators.instance_of(bool))
    location: Location = attrs.field(converter=Location)
    cloud_storage_id: int | None = attrs.field(
        converter=lambda x: x if x is None else int(x), default=None
    )

    def __attrs_post_init__(self):
        if self.location == Location.CLOUD_STORAGE and not self.cloud_storage_id:
            raise ValueError(
                "Trying to use undefined cloud storage (cloud_storage_id was not provided)"
            )


def get_location_configuration(
    query_params: dict[str, Any],
    field_name: str,
    *,
    db_instance: Project | Task | Job | None = None,
) -> LocationConfig:
    location = query_params.get("location")

    # handle backup imports
    if not location and not db_instance:
        location = Location.LOCAL

    use_default_settings = location is None

    if use_default_settings:
        storage: Storage = (
            getattr(db_instance, field_name)
            if not isinstance(db_instance, Job)
            else getattr(db_instance.segment.task, field_name)
        )
        return (
            LocationConfig(is_default=True, location=Location.LOCAL)
            if storage is None
            else LocationConfig(
                is_default=True,
                location=storage.location,
                cloud_storage_id=storage.cloud_storage_id,
            )
        )

    return LocationConfig(
        is_default=False, location=location, cloud_storage_id=query_params.get("cloud_storage_id")
    )
