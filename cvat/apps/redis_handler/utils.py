# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import importlib
from pathlib import Path


def get_class_from_module(module_path: str | Path, class_name: str) -> type | None:
    module = importlib.import_module(module_path)
    klass = getattr(module, class_name, None)
    return klass
