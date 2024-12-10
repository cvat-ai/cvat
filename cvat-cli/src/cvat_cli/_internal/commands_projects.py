# Copyright (C) 2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import argparse
import textwrap

from cvat_sdk import Client, models

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
    description = textwrap.dedent(
        """\
        Create a new CVAT project.
        """
    )

    def configure_parser(self, parser: argparse.ArgumentParser) -> None:
        parser.add_argument("name", type=str, help="name of the project")
        parser.add_argument(
            "--bug_tracker", "--bug", default=argparse.SUPPRESS, type=str, help="bug tracker URL"
        )
        parser.add_argument(
            "--labels",
            required=True,
            type=parse_label_arg,
            help="string or file containing JSON labels specification",
        )

    def execute(self, client: Client, *, name: str, labels: dict, **kwargs) -> None:
        project = client.projects.create(
            spec=models.ProjectWriteRequest(name=name, labels=labels, **kwargs)
        )
        print(f"Created project ID {project.id}")


@COMMANDS.command_class("delete")
class ProjectDelete(GenericDeleteCommand, GenericProjectCommand):
    pass
