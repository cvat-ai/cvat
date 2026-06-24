# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
import os
import sys
from pathlib import Path

import platformdirs
import pytest
from cvat_sdk.core.auth import (
    DEFAULT_SERVER,
    AuthStore,
    AuthStoreError,
    ProfileEntry,
    get_auth_store_path,
)


def test_profile_entry_holds_fields():
    entry = ProfileEntry(
        server="https://app.cvat.ai", token="tok", created_date="2026-01-01T00:00:00+00:00"
    )
    assert entry.server == "https://app.cvat.ai"
    assert entry.token == "tok"
    assert entry.created_date == "2026-01-01T00:00:00+00:00"


def test_default_server_is_app_cvat_ai():
    assert DEFAULT_SERVER == "https://app.cvat.ai"


def test_auth_store_path_matches_platformdirs():
    expected = platformdirs.user_config_path("cvat-sdk", "CVAT.ai") / "auth.json"
    assert get_auth_store_path() == expected
    assert isinstance(get_auth_store_path(), Path)


def _store(tmp_path) -> AuthStore:
    return AuthStore(config_file_path=tmp_path / "cvat" / "auth.json")


def test_load_returns_empty_doc_when_file_absent(tmp_path):
    doc = _store(tmp_path)._load()
    assert doc == {"version": 1, "profiles": {}}


def test_save_then_load_roundtrips(tmp_path):
    store = _store(tmp_path)
    store._save({"version": 1, "profiles": {"a": {"server": "https://x", "token": "t"}}})
    assert store._load()["profiles"]["a"]["token"] == "t"


@pytest.mark.skipif(sys.platform == "win32", reason="POSIX permission semantics")
def test_save_creates_0600_file_in_0700_dir(tmp_path):
    store = _store(tmp_path)
    store._save({"version": 1, "profiles": {}})
    path = tmp_path / "cvat" / "auth.json"
    assert (path.stat().st_mode & 0o777) == 0o600
    assert (path.parent.stat().st_mode & 0o777) == 0o700


@pytest.mark.skipif(sys.platform == "win32", reason="POSIX permission semantics")
def test_load_refuses_world_readable_file(tmp_path):
    store = _store(tmp_path)
    store._save({"version": 1, "profiles": {}})
    path = tmp_path / "cvat" / "auth.json"
    os.chmod(path, 0o644)
    with pytest.raises(AuthStoreError, match="permission"):
        store._load()


@pytest.mark.skipif(sys.platform == "win32", reason="POSIX permission semantics")
def test_load_refuses_file_with_special_permission_bits(tmp_path):
    store = _store(tmp_path)
    store._save({"version": 1, "profiles": {}})
    path = tmp_path / "cvat" / "auth.json"
    os.chmod(path, 0o1600)
    with pytest.raises(AuthStoreError, match="expected 0o600"):
        store._load()


def test_load_rejects_directory_config_file_path(tmp_path):
    path = tmp_path / "cvat" / "auth.json"
    path.mkdir(parents=True)
    if sys.platform != "win32":
        os.chmod(path.parent, 0o700)
        os.chmod(path, 0o700)
    with pytest.raises(AuthStoreError, match="must be a file"):
        _store(tmp_path)._load()


def test_load_rejects_unknown_version(tmp_path):
    path = tmp_path / "cvat" / "auth.json"
    path.parent.mkdir(parents=True)
    path.write_text(json.dumps({"version": 999, "profiles": {}}))
    if sys.platform != "win32":
        os.chmod(path.parent, 0o700)
        os.chmod(path, 0o600)
    with pytest.raises(AuthStoreError, match="version"):
        _store(tmp_path)._load()


def test_load_rejects_corrupt_json(tmp_path):
    path = tmp_path / "cvat" / "auth.json"
    path.parent.mkdir(parents=True)
    path.write_text("{not json")
    if sys.platform != "win32":
        os.chmod(path.parent, 0o700)
        os.chmod(path, 0o600)
    with pytest.raises(AuthStoreError):
        _store(tmp_path)._load()
