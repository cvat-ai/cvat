---
title: 'Manage jobs'
linkTitle: 'Jobs'
weight: 4
description: 'List, search, and filter jobs, change a job stage, assign jobs round-robin, and import annotations'
---

List, filter, and search jobs, change a job's stage, assign jobs - including a
round-robin "automatic assignment" over a team - and import annotations into a single job.

_Prerequisites:_ an authenticated `client` and a task that already has jobs.

```python
from pathlib import Path

from cvat_sdk import Client, models
from cvat_sdk.core.filters import F, all_, not_
from cvat_sdk.core.proxies.jobs import Job


def list_jobs(
    client: Client, task_id: int | None = None, stage: str | None = None, state: str | None = None
) -> list[Job]:
    conditions = []
    if task_id is not None:
        conditions.append(F.task_id == task_id)
    if stage is not None:
        conditions.append(F.stage == stage)
    if state is not None:
        conditions.append(F.state == state)
    if conditions:
        return client.jobs.list(filter=all_(*conditions))
    return client.jobs.list()


def list_unassigned_jobs(client: Client, task_id: int) -> list[Job]:
    return client.jobs.list(filter=all_(F.task_id == task_id, not_(F.assignee.is_set())))


def search_jobs(
    client: Client, search: str | None = None, ordering: str | None = None
) -> list[Job]:
    # search/ordering go straight through to the list endpoint as query params,
    # unlike the structured `filter` used above. `ordering` is a field name,
    # optionally prefixed with `-` for descending order (e.g. "-updated_date").
    kwargs = {}
    if search is not None:
        kwargs["search"] = search
    if ordering is not None:
        kwargs["ordering"] = ordering
    return client.jobs.list(**kwargs)


def auto_assign_task_jobs(
    client: Client, task_id: int, assignee_ids: list[int]
) -> dict[int, int]:
    """Round-robin every job in a task across the given annotators."""
    if not assignee_ids:
        raise ValueError("assignee_ids must not be empty")

    task = client.tasks.retrieve(task_id)
    mapping: dict[int, int] = {}
    for i, job in enumerate(task.get_jobs()):
        user_id = assignee_ids[i % len(assignee_ids)]
        job.update(models.PatchedJobWriteRequest(assignee=user_id))
        mapping[job.id] = user_id
    return mapping
```

Import annotations from a file into a single job. `format_name` must match the
file's format (e.g. `"COCO 1.0"` or `"CVAT for images 1.1"`):

```python
def import_job_annotations(
    client: Client, job_id: int, format_name: str, path: Path
) -> None:
    job = client.jobs.retrieve(job_id)
    job.import_annotations(format_name, path)
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
| `Job.get_frame(frame_id: int, quality="original" \| "compressed")` | Return a single frame as a file-like object (`io.RawIOBase`) of image bytes. `quality` defaults to `"original"`. |
| `Job.download_frames(frame_ids: Sequence[int], outdir=".", quality="original", image_extension=None, filename_pattern="frame_{frame_id:06d}{frame_ext}")` | Save the given frames to disk under `outdir`. `image_extension` (e.g. `"png"`) overrides the auto-detected extension; `quality` is `"original"` or `"compressed"`. |
| `Job.get_meta()` / `Job.get_labels()`                            | Read a job's frame metadata and label schema.                                                            |

_Notes:_

- `stage` is one of `annotation`, `validation`, `acceptance`.
- Jobs are created automatically with their task (controlled by `segment_size` at task creation) -
  you can update and assign them, but not create a job on its own. CVAT has no built-in
  auto-assignment, so `auto_assign_task_jobs` is the scripted pattern.
- Full module:
  [`job_management.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/job_management.py).
