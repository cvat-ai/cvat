# Copyright (C) 2022-2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from enum import Enum
from typing import Any, Dict, Union, Optional

from cvat.apps.engine.models import Location, Project, Task, Job

class StorageType(str, Enum):
    TARGET = 'target_storage'
    SOURCE = 'source_storage'

    def __str__(self):
        return self.value

def get_location_configuration(
    query_params: Dict[str, Any],
    field_name: str,
    *,
    db_instance: Optional[Union[Project, Task, Job]] = None,
) -> Dict[str, Any]:
    location = query_params.get('location')

    # handle resource import
    if not location and not db_instance:
        location = Location.LOCAL

    use_default_settings = location is None

    location_conf = {
        "is_default": use_default_settings
    }

    if use_default_settings:
        storage = getattr(db_instance, field_name) if not isinstance(db_instance, Job) else getattr(db_instance.segment.task, field_name)
        if storage is None:
            location_conf['location'] = Location.LOCAL
        else:
            location_conf['location'] = storage.location
            if cloud_storage_id := storage.cloud_storage_id:
                location_conf['storage_id'] = cloud_storage_id
    else:
        if location not in Location.list():
            raise ValueError(f"The specified location {location} is not supported")

        cloud_storage_id = query_params.get('cloud_storage_id')

        if location == Location.CLOUD_STORAGE and not cloud_storage_id:
            raise ValueError("Cloud storage was selected as location but cloud_storage_id was not specified")

        location_conf['location'] = location
        if cloud_storage_id:
            location_conf['storage_id'] = int(cloud_storage_id)

    return location_conf
