---
title: 'Job recipes'
linkTitle: 'Jobs'
weight: 4
description: "List a task's or project's jobs, round-robin unassigned jobs, batch-advance completed jobs"
---

Three recipes: `job_list.py` lists a task's or project's jobs with optional
stage/state filters and an optional CSV report, `job_assign.py` round-robins
unassigned jobs across a resolved pool of users and writes a CSV report, and
`job_workflow.py` batch-advances every completed job at a given stage to the
next stage.

## List a task's or project's jobs

Queries the jobs of a task or a project (pick one with `--task-id` or
`--project-id`) with optional server-side `--stage` / `--state` filters,
ordered by most recently updated. Pass `--csv` to also write `report.csv`
(`project_id, project_name, task_id, task_name, job_id, stage, state,
assignee, frames`) into the current directory.

| Flag | Required | Meaning |
| --- | --- | --- |
| `--host` | yes | Server URL |
| `--token` | yes | Personal Access Token |
| `--task-id` | one of `--task-id` / `--project-id` | Id of the task whose jobs to list |
| `--project-id` | one of `--task-id` / `--project-id` | Id of the project whose jobs to list |
| `--stage` | no | Only jobs at this stage, e.g. `annotation` |
| `--state` | no | Only jobs in this state, e.g. `new` |
| `--csv` | no | Also write `report.csv` into the current directory |

```bash
python job_list.py --host 'https://app.cvat.ai' --token '<your token>' \
    --task-id 42
python job_list.py --host 'https://app.cvat.ai' --token '<your token>' \
    --task-id 42 --stage annotation --state new
python job_list.py --host 'https://app.cvat.ai' --token '<your token>' \
    --project-id 7 --csv
```

### The script

{{< include-code "assets/sdk-examples/job_list.py" >}}

## Round-robin assign a task's jobs

Distributes the unassigned jobs of a task across a resolved user pool and
writes `assignments.csv` (`job_id, previous_assignee, new_assignee,
new_assignee_id`). The pool is resolved by looking up usernames exactly with
`--assignees`, by searching an organization's members with `--search`, or
self-assigns if neither is passed.

| Flag | Required | Meaning |
| --- | --- | --- |
| `--host` | yes | Server URL |
| `--token` | yes | Personal Access Token |
| `--task-id` | yes | Id of the task |
| `--org SLUG` | no | Organization slug to scope the user and job queries |
| `--org-id ID` | no | Organization id, as an alternative to `--org` |
| `--assignees USERNAME [...]` | no | Usernames to round-robin (exact match) |
| `--search QUERY` | no | Search the organization's members; every match becomes an assignee |

`--assignees` and `--search` are mutually exclusive, and so are `--org` and
`--org-id`. Omit both `--assignees` and `--search` to self-assign.

`--search` requires an organization, so pass it together with `--org` or
`--org-id`. Search matches the `username`, `first_name`, and `last_name`
fields, which is only meaningful scoped to a team.

```bash
# self-assign every unassigned job
python job_assign.py --host 'https://app.cvat.ai' --token '<your token>' \
    --task-id 42
# round-robin across an explicit pool
python job_assign.py --host 'https://app.cvat.ai' --token '<your token>' \
    --task-id 42 --assignees alice bob
# pool = every organization member matching the search
python job_assign.py --host 'https://app.cvat.ai' --token '<your token>' \
    --task-id 42 --org 'annotators' --search 'annotator-team'
```

### The script

{{< include-code "assets/sdk-examples/job_assign.py" >}}

## Batch-advance completed jobs

Finds every job whose state is `completed` at `--from-stage` and moves each
one to the next stage (`annotation → validation → acceptance`). Optionally
restrict the sweep to a single task.

| Flag | Required | Meaning |
| --- | --- | --- |
| `--host` | yes | Server URL |
| `--token` | yes | Personal Access Token |
| `--from-stage` | yes | Advance completed jobs at this stage (`annotation` or `validation`) |
| `--task-id` | no | Restrict the sweep to a single task |

```bash
# send everything annotators finished into review
python job_workflow.py --host 'https://app.cvat.ai' --token '<your token>' \
    --from-stage annotation
# accept everything that passed review, scoped to one task
python job_workflow.py --host 'https://app.cvat.ai' --token '<your token>' \
    --from-stage validation --task-id 42
```

### The script

{{< include-code "assets/sdk-examples/job_workflow.py" >}}

_Other SDK options:_

| SDK method / parameter                                           | What it adds                                                                                             |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
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

- `stage` is one of `annotation`, `validation`, `acceptance`; `state` is one of
  `new`, `in progress`, `rejected`, `completed`.
- Jobs are created automatically with their task (controlled by `segment_size`
  at task creation) — you can update and assign them, but not create a job on
  its own.
- CVAT has no built-in auto-assignment, so `job_assign.py` is the scripted
  pattern.
- Full recipes:
  [`job_list.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/job_list.py),
  [`job_assign.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/job_assign.py),
  [`job_workflow.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/job_workflow.py).
