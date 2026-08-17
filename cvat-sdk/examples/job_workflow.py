# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Drive a job through its workflow: pick the most recently updated job of a
task, import annotations into it, and move it to the validation stage.

Steps:
  1. List the task's jobs, most recently updated first (server-side ordering;
     the same endpoint also accepts free-text search, e.g. search="alice").
  2. Import annotations from a file into the first job. The file's format must
     match ANNOTATIONS_FORMAT (an importer name, e.g. "COCO 1.0").
  3. Verify the shapes arrived, then move the job to the validation stage.

Usage:
  export CVAT_HOST=https://app.cvat.ai
  export CVAT_ACCESS_TOKEN=...              # CVAT UI: Profile -> Security
  export CVAT_TASK_ID=42                   # an existing task id
  export ANNOTATIONS_PATH=./annotations.json
  export ANNOTATIONS_FORMAT="COCO 1.0"     # optional, default "COCO 1.0"
  python job_workflow.py
"""

import os
import sys
from pathlib import Path

from cvat_sdk import make_client, models
from cvat_sdk.core.filters import F


def require_env(name: str, hint: str) -> str:
    value = os.environ.get(name)
    if not value:
        sys.exit(f"Set the {name} environment variable: {hint}")
    return value


HOST = require_env("CVAT_HOST", "your CVAT server URL, e.g. https://app.cvat.ai")
TOKEN = require_env("CVAT_ACCESS_TOKEN", "create one in the CVAT UI: Profile -> Security")
TASK_ID = int(require_env("CVAT_TASK_ID", "id of an existing task, e.g. 42"))
ANNOTATIONS_PATH = Path(
    require_env("ANNOTATIONS_PATH", "an annotations file matching ANNOTATIONS_FORMAT")
)
ANNOTATIONS_FORMAT = os.environ.get("ANNOTATIONS_FORMAT", "COCO 1.0")


def main() -> None:
    if not ANNOTATIONS_PATH.is_file():
        sys.exit(f"ANNOTATIONS_PATH {ANNOTATIONS_PATH} does not exist")

    with make_client(HOST, access_token=TOKEN) as client:
        # 1. Most recently updated job first
        jobs = client.jobs.list(filter=F.task_id == TASK_ID, sort="-updated_date")
        if not jobs:
            sys.exit(f"Task {TASK_ID} has no jobs")
        job = jobs[0]
        print(f"Working with job {job.id} (stage={job.stage}, state={job.state})")

        # 2. Import annotations
        job.import_annotations(ANNOTATIONS_FORMAT, ANNOTATIONS_PATH)
        print(f"Imported {ANNOTATIONS_FORMAT} annotations from {ANNOTATIONS_PATH}")
        shapes = job.get_annotations().shapes
        print(f"Job {job.id} now has {len(shapes)} shapes")

        # 3. Advance the workflow stage: annotation -> validation -> acceptance
        job.update(models.PatchedJobWriteRequest(stage="validation"))
        print(f"Moved job {job.id} to the validation stage")


if __name__ == "__main__":
    main()
