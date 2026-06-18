# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import json
from collections.abc import Mapping
from typing import Any


def _as_expr(value: Filter | Mapping | str) -> Any:
    """Normalize a condition into a JSON Logic value."""
    if isinstance(value, Filter):
        return value.to_json_logic()
    if isinstance(value, Mapping):
        return dict(value)
    if isinstance(value, str):
        return json.loads(value)
    raise TypeError(f"Unsupported filter condition: {value!r}")


def _merge(op: str, left: Any, right: Any) -> dict[str, Any]:
    args: list[Any] = []
    for node in (left, right):
        if isinstance(node, Mapping) and list(node) == [op]:
            args.extend(node[op])
        else:
            args.append(node)
    return {op: args}


class Filter:
    """A composable JSON Logic filter node."""

    __slots__ = ("_expr",)

    def __init__(self, expr: Any) -> None:
        self._expr = expr

    def to_json_logic(self) -> Any:
        return self._expr

    def __and__(self, other: Filter | Mapping | str) -> Filter:
        return Filter(_merge("and", self._expr, _as_expr(other)))

    def __or__(self, other: Filter | Mapping | str) -> Filter:
        return Filter(_merge("or", self._expr, _as_expr(other)))

    def __invert__(self) -> Filter:
        return Filter({"!": self._expr})

    def __repr__(self) -> str:
        return f"Filter({self._expr!r})"


def all_(*conditions: Filter | Mapping | str) -> Filter:
    """AND of all conditions. A single condition is returned unwrapped."""
    if not conditions:
        raise ValueError("all_() requires at least one condition")
    exprs = [_as_expr(c) for c in conditions]
    return Filter(exprs[0] if len(exprs) == 1 else {"and": exprs})


def any_(*conditions: Filter | Mapping | str) -> Filter:
    """OR of all conditions. A single condition is returned unwrapped."""
    if not conditions:
        raise ValueError("any_() requires at least one condition")
    exprs = [_as_expr(c) for c in conditions]
    return Filter(exprs[0] if len(exprs) == 1 else {"or": exprs})


def not_(condition: Filter | Mapping | str) -> Filter:
    """Negate a condition."""
    return Filter({"!": _as_expr(condition)})
