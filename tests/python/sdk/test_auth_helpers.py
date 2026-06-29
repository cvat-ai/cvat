# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import argparse
import logging

import pytest
from cvat_sdk.core.auth import (
    CVAT_ACCESS_TOKEN_ENV_VAR,
    DEFAULT_SERVER,
    AuthStore,
    AuthStoreError,
    ClientAuthParameters,
    ProfileEntry,
    configure_client_auth_arguments,
    default_auth_factory,
    get_auth_factory,
    make_client_from_cli,
    make_client_from_profile,
)
from cvat_sdk.core.client import AccessTokenCredentials, Config, PasswordCredentials

AUTH_URL = "https://auth.test.invalid"
PROFILE_URL = "https://profile.test.invalid"
EXPLICIT_URL = "https://explicit.test.invalid"
STUB_URL = "https://stub.test.invalid"


class _FakeClient:
    def __init__(self, url, **kwargs):
        self.url = url
        self.logged_in_with = None
        self.organization_slug = None
        self.config = kwargs.get("config")
        self.logger = kwargs.get("logger")
        self.check_server_version = kwargs.get("check_server_version")
        self.api_client = type(
            "ApiClient",
            (),
            {"configuration": type("Config", (), {"host": STUB_URL})()},
        )()

    def login(self, credentials):
        self.logged_in_with = credentials


def _ns(**kw):
    ns = argparse.Namespace(
        profile=None,
        auth=None,
        server_host=None,
        server_port=None,
        insecure=False,
        organization=None,
    )
    for k, v in kw.items():
        setattr(ns, k, v)
    return ns


def test_get_auth_factory_parses_user_pass():
    cred = get_auth_factory("alice:secret")(AUTH_URL)
    assert isinstance(cred, PasswordCredentials)
    assert cred.user == "alice"
    assert cred.password == "secret"


def test_default_auth_factory_reads_env_token(monkeypatch):
    monkeypatch.setenv(CVAT_ACCESS_TOKEN_ENV_VAR, "pat-123")
    cred = default_auth_factory()(AUTH_URL)
    assert isinstance(cred, AccessTokenCredentials)
    assert cred.token == "pat-123"


def test_configure_client_auth_arguments_defines_shared_parser_surface():
    parser = argparse.ArgumentParser()
    configure_client_auth_arguments(parser)

    args = parser.parse_args(
        [
            "--profile",
            "p",
            "--insecure",
            "--organization",
            "org",
        ]
    )
    params = ClientAuthParameters.from_namespace(args)

    assert params.profile == "p"
    assert params.insecure is True
    assert params.organization == "org"


def test_configure_client_auth_arguments_parses_auth_and_host():
    parser = argparse.ArgumentParser()
    configure_client_auth_arguments(parser)

    args = parser.parse_args(
        [
            "--server-host",
            EXPLICIT_URL,
            "--server-port",
            "8443",
            "--auth",
            "alice:secret",
        ]
    )
    params = ClientAuthParameters.from_namespace(args)
    cred = params.auth(AUTH_URL)

    assert params.server_host == EXPLICIT_URL
    assert params.server_port == 8443
    assert isinstance(cred, PasswordCredentials)
    assert cred.user == "alice"
    assert cred.password == "secret"


def test_make_client_from_profile_uses_profile_entry(monkeypatch):
    from cvat_sdk.core import auth as auth_mod

    logger = logging.getLogger("test-auth")
    config = Config(status_check_period=0.1, verify_ssl=False)
    entry = ProfileEntry(
        server=PROFILE_URL, token="pat-9", created_date="2026-01-01T00:00:00+00:00"
    )
    monkeypatch.setattr(auth_mod, "Client", _FakeClient)

    client = make_client_from_profile(
        entry, logger=logger, config=config, check_server_version=True
    )
    assert client.url == PROFILE_URL
    assert client.logged_in_with.token == "pat-9"
    assert client.logger is logger
    assert client.config is config
    assert client.check_server_version is True


def test_make_client_from_cli_unknown_profile_raises(tmp_path):
    store = AuthStore(path=tmp_path / "auth.json")
    with pytest.raises(AuthStoreError, match="profile"):
        make_client_from_cli(_ns(profile="ghost"), store=store)


def test_make_client_from_cli_profile_path(tmp_path, monkeypatch):
    from cvat_sdk.core import auth as auth_mod

    store = AuthStore(path=tmp_path / "auth.json")
    store.add_profile(
        "p",
        ProfileEntry(server=PROFILE_URL, token="pat", created_date="2026-01-01T00:00:00+00:00"),
    )
    monkeypatch.setattr(auth_mod, "Client", _FakeClient)
    client = make_client_from_cli(_ns(profile="p"), store=store)
    assert client.url == PROFILE_URL
    assert client.logged_in_with.token == "pat"


def test_make_client_from_cli_profile_conflicts(tmp_path):
    store = AuthStore(path=tmp_path / "auth.json")
    with pytest.raises(AuthStoreError, match="mutually exclusive"):
        make_client_from_cli(_ns(profile="p", server_host=EXPLICIT_URL), store=store)
    with pytest.raises(AuthStoreError, match="mutually exclusive"):
        make_client_from_cli(_ns(profile="p", auth=get_auth_factory("u:p")), store=store)


def test_make_client_from_cli_zero_flag_uses_default_profile(tmp_path, monkeypatch):
    from cvat_sdk.core import auth as auth_mod

    store = AuthStore(path=tmp_path / "auth.json")
    store.add_profile(
        "p",
        ProfileEntry(server=PROFILE_URL, token="dpat", created_date="2026-01-01T00:00:00+00:00"),
        set_default=True,
    )
    monkeypatch.setattr(auth_mod, "Client", _FakeClient)
    monkeypatch.delenv(CVAT_ACCESS_TOKEN_ENV_VAR, raising=False)
    client = make_client_from_cli(_ns(), store=store)
    assert client.url == PROFILE_URL
    assert client.logged_in_with.token == "dpat"


def test_make_client_from_cli_profile_path_applies_client_options(tmp_path, monkeypatch):
    from cvat_sdk.core import auth as auth_mod

    logger = logging.getLogger("test-auth")
    config = Config(status_check_period=0.1, verify_ssl=True)
    store = AuthStore(path=tmp_path / "auth.json")
    store.add_profile(
        "p",
        ProfileEntry(server=PROFILE_URL, token="pat", created_date="2026-01-01T00:00:00+00:00"),
    )
    monkeypatch.setattr(auth_mod, "Client", _FakeClient)

    client = make_client_from_cli(
        _ns(profile="p", insecure=True),
        logger=logger,
        config=config,
        check_server_version=True,
        store=store,
    )

    assert client.url == PROFILE_URL
    assert client.config.status_check_period == 0.1
    assert client.config.verify_ssl is False
    assert client.logger is logger
    assert client.check_server_version is True


def test_make_client_from_cli_explicit_host_does_not_borrow_profile_token(tmp_path, monkeypatch):
    from cvat_sdk.core import auth as auth_mod

    store = AuthStore(path=tmp_path / "auth.json")
    store.add_profile(
        "p",
        ProfileEntry(server=PROFILE_URL, token="dpat", created_date="2026-01-01T00:00:00+00:00"),
        set_default=True,
    )
    monkeypatch.setattr(auth_mod, "Client", _FakeClient)
    monkeypatch.setenv(CVAT_ACCESS_TOKEN_ENV_VAR, "env-tok")
    client = make_client_from_cli(_ns(server_host=EXPLICIT_URL), store=store)
    assert client.url == EXPLICIT_URL
    assert client.logged_in_with.token == "env-tok"


def test_make_client_from_cli_accepts_typed_parameters_and_config(tmp_path, monkeypatch):
    from cvat_sdk.core import auth as auth_mod

    config = Config(status_check_period=0.1, verify_ssl=True)
    store = AuthStore(path=tmp_path / "auth.json")
    monkeypatch.setattr(auth_mod, "Client", _FakeClient)
    monkeypatch.setenv(CVAT_ACCESS_TOKEN_ENV_VAR, "env-tok")

    client = make_client_from_cli(
        ClientAuthParameters(server_host=EXPLICIT_URL, insecure=True),
        config=config,
        store=store,
    )

    assert client.url == EXPLICIT_URL
    assert client.config.status_check_period == 0.1
    assert client.config.verify_ssl is False
    assert client.logged_in_with.token == "env-tok"


def test_make_client_from_cli_env_token_zero_flag(tmp_path, monkeypatch):
    from cvat_sdk.core import auth as auth_mod

    store = AuthStore(path=tmp_path / "auth.json")
    monkeypatch.setattr(auth_mod, "Client", _FakeClient)
    monkeypatch.setenv(CVAT_ACCESS_TOKEN_ENV_VAR, "env-tok")
    client = make_client_from_cli(_ns(), store=store)
    assert client.url == DEFAULT_SERVER
    assert client.logged_in_with.token == "env-tok"


def test_public_exports():
    import cvat_sdk
    import cvat_sdk.core

    for name in (
        "AuthStore",
        "ClientAuthParameters",
        "ProfileEntry",
        "configure_client_auth_arguments",
        "get_auth_store_path",
        "make_client_from_cli",
        "make_client_from_profile",
    ):
        assert hasattr(cvat_sdk, name), f"cvat_sdk.{name} missing"
        assert hasattr(cvat_sdk.core, name), f"cvat_sdk.core.{name} missing"
