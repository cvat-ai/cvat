# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .backend import Datumaro2DBackend

__all__ = ["Datumaro2DBackend"]


def __getattr__(name: str):
    if name == "Datumaro2DBackend":
        from .backend import Datumaro2DBackend

        return Datumaro2DBackend
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
