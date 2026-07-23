# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import argparse
import getpass
from pathlib import Path
from urllib.parse import urlsplit

from cvat_sdk.core.auth import DEFAULT_SERVER, AuthStore, ProfileEntry
from cvat_sdk.core.client import AccessTokenCredentials, Client, Config
from cvat_sdk.core.utils import normalize_server_url

from .command_base import CommandGroup
from .common import CriticalError
from .utils import fetch_current_access_token_name, get_current_time_iso, read_token_file

COMMANDS = CommandGroup(description="Manage saved CVAT authentication profiles.")


@COMMANDS.command_class("list")
class ProfileList:
    needs_client = False
    description = "List saved profiles, marking the default one."

    def configure_parser(self, parser: argparse.ArgumentParser) -> None:
        parser.add_argument(
            "--names-only", action="store_true", help="print profile names only (one per line)"
        )

    def execute(self, args: argparse.Namespace) -> None:
        store = AuthStore()
        profiles = store.list_profiles()
        default = store.get_default_profile()
        default_name = default[0] if default is not None else None

        for name in sorted(profiles):
            if args.names_only:
                print(name)
            else:
                marker = "(default)" if name == default_name else ""
                print(f"{name}\t{profiles[name].server}\t{marker}".rstrip())


@COMMANDS.command_class("default")
class ProfileDefault:
    needs_client = False
    description = "Print, set, or unset the default profile."

    def configure_parser(self, parser: argparse.ArgumentParser) -> None:
        parser.add_argument("name", nargs="?", default=None, help="profile to make default")
        parser.add_argument("--unset", action="store_true", help="clear the default profile")

    def execute(self, args: argparse.Namespace) -> None:
        store = AuthStore()

        if args.unset and args.name is not None:
            raise CriticalError("Cannot combine a profile name with '--unset'.")

        if args.unset:
            store.clear_default_profile()
            print("Default profile cleared.")
        elif args.name is not None:
            try:
                store.set_default_profile(args.name)
            except KeyError:
                raise CriticalError(f"Unknown profile '{args.name}'. Run 'cvat-cli profile list'.")
            print(f"Default profile is now '{args.name}'.")
        else:
            default = store.get_default_profile()
            if default is None:
                raise CriticalError("No default profile is set.")
            print(default[0])


@COMMANDS.command_class("delete")
class ProfileDelete:
    needs_client = False
    description = (
        "Remove a saved profile. Does not revoke the server-side token. "
        "If it was the default, the default becomes unset."
    )

    def configure_parser(self, parser: argparse.ArgumentParser) -> None:
        parser.add_argument("name", help="profile to remove")

    def execute(self, args: argparse.Namespace) -> None:
        store = AuthStore()
        try:
            store.remove_profile(args.name)
        except KeyError:
            raise CriticalError(f"Unknown profile '{args.name}'. Run 'cvat-cli profile list'.")
        print(f"Removed profile '{args.name}'.")


@COMMANDS.command_class("create")
class ProfileCreate:
    needs_client = False
    description = (
        "Save a Personal Access Token (PAT) and the server info into a local profile. "
        "A PAT must be created on the server manually first. "
        "Read more: https://docs.cvat.ai/docs/api_sdk/access_tokens/"
    )

    def configure_parser(self, parser: argparse.ArgumentParser) -> None:
        parser.add_argument("--name", default=None, help="profile name (unique)")
        parser.add_argument("token", nargs="?", default=None, help="PAT (omit to be prompted)")
        parser.add_argument("--set-default", action="store_true", help="mark as default profile")
        parser.add_argument("--force", action="store_true", help="overwrite an existing profile")
        parser.add_argument(
            "--file",
            type=Path,
            default=None,
            help="read the PAT from a file (plain token or JSON envelope)",
        )

    def execute(self, args: argparse.Namespace) -> None:
        store = AuthStore()

        envelope_server = envelope_name = None
        if args.file is not None:
            if args.token is not None:
                raise CriticalError("Cannot combine a PAT argument with '--file'.")
            try:
                token, envelope_server, envelope_name = read_token_file(args.file)
            except (OSError, UnicodeError, ValueError) as e:
                raise CriticalError(f"Cannot read token file '{args.file}': {e}") from e
        elif args.token is not None:
            token = args.token
        else:
            token = getpass.getpass("Personal Access Token (PAT): ")
        if not token:
            raise CriticalError("A non-empty PAT is required.")

        server = (
            args.server_host or envelope_server or store.get_default_server() or DEFAULT_SERVER
        ).rstrip("/")
        if args.server_port:
            parsed_url = urlsplit(("https://" if "://" not in server else "") + server)
            if parsed_url.port:
                raise CriticalError(
                    "A server URL with a port and '--server-port' cannot be used together. "
                    "Please specify only one port."
                )
            server = f"{server}:{args.server_port}"
        server = normalize_server_url(server)

        name = args.name or envelope_name
        if name is None:
            with Client(
                url=server, config=Config(verify_ssl=not args.insecure), check_server_version=False
            ) as client:
                client.login(AccessTokenCredentials(token))
                name = fetch_current_access_token_name(client)

        if store.get_profile(name) is not None and not args.force:
            raise CriticalError(f"Profile '{name}' already exists. Pass '--force' to overwrite.")

        store.put_profile(
            name,
            ProfileEntry(server=server, token=token, created_date=get_current_time_iso()),
            set_default=args.set_default,
        )
        suffix = " (set as default)" if store.get_default_profile()[0] == name else ""
        print(f"Saved profile '{name}' for {server}{suffix}.")
