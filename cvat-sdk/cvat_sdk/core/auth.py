# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import contextlib
import json
import os
import stat
import tempfile
from pathlib import Path

import attrs
import platformdirs

from cvat_sdk.core.exceptions import AuthStoreError

DEFAULT_SERVER = "https://app.cvat.ai"

_APP_NAME = "cvat-sdk"
_APP_AUTHOR = "CVAT.ai"
_STORE_VERSION = 1


@attrs.frozen
class ProfileEntry:
    """A self-contained saved profile: a server host bundled with a PAT."""

    server: str
    """Normalized scheme://host[:port]."""

    token: str
    """A Personal Access Token (PAT)."""

    created_date: str
    """ISO-8601 UTC timestamp of when the profile was saved."""


def get_auth_store_path() -> Path:
    """Return the path to the persistent auth.json store."""
    return platformdirs.user_config_path(_APP_NAME, _APP_AUTHOR) / "auth.json"


class AuthStore:
    """Reads/writes the persistent auth.json config file, enforcing 0600/0700 permissions."""

    def __init__(self, config_file_path: Path | None = None) -> None:
        self._path = (
            Path(config_file_path) if config_file_path is not None else get_auth_store_path()
        )

    @property
    def path(self) -> Path:
        return self._path

    @staticmethod
    def _is_windows() -> bool:
        return os.name == "nt"

    def _check_secure_permissions(self) -> None:
        if self._path.exists() and not self._path.is_file():
            raise AuthStoreError(f"Auth store path {self._path} must be a file.")

        if self._is_windows():
            return

        for p, expected_mode in ((self._path.parent, 0o700), (self._path, 0o600)):
            if not p.exists():
                continue

            mode = stat.S_IMODE(p.stat().st_mode)
            if mode != expected_mode:
                raise AuthStoreError(
                    f"Refusing to use {self._path}: '{p}' has permissions {oct(mode)}; "
                    f"expected {oct(expected_mode)}. Run: chmod {oct(expected_mode)[2:]} '{p}'"
                )

    def _load(self) -> dict:
        if not self._path.exists():
            return {"version": _STORE_VERSION, "profiles": {}}

        self._check_secure_permissions()

        try:
            doc = json.loads(self._path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError) as e:
            raise AuthStoreError(f"Cannot read auth store {self._path}: {e}") from e

        if not isinstance(doc, dict) or "version" not in doc:
            raise AuthStoreError(f"Auth store {self._path} is corrupt (missing 'version').")
        if doc["version"] != _STORE_VERSION:
            raise AuthStoreError(
                f"Auth store {self._path} has unsupported version {doc['version']!r}; "
                f"this client supports version {_STORE_VERSION}. Please upgrade cvat-sdk."
            )

        doc.setdefault("profiles", {})
        return doc

    def _save(self, doc: dict) -> None:
        directory = self._path.parent
        directory.mkdir(parents=True, exist_ok=True)
        if not self._is_windows():
            os.chmod(directory, 0o700)

        self._check_secure_permissions()

        payload = json.dumps(doc, indent=2, sort_keys=True)

        fd, tmp_name = tempfile.mkstemp(dir=directory, prefix=".auth.", suffix=".tmp")
        try:
            if not self._is_windows():
                os.fchmod(fd, 0o600)
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                f.write(payload)
            os.replace(tmp_name, self._path)
        except BaseException:
            with contextlib.suppress(OSError):
                os.unlink(tmp_name)
            raise

        if not self._is_windows():
            os.chmod(self._path, 0o600)

    @staticmethod
    def _to_entry(raw: dict) -> ProfileEntry:
        return ProfileEntry(
            server=raw["server"], token=raw["token"], created_date=raw.get("created_date", "")
        )

    def list_profiles(self) -> dict[str, ProfileEntry]:
        doc = self._load()
        return {name: self._to_entry(raw) for name, raw in doc["profiles"].items()}

    def get_profile(self, name: str) -> ProfileEntry | None:
        raw = self._load()["profiles"].get(name)
        return self._to_entry(raw) if raw is not None else None

    def add_profile(self, name: str, entry: ProfileEntry, *, set_default: bool = False) -> None:
        doc = self._load()
        doc["profiles"][name] = {
            "server": entry.server,
            "token": entry.token,
            "created_date": entry.created_date,
        }
        if set_default or "default_profile" not in doc:
            doc["default_profile"] = name
        self._save(doc)

    def remove_profile(self, name: str) -> None:
        doc = self._load()
        del doc["profiles"][name]  # raises KeyError if absent
        if doc.get("default_profile") == name:
            doc.pop("default_profile", None)
        self._save(doc)

    def get_default_profile(self) -> tuple[str, ProfileEntry] | None:
        doc = self._load()
        name = doc.get("default_profile")
        if name is None or name not in doc["profiles"]:
            return None
        return name, self._to_entry(doc["profiles"][name])

    def set_default_profile(self, name: str) -> None:
        doc = self._load()
        if name not in doc["profiles"]:
            raise KeyError(name)
        doc["default_profile"] = name
        self._save(doc)

    def clear_default_profile(self) -> None:
        doc = self._load()
        doc.pop("default_profile", None)
        self._save(doc)

    def get_default_server(self) -> str | None:
        return self._load().get("default_server")

    def set_default_server(self, server: str) -> None:
        doc = self._load()
        doc["default_server"] = server
        self._save(doc)

    def clear_default_server(self) -> None:
        doc = self._load()
        doc.pop("default_server", None)
        self._save(doc)
