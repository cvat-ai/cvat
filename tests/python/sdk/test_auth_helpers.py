# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import pytest

from cvat_sdk.core.auth import (
    CVAT_ACCESS_TOKEN_ENV_VAR,
    DEFAULT_SERVER,
    AuthStore,
    AuthStoreError,
    ProfileEntry,
    default_auth_factory,
    get_auth_factory,
    make_client_from_profile,
    resolve_server_host,
)
from cvat_sdk.core.client import AccessTokenCredentials, PasswordCredentials


class _FakeClient:
    def __init__(self, url, **kwargs):
        self.url = url
        self.logged_in_with = None
        self.organization_slug = None

    def login(self, credentials):
        self.logged_in_with = credentials


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
