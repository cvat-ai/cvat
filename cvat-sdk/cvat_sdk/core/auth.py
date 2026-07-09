# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import argparse
import contextlib
import copy
import getpass
import json
import logging
import os
import stat
import tempfile
import textwrap
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


@attrs.define
class ClientAuthParameters:
    """Common CLI/SDK authentication parameters consumed by make_client_from_cli."""

    profile: str | None = None
    auth: Callable[[str], Credentials] | None = None
    server_host: str | None = None
    server_port: int | None = None
    insecure: bool = False
    organization: str | None = None

    @classmethod
    def from_namespace(cls, parsed_args: argparse.Namespace) -> ClientAuthParameters:
        return cls(
            profile=getattr(parsed_args, "profile", None),
            auth=getattr(parsed_args, "auth", None),
            server_host=getattr(parsed_args, "server_host", None),
            server_port=getattr(parsed_args, "server_port", None),
            insecure=getattr(parsed_args, "insecure", False),
            organization=getattr(parsed_args, "organization", None),
        )


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


def configure_client_auth_arguments(parser: argparse.ArgumentParser) -> None:
    """Add the shared CLI/SDK authentication argument set to an argparse parser."""
    parser.add_argument(
        "--insecure",
        action="store_true",
        help="Allows to disable SSL certificate check",
    )
    parser.add_argument(
        "--auth",
        type=get_auth_factory,
        metavar="USER[:PASS]",
        default=None,
        help=textwrap.dedent("""\
            User and password to use for authentication;
            supports the PASS environment variable or a password prompt.
            A Personal Access Token (PAT) can be supplied via the {} environment
            variable, or saved as a profile.
            """).format(CVAT_ACCESS_TOKEN_ENV_VAR),
    )
    parser.add_argument(
        "--server-host",
        type=str,
        default=None,
        help="host (default: the active profile, default_server, or %s)" % DEFAULT_SERVER,
    )
    parser.add_argument(
        "--server-port",
        type=int,
        default=None,
        help="port (default: 80 for http and 443 for https connections)",
    )
    parser.add_argument(
        "--organization",
        "--org",
        metavar="SLUG",
        help="""short name (slug) of the organization
                to use when listing or creating resources;
                set to blank string to use the personal workspace""",
    )
    parser.add_argument(
        "--profile",
        metavar="NAME",
        default=None,
        help="use a saved profile (server + credential); see 'cvat-cli profile list'."
        " Mutually exclusive with --server-host/--server-port/--auth.",
    )


def make_client_from_profile(
    profile: ProfileEntry,
    *,
    logger: logging.Logger | None = None,
    config: Config | None = None,
    check_server_version: bool = False,
) -> Client:
    """Build and authenticate a Client from a saved profile entry."""
    client = Client(
        url=profile.server,
        logger=logger,
        config=config,
        check_server_version=check_server_version,
    )
    client.login(AccessTokenCredentials(profile.token))
    return client


def make_client_from_cli(
    parsed_args: argparse.Namespace | ClientAuthParameters,
    *,
    logger: logging.Logger | None = None,
    config: Config | None = None,
    check_server_version: bool = False,
    store: AuthStore | None = None,
) -> Client:
    """Build and authenticate a Client from parsed CLI-style arguments.

    If config is provided, it is used as the base Client configuration. The
    parsed ``insecure`` flag is then applied on top by setting ``verify_ssl`` to
    false; all other Client options come from keyword arguments.
    """
    store = store or AuthStore()
    params = (
        parsed_args
        if isinstance(parsed_args, ClientAuthParameters)
        else ClientAuthParameters.from_namespace(parsed_args)
    )
    client_config = _make_client_config(params, config)

    if params.profile is not None and (
        params.server_host is not None or params.server_port is not None or params.auth is not None
    ):
        raise AuthStoreError(
            "--profile is mutually exclusive with --server-host/--server-port/--auth."
        )

    env_token = os.getenv(CVAT_ACCESS_TOKEN_ENV_VAR)
    explicit_host = params.server_host is not None or params.server_port is not None
    explicit_cred = params.auth is not None or env_token is not None

    profile = None
    if params.profile is not None:
        profile = _get_profile_or_raise(store, params.profile)
    elif not explicit_host and not explicit_cred:
        default = store.get_default_profile()
        if default is not None:
            profile = default[1]

    if profile is not None:
        return _make_client_from_profile(
            profile,
            logger=logger,
            config=client_config,
            check_server_version=check_server_version,
            organization=params.organization,
        )

    if explicit_host:
        url = (
            params.server_host
            if params.server_host is not None
            else store.get_default_server() or DEFAULT_SERVER
        )
        if params.server_port:
            url = f"{url}:{params.server_port}"
    else:
        url = store.get_default_server() or DEFAULT_SERVER

    client = Client(
        url=url,
        logger=logger,
        config=client_config,
        check_server_version=check_server_version,
    )

    auth_factory = params.auth if params.auth is not None else default_auth_factory()
    client.login(auth_factory(client.api_client.configuration.host))

    if params.organization is not None:
        client.organization_slug = params.organization
    return client


def _make_client_config(params: ClientAuthParameters, config: Config | None) -> Config:
    if config is None:
        return Config(verify_ssl=not params.insecure)

    if params.insecure:
        return attrs.evolve(config, verify_ssl=False)

    return config


def _get_profile_or_raise(store: AuthStore, name: str) -> ProfileEntry:
    profile = store.get_profile(name)
    if profile is None:
        raise AuthStoreError(f"Unknown profile {name!r}.")
    return profile


def _make_client_from_profile(
    profile: ProfileEntry,
    *,
    logger: logging.Logger | None,
    config: Config,
    check_server_version: bool,
    organization: str | None,
) -> Client:
    client = make_client_from_profile(
        profile,
        logger=logger,
        config=config,
        check_server_version=check_server_version,
    )
    if organization is not None:
        client.organization_slug = organization
    return client


class AuthStore:
    """Reads/writes the persistent auth.json config file, enforcing 0600/0700 permissions."""

    def __init__(self, path: Path | None = None):
        self._path = Path(path) if path is not None else get_auth_store_path()
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

    def _load_for_update(self) -> dict:
        return copy.deepcopy(self._load())

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
        # TODO: revisit AuthStore API before it grows further — no in-place updates,
        # N-writes per N-mutations; consider batch() context manager vs dict+save().
        # For context see: https://github.com/cvat-ai/cvat/pull/10819
        doc = self._load()
        return {name: self._to_entry(raw) for name, raw in doc["profiles"].items()}

    def get_profile(self, name: str) -> ProfileEntry | None:
        raw = self._load()["profiles"].get(name)
        return self._to_entry(raw) if raw is not None else None

    def put_profile(self, name: str, entry: ProfileEntry, *, set_default: bool = False) -> None:
        doc = self._load_for_update()
        is_first_profile = not doc["profiles"]
        doc["profiles"][name] = {
            "server": entry.server,
            "token": entry.token,
            "created_date": entry.created_date,
        }
        if set_default or is_first_profile:
            doc["default_profile"] = name
        self._save(doc)

    def remove_profile(self, name: str) -> None:
        doc = self._load_for_update()
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
        doc = self._load_for_update()
        if name not in doc["profiles"]:
            raise KeyError(name)
        doc["default_profile"] = name
        self._save(doc)

    def clear_default_profile(self) -> None:
        doc = self._load_for_update()
        doc.pop("default_profile", None)
        self._save(doc)

    def get_default_server(self) -> str | None:
        return self._load().get("default_server")

    def set_default_server(self, server: str) -> None:
        doc = self._load_for_update()
        doc["default_server"] = server
        self._save(doc)

    def clear_default_server(self) -> None:
        doc = self._load_for_update()
        doc.pop("default_server", None)
        self._save(doc)
