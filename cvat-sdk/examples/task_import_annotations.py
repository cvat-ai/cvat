# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Import annotations from a local file into an existing task, e.g. to load
predictions of a model or work made on another server.

Steps:
  1. Retrieve the task and count the objects it already has.
  2. Fetch the server's import format list and validate --import-format.
  3. Upload the annotations file and wait for the server to process it.
  4. Count the objects again to show what the import added.

Usage (run ``python task_import_annotations.py --help`` for the full list of options):
  python task_import_annotations.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --task-id 42 --annotations-file 'annotations.zip' --import-format 'COCO 1.0'
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
    parser.add_argument(
        "--task-id", type=int, required=True, help="id of an existing task, e.g. 42"
    )
    parser.add_argument(
        "--annotations-file",
        type=Path,
        required=True,
        help="file to import, e.g. 'annotations.zip'",
    )
    parser.add_argument(
        "--import-format",
        default="COCO 1.0",
        help="importer name, e.g. 'COCO 1.0' (default: '%(default)s')",
    )
    return parser.parse_args()


def count_objects(task) -> int:
    """All annotation objects of a task: tags, shapes, and tracks."""
    annotations = task.get_annotations()
    return len(annotations.tags) + len(annotations.shapes) + len(annotations.tracks)


def main() -> None:
    args = parse_args()
    with make_client(args.host, access_token=args.token) as client:
        task = client.tasks.retrieve(args.task_id)
        print(f"Task {task.id}: {count_objects(task)} objects before import")

        formats, _ = client.api_client.server_api.retrieve_annotation_formats()
        names = [f.name for f in formats.importers]
        if args.import_format not in names:
            sys.exit(
                f"Unknown import format {args.import_format!r}. Choose one of: {', '.join(names)}"
            )

        task.import_annotations(args.import_format, args.annotations_file)
        print(f"Imported {args.annotations_file} as {args.import_format!r}")

        print(f"Task {task.id}: {count_objects(task)} objects after import")


if __name__ == "__main__":
    main()
