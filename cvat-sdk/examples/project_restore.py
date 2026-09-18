# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Restore a project from a backup zip as a new project.

Pair with project_backup.py to migrate or clone a project.

Steps:
  1. Restore --backup as a brand-new project.
  2. Optionally delete the restored copy (--cleanup) — useful when testing a
     backup file.

Usage (run ``python project_restore.py --help`` for the full list of options):
  python project_restore.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --backup './project_42_backup.zip'
"""

import argparse
import sys
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
    parser.add_argument("--backup", type=Path, required=True, help="path to a project backup zip")
    parser.add_argument(
        "--cleanup",
        action="store_true",
        help="delete the restored project at the end (never touches the source backup)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if not args.backup.is_file():
        sys.exit(f"--backup {args.backup} does not exist")

    with make_client(args.host, access_token=args.token) as client:
        restored = client.projects.create_from_backup(args.backup)
        print(f"Restored a copy as project {restored.id}: {args.host}/projects/{restored.id}")

        if args.cleanup:
            restored.remove()
            print(f"Deleted restored project {restored.id}")
        else:
            print("Keeping the restored project; pass --cleanup to delete it")


if __name__ == "__main__":
    main()
