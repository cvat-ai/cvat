# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .backend import Cuboid3DBackend

__all__ = ["Cuboid3DBackend"]


def __getattr__(name: str):
    if name == "Cuboid3DBackend":
        from .backend import Cuboid3DBackend

        return Cuboid3DBackend
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
