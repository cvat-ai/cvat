# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Download a backup zip of an existing project.

A backup contains the project's tasks, jobs, annotations, and settings. Pair
this recipe with project_restore.py to migrate or clone a project.

Steps:
  1. Retrieve the project by id.
  2. Download its backup to --output (default: project_<id>_backup.zip).

Usage (run ``python project_backup.py --help`` for the full list of options):
  python project_backup.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --project-id 42
"""

import argparse
from pathlib import Path

from cvat_sdk import make_client


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--host", required=True, help="CVAT server URL, e.g. 'https://app.cvat.ai'")
    parser.add_argument(
        "--token",
        required=True,
        help="Personal Access Token (CVAT UI: Profile -> Security)",
    )
    parser.add_argument(
        "--project-id", type=int, required=True, help="id of an existing project, e.g. 42"
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="destination file path (default: project_<id>_backup.zip)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    with make_client(args.host, access_token=args.token) as client:
        project = client.projects.retrieve(args.project_id)
        output = args.output or Path(f"project_{project.id}_backup.zip")
        project.download_backup(output)
        print(f"Backed up project {project.id} to {output.resolve()}")


if __name__ == "__main__":
    main()
