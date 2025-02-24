# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from collections.abc import Mapping
from typing import Callable, Union

from . import models


class _CheckboxAttributeValueValidator:
    def __init__(self, values: list[str]) -> None:
        pass

    def __call__(self, value: str) -> bool:
        return value in {"true", "false"}


class _NumberAttributeValueValidator:
    def __init__(self, values: list[str]) -> None:
        if len(values) != 3:
            raise ValueError(f"wrong number of values: expected 3, got {len(values)}")

        try:
            (self._min_value, self._max_value, self._step) = map(int, values)
        except ValueError as ex:
            raise ValueError(f"values could not be converted to integers") from ex

        try:
            number_attribute_values(self._min_value, self._max_value, self._step)
        except ValueError as ex:
            raise ValueError(f"invalid values: {ex}") from ex

    def __call__(self, value: str) -> bool:
        try:
            value = int(value)
        except ValueError:
            return False

        return (
            self._min_value <= value <= self._max_value
            and (value - self._min_value) % self._step == 0
        )


class _SelectAttributeValueValidator:
    def __init__(self, values: list[str]) -> None:
        if len(values) == 0:
            raise ValueError("empty list of allowed values")

        self._values = frozenset(values)

    def __call__(self, value: str) -> bool:
        return value in self._values


class _TextAttributeValueValidator:
    def __init__(self, values: list[str]) -> None:
        pass

    def __call__(self, value: str) -> bool:
        return True


_VALIDATOR_CLASSES = {
    "checkbox": _CheckboxAttributeValueValidator,
    "number": _NumberAttributeValueValidator,
    "radio": _SelectAttributeValueValidator,
    "select": _SelectAttributeValueValidator,
    "text": _TextAttributeValueValidator,
}

# make sure all possible types are covered
assert set(models.InputTypeEnum.allowed_values[("value",)].values()) == _VALIDATOR_CLASSES.keys()


def attribute_value_validator(spec: models.IAttributeRequest) -> Callable[[str], bool]:
    """
    Returns a callable that can be used to verify
    whether an attribute value is suitable for an attribute with the given spec.
    The resulting callable takes a single argument (the attribute value as a string)
    and returns True if and only if the value is suitable.

    The spec's `values` attribute must be consistent with its `input_type` attribute,
    otherwise ValueError will be raised.
    """
    return _VALIDATOR_CLASSES[spec.input_type.value](spec.values)


def number_attribute_values(min_value: int, max_value: int, /, step: int = 1) -> list[str]:
    """
    Returns a list suitable as the value of the "values" field of an `AttributeRequest`
    with `input_type="number"`.
    """

    if min_value > max_value:
        raise ValueError("min_value must be less than or equal to max_value")

    if step <= 0:
        raise ValueError("step must be positive")

    if (max_value - min_value) % step != 0:
        raise ValueError("step must be a divisor of max_value - min_value")

    return [str(min_value), str(max_value), str(step)]


def attribute_vals_from_dict(
    id_to_value: Mapping[int, Union[str, int, bool]], /
) -> list[models.AttributeValRequest]:
    """
    Returns a list of AttributeValRequest objects with given IDs and values.

    The input value must be a mapping from attribute spec IDs to corresponding values.
    A value may be specified as a string, an integer, or a boolean.
    Integers and booleans will be converted to strings according to the format CVAT expects
    for attributes with input type "number" and "checkbox", respectively.
    """

    def val_as_string(v: Union[str, int, bool]) -> str:
        if v is True:
            return "true"
        if v is False:
            return "false"
        if isinstance(v, int):
            return str(v)
        if isinstance(v, str):
            return v
        assert False, f"unexpected value {v!r} of type {type(v)}"

    return [
        models.AttributeValRequest(spec_id=k, value=val_as_string(v))
        for k, v in id_to_value.items()
    ]
