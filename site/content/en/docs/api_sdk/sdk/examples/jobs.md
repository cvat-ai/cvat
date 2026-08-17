---
title: 'Job recipes'
linkTitle: 'Jobs'
weight: 4
description: 'List a task jobs and assign round-robin; drive a job through its workflow with annotation import'
---

Two recipes: `job_list_and_assign.py` lists a task's jobs and distributes the
unassigned ones round-robin, and `job_workflow.py` picks the most recently
updated job, imports annotations, and moves it to the validation stage.

## List and auto-assign a task's jobs

Lists the jobs of a task, filters the unassigned ones, and hands them out
round-robin across `CVAT_ASSIGNEE_IDS` (or all to you if unset).

| Variable | Required | Meaning |
| --- | --- | --- |
| `CVAT_HOST` | yes | Server URL |
| `CVAT_ACCESS_TOKEN` | yes | Personal Access Token |
| `CVAT_TASK_ID` | yes | Id of the task whose jobs to assign |
| `CVAT_ASSIGNEE_IDS` | no | Comma-separated user ids; defaults to your own user |

```bash
export CVAT_HOST=https://app.cvat.ai
export CVAT_ACCESS_TOKEN=...
export CVAT_TASK_ID=42
python job_list_and_assign.py
```

### The script

```python
"""List an existing task's jobs, find the unassigned ones, and distribute them
across annotators round-robin (CVAT has no built-in auto-assignment).

Steps:
  1. List all jobs of the task with their stage/state/assignee.
  2. Filter the jobs that have no assignee yet.
  3. Assign them round-robin across CVAT_ASSIGNEE_IDS — or all to you,
     if CVAT_ASSIGNEE_IDS is not set.

Usage:
  export CVAT_HOST=https://app.cvat.ai
  export CVAT_ACCESS_TOKEN=...       # CVAT UI: Profile -> Security
  export CVAT_TASK_ID=42            # an existing task id
  export CVAT_ASSIGNEE_IDS=10,11,12 # optional, comma-separated user ids
  python job_list_and_assign.py
"""

import os
import sys

from cvat_sdk import make_client, models
from cvat_sdk.core.filters import F, all_, not_


def require_env(name: str, hint: str) -> str:
    value = os.environ.get(name)
    if not value:
        sys.exit(f"Set the {name} environment variable: {hint}")
    return value


HOST = require_env("CVAT_HOST", "your CVAT server URL, e.g. https://app.cvat.ai")
TOKEN = require_env("CVAT_ACCESS_TOKEN", "create one in the CVAT UI: Profile -> Security")
TASK_ID = int(require_env("CVAT_TASK_ID", "id of an existing task, e.g. 42"))
ASSIGNEE_IDS = [int(x) for x in os.environ.get("CVAT_ASSIGNEE_IDS", "").split(",") if x]


def main() -> None:
    with make_client(HOST, access_token=TOKEN) as client:
        # 1. List all jobs of the task
        jobs = client.jobs.list(filter=F.task_id == TASK_ID)
        print(f"Task {TASK_ID} has {len(jobs)} jobs")
        for job in jobs:
            assignee = job.assignee.username if job.assignee else "-"
            print(f"  job {job.id}: stage={job.stage}, state={job.state}, assignee={assignee}")

        # 2. Only the unassigned ones
        unassigned = client.jobs.list(filter=all_(F.task_id == TASK_ID, not_(F.assignee.is_set())))
        print(f"Unassigned jobs: {[job.id for job in unassigned]}")

        # 3. Round-robin assignment. To pull a team automatically instead of
        # passing ids, use client.users.list(...).
        assignees = ASSIGNEE_IDS or [client.users.retrieve_current_user().id]
        for i, job in enumerate(unassigned):
            user_id = assignees[i % len(assignees)]
            job.update(models.PatchedJobWriteRequest(assignee=user_id))
            print(f"Assigned job {job.id} -> user {user_id}")


if __name__ == "__main__":
    main()
```

## Import annotations and advance a job

Sorts the task's jobs by most recently updated, imports annotations from a file
into the first one, and moves the job to the `validation` stage.

| Variable | Required | Meaning |
| --- | --- | --- |
| `CVAT_HOST` | yes | Server URL |
| `CVAT_ACCESS_TOKEN` | yes | Personal Access Token |
| `CVAT_TASK_ID` | yes | Id of the task |
| `ANNOTATIONS_PATH` | yes | Annotations file matching `ANNOTATIONS_FORMAT` |
| `ANNOTATIONS_FORMAT` | no | Importer name (default `COCO 1.0`) |

```bash
export CVAT_HOST=https://app.cvat.ai
export CVAT_ACCESS_TOKEN=...
export CVAT_TASK_ID=42
export ANNOTATIONS_PATH=./annotations.json
python job_workflow.py
```

### The script

```python
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
```

_Other SDK options:_

| SDK method / parameter                                           | What it adds                                                                                             |
|------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------|
| `Job.update(models.PatchedJobWriteRequest(stage=...))`           | Change a job's `stage` (retrieve the job, then update). Must be one of: `annotation`, `validation`, `acceptance`. |
| `Job.update(models.PatchedJobWriteRequest(state=...))`           | Change a job's `state`, must be one of these values:  `new`, `in progress`, `rejected`, `completed`.     |
| `Job.import_annotations(..., import_mode="replace" \| "append")` | `"replace"` overwrites the job's existing annotations (default); `"append"` merges the imported ones in. |
| `Job.import_annotations(..., conv_mask_to_poly=True \| False)`   | Convert imported mask annotations to polygons (`bool`, server default `True`).                           |
| `Job.import_annotations(..., pbar=ProgressReporter())`           | Report upload progress (a `cvat_sdk.core.progress.ProgressReporter`).                                    |
| `Job.get_issues()`                                               | Fetch the review issues raised on a job.                                                                 |
| `Job.export_dataset(format_name, path)`                          | Export a single job's dataset - the export counterpart of `import_annotations`.                          |
| `Job.get_frame(frame_id: int, *, quality="original" \| "compressed")` | Return a single frame as a file-like object (`io.RawIOBase`) of image bytes. `quality` is an optional keyword argument (`"original"` or `"compressed"`); if omitted, the server default is used. |
| `Job.download_frames(frame_ids: Sequence[int], outdir=".", quality="original", image_extension=None, filename_pattern="frame_{frame_id:06d}{frame_ext}")` | Save the given frames to disk under `outdir`. `image_extension` (e.g. `"png"`) overrides the auto-detected extension; `quality` is `"original"` or `"compressed"`. |
| `Job.get_meta()` / `Job.get_labels()`                            | Read a job's frame metadata and label schema.                                                            |

_Notes:_

- `stage` is one of `annotation`, `validation`, `acceptance`.
- Jobs are created automatically with their task (controlled by `segment_size` at
  task creation) — you can update and assign them, but not create a job on its own.
  CVAT has no built-in auto-assignment, so `job_list_and_assign.py` is the scripted
  pattern.
- Full recipes:
  [`job_list_and_assign.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/job_list_and_assign.py),
  [`job_workflow.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/job_workflow.py).
