# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import argparse
import getpass

from cvat_sdk.core.auth import DEFAULT_SERVER, AuthStore, ProfileEntry

from .command_base import CommandGroup
from .common import CriticalError
from .utils import _fetch_name_from_server, _normalize_server, _now_iso

COMMANDS = CommandGroup(description="Manage saved CVAT authentication profiles.")


@COMMANDS.command_class("list")
class ProfileList:
    needs_client = False
    description = "List saved profiles, marking the default one."

    def configure_parser(self, parser: argparse.ArgumentParser) -> None:
        parser.add_argument(
            "--quiet", action="store_true", help="print profile names only (one per line)"
        )

    def execute(self, args: argparse.Namespace) -> None:
        store = AuthStore()
        profiles = store.list_profiles()
        default = store.get_default_profile()
        default_name = default[0] if default is not None else None

        for name in sorted(profiles):
            if args.quiet:
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
            raise CriticalError("Cannot combine a profile name with --unset.")

        if args.unset:
            store.clear_default_profile()
            print("Default profile cleared.")
        elif args.name is not None:
            try:
                store.set_default_profile(args.name)
            except KeyError:
                raise CriticalError(f"Unknown profile {args.name!r}. Run 'cvat-cli profile list'.")
            print(f'Default profile is now "{args.name}".')
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
            raise CriticalError(f"Unknown profile {args.name!r}. Run 'cvat-cli profile list'.")
        print(f'Removed profile "{args.name}".')


@COMMANDS.command_class("create")
class ProfileCreate:
    needs_client = False
    description = (
        "Save a self-contained profile bundling a server and a PAT. "
        "Only an existing PAT can be remembered; this does not create a server-side token."
    )

    def configure_parser(self, parser: argparse.ArgumentParser) -> None:
        parser.add_argument("name", nargs="?", default=None, help="profile name (unique)")
        parser.add_argument("token", nargs="?", default=None, help="PAT (omit to be prompted)")
        parser.add_argument("--set-default", action="store_true", help="mark as default profile")
        parser.add_argument("--force", action="store_true", help="overwrite an existing profile")

    def execute(self, args: argparse.Namespace) -> None:
        store = AuthStore()

        token = args.token if args.token is not None else getpass.getpass("PAT: ")
        if not token:
            raise CriticalError("A non-empty PAT is required.")

        if args.server_host:
            server = args.server_host
            if args.server_port:
                server = f"{server}:{args.server_port}"
        else:
            server = store.get_default_server() or DEFAULT_SERVER
        server = _normalize_server(server)

        name = args.name
        if name is None:
            name = _fetch_name_from_server(server, token, insecure=args.insecure)

        if store.get_profile(name) is not None and not args.force:
            raise CriticalError(f"Profile {name!r} already exists. Pass --force to overwrite.")

        store.add_profile(
            name,
            ProfileEntry(server=server, token=token, created_date=_now_iso()),
            set_default=args.set_default,
        )
        suffix = " (set as default)" if store.get_default_profile()[0] == name else ""
        print(f'Saved profile "{name}" for {server}{suffix}.')
