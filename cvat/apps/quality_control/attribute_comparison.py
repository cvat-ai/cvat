# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from collections.abc import Mapping
from copy import deepcopy
from typing import Any

CVAT_ATTRIBUTE_SPEC_IDS_ATTR = "__cvat_attribute_spec_ids"

_DEFAULT_COMPARATOR = "exact"
_DEFAULT_ATTRIBUTE_ENABLED = False


def _rule_key(rule: Mapping[str, Any]) -> tuple[str, int | str] | None:
    if rule.get("spec_id") is not None:
        return ("spec_id", int(rule["spec_id"]))

    return None


def normalize_attribute_comparison(
    value: Mapping[str, Any] | None,
    *,
    fill_default: bool,
) -> dict[str, Any]:
    result: dict[str, Any] = {}
    default_rule = deepcopy((value or {}).get("default") or {})

    if default_rule:
        if default_rule.get("enabled") is None:
            default_rule.pop("enabled")
        if default_rule:
            result["default"] = default_rule

    if fill_default:
        result.setdefault("default", {})
        result["default"].setdefault("enabled", _DEFAULT_ATTRIBUTE_ENABLED)

    rules_by_key: dict[tuple[str, int | str], dict[str, Any]] = {}
    for rule in (value or {}).get("rules") or []:
        key = _rule_key(rule)
        if key is None:
            continue

        normalized_rule = deepcopy(rule)
        if normalized_rule.get("spec_id") is not None:
            normalized_rule["spec_id"] = int(normalized_rule["spec_id"])
        rules_by_key[key] = normalized_rule

    if rules_by_key:
        result["rules"] = list(rules_by_key.values())
    elif fill_default:
        result["rules"] = []

    return result


def merge_attribute_comparison(
    parent_value: Mapping[str, Any] | None,
    child_value: Mapping[str, Any] | None,
) -> dict[str, Any]:
    merged = normalize_attribute_comparison(parent_value, fill_default=True)
    if child_value is None:
        return merged

    child_value = normalize_attribute_comparison(child_value, fill_default=False)

    child_default = child_value.get("default")
    if child_default:
        merged.setdefault("default", {})
        for field_name, field_value in child_default.items():
            if field_name == "enabled" and field_value is None:
                continue

            merged["default"][field_name] = deepcopy(field_value)

    merged_rules = {
        key: deepcopy(rule)
        for rule in merged.get("rules", [])
        if (key := _rule_key(rule)) is not None
    }
    for child_rule in child_value.get("rules", []):
        key = _rule_key(child_rule)
        if key is None:
            continue

        merged_rules[key] = deepcopy(child_rule)

    merged["rules"] = list(merged_rules.values())
    return merged


def attribute_comparison_may_compare(value: Mapping[str, Any] | None) -> bool:
    normalized = normalize_attribute_comparison(value, fill_default=True)
    default_rule = normalized.get("default") or {}
    if default_rule.get("enabled") is True:
        return True

    return any(rule.get("enabled") is True for rule in normalized.get("rules") or [])


def make_default_attribute_rule(attribute_comparison: Mapping[str, Any] | None) -> dict[str, Any]:
    normalized = normalize_attribute_comparison(attribute_comparison, fill_default=True)
    return {
        "enabled": normalized.get("default", {}).get("enabled", _DEFAULT_ATTRIBUTE_ENABLED),
        "comparator": _DEFAULT_COMPARATOR,
        **(normalized.get("default") or {}),
    }
