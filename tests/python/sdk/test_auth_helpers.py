# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import argparse

import pytest
from cvat_sdk.core.auth import (
    CVAT_ACCESS_TOKEN_ENV_VAR,
    DEFAULT_SERVER,
    AuthStore,
    AuthStoreError,
    ProfileEntry,
    default_auth_factory,
    get_auth_factory,
    make_client_from_cli,
    make_client_from_profile,
    resolve_server_host,
)
from cvat_sdk.core.client import AccessTokenCredentials, PasswordCredentials


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
            {"configuration": type("Config", (), {"host": "https://stub"})()},
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
    cred = get_auth_factory("alice:secret")("https://app.cvat.ai")
    assert isinstance(cred, PasswordCredentials)
    assert cred.user == "alice"
    assert cred.password == "secret"


def test_default_auth_factory_reads_env_token(monkeypatch):
    monkeypatch.setenv(CVAT_ACCESS_TOKEN_ENV_VAR, "pat-123")
    cred = default_auth_factory()("https://app.cvat.ai")
    assert isinstance(cred, AccessTokenCredentials)
    assert cred.token == "pat-123"


def test_resolve_server_host_prefers_explicit(tmp_path):
    store = AuthStore(path=tmp_path / "auth.json")
    assert resolve_server_host("https://explicit", store) == "https://explicit"


def test_resolve_server_host_falls_back_to_default_server(tmp_path):
    store = AuthStore(path=tmp_path / "auth.json")
    store.set_default_server("https://staging.example.com")
    assert resolve_server_host(None, store) == "https://staging.example.com"


def test_resolve_server_host_builtin_default(tmp_path):
    store = AuthStore(path=tmp_path / "auth.json")
    assert resolve_server_host(None, store) == DEFAULT_SERVER


def test_resolve_server_host_uses_default_profile_server(tmp_path):
    store = AuthStore(path=tmp_path / "auth.json")
    store.add_profile(
        "p",
        ProfileEntry(server="https://prof", token="t", created_date="2026-01-01T00:00:00+00:00"),
        set_default=True,
    )
    assert resolve_server_host(None, store) == "https://prof"


def test_make_client_from_profile_uses_named_profile(tmp_path, monkeypatch):
    from cvat_sdk.core import auth as auth_mod

    store = AuthStore(path=tmp_path / "auth.json")
    store.add_profile(
        "mycvat",
        ProfileEntry(
            server="https://app.cvat.ai", token="pat-9", created_date="2026-01-01T00:00:00+00:00"
        ),
    )
    monkeypatch.setattr(auth_mod, "Client", _FakeClient)

    client = make_client_from_profile("mycvat", store=store)
    assert client.url == "https://app.cvat.ai"
    assert client.logged_in_with.token == "pat-9"


def test_make_client_from_profile_uses_default_profile(tmp_path, monkeypatch):
    from cvat_sdk.core import auth as auth_mod

    store = AuthStore(path=tmp_path / "auth.json")
    store.add_profile(
        "mycvat",
        ProfileEntry(
            server="https://app.cvat.ai", token="pat-9", created_date="2026-01-01T00:00:00+00:00"
        ),
        set_default=True,
    )
    monkeypatch.setattr(auth_mod, "Client", _FakeClient)

    client = make_client_from_profile(store=store)
    assert client.url == "https://app.cvat.ai"
    assert client.logged_in_with.token == "pat-9"


def test_make_client_from_profile_unknown_name_raises(tmp_path):
    store = AuthStore(path=tmp_path / "auth.json")
    with pytest.raises(AuthStoreError, match="profile"):
        make_client_from_profile("ghost", store=store)


def test_make_client_from_profile_no_default_raises(tmp_path):
    store = AuthStore(path=tmp_path / "auth.json")
    with pytest.raises(AuthStoreError, match="default profile"):
        make_client_from_profile(store=store)


def test_make_client_from_cli_profile_path(tmp_path, monkeypatch):
    from cvat_sdk.core import auth as auth_mod

    store = AuthStore(path=tmp_path / "auth.json")
    store.add_profile(
        "p",
        ProfileEntry(server="https://prof", token="pat", created_date="2026-01-01T00:00:00+00:00"),
    )
    monkeypatch.setattr(auth_mod, "Client", _FakeClient)
    client = make_client_from_cli(_ns(profile="p"), store=store)
    assert client.url == "https://prof"
    assert client.logged_in_with.token == "pat"


def test_make_client_from_cli_profile_conflicts(tmp_path):
    store = AuthStore(path=tmp_path / "auth.json")
    with pytest.raises(AuthStoreError, match="mutually exclusive"):
        make_client_from_cli(_ns(profile="p", server_host="https://x"), store=store)
    with pytest.raises(AuthStoreError, match="mutually exclusive"):
        make_client_from_cli(_ns(profile="p", auth=get_auth_factory("u:p")), store=store)


def test_make_client_from_cli_zero_flag_uses_default_profile(tmp_path, monkeypatch):
    from cvat_sdk.core import auth as auth_mod

    store = AuthStore(path=tmp_path / "auth.json")
    store.add_profile(
        "p",
        ProfileEntry(server="https://prof", token="dpat", created_date="2026-01-01T00:00:00+00:00"),
        set_default=True,
    )
    monkeypatch.setattr(auth_mod, "Client", _FakeClient)
    monkeypatch.delenv(CVAT_ACCESS_TOKEN_ENV_VAR, raising=False)
    client = make_client_from_cli(_ns(), store=store)
    assert client.url == "https://prof"
    assert client.logged_in_with.token == "dpat"


def test_make_client_from_cli_explicit_host_does_not_borrow_profile_token(tmp_path, monkeypatch):
    from cvat_sdk.core import auth as auth_mod

    store = AuthStore(path=tmp_path / "auth.json")
    store.add_profile(
        "p",
        ProfileEntry(server="https://prof", token="dpat", created_date="2026-01-01T00:00:00+00:00"),
        set_default=True,
    )
    monkeypatch.setattr(auth_mod, "Client", _FakeClient)
    monkeypatch.setenv(CVAT_ACCESS_TOKEN_ENV_VAR, "env-tok")
    client = make_client_from_cli(_ns(server_host="https://explicit"), store=store)
    assert client.url == "https://explicit"
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
        "ProfileEntry",
        "get_auth_store_path",
        "make_client_from_cli",
        "make_client_from_profile",
        "resolve_server_host",
    ):
        assert hasattr(cvat_sdk, name), f"cvat_sdk.{name} missing"
        assert hasattr(cvat_sdk.core, name), f"cvat_sdk.core.{name} missing"
