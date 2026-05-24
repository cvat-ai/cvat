# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import argparse
import json
import os
import textwrap
import types
from abc import ABCMeta, abstractmethod
from collections.abc import Callable, Mapping, Sequence
from typing import Protocol

from attr.converters import to_bool
from cvat_sdk import Client
from cvat_sdk.core.helpers import DeferredTqdmProgressReporter
from cvat_sdk.core.proxies.types import Location


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


class DeprecatedAlias:
    def __init__(self, command: Command, replacement: str) -> None:
        self._command = command
        self._replacement = replacement

    @property
    def description(self) -> str:
        return textwrap.dedent(f"""\
            {self._command.description}
            (Deprecated; use "{self._replacement}" instead.)
            """)

    def configure_parser(self, parser: argparse.ArgumentParser) -> None:
        self._command.configure_parser(parser)

    def execute(self, client: Client, **kwargs) -> None:
        client.logger.warning('This command is deprecated. Use "%s" instead.', self._replacement)
        self._command.execute(client, **kwargs)


class GenericCommand(metaclass=ABCMeta):
    @abstractmethod
    def repo(self, client: Client): ...

    @property
    @abstractmethod
    def resource_type_str(self) -> str: ...


class GenericListCommand(GenericCommand):
    @property
    def description(self) -> str:
        return f"List all CVAT {self.resource_type_str}s in either basic or JSON format."

    def configure_parser(self, parser: argparse.ArgumentParser) -> None:
        parser.add_argument(
            "--json",
            dest="use_json_output",
            default=False,
            action="store_true",
            help="output JSON data",
        )

    def execute(self, client: Client, *, use_json_output: bool = False):
        results = self.repo(client).list(return_json=use_json_output)
        if use_json_output:
            print(json.dumps(json.loads(results), indent=2))
        else:
            for r in results:
                print(r.id)


class GenericDeleteCommand(GenericCommand):
    @property
    def description(self):
        return f"Delete a list of {self.resource_type_str}s, ignoring those which don't exist."

    def configure_parser(self, parser: argparse.ArgumentParser) -> None:
        parser.add_argument(
            "ids", type=int, help=f"list of {self.resource_type_str} IDs", nargs="+"
        )

    def execute(self, client: Client, *, ids: Sequence[int]) -> None:
        self.repo(client).remove_by_ids(ids)


class GenericDownloadBackupCommand(GenericCommand):
    @property
    def description(self) -> str:
        return f"Download a {self.resource_type_str} backup."

    def configure_parser(self, parser: argparse.ArgumentParser) -> None:
        parser.add_argument(
            "resource_id",
            metavar=f"{self.resource_type_str}_id",
            type=int,
            help=f"{self.resource_type_str} ID",
        )
        parser.add_argument(
            "filename",
            type=str,
            nargs="?",
            default="",
            help="output file or directory (default: current directory)",
        )
        parser.add_argument(
            "--completion_verification_period",
            dest="status_check_period",
            default=2,
            type=float,
            help="time interval between checks if archive building has been finished, in seconds",
        )

    def execute(
        self, client: Client, *, resource_id: int, filename: str, status_check_period: float
    ) -> None:
        if not filename:
            filename = os.getcwd()

        if filename.endswith((os.sep, os.altsep or os.sep)):
            os.makedirs(filename, exist_ok=True)

        self.repo(client).retrieve(obj_id=resource_id).download_backup(
            filename=filename,
            status_check_period=status_check_period,
            pbar=DeferredTqdmProgressReporter(),
            location=Location.LOCAL,
        )


class GenericCreateFromBackupCommand(GenericCommand):
    @property
    def description(self) -> str:
        return f"Create a {self.resource_type_str} from a backup file."

    def configure_parser(self, parser: argparse.ArgumentParser) -> None:
        parser.add_argument("filename", type=str, help="upload file")
        parser.add_argument(
            "--completion_verification_period",
            dest="status_check_period",
            default=2,
            type=float,
            help="time interval between checks if archive processing was finished, in seconds",
        )

    def execute(self, client: Client, *, filename: str, status_check_period: float) -> None:
        resource = self.repo(client).create_from_backup(
            filename=filename,
            status_check_period=status_check_period,
            pbar=DeferredTqdmProgressReporter(),
        )
        print(resource.id)


class GenericExportDatasetCommand(GenericCommand):
    @property
    def description(self) -> str:
        return textwrap.dedent(f"""\
            Export a {self.resource_type_str} as a dataset in the specified format
            (e.g. 'YOLO 1.1').
            """)

    def configure_parser(self, parser: argparse.ArgumentParser) -> None:
        parser.add_argument(
            "resource_id",
            metavar=f"{self.resource_type_str}_id",
            type=int,
            help=f"{self.resource_type_str} ID",
        )
        parser.add_argument(
            "filename",
            type=str,
            nargs="?",
            default="",
            help="output file or directory (default: current directory)",
        )
        parser.add_argument(
            "--format",
            dest="fileformat",
            type=str,
            default="CVAT for images 1.1",
            help="annotation format (default: %(default)s)",
        )
        parser.add_argument(
            "--completion_verification_period",
            dest="status_check_period",
            default=2,
            type=float,
            help="number of seconds to wait until checking if dataset building finished",
        )
        parser.add_argument(
            "--with-images",
            type=to_bool,
            default=False,
            dest="include_images",
            help="Whether to include images or not (default: %(default)s)",
        )

    def execute(
        self,
        client: Client,
        *,
        fileformat: str,
        filename: str,
        status_check_period: int,
        include_images: bool,
        resource_id: int,
    ) -> None:
        if not filename:
            filename = os.getcwd()

        if filename.endswith((os.sep, os.altsep or os.sep)):
            os.makedirs(filename, exist_ok=True)

        self.repo(client).retrieve(obj_id=resource_id).export_dataset(
            format_name=fileformat,
            filename=filename,
            pbar=DeferredTqdmProgressReporter(),
            status_check_period=status_check_period,
            include_images=include_images,
            location=Location.LOCAL,
        )


class GenericImportDatasetCommand(GenericCommand):
    import_method_name = "import_dataset"

    def configure_parser(self, parser: argparse.ArgumentParser) -> None:
        parser.add_argument(
            "resource_id",
            metavar=f"{self.resource_type_str}_id",
            type=int,
            help=f"{self.resource_type_str} ID",
        )
        parser.add_argument("filename", type=str, help="upload file")
        parser.add_argument(
            "--format",
            dest="fileformat",
            type=str,
            default="CVAT 1.1",
            help="annotation format (default: %(default)s)",
        )

    def execute(
        self,
        client: Client,
        *,
        fileformat: str,
        filename: str,
        resource_id: int,
    ) -> None:
        resource = self.repo(client).retrieve(obj_id=resource_id)
        import_dataset = getattr(resource, self.import_method_name)
        import_dataset(
            format_name=fileformat,
            filename=filename,
            pbar=DeferredTqdmProgressReporter(),
        )
