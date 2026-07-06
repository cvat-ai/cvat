# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import argparse

from cvat_sdk.core.auth import AuthStore

from .command_base import CommandGroup
from .common import CriticalError

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
