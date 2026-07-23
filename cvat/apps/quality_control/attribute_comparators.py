# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Mapping
from typing import Any, ClassVar


class AttributeComparator(ABC):
    name: ClassVar[str]

    @abstractmethod
    def match(self, left: Any, right: Any, *, rule: Mapping[str, Any]) -> bool:
        raise NotImplementedError


class ExactAttributeComparator(AttributeComparator):
    name = "exact"

    def match(self, left: Any, right: Any, *, rule: Mapping[str, Any]) -> bool:
        return left == right


class LevenshteinAttributeComparator(AttributeComparator):
    name = "levenshtein"

    def match(self, left: Any, right: Any, *, rule: Mapping[str, Any]) -> bool:
        return self._similarity(left, right) >= rule.get("threshold", 1.0)

    @staticmethod
    def _similarity(left: Any, right: Any) -> float:
        left = str(left)
        right = str(right)

        if left == right:
            return 1.0

        if not left or not right:
            return 0.0

        previous_row = list(range(len(right) + 1))
        for left_index, left_char in enumerate(left, start=1):
            current_row = [left_index]
            for right_index, right_char in enumerate(right, start=1):
                insert_cost = current_row[right_index - 1] + 1
                delete_cost = previous_row[right_index] + 1
                replace_cost = previous_row[right_index - 1] + (left_char != right_char)
                current_row.append(min(insert_cost, delete_cost, replace_cost))
            previous_row = current_row

        distance = previous_row[-1]
        return 1 - distance / max(len(left), len(right))


_ATTRIBUTE_COMPARATORS: tuple[AttributeComparator, ...] = (
    ExactAttributeComparator(),
    LevenshteinAttributeComparator(),
)
_ATTRIBUTE_COMPARATORS_BY_NAME = {
    comparator.name: comparator for comparator in _ATTRIBUTE_COMPARATORS
}

DEFAULT_ATTRIBUTE_COMPARATOR = ExactAttributeComparator.name


def get_attribute_comparator(name: str | None = None) -> AttributeComparator:
    comparator_name = name or DEFAULT_ATTRIBUTE_COMPARATOR
    try:
        return _ATTRIBUTE_COMPARATORS_BY_NAME[comparator_name]
    except KeyError as exc:
        raise ValueError(f"Unsupported attribute comparator: {comparator_name!r}") from exc


def get_attribute_comparator_names() -> tuple[str, ...]:
    return tuple(sorted(_ATTRIBUTE_COMPARATORS_BY_NAME))


def format_attribute_comparator_names() -> str:
    names = [f"'{name}'" for name in get_attribute_comparator_names()]
    if len(names) <= 1:
        return "".join(names)

    return f"{', '.join(names[:-1])} or {names[-1]}"


def match_attribute_values(left: Any, right: Any, *, rule: Mapping[str, Any]) -> bool:
    return get_attribute_comparator(rule.get("comparator")).match(left, right, rule=rule)
