# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from collections.abc import Sequence
from typing import Any

from rest_framework import serializers


def require_one_of_fields(data: dict[str, Any], keys: Sequence[str]) -> None:
    active_count = sum(key in data for key in keys)
    if active_count == 1:
        return

    options = ", ".join(f'"{k}"' for k in keys)

    if not active_count:
        raise serializers.ValidationError(f"必须提供以下字段之一: {options}")
    else:
        raise serializers.ValidationError(f"只能使用以下字段之一: {options}")


def require_field(data: dict[str, Any], key: str) -> None:
    if key not in data:
        raise serializers.ValidationError(f'字段 "{key}" 是必填的')


def require_one_of_values(data: dict[str, Any], key: str, values: Sequence[Any]) -> None:
    assert values

    if data.get(key) not in values:
        if len(values) == 1:
            raise serializers.ValidationError(
                '字段 "{}" 必须为 {}'.format(key, ", ".join(f"{k}" for k in values))
            )
        else:
            raise serializers.ValidationError(
                '字段 "{}" 必须为以下值之一: {}'.format(key, ", ".join(f"{k}" for k in values))
            )


def validate_share(value: float) -> float:
    if not 0 <= value <= 1:
        raise serializers.ValidationError("值必须在 [0; 1] 范围内")

    return value
