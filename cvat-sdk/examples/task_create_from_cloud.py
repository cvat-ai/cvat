# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Create an annotation task from images that already live in a registered
cloud storage — nothing is uploaded from your machine.

Steps:
  1. Create a task whose data is a list of object keys in the bucket.
  2. Print the result.
  3. Optionally delete it (CVAT_EXAMPLES_CLEANUP=1).

Register a bucket first with cloud_storage_register.py to get the storage id.

Usage:
  export CVAT_HOST=https://app.cvat.ai
  export CVAT_ACCESS_TOKEN=...                       # CVAT UI: Profile -> Security
  export CVAT_CLOUD_STORAGE_ID=7
  export CLOUD_KEYS=images/0001.jpg,images/0002.jpg  # comma-separated object keys
  export CVAT_LABELS=car,person                      # optional
  python task_create_from_cloud.py
"""

import os
import sys

from cvat_sdk import make_client, models
from cvat_sdk.core.proxies.tasks import ResourceType


def require_env(name: str, hint: str) -> str:
    value = os.environ.get(name)
    if not value:
        sys.exit(f"Set the {name} environment variable: {hint}")
    return value


HOST = require_env("CVAT_HOST", "your CVAT server URL, e.g. https://app.cvat.ai")
TOKEN = require_env("CVAT_ACCESS_TOKEN", "create one in the CVAT UI: Profile -> Security")
CLOUD_STORAGE_ID = int(
    require_env(
        "CVAT_CLOUD_STORAGE_ID", "a registered cloud storage id (cloud_storage_register.py)"
    )
)
CLOUD_KEYS = require_env(
    "CLOUD_KEYS", "comma-separated object keys, e.g. images/0001.jpg,images/0002.jpg"
).split(",")
TASK_NAME = os.environ.get("CVAT_TASK_NAME", "Task from cloud storage")
LABELS = os.environ.get("CVAT_LABELS", "object").split(",")
CLEANUP = os.environ.get("CVAT_EXAMPLES_CLEANUP") == "1"


def main() -> None:
    with make_client(HOST, access_token=TOKEN) as client:
        # ResourceType.SHARE + cloud_storage_id = read images from the bucket
        task = client.tasks.create_from_data(
            spec=models.TaskWriteRequest(
                name=TASK_NAME,
                labels=[models.PatchedLabelRequest(name=name) for name in LABELS],
            ),
            resource_type=ResourceType.SHARE,
            resources=CLOUD_KEYS,
            data_params={"cloud_storage_id": CLOUD_STORAGE_ID},
        )
        print(f"Created task {task.id} with {task.size} frames: {HOST}/tasks/{task.id}")

        if CLEANUP:
            task.remove()
            print(f"Deleted task {task.id}")
        else:
            print("Keeping the task; set CVAT_EXAMPLES_CLEANUP=1 to delete it")


if __name__ == "__main__":
    main()
