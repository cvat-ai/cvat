# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Mapping
from typing import Any, ClassVar

from attrs import frozen


class AttributeComparator(ABC):
    name: ClassVar[str]

    @abstractmethod
    def match(self, left: Any, right: Any, *, rule: AttributeComparisonRule) -> bool:
        raise NotImplementedError


class ExactAttributeComparator(AttributeComparator):
    name = "exact"

    def match(self, left: Any, right: Any, *, rule: AttributeComparisonRule) -> bool:
        return left == right


class LevenshteinAttributeComparator(AttributeComparator):
    name = "levenshtein"

    def match(self, left: Any, right: Any, *, rule: AttributeComparisonRule) -> bool:
        return self._similarity(left, right) >= rule.threshold

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


@frozen(kw_only=True)
class AttributeComparisonRule:
    enabled: bool
    comparator: str = DEFAULT_ATTRIBUTE_COMPARATOR
    threshold: float = 1.0
    spec_id: int | None = None

    @classmethod
    def from_mapping(
        cls,
        value: Mapping[str, Any],
        *,
        defaults: AttributeComparisonRule | None = None,
    ) -> AttributeComparisonRule:
        enabled = value.get("enabled", defaults.enabled if defaults else False)
        comparator = value.get(
            "comparator",
            defaults.comparator if defaults else DEFAULT_ATTRIBUTE_COMPARATOR,
        )
        threshold = value.get("threshold", defaults.threshold if defaults else 1.0)
        spec_id = value.get("spec_id")
        return cls(
            enabled=bool(enabled),
            comparator=comparator or DEFAULT_ATTRIBUTE_COMPARATOR,
            threshold=float(threshold) if threshold is not None else 1.0,
            spec_id=int(spec_id) if spec_id is not None else None,
        )


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


def match_attribute_values(left: Any, right: Any, *, rule: AttributeComparisonRule) -> bool:
    return get_attribute_comparator(rule.comparator).match(left, right, rule=rule)
