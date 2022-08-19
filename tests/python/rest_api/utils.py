# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from http import HTTPStatus
from time import sleep

from cvat_sdk.api_client.api_client import Endpoint
from urllib3 import HTTPResponse


def export_dataset(
    endpoint: Endpoint, *, max_retries: int = 20, interval: float = 0.1, **kwargs
) -> HTTPResponse:
    for _ in range(max_retries):
        (_, response) = endpoint.call_with_http_info(**kwargs, _parse_response=False)
        if response.status == HTTPStatus.CREATED:
            break
        assert response.status == HTTPStatus.ACCEPTED
        sleep(interval)
    assert response.status == HTTPStatus.CREATED

    (_, response) = endpoint.call_with_http_info(**kwargs, action="download", _parse_response=False)
    assert response.status == HTTPStatus.OK

    return response
