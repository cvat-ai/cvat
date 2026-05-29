# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from abc import ABCMeta
from dataclasses import dataclass
from typing import Generic, TypeVar

_T = TypeVar("_T")


@dataclass
class DataWithMeta(Generic[_T]):
    data: _T
    mime: str


class IMediaProvider(metaclass=ABCMeta):
    def unload(self):
        pass
