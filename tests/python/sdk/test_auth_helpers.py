# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from cvat_sdk.core.auth import (
    CVAT_ACCESS_TOKEN_ENV_VAR,
    DEFAULT_SERVER,
    AuthStore,
    ProfileEntry,
    default_auth_factory,
    get_auth_factory,
    resolve_server_host,
)
from cvat_sdk.core.client import AccessTokenCredentials, PasswordCredentials


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
