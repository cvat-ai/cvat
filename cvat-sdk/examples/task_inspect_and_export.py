# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Inspect an existing task (labels, jobs, frames) and export its dataset to a
local zip AND to a registered cloud storage.

Steps:
  1. Retrieve the task and print a summary: labels, jobs (stage/state), frames.
  2. Fetch the server's export format list and validate CVAT_EXPORT_FORMAT.
  3. Export to task_<id>_dataset.zip in the current directory.
  4. Export the same dataset straight to the cloud storage.

Usage:
  export CVAT_HOST=https://app.cvat.ai
  export CVAT_ACCESS_TOKEN=...          # CVAT UI: Profile -> Security
  export CVAT_TASK_ID=42               # an existing task id
  export CVAT_CLOUD_STORAGE_ID=7       # see cloud_storage_register.py
  export CVAT_EXPORT_FORMAT="COCO 1.0" # optional, default "COCO 1.0"
  python task_inspect_and_export.py
"""

import os
import sys
from pathlib import Path

from cvat_sdk import make_client
from cvat_sdk.core.proxies.types import Location


def require_env(name: str, hint: str) -> str:
    value = os.environ.get(name)
    if not value:
        sys.exit(f"Set the {name} environment variable: {hint}")
    return value


HOST = require_env("CVAT_HOST", "your CVAT server URL, e.g. https://app.cvat.ai")
TOKEN = require_env("CVAT_ACCESS_TOKEN", "create one in the CVAT UI: Profile -> Security")
TASK_ID = int(require_env("CVAT_TASK_ID", "id of an existing task, e.g. 42"))
CLOUD_STORAGE_ID = int(
    require_env(
        "CVAT_CLOUD_STORAGE_ID", "a registered cloud storage id (cloud_storage_register.py)"
    )
)
EXPORT_FORMAT = os.environ.get("CVAT_EXPORT_FORMAT", "COCO 1.0")


def main() -> None:
    with make_client(HOST, access_token=TOKEN) as client:
        # 1. Inspect
        task = client.tasks.retrieve(TASK_ID)
        print(f"Task {task.id}: {task.name!r}, {task.size} frames")
        print(f"  labels: {[label.name for label in task.get_labels()]}")
        for job in task.get_jobs():
            print(f"  job {job.id}: stage={job.stage}, state={job.state}")

        # 2. Validate the export format against the server's list.
        # Low-level API: there is no high-level proxy for the format list yet.
        formats, _ = client.api_client.server_api.retrieve_annotation_formats()
        names = [f.name for f in formats.exporters]
        if EXPORT_FORMAT not in names:
            sys.exit(f"Unknown export format {EXPORT_FORMAT!r}. Choose one of: {', '.join(names)}")

        # 3. Export to a local zip
        local_path = Path(f"task_{task.id}_dataset.zip")
        task.export_dataset(EXPORT_FORMAT, local_path, include_images=True, location=Location.LOCAL)
        print(f"Exported {local_path.resolve()}")

        # 4. Export straight to the cloud storage
        remote_name = f"task_{task.id}_dataset.zip"
        task.export_dataset(
            EXPORT_FORMAT,
            remote_name,
            include_images=True,
            location=Location.CLOUD_STORAGE,
            cloud_storage_id=CLOUD_STORAGE_ID,
        )
        print(f"Exported {remote_name} to cloud storage {CLOUD_STORAGE_ID}")


if __name__ == "__main__":
    main()
