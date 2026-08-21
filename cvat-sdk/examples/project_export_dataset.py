# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Export a project's tasks individually, without images, to local zips AND to
a registered cloud storage.

By default every task in the project is exported; pass --task-id to export
only a specific subset. This is the SDK-only stand-in for what could become a
bulk per-task export command in cvat-cli.

Steps:
  1. Fetch the server's export format list and validate --export-format.
  2. Resolve which tasks to export: --task-id filters to a subset of the
     project's tasks; omit it to export every task in the project.
  3. For each task: export to task_<id>_dataset.zip in the current directory,
     then export the same dataset straight to the cloud storage (no local
     download).

Usage (run ``python project_export_dataset.py --help`` for the full list of options):
  # every task in the project
  python project_export_dataset.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --project-id 42 --cloud-storage-id 7 --export-format 'COCO 1.0'

  # only tasks 10 and 11
  python project_export_dataset.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --project-id 42 --cloud-storage-id 7 --task-id 10 11
"""

import argparse
import sys
from pathlib import Path

from cvat_sdk import make_client
from cvat_sdk.core.proxies.types import Location


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=" ".join(__doc__.splitlines()[:2]))
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
        "--cloud-storage-id",
        type=int,
        required=True,
        help="a registered cloud storage id (see cloud_storage_register.py)",
    )
    parser.add_argument(
        "--export-format",
        default="COCO 1.0",
        help="exporter name, e.g. 'COCO 1.0' (default: '%(default)s')",
    )
    parser.add_argument(
        "--task-id",
        type=int,
        nargs="+",
        metavar="ID",
        help="export only these task ids (must belong to the project); "
        "omit to export every task in the project",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    with make_client(args.host, access_token=args.token) as client:
        # 1. Validate the format against the server's list.
        # Low-level API: there is no high-level proxy for the format list yet.
        formats, _ = client.api_client.server_api.retrieve_annotation_formats()
        names = [f.name for f in formats.exporters]
        if args.export_format not in names:
            sys.exit(
                f"Unknown export format {args.export_format!r}. Choose one of: {', '.join(names)}"
            )

        # 2. Resolve which tasks to export.
        project = client.projects.retrieve(args.project_id)
        tasks_by_id = {task.id: task for task in project.get_tasks()}
        if args.task_id:
            missing = [str(tid) for tid in args.task_id if tid not in tasks_by_id]
            if missing:
                sys.exit(
                    f"Task id(s) {', '.join(missing)} not found in project {project.id}"
                )
            tasks = [tasks_by_id[tid] for tid in args.task_id]
        else:
            tasks = list(tasks_by_id.values())
        if not tasks:
            sys.exit(f"Project {project.id} has no tasks to export")

        # 3. Export each task individually: a local zip AND straight to the cloud storage.
        for task in tasks:
            local_path = Path(f"task_{task.id}_dataset.zip")
            task.export_dataset(
                args.export_format, local_path, include_images=False, location=Location.LOCAL
            )
            print(f"Exported {local_path.resolve()}")

            remote_name = f"task_{task.id}_dataset.zip"
            task.export_dataset(
                args.export_format,
                remote_name,
                include_images=False,
                location=Location.CLOUD_STORAGE,
                cloud_storage_id=args.cloud_storage_id,
            )
            print(f"Exported {remote_name} to cloud storage {args.cloud_storage_id}")

        print(f"Exported {len(tasks)} task dataset(s) from project {project.id}")


if __name__ == "__main__":
    main()
