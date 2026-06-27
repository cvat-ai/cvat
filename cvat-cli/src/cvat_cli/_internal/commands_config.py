# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import argparse

from cvat_sdk.core.auth import AuthStore

from .command_base import CommandGroup
from .common import CriticalError

COMMANDS = CommandGroup(description="Manage local (non-auth) CVAT CLI settings.")


@COMMANDS.command_class("default-server")
class ConfigDefaultServer:
    needs_client = False
    description = (
        "Print, set, or unset the default server used by the non-profile "
        "credential paths (--auth, CVAT_ACCESS_TOKEN, prompt)."
    )

    def configure_parser(self, parser: argparse.ArgumentParser) -> None:
        parser.add_argument("server", nargs="?", default=None, help="server URL to remember")
        parser.add_argument("--unset", action="store_true", help="clear the saved default server")

    def execute(self, args: argparse.Namespace) -> None:
        store = AuthStore()

        if args.unset and args.server is not None:
            raise CriticalError("Cannot combine a server value with --unset.")

        if args.unset:
            store.clear_default_server()
            print("Default server cleared.")
        elif args.server is not None:
            store.set_default_server(args.server)
            print(f"Default server is now {args.server!r}.")
        else:
            current = store.get_default_server()
            print(current if current is not None else "(no default server set)")
