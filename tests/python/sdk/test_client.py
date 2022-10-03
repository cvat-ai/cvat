# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
from contextlib import ExitStack
from logging import Logger
from typing import Tuple

import packaging.version as pv
import pytest
from cvat_sdk import Client
from cvat_sdk.core.client import Config, make_client
from cvat_sdk.core.exceptions import IncompatibleVersionException, InvalidHostException
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

    def test_can_get_server_version(self):
        self.client.login((self.user, USER_PASS))

        version = self.client.get_server_version()

        assert (version.major, version.minor) >= (2, 0)


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


@pytest.mark.parametrize("raise_exception", (True, False))
def test_can_warn_on_mismatching_server_version(
    fxt_logger: Tuple[Logger, io.StringIO], monkeypatch, raise_exception: bool
):
    logger, logger_stream = fxt_logger

    def mocked_version(_):
        return pv.Version("0")

    monkeypatch.setattr(Client, "get_server_version", mocked_version)

    config = Config()

    with ExitStack() as es:
        if raise_exception:
            config.allow_unsupported_server = False
            es.enter_context(pytest.raises(IncompatibleVersionException))

        Client(url=BASE_URL, logger=logger, config=config)

    assert "Server version '0' is not compatible with SDK version" in logger_stream.getvalue()


@pytest.mark.parametrize("do_check", (True, False))
def test_can_check_server_version_in_ctor(
    fxt_logger: Tuple[Logger, io.StringIO], monkeypatch, do_check: bool
):
    logger, logger_stream = fxt_logger

    def mocked_version(_):
        return pv.Version("0")

    monkeypatch.setattr(Client, "get_server_version", mocked_version)

    config = Config()
    config.allow_unsupported_server = False

    with ExitStack() as es:
        if do_check:
            es.enter_context(pytest.raises(IncompatibleVersionException))

        Client(url=BASE_URL, logger=logger, config=config, check_server_version=do_check)

    assert (
        "Server version '0' is not compatible with SDK version" in logger_stream.getvalue()
    ) == do_check


def test_can_check_server_version_in_method(fxt_logger: Tuple[Logger, io.StringIO], monkeypatch):
    logger, logger_stream = fxt_logger

    def mocked_version(_):
        return pv.Version("0")

    monkeypatch.setattr(Client, "get_server_version", mocked_version)

    config = Config()
    config.allow_unsupported_server = False
    client = Client(url=BASE_URL, logger=logger, config=config, check_server_version=False)

    with client, pytest.raises(IncompatibleVersionException):
        client.check_server_version()

    assert "Server version '0' is not compatible with SDK version" in logger_stream.getvalue()


@pytest.mark.parametrize("verify", [True, False])
def test_can_control_ssl_verification_with_config(verify: bool):
    config = Config(verify_ssl=verify)

    client = Client(BASE_URL, config=config)

    assert client.api_client.configuration.verify_ssl == verify
