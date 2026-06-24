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
from cvat_sdk.core.utils import is_posix

DEFAULT_SERVER = "http://localhost:8080"

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

    def _check_secure_permissions(self) -> None:
        if self._path.exists() and not self._path.is_file():
            raise AuthStoreError(f"Auth store path {self._path} must be a file.")

        if not is_posix():
            return

        for p, expected_mode in ((self._path.parent, 0o700), (self._path, 0o600)):
            if not p.exists():
                continue

            mode = stat.S_IMODE(p.stat().st_mode) & 0o777
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
        if is_posix():
            os.chmod(directory, 0o700)

        self._check_secure_permissions()

        payload = json.dumps(doc, indent=2, sort_keys=True)

        fd, tmp_name = tempfile.mkstemp(dir=directory, prefix=".auth.", suffix=".tmp")
        try:
            if is_posix():
                os.fchmod(fd, 0o600)
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                f.write(payload)
            os.replace(tmp_name, self._path)
        except BaseException:
            with contextlib.suppress(OSError):
                os.unlink(tmp_name)
            raise

        if is_posix():
            os.chmod(self._path, 0o600)
