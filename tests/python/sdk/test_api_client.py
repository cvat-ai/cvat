# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


import json
from types import SimpleNamespace

from cvat_sdk.api_client import ApiClient, Configuration
from cvat_sdk.api_client.api.tasks_api import TasksApi

import pytest
from cvat_sdk import models
from cvat_sdk.api_client.exceptions import ApiValueError
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


def test_string_enum_model_value_cannot_be_changed():
    enum_value = models.ShapeType("rectangle")

    with pytest.raises(ApiValueError):
        enum_value.value = "ellipse"

    with pytest.raises(ApiValueError):
        enum_value["value"] = "ellipse"

    with pytest.raises(ApiValueError):
        enum_value.set_attribute("value", "ellipse")

    assert enum_value == "rectangle"
    assert enum_value.value == "rectangle"
    assert enum_value["value"] == "rectangle"


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


def test_call_api_request_headers_override_defaults_and_skip_none(monkeypatch):
    api_client = ApiClient(Configuration(host=BASE_URL))
    api_client.set_default_header("X-Organization", "default-org")
    api_client.set_default_header("X-Remove-Me", "default-value")

    captured_headers = {}

    def fake_request(method, url, query_params=None, headers=None, **kwargs):
        captured_headers.update(headers)
        return SimpleNamespace(data=b"{}", status=200, msg="OK", headers={})

    monkeypatch.setattr(api_client, "request", fake_request)

    _, response = api_client.call_api(
        "/api/server/about",
        method="GET",
        header_params={
            "X-Organization": "request-org",
            "X-Remove-Me": None,
        },
        _parse_response=False,
    )

    assert response.status == 200
    assert captured_headers["X-Organization"] == "request-org"
    assert "X-Remove-Me" not in captured_headers


def test_endpoint_header_params_with_none_are_omitted(monkeypatch):
    api_client = ApiClient(Configuration(host=BASE_URL))
    api_client.set_default_header("X-Organization", "default-org")

    captured_request = {}

    def fake_request(method, url, query_params=None, headers=None, **kwargs):
        captured_request.update(
            method=method,
            url=url,
            query_params=query_params,
            headers=headers,
        )
        return SimpleNamespace(
            data=b'{"count":0,"next":null,"previous":null,"results":[]}',
            status=200,
            msg="OK",
            headers={},
        )

    monkeypatch.setattr(api_client, "request", fake_request)

    _, response = TasksApi(api_client).list_endpoint.call_with_http_info(
        org_id=123,
        x_organization=None,
        _parse_response=False,
    )

    assert response.status == 200
    assert "X-Organization" not in captured_request["headers"]
    assert dict(captured_request["query_params"]) == {"org_id": 123}
