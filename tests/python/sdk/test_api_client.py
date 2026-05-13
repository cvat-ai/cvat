# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


import json

import pytest

from cvat_sdk import models
from cvat_sdk.api_client.model_utils import to_json

from shared.utils.config import BASE_URL, make_api_client


@pytest.mark.parametrize(
    ("enum_class", "args", "expected_value"),
    [
        pytest.param(models.ShapeType, ("rectangle",), "rectangle", id="explicit-value"),
        pytest.param(models.WebhookContentType, (), "application/json", id="default-value"),
    ],
)
def test_string_enum_models_are_string_compatible(enum_class, args, expected_value):
    enum_value = enum_class(*args)
    deserialized_enum_value = enum_class._from_openapi_data(*args)

    assert isinstance(enum_value, str)
    assert isinstance(deserialized_enum_value, str)
    assert enum_value == expected_value
    assert expected_value == enum_value
    assert deserialized_enum_value == expected_value
    assert enum_value.value == expected_value
    assert deserialized_enum_value.value == expected_value
    assert str(enum_value) == expected_value
    assert enum_value in {expected_value}
    assert {enum_value: "value"}[expected_value] == "value"
    assert json.dumps({"value": enum_value}) == json.dumps({"value": expected_value})


def test_string_enum_model_fields_are_serialized_as_strings():
    shape = models.LabeledShapeRequest(
        frame=0,
        label_id=1,
        type=models.ShapeType("rectangle"),
        points=[1.0, 2.0, 3.0, 4.0],
    )

    serialized_shape = to_json(shape)

    assert serialized_shape["type"] == "rectangle"
    assert serialized_shape["type"].__class__ is str


def test_can_make_custom_request_with_call_api_method(admin_user):
    with make_api_client(admin_user) as api_client:
        _, response = api_client.call_api("/api/users/self", method="GET", _parse_response=False)

        assert json.loads(response.data)["username"] == admin_user


def test_can_make_custom_request_with_request_method(admin_user):
    with make_api_client(admin_user) as api_client:
        headers = api_client.get_common_headers()
        query_params = []
        api_client.update_params_for_auth(headers=headers, queries=query_params)
        assert not query_params

        response = api_client.request(
            "GET", BASE_URL + "/api/users/self", headers=headers, _parse_response=False
        )

        assert json.loads(response.data)["username"] == admin_user
