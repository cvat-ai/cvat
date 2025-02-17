# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from .command_base import CommandGroup, DeprecatedAlias
from .commands_functions import COMMANDS as COMMANDS_FUNCTIONS
from .commands_projects import COMMANDS as COMMANDS_PROJECTS
from .commands_tasks import COMMANDS as COMMANDS_TASKS

COMMANDS = CommandGroup(description="Perform operations on CVAT resources.")

COMMANDS.add_command("function", COMMANDS_FUNCTIONS)
COMMANDS.add_command("project", COMMANDS_PROJECTS)
COMMANDS.add_command("task", COMMANDS_TASKS)

_legacy_mapping = {
    "create": "create",
    "ls": "ls",
    "delete": "delete",
    "frames": "frames",
    "dump": "export-dataset",
    "upload": "import-dataset",
    "export": "backup",
    "import": "create-from-backup",
    "auto-annotate": "auto-annotate",
}

for _legacy, _new in _legacy_mapping.items():
    COMMANDS.add_command(_legacy, DeprecatedAlias(COMMANDS_TASKS.commands[_new], f"task {_new}"))
