# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Back up an existing project to a zip and restore it as a new copy.

A backup contains the project's tasks, jobs, annotations, and settings, so
this doubles as a copy-a-project recipe.

Steps:
  1. Download a backup of the project to project_backup.zip.
  2. Restore the backup as a brand-new project.
  3. Optionally delete the restored copy (CVAT_EXAMPLES_CLEANUP=1).

Usage:
  export CVAT_HOST=https://app.cvat.ai
  export CVAT_ACCESS_TOKEN=...    # CVAT UI: Profile -> Security
  export CVAT_PROJECT_ID=42      # an existing project id
  python project_backup_restore.py
"""

import os
import sys
from pathlib import Path

from cvat_sdk import make_client


def require_env(name: str, hint: str) -> str:
    value = os.environ.get(name)
    if not value:
        sys.exit(f"Set the {name} environment variable: {hint}")
    return value


HOST = require_env("CVAT_HOST", "your CVAT server URL, e.g. https://app.cvat.ai")
TOKEN = require_env("CVAT_ACCESS_TOKEN", "create one in the CVAT UI: Profile -> Security")
PROJECT_ID = int(require_env("CVAT_PROJECT_ID", "id of an existing project, e.g. 42"))
BACKUP_PATH = Path("project_backup.zip")
CLEANUP = os.environ.get("CVAT_EXAMPLES_CLEANUP") == "1"


def main() -> None:
    with make_client(HOST, access_token=TOKEN) as client:
        # 1. Backup
        project = client.projects.retrieve(PROJECT_ID)
        project.download_backup(BACKUP_PATH)
        print(f"Backed up project {project.id} to {BACKUP_PATH.resolve()}")

        # 2. Restore as a new project
        restored = client.projects.create_from_backup(BACKUP_PATH)
        print(f"Restored a copy as project {restored.id}: {HOST}/projects/{restored.id}")

        # 3. Opt-in cleanup (only the copy — never the original)
        if CLEANUP:
            restored.remove()
            print(f"Deleted restored project {restored.id}")
        else:
            print("Keeping the restored project; set CVAT_EXAMPLES_CLEANUP=1 to delete it")


if __name__ == "__main__":
    main()
