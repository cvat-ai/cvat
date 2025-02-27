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
        raise serializers.ValidationError(f"One of the fields {options} required")
    else:
        raise serializers.ValidationError(f"Only 1 of the fields {options} can be used")


def require_field(data: dict[str, Any], key: str) -> None:
    if key not in data:
        raise serializers.ValidationError(f'The "{key}" field is required')


def require_one_of_values(data: dict[str, Any], key: str, values: Sequence[Any]) -> None:
    assert values

    if data.get(key) not in values:
        if len(values) == 1:
            raise serializers.ValidationError(
                'The "{}" field must be {}'.format(key, ", ".join(f"{k}" for k in values))
            )
        else:
            raise serializers.ValidationError(
                'The "{}" field must be one of {}'.format(key, ", ".join(f"{k}" for k in values))
            )


def validate_share(value: float) -> float:
    if not 0 <= value <= 1:
        raise serializers.ValidationError("Value must be in the range [0; 1]")

    return value
