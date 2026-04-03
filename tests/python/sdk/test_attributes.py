# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import pytest
from cvat_sdk import models
from cvat_sdk.attributes import (
    attribute_vals_from_dict,
    attribute_value_validator,
    number_attribute_values,
)


def test_number_attribute_values_can_convert_good_values():
    assert number_attribute_values(0, 0, 1) == ["0", "0", "1"]
    assert number_attribute_values(0, 10, 1) == ["0", "10", "1"]
    assert number_attribute_values(0, 10, 10) == ["0", "10", "10"]
    assert number_attribute_values(0, 10, 5) == ["0", "10", "5"]


def test_number_attribute_values_can_reject_bad_values():
    with pytest.raises(ValueError, match="min_value must be less than or equal to max_value"):
        number_attribute_values(1, 0, 1)

    with pytest.raises(ValueError, match="step must be positive"):
        number_attribute_values(0, 10, 0)

    with pytest.raises(ValueError, match="step must be positive"):
        number_attribute_values(0, 10, -1)

    with pytest.raises(ValueError, match="step must be a divisor of max_value - min_value"):
        number_attribute_values(0, 10, 3)


def test_attribute_value_validator_checkbox():
    validator = attribute_value_validator(
        models.AttributeRequest(name="a", mutable=False, input_type="checkbox", values=[])
    )

    assert validator("true")
    assert validator("false")
    assert not validator("maybe")


def test_attribute_value_validator_number():
    validator = attribute_value_validator(
        models.AttributeRequest(
            name="a", mutable=False, input_type="number", values=["0", "10", "2"]
        )
    )

    assert validator("0")
    assert validator("2")
    assert validator("10")
    assert not validator("1")
    assert not validator("-2")
    assert not validator("12")
    assert not validator("not a number")


@pytest.mark.parametrize(
    ["values", "exc_match"],
    [
        (["0", "1"], "wrong number of values"),
        (["0", "10", "1", "1"], "wrong number of values"),
        (["a", "10", "1"], "values could not be converted to integers"),
        (["0", "a", "1"], "values could not be converted to integers"),
        (["0", "10", "a"], "values could not be converted to integers"),
        (["0", "10", "0"], "step must be positive"),
        (["1", "0", "1"], "min_value must be less than or equal to max_value"),
        (["0", "10", "3"], "step must be a divisor of max_value - min_value"),
    ],
)
def test_attribute_value_validator_number_bad_spec(values, exc_match):
    with pytest.raises(ValueError, match=exc_match):
        attribute_value_validator(
            models.AttributeRequest(name="a", mutable=False, input_type="number", values=values)
        )


@pytest.mark.parametrize("input_type", ["radio", "select"])
def test_attribute_value_validator_radiolike(input_type: str):
    validator = attribute_value_validator(
        models.AttributeRequest(name="a", mutable=False, input_type=input_type, values=["a", "b"])
    )

    assert validator("a")
    assert validator("b")
    assert not validator("c")


@pytest.mark.parametrize("input_type", ["radio", "select"])
def test_attribute_value_validator_radiolike_bad_spec(input_type: str):
    with pytest.raises(ValueError, match="empty list of allowed values"):
        attribute_value_validator(
            models.AttributeRequest(name="a", mutable=False, input_type=input_type, values=[])
        )


def test_attribute_value_validator_text():
    validator = attribute_value_validator(
        models.AttributeRequest(name="a", mutable=False, input_type="text", values=[])
    )

    assert validator("anything")


def test_attribute_vals_from_dict():
    assert attribute_vals_from_dict({}) == []

    attrs = attribute_vals_from_dict({0: "x", 1: 5, 2: True, 3: False})
    assert len(attrs) == 4

    for i, attr in enumerate(attrs):
        assert attr.spec_id == i

    assert attrs[0].value == "x"
    assert attrs[1].value == "5"
    assert attrs[2].value == "true"
    assert attrs[3].value == "false"
