# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Export an existing project's dataset (all tasks) to a local zip AND to a
registered cloud storage.

Steps:
  1. Fetch the server's export format list and validate --export-format.
  2. Export to project_<id>_dataset.zip in the current directory.
  3. Export the same dataset straight to the cloud storage (no local download).

Usage (run ``python project_export_dataset.py --help`` for the full list of options):
  python project_export_dataset.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --project-id 42 --cloud-storage-id 7 --export-format 'COCO 1.0'
"""

import argparse
import sys
from pathlib import Path

from cvat_sdk import make_client
from cvat_sdk.core.proxies.types import Location


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--host", required=True, help="CVAT server URL, e.g. 'https://app.cvat.ai'"
    )
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
        help="exporter name, e.g. 'COCO 1.0' (default: 'COCO 1.0')",
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

        project = client.projects.retrieve(args.project_id)

        # 2. Export to a local zip
        local_path = Path(f"project_{project.id}_dataset.zip")
        project.export_dataset(
            args.export_format, local_path, include_images=True, location=Location.LOCAL
        )
        print(f"Exported {local_path.resolve()}")

        # 3. Export straight to the cloud storage
        remote_name = f"project_{project.id}_dataset.zip"
        project.export_dataset(
            args.export_format,
            remote_name,
            include_images=True,
            location=Location.CLOUD_STORAGE,
            cloud_storage_id=args.cloud_storage_id,
        )
        print(f"Exported {remote_name} to cloud storage {args.cloud_storage_id}")


if __name__ == "__main__":
    main()
