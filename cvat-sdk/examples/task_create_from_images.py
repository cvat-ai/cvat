# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Create an annotation task from a local directory of images, then list,
retrieve, and rename it.

Steps:
  1. Collect *.jpg / *.jpeg / *.png files from IMAGE_DIR (sorted).
  2. Create the task and upload the images. With CVAT_PROJECT_ID the task is
     created inside that project and inherits its labels; without it, the task
     gets its own labels from CVAT_LABELS.
  3. List tasks currently in the "annotation" status.
  4. Retrieve the new task by id and rename it.
  5. Optionally delete it (CVAT_EXAMPLES_CLEANUP=1).

Usage:
  export CVAT_HOST=https://app.cvat.ai
  export CVAT_ACCESS_TOKEN=...       # CVAT UI: Profile -> Security
  export IMAGE_DIR=./images
  export CVAT_PROJECT_ID=42          # optional: create inside a project
  export CVAT_LABELS=car,person      # optional, used only without a project
  python task_create_from_images.py
"""

import os
import sys
from pathlib import Path

from cvat_sdk import make_client, models
from cvat_sdk.core.filters import F
from cvat_sdk.core.proxies.tasks import ResourceType


def require_env(name: str, hint: str) -> str:
    value = os.environ.get(name)
    if not value:
        sys.exit(f"Set the {name} environment variable: {hint}")
    return value


HOST = require_env("CVAT_HOST", "your CVAT server URL, e.g. https://app.cvat.ai")
TOKEN = require_env("CVAT_ACCESS_TOKEN", "create one in the CVAT UI: Profile -> Security")
IMAGE_DIR = Path(require_env("IMAGE_DIR", "a directory containing *.jpg/*.png images"))
PROJECT_ID = os.environ.get("CVAT_PROJECT_ID")
TASK_NAME = os.environ.get("CVAT_TASK_NAME", "Example task")
LABELS = os.environ.get("CVAT_LABELS", "object").split(",")
CLEANUP = os.environ.get("CVAT_EXAMPLES_CLEANUP") == "1"


def find_images(directory: Path) -> list[Path]:
    if not directory.is_dir():
        sys.exit(f"IMAGE_DIR {directory} is not a directory")
    images = sorted(p for p in directory.iterdir() if p.suffix.lower() in (".jpg", ".jpeg", ".png"))
    if not images:
        sys.exit(f"No images found in {directory}")
    return images


def main() -> None:
    images = find_images(IMAGE_DIR)
    print(f"Found {len(images)} images in {IMAGE_DIR}")

    with make_client(HOST, access_token=TOKEN) as client:
        # 1-2. Create the task and upload the images.
        if PROJECT_ID:
            # Tasks in a project inherit the project's labels — do NOT pass labels.
            spec = models.TaskWriteRequest(name=TASK_NAME, project_id=int(PROJECT_ID))
        else:
            spec = models.TaskWriteRequest(
                name=TASK_NAME,
                labels=[models.PatchedLabelRequest(name=name) for name in LABELS],
            )
        task = client.tasks.create_from_data(
            spec=spec,
            resource_type=ResourceType.LOCAL,
            resources=images,
            # predefined = keep the order we pass; image_quality trades size for fidelity
            data_params={"image_quality": 95, "sorting_method": "predefined"},
        )
        where = f" into project {PROJECT_ID}" if PROJECT_ID else ""
        print(f"Created task {task.id}{where} with {task.size} frames: {HOST}/tasks/{task.id}")

        # 3. List tasks that are still being annotated
        in_annotation = client.tasks.list(filter=F.status == "annotation")
        print(f"Tasks in 'annotation' status: {len(in_annotation)}")

        # 4. Retrieve by id and rename
        fetched = client.tasks.retrieve(task.id)
        renamed = fetched.update(models.PatchedTaskWriteRequest(name=f"{TASK_NAME} (renamed)"))
        print(f"Renamed to: {renamed.name}")

        # 5. Opt-in cleanup
        if CLEANUP:
            renamed.remove()
            print(f"Deleted task {task.id}")
        else:
            print("Keeping the task; set CVAT_EXAMPLES_CLEANUP=1 to delete it")


if __name__ == "__main__":
    main()
