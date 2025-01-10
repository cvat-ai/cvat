# Copyright (C) 2025 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


from django.apps import apps, AppConfig
from collections.abc import Iterable

def get_app_configs() -> Iterable[AppConfig]:
    return [
        app_config for app_config in apps.get_app_configs()
        if app_config.name.startswith('cvat.apps.')
    ]
