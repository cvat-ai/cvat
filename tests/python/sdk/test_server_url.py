# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import pytest

from cvat_sdk import Client
from cvat_sdk.core.exceptions import InvalidHostException


@pytest.mark.parametrize(
    ["url", "expected"],
    [
        ("HTTPS://Example.COM:8443/CVAT/", "https://Example.COM:8443/CVAT"),
        ("Https://Example.COM:8443/CVAT/", "https://Example.COM:8443/CVAT"),
        ("HTTP://Example.COM:8080/CVAT/", "http://Example.COM:8080/CVAT"),
        ("hTtP://Example.COM:8080/CVAT/", "http://Example.COM:8080/CVAT"),
        ("https://Example.COM:8443/CVAT/", "https://Example.COM:8443/CVAT"),
        ("Example.COM:8443/CVAT/", "https://Example.COM:8443/CVAT"),
    ],
)
def test_client_accepts_case_insensitive_server_scheme(url: str, expected: str):
    with Client(url, check_server_version=False) as client:
        assert client.api_map.host == expected
        assert client.api_client.configuration.host == expected


@pytest.mark.parametrize("url", ["FTP://example.com", "file://example.com"])
def test_client_still_rejects_unsupported_server_scheme(url: str):
    with pytest.raises(InvalidHostException):
        Client(url, check_server_version=False)
