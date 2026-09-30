# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import json
from collections.abc import Callable, Mapping
from typing import Any, TypeAlias

__all__ = ["Condition", "F", "Field", "Filter", "JsonLogicExpression", "all_", "any_", "not_"]

JsonLogicExpression: TypeAlias = Mapping[str, Any]
# Anything that can stand in for a filter condition: a composed ``Filter``, a raw
# JSON Logic mapping, or a JSON string.
Condition: TypeAlias = "Filter | JsonLogicExpression | str"
# Keyword-lookup suffixes (``field__<op>``) map to the same field-DSL builders the
# ``F`` object exposes, so the two front-ends stay a single source of truth.
LOOKUPS: dict[str, Callable[[Field, Any], Filter]] = {
    "in": lambda field, value: field.one_of(value),
    "contains": lambda field, value: field.contains(value),
    "lt": lambda field, value: field < value,
    "lte": lambda field, value: field <= value,
    "gt": lambda field, value: field > value,
    "gte": lambda field, value: field >= value,
    "ne": lambda field, value: field != value,
    "between": lambda field, value: field.between(*value),
    "isset": lambda field, value: field.is_set() if value else not_(field.is_set()),
}


class Filter:
    """A composable JSON Logic filter node."""

    __slots__ = ("_expr",)
    _expr: JsonLogicExpression

    def __init__(self, expr: Condition) -> None:
        self._expr = _as_expr(expr)

    def to_json_logic(self) -> JsonLogicExpression:
        return self._expr

    def __and__(self, other: Condition) -> Filter:
        return Filter(_merge("and", self._expr, _as_expr(other)))

    def __or__(self, other: Condition) -> Filter:
        return Filter(_merge("or", self._expr, _as_expr(other)))

    def __invert__(self) -> Filter:
        return Filter({"!": self._expr})

    def __repr__(self) -> str:
        return f"Filter({self._expr!r})"


class Field:
    """A filterable field. Operators and methods produce Filter nodes."""

    __slots__ = ("_name",)

    def __init__(self, name: str) -> None:
        self._name = name

    @property
    def _var(self) -> JsonLogicExpression:
        return {"var": self._name}

    def __eq__(self, value: Any) -> Filter:  # type: ignore[override]
        return Filter({"==": [self._var, value]})

    def __ne__(self, value: Any) -> Filter:  # type: ignore[override]
        return Filter({"!": {"==": [self._var, value]}})

    def __lt__(self, value: Any) -> Filter:
        return Filter({"<": [self._var, value]})

    def __le__(self, value: Any) -> Filter:
        return Filter({"<=": [self._var, value]})

    def __gt__(self, value: Any) -> Filter:
        return Filter({">": [self._var, value]})

    def __ge__(self, value: Any) -> Filter:
        return Filter({">=": [self._var, value]})

    def one_of(self, values: Any) -> Filter:
        return Filter({"in": [self._var, list(values)]})

    def contains(self, substring: Any) -> Filter:
        return Filter({"in": [substring, self._var]})

    def between(self, low: Any, high: Any) -> Filter:
        return Filter({"<=": [low, self._var, high]})

    def is_set(self) -> Filter:
        return Filter(self._var)

    # Field defines __eq__, so it is intentionally not hashable.
    __hash__ = None  # type: ignore[assignment]

    def __repr__(self) -> str:
        return f"Field({self._name!r})"


class _FieldFactory:
    """Accessor that turns attribute/item access into Field objects."""

    def __getattr__(self, name: str) -> Field:
        if name.startswith("_"):
            raise AttributeError(name)
        return Field(name)

    def __getitem__(self, name: str) -> Field:
        return Field(name)


F = _FieldFactory()


def all_(*conditions: Condition) -> Filter:
    """AND of all conditions. A single condition is returned unwrapped."""
    return _combine("and", conditions, "all_")


def any_(*conditions: Condition) -> Filter:
    """OR of all conditions. A single condition is returned unwrapped."""
    return _combine("or", conditions, "any_")


def not_(condition: Condition) -> Filter:
    """Negate a condition."""
    return Filter({"!": _as_expr(condition)})


def pop_lookup_conditions(kwargs: dict[str, Any]) -> list[JsonLogicExpression]:
    """Extract and remove ``field__op`` lookup kwargs, returning JSON Logic conditions."""
    conditions: list[JsonLogicExpression] = []
    for key in list(kwargs):
        field_name, sep, op = key.rpartition("__")
        if sep and field_name and op in LOOKUPS:
            conditions.append(LOOKUPS[op](Field(field_name), kwargs.pop(key)).to_json_logic())
    return conditions


def build_filter_param(
    filter_value: Condition | None,
    lookup_conditions: list[JsonLogicExpression],
) -> str | None:
    """Assemble the ``filter`` query-string value from a filter expression and lookups."""
    if isinstance(filter_value, str) and not filter_value:
        filter_value = None
    if filter_value is None and not lookup_conditions:
        return None

    # A lone JSON string with nothing to merge is sent verbatim.
    if isinstance(filter_value, str) and not lookup_conditions:
        return filter_value

    nodes: list[JsonLogicExpression] = list(lookup_conditions)
    if filter_value is not None:
        nodes.append(_as_expr(filter_value))

    combined = nodes[0] if len(nodes) == 1 else {"and": nodes}
    return json.dumps(combined)


def _as_expr(value: Condition) -> JsonLogicExpression:
    """Normalize a condition into a JSON Logic value."""
    if isinstance(value, Filter):
        return value.to_json_logic()
    if isinstance(value, Mapping):
        return dict(value)
    if isinstance(value, str):
        expr = json.loads(value)
        if isinstance(expr, Mapping):
            return dict(expr)
    raise TypeError(f"Unsupported filter condition: {value!r}")


def _merge(op: str, left: JsonLogicExpression, right: JsonLogicExpression) -> JsonLogicExpression:
    """Combine two expressions under ``op``, flattening operands that share it."""
    args: list[JsonLogicExpression] = []
    for node in (left, right):
        if isinstance(node, Mapping) and list(node) == [op]:
            args.extend(node[op])
        else:
            args.append(node)
    return {op: args}


def _combine(op: str, conditions: tuple[Condition, ...], func_name: str) -> Filter:
    """AND/OR of all conditions; a single condition is returned unwrapped."""
    if not conditions:
        raise ValueError(f"{func_name}() requires at least one condition")
    exprs: list[JsonLogicExpression] = [_as_expr(c) for c in conditions]
    return Filter(exprs[0] if len(exprs) == 1 else {op: exprs})
