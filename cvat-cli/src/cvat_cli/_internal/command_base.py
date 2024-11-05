# Copyright (C) 2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import argparse
import types
from collections.abc import Mapping
from typing import Callable, Protocol


class Command(Protocol):
    @property
    def description(self) -> str: ...

    def configure_parser(self, parser: argparse.ArgumentParser) -> None: ...

    # The exact parameters accepted by `execute` vary between commands,
    # so we're forced to declare it like this instead of as a method.
    @property
    def execute(self) -> Callable[..., None]: ...


class CommandGroup:
    def __init__(self, *, description: str) -> None:
        self._commands: dict[str, Command] = {}
        self.description = description

    def command_class(self, name: str):
        def decorator(cls: type):
            self._commands[name] = cls()
            return cls

        return decorator

    def add_command(self, name: str, command: Command) -> None:
        self._commands[name] = command

    @property
    def commands(self) -> Mapping[str, Command]:
        return types.MappingProxyType(self._commands)

    def configure_parser(self, parser: argparse.ArgumentParser) -> None:
        subparsers = parser.add_subparsers(required=True)

        for name, command in self._commands.items():
            subparser = subparsers.add_parser(name, description=command.description)
            subparser.set_defaults(_executor=command.execute)
            command.configure_parser(subparser)

    def execute(self) -> None:
        # It should be impossible for a command group to be executed,
        # because configure_parser requires that a subcommand is specified.
        assert False, "unreachable code"
