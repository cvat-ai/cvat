# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from typing import TypeVar, Union

_T = TypeVar("_T")


class Undefined:
    pass


MaybeUndefined = Union[_T, Undefined]
"""
The reverse side of one-to-one relationship.
May be undefined in the object, should be accessed via getattr().
"""
