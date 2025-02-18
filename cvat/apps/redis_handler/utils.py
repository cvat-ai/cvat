# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.apps import AppConfig, apps
from pathlib import Path
import importlib


def get_class_from_module(module_path: str | Path, class_name: str) -> type | None:
    module = importlib.import_module(module_path)
    klass = getattr(module, class_name, None)
    return klass

def find_cvat_app_configs(migration_dir_name: str) -> list[AppConfig]:
    return [
        app_config
        for app_config in apps.get_app_configs()
        if app_config.name.startswith("cvat")
        and (Path(app_config.path) / migration_dir_name).exists()
    ]
