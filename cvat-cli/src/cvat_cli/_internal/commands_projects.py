# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import argparse
import os
import textwrap

from cvat_sdk import Client, models
from cvat_sdk.core.helpers import DeferredTqdmProgressReporter
from cvat_sdk.core.proxies.types import Location

from .command_base import CommandGroup, GenericCommand, GenericDeleteCommand, GenericListCommand
from .parsers import parse_label_arg

COMMANDS = CommandGroup(description="Perform operations on CVAT projects.")


class GenericProjectCommand(GenericCommand):
    resource_type_str = "project"

    def repo(self, client: Client):
        return client.projects


@COMMANDS.command_class("ls")
class ProjectList(GenericListCommand, GenericProjectCommand):
    pass


@COMMANDS.command_class("create")
class ProjectCreate:
    description = textwrap.dedent("""\
        Create a new CVAT project, optionally importing a dataset.
        """)

    def configure_parser(self, parser: argparse.ArgumentParser) -> None:
        parser.add_argument("name", type=str, help="name of the project")
        parser.add_argument(
            "--bug_tracker", "--bug", default=argparse.SUPPRESS, type=str, help="bug tracker URL"
        )
        parser.add_argument(
            "--labels",
            default=[],
            type=parse_label_arg,
            help="string or file containing JSON labels specification (default: %(default)s)",
        )
        parser.add_argument(
            "--dataset_path",
            default="",
            type=str,
            help="path to the dataset file to import",
        )
        parser.add_argument(
            "--dataset_format",
            default="CVAT 1.1",
            type=str,
            help="format of the dataset file being uploaded"
            " (only applies when --dataset_path is specified; default: %(default)s)",
        )
        parser.add_argument(
            "--completion_verification_period",
            dest="status_check_period",
            default=2,
            type=float,
            help="period between status checks"
            " (only applies when --dataset_path is specified; default: %(default)s)",
        )

    def execute(
        self,
        client: Client,
        *,
        name: str,
        labels: dict,
        dataset_path: str,
        dataset_format: str,
        status_check_period: int,
        **kwargs,
    ) -> None:
        project = client.projects.create_from_dataset(
            spec=models.ProjectWriteRequest(name=name, labels=labels, **kwargs),
            dataset_path=dataset_path,
            dataset_format=dataset_format,
            status_check_period=status_check_period,
        )
        print(project.id)


@COMMANDS.command_class("delete")
class ProjectDelete(GenericDeleteCommand, GenericProjectCommand):
    pass


@COMMANDS.command_class("backup")
class ProjectBackup:
    description = """Download a project backup."""

    def configure_parser(self, parser: argparse.ArgumentParser) -> None:
        parser.add_argument("project_id", type=int, help="project ID")
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
        self, client: Client, *, project_id: int, filename: str, status_check_period: int
    ) -> None:
        if not filename:
            filename = os.getcwd()

        if filename.endswith((os.sep, os.altsep or os.sep)):
            os.makedirs(filename, exist_ok=True)

        client.projects.retrieve(obj_id=project_id).download_backup(
            filename=filename,
            status_check_period=status_check_period,
            pbar=DeferredTqdmProgressReporter(),
            location=Location.LOCAL,
        )


@COMMANDS.command_class("create-from-backup")
class ProjectCreateFromBackup:
    description = """Create a project from a backup file."""

    def configure_parser(self, parser: argparse.ArgumentParser) -> None:
        parser.add_argument("filename", type=str, help="upload file")
        parser.add_argument(
            "--completion_verification_period",
            dest="status_check_period",
            default=2,
            type=float,
            help="time interval between checks if archive processing was finished, in seconds",
        )

    def execute(self, client: Client, *, filename: str, status_check_period: int) -> None:
        project = client.projects.create_from_backup(
            filename=filename,
            status_check_period=status_check_period,
            pbar=DeferredTqdmProgressReporter(),
        )
        print(project.id)
