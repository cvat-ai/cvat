# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Create a project with labels, then list, filter, retrieve, and rename it.

Steps:
  1. Create a project with a simple label schema.
  2. List all projects visible to you (pagination is handled by the SDK).
  3. Filter projects by a name substring.
  4. Retrieve one project by id and read its labels.
  5. Rename it.
  6. Optionally delete it (CVAT_EXAMPLES_CLEANUP=1).

Usage:
  export CVAT_HOST=https://app.cvat.ai
  export CVAT_ACCESS_TOKEN=...            # CVAT UI: Profile -> Security
  export CVAT_PROJECT_NAME="My project"   # optional, default "Example project"
  export CVAT_LABELS=car,person           # optional, comma-separated
  python project_create_and_list.py
"""

import os
import sys

from cvat_sdk import make_client, models
from cvat_sdk.core.filters import F


def require_env(name: str, hint: str) -> str:
    value = os.environ.get(name)
    if not value:
        sys.exit(f"Set the {name} environment variable: {hint}")
    return value


HOST = require_env("CVAT_HOST", "your CVAT server URL, e.g. https://app.cvat.ai")
TOKEN = require_env("CVAT_ACCESS_TOKEN", "create one in the CVAT UI: Profile -> Security")
PROJECT_NAME = os.environ.get("CVAT_PROJECT_NAME", "Example project")
LABELS = os.environ.get("CVAT_LABELS", "car,person").split(",")
CLEANUP = os.environ.get("CVAT_EXAMPLES_CLEANUP") == "1"


def main() -> None:
    with make_client(HOST, access_token=TOKEN) as client:
        # 1. Create a project with labels
        project = client.projects.create(
            models.ProjectWriteRequest(
                name=PROJECT_NAME,
                labels=[models.PatchedLabelRequest(name=name) for name in LABELS],
            )
        )
        print(f"Created project {project.id}: {HOST}/projects/{project.id}")

        # 2. List all projects
        projects = client.projects.list()
        print(f"Projects visible to you: {len(projects)}")

        # 3. Filter by name substring
        matches = client.projects.list(filter=F.name.contains(PROJECT_NAME))
        print(f"Projects with {PROJECT_NAME!r} in the name: {[p.id for p in matches]}")

        # 4. Retrieve by id
        fetched = client.projects.retrieve(project.id)
        print(f"Project {fetched.id} labels: {[label.name for label in fetched.get_labels()]}")

        # 5. Rename
        renamed = fetched.update(
            models.PatchedProjectWriteRequest(name=f"{PROJECT_NAME} (renamed)")
        )
        print(f"Renamed to: {renamed.name}")

        # 6. Opt-in cleanup
        if CLEANUP:
            renamed.remove()
            print(f"Deleted project {project.id}")
        else:
            print("Keeping the project; set CVAT_EXAMPLES_CLEANUP=1 to delete it")


if __name__ == "__main__":
    main()
