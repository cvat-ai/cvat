# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Download a project's task datasets incrementally: export only the tasks that
changed since the previous run.

Pass --updated-after with the timestamp stored by your pipeline, or omit it
for a full download. The script does not store synchronization state.

Steps:
  1. Ask the server for the project's tasks updated after the given timestamp.
  2. Export each selected task, replacing its previous local archive.

Usage (run ``python dataset_incremental_download.py --help`` for the full list of options):
  python dataset_incremental_download.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --project-id 7 --output-dir datasets
  python dataset_incremental_download.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --project-id 7 --updated-after '2026-09-01T00:00:00+00:00'
"""

import argparse
from pathlib import Path

from cvat_sdk import make_client
from cvat_sdk.core.proxies.types import Location


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--host", required=True, help="CVAT server URL, e.g. 'https://app.cvat.ai'")
    parser.add_argument(
        "--token",
        required=True,
        help="Personal Access Token (CVAT UI: Profile -> Security)",
    )
    parser.add_argument(
        "--project-id", type=int, required=True, help="id of an existing project, e.g. 7"
    )
    parser.add_argument(
        "--updated-after",
        metavar="TIMESTAMP",
        help="export tasks updated after this ISO 8601 timestamp; omit to export all tasks",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("datasets"),
        help="directory to write the exported datasets to (default: %(default)s)",
    )
    parser.add_argument(
        "--export-format",
        default="COCO 1.0",
        help="exporter name, e.g. 'COCO 1.0' (default: '%(default)s')",
    )
    parser.add_argument(
        "--with-images",
        action="store_true",
        help="include images in the exported datasets (slower, much larger)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    with make_client(args.host, access_token=args.token) as client:
        filters = {"project_id": args.project_id}
        if args.updated_after:
            filters["updated_date__gt"] = args.updated_after
        tasks = client.tasks.list(**filters)
        if not tasks:
            print(
                f"No tasks to export after {args.updated_after}"
                if args.updated_after
                else f"Project {args.project_id} has no tasks to export"
            )
            return

        args.output_dir.mkdir(parents=True, exist_ok=True)
        for task in tasks:
            path = args.output_dir / f"task_{task.id}.zip"
            path.unlink(missing_ok=True)
            task.export_dataset(
                args.export_format,
                path,
                include_images=args.with_images,
                location=Location.LOCAL,
            )
            print(f"Exported task {task.id} {task.name!r} -> {path.resolve()}")

        print(f"Downloaded {len(tasks)} task dataset(s) into {args.output_dir.resolve()}")


if __name__ == "__main__":
    main()
