# Copyright (C) 2022-2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from enum import Enum
from typing import Any, Dict, Union

from cvat.apps.engine.models import Location, Project, Task, Job

class StorageType(str, Enum):
    TARGET = 'target_storage'
    SOURCE = 'source_storage'

    def __str__(self):
        return self.value

def get_location_configuration(
    obj: Union[Project, Task, Job, Dict],
    field_name: str,
    use_settings: bool = False,
) -> Dict[str, Any]:
    location_conf = {
        "is_default": use_settings
    }

    if use_settings:
        storage = getattr(obj, field_name) if not isinstance(obj, Job) else getattr(obj.segment.task, field_name)
        if storage is None:
            location_conf['location'] = Location.LOCAL
        else:
            location_conf['location'] = storage.location
            if cloud_storage_id := storage.cloud_storage_id:
                location_conf['storage_id'] = cloud_storage_id
    else:
        # obj is query_params
        location_conf['location'] = obj.get('location', Location.LOCAL)
        if cloud_storage_id := obj.get('cloud_storage_id'):
            location_conf['storage_id'] = int(cloud_storage_id)

    return location_conf
