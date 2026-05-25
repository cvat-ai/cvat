# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import importlib
from pathlib import Path


def get_class_from_module(module_path: str | Path, class_name: str) -> type | None:
    module = importlib.import_module(module_path)
    klass = getattr(module, class_name, None)
    return klass


class NoOpDeathPenalty:
    """Death-penalty stand-in for the thread-pool worker — threads cannot be
    interrupted mid-blocking-IO, so job/callback timeouts are no-ops."""

    def __init__(self, *args, **kwargs) -> None:
        pass

    def __enter__(self) -> "NoOpDeathPenalty":
        return self

    def __exit__(self, *exc) -> bool:
        return False
