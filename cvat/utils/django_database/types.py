# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from typing import TypeAlias, TypeVar

__all__ = ("MaybeUndefined",)

_T = TypeVar("_T")


class _Undefined:
    pass


MaybeUndefined: TypeAlias = _T | _Undefined
"""
Can be used to annotate dynamic class members that may be undefined in the object.
Such fields should typically be accessed via hasattr() and getattr().

Common use cases:
- the reverse side of one-to-one relationship
- extra annotations from a model queryset
"""
