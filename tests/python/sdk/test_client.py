# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
from logging import Logger
from typing import Tuple

import pytest
from cvat_sdk import Client
from cvat_sdk.core.client import make_client
from cvat_sdk.core.exceptions import InvalidHostException
from cvat_sdk.exceptions import ApiException

from shared.utils.config import BASE_URL, USER_PASS


class TestClientUsecases:
    @pytest.fixture(autouse=True)
    def setup(
        self,
        changedb,  # force fixture call order to allow DB setup
        fxt_logger: Tuple[Logger, io.StringIO],
        fxt_client: Client,
        fxt_stdout: io.StringIO,
        admin_user: str,
    ):
        _, self.logger_stream = fxt_logger
        self.client = fxt_client
        self.stdout = fxt_stdout
        self.user = admin_user

        yield

    def test_can_login_with_basic_auth(self):
        self.client.login((self.user, USER_PASS))

        assert self.client.has_credentials()

    def test_can_fail_to_login_with_basic_auth(self):
        with pytest.raises(ApiException):
            self.client.login((self.user, USER_PASS + "123"))

    def test_can_logout(self):
        self.client.login((self.user, USER_PASS))

        self.client.logout()

        assert not self.client.has_credentials()


def test_can_detect_server_schema_if_not_provided():
    host, port = BASE_URL.split("://", maxsplit=1)[1].rsplit(":", maxsplit=1)
    client = make_client(host=host, port=int(port))
    assert client.api_map.host == "http://" + host + ":" + port


def test_can_fail_to_detect_server_schema_if_not_provided():
    host, port = BASE_URL.split("://", maxsplit=1)[1].rsplit(":", maxsplit=1)
    with pytest.raises(InvalidHostException) as capture:
        make_client(host=host, port=int(port) + 1)

    assert capture.match(r"Failed to detect host schema automatically")


def test_can_reject_invalid_server_schema():
    host, port = BASE_URL.split("://", maxsplit=1)[1].rsplit(":", maxsplit=1)
    with pytest.raises(InvalidHostException) as capture:
        make_client(host="ftp://" + host, port=int(port) + 1)

    assert capture.match(r"Invalid url schema 'ftp'")
