# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


import json

from shared.utils.config import BASE_URL, make_api_client


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
