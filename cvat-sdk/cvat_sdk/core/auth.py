# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import argparse
import contextlib
import getpass
import json
import logging
import os
import stat
import tempfile
from collections.abc import Callable
from pathlib import Path

import attrs
import platformdirs

from cvat_sdk.core.client import (
    AccessTokenCredentials,
    Client,
    Config,
    Credentials,
    PasswordCredentials,
)
from cvat_sdk.core.exceptions import AuthStoreError
from cvat_sdk.core.utils import is_posix

CVAT_ACCESS_TOKEN_ENV_VAR = "CVAT_ACCESS_TOKEN"  # nosec - a variable name declaration
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


def get_auth_factory(s: str) -> Callable[[str], Credentials]:
    """
    Parse a USER[:PASS] string and return a callable that takes the server URL
    and returns auth credentials for that URL.
    The callable will prompt the user for the password if none was initially supplied in the
    input string and in the PASS env variable.
    """

    user, _, password = s.partition(":")
    if not password:
        password = os.environ.get("PASS")

    if password:
        return lambda _: PasswordCredentials(user, password)
    else:
        return lambda url: PasswordCredentials(
            user, getpass.getpass(f"Password for {user} at {url}: ")
        )


def default_auth_factory() -> Callable[[str], Credentials]:
    """
    Try to read the CVAT_ACCESS_TOKEN environment variable for a Personal Access Token (PAT).
    If there is no value, try using the current user and asking for the password.
    """

    token = os.getenv(CVAT_ACCESS_TOKEN_ENV_VAR)
    if token is not None:
        return lambda _: AccessTokenCredentials(token)

    return get_auth_factory(getpass.getuser())


def resolve_server_host(cli_value: str | None, store: AuthStore) -> str:
    """Resolve a server host from CLI input, saved defaults, or the built-in fallback."""
    if cli_value:
        return cli_value

    default = store.get_default_profile()
    if default is not None:
        return default[1].server

    return store.get_default_server() or DEFAULT_SERVER


def make_client_from_profile(name: str | None = None, *, store: AuthStore | None = None) -> Client:
    """Build and authenticate a Client from a saved profile."""
    store = store or AuthStore()

    if name is None:
        default = store.get_default_profile()
        if default is None:
            raise AuthStoreError(
                "No default profile is set. Run 'cvat-cli profile default <name>' "
                "or pass an explicit profile name."
            )
        name, entry = default
    else:
        entry = store.get_profile(name)
        if entry is None:
            raise AuthStoreError(
                f"Unknown profile {name!r}. Run 'cvat-cli profile list' to see saved profiles."
            )

    client = Client(url=entry.server, check_server_version=False)
    client.login(AccessTokenCredentials(entry.token))
    return client


def make_client_from_cli(
    parsed_args: argparse.Namespace,
    *,
    logger: logging.Logger | None = None,
    store: AuthStore | None = None,
) -> Client:
    """Build and authenticate a Client from parsed CLI-style arguments."""
    store = store or AuthStore()

    profile = getattr(parsed_args, "profile", None)
    auth = getattr(parsed_args, "auth", None)
    server_host = getattr(parsed_args, "server_host", None)
    server_port = getattr(parsed_args, "server_port", None)
    insecure = getattr(parsed_args, "insecure", False)
    organization = getattr(parsed_args, "organization", None)

    if profile is not None and (
        server_host is not None or server_port is not None or auth is not None
    if profile is not None and any(v is not None for v in (server_host, server_port, auth)):
        raise AuthStoreError(
            "--profile is mutually exclusive with --server-host/--server-port/--auth."
        )

    if profile is not None:
        client = make_client_from_profile(profile, store=store)
        if organization is not None:
            client.organization_slug = organization
        return client

    env_token = os.getenv(CVAT_ACCESS_TOKEN_ENV_VAR)
    explicit_host = server_host is not None or server_port is not None
    explicit_cred = auth is not None or env_token is not None

    if not explicit_host and not explicit_cred:
        default = store.get_default_profile()
        if default is not None:
            client = make_client_from_profile(default[0], store=store)
            if organization is not None:
                client.organization_slug = organization
            return client

    if explicit_host:
        url = (
            server_host if server_host is not None else store.get_default_server() or DEFAULT_SERVER
        )
        if server_port:
            url = f"{url}:{server_port}"
    else:
        url = store.get_default_server() or DEFAULT_SERVER

    config = Config(verify_ssl=not insecure)
    client = Client(url=url, logger=logger, config=config, check_server_version=False)

    auth_factory = auth if auth is not None else default_auth_factory()
    client.login(auth_factory(client.api_client.configuration.host))

    if organization is not None:
        client.organization_slug = organization
    return client


class AuthStore:
    """Reads/writes the persistent auth.json config file, enforcing 0600/0700 permissions."""

    def __init__(
        self,
        path: Path | None = None,
        *,
        config_file_path: Path | None = None,
    ) -> None:
        if path is not None and config_file_path is not None:
            raise TypeError("'path' and 'config_file_path' cannot be used together")

        store_path = path if path is not None else config_file_path
        self._path = Path(store_path) if store_path is not None else get_auth_store_path()
        self._doc: dict | None = None

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
        if self._doc is not None:
            return self._doc

        if not self._path.exists():
            self._doc = {"version": _STORE_VERSION, "profiles": {}}
            return self._doc

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
        self._doc = doc
        return self._doc

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

        self._doc = doc

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
