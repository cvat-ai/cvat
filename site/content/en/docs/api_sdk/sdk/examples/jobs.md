---
title: 'Job recipes'
linkTitle: 'Jobs'
weight: 4
description: 'List a task jobs, round-robin unassigned jobs, batch-advance completed jobs'
---

Three recipes: `job_list.py` lists a task's jobs with optional stage/state
filters, `job_assign.py` round-robins unassigned jobs across a resolved pool
of users and writes a CSV report, and `job_workflow.py` batch-advances every
completed job at a given stage to the next stage.

## List a task's jobs

Queries the jobs of a task with optional server-side `--stage` / `--state`
filters, ordered by most recently updated.

| Flag | Required | Meaning |
| --- | --- | --- |
| `--host` | yes | Server URL |
| `--token` | yes | Personal Access Token |
| `--task-id` | yes | Id of the task whose jobs to list |
| `--stage` | no | Only jobs at this stage, e.g. `annotation` |
| `--state` | no | Only jobs in this state, e.g. `new` |

```bash
python job_list.py --host 'https://app.cvat.ai' --token '<your token>' \
    --task-id 42
python job_list.py --host 'https://app.cvat.ai' --token '<your token>' \
    --task-id 42 --stage annotation --state new
```

### The script

```python
"""List the jobs of an existing task with their stage, state, and assignee.

Steps:
  1. Query jobs of the task, most recently updated first. --stage / --state
     filter server-side, so large tasks stay cheap. The same endpoint also
     accepts free-text search, e.g. search='alice'.
  2. Print one row per job.

Usage (run ``python job_list.py --help`` for the full list of options):
  python job_list.py --host 'https://app.cvat.ai' --token '<your token>' \
      --task-id 42
  python job_list.py --host 'https://app.cvat.ai' --token '<your token>' \
      --task-id 42 --stage annotation --state new
"""

import argparse

from cvat_sdk import make_client
from cvat_sdk.core.filters import F, all_


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
        "--task-id", type=int, required=True, help="id of an existing task, e.g. 42"
    )
    parser.add_argument("--stage", help="only jobs at this stage, e.g. 'annotation'")
    parser.add_argument("--state", help="only jobs in this state, e.g. 'new'")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    with make_client(args.host, access_token=args.token) as client:
        conditions = [F.task_id == args.task_id]
        if args.stage:
            conditions.append(F.stage == args.stage)
        if args.state:
            conditions.append(F.state == args.state)

        jobs = client.jobs.list(filter=all_(*conditions), sort="-updated_date")
        print(f"Task {args.task_id}: {len(jobs)} matching jobs")
        for job in jobs:
            assignee = job.assignee.username if job.assignee else "-"
            print(f"  job {job.id}: stage={job.stage}, state={job.state}, assignee={assignee}")


if __name__ == "__main__":
    main()
```

## Round-robin assign a task's jobs

Distributes the unassigned jobs of a task across a resolved user pool and
writes `assignments.csv` (`job_id, previous_assignee, new_assignee,
new_assignee_id`). The pool is resolved by looking up usernames exactly with
`--assignees`, by server-side search with `--search`, or self-assigns if
neither is passed.

| Flag | Required | Meaning |
| --- | --- | --- |
| `--host` | yes | Server URL |
| `--token` | yes | Personal Access Token |
| `--task-id` | yes | Id of the task |
| `--assignees USERNAME [...]` | no | Usernames to round-robin (exact match) |
| `--search QUERY` | no | Server-side user search; every match becomes an assignee |

`--assignees` and `--search` are mutually exclusive. Omit both to self-assign.

```bash
# self-assign every unassigned job
python job_assign.py --host 'https://app.cvat.ai' --token '<your token>' \
    --task-id 42
# round-robin across an explicit pool
python job_assign.py --host 'https://app.cvat.ai' --token '<your token>' \
    --task-id 42 --assignees alice bob
# pool = every user matching the search
python job_assign.py --host 'https://app.cvat.ai' --token '<your token>' \
    --task-id 42 --search 'annotator-team'
```

### The script

```python
"""Round-robin the unassigned jobs of a task across a set of annotators and
write a CSV report of the assignments (job_id, previous_assignee, new_assignee).

The user API supports server-side search, so you rarely need to know user ids —
pass usernames (or a search query) and let the recipe resolve them.

Steps:
  1. Resolve the assignee pool:
       --assignees USERNAME [USERNAME ...] : look up each username exactly.
       --search QUERY                      : run client.users.list(search=QUERY),
                                             print the matches, use them all.
       neither                             : assign to me (the authenticated user).
  2. Filter the task's unassigned jobs.
  3. Round-robin the jobs across the resolved users.
  4. Write assignments.csv into the current directory.

Usage (run ``python job_assign.py --help`` for the full list of options):
  python job_assign.py --host 'https://app.cvat.ai' --token '<your token>' \
      --task-id 42                              # self-assign
  python job_assign.py --host 'https://app.cvat.ai' --token '<your token>' \
      --task-id 42 --assignees alice bob
  python job_assign.py --host 'https://app.cvat.ai' --token '<your token>' \
      --task-id 42 --search 'annotator-team'    # pool = every match of the search
"""

import argparse
import csv
import sys
from pathlib import Path

from cvat_sdk import make_client, models
from cvat_sdk.core.filters import F, all_, not_
from cvat_sdk.core.proxies.users import User


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
        "--task-id", type=int, required=True, help="id of an existing task, e.g. 42"
    )
    group = parser.add_mutually_exclusive_group()
    group.add_argument(
        "--assignees",
        nargs="+",
        metavar="USERNAME",
        help="usernames to round-robin across (looked up exactly on the server)",
    )
    group.add_argument(
        "--search",
        metavar="QUERY",
        help="server-side user search; every match becomes an assignee",
    )
    return parser.parse_args()


def resolve_pool(client, args: argparse.Namespace) -> list[User]:
    """Resolve --assignees / --search / nothing to a list of User objects."""
    if args.search:
        matches = client.users.list(search=args.search)
        if not matches:
            sys.exit(f"No users matched search {args.search!r}")
        print(f"Users matching {args.search!r}:")
        for user in matches:
            print(f"  {user.id}\t{user.username}")
        return matches

    if args.assignees:
        pool: list[User] = []
        for username in args.assignees:
            found = client.users.list(filter=F.username == username)
            if not found:
                sys.exit(f"User {username!r} not found")
            pool.append(found[0])
        return pool

    me = client.users.retrieve_current_user()
    print(f"No --assignees / --search; self-assigning as {me.username} (id={me.id})")
    return [me]


def main() -> None:
    args = parse_args()
    report_path = Path("assignments.csv")
    with make_client(args.host, access_token=args.token) as client:
        pool = resolve_pool(client, args)

        unassigned = client.jobs.list(
            filter=all_(F.task_id == args.task_id, not_(F.assignee.is_set()))
        )
        print(f"Task {args.task_id}: {len(unassigned)} unassigned jobs to distribute")

        with report_path.open("w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["job_id", "previous_assignee", "new_assignee", "new_assignee_id"])
            for i, job in enumerate(unassigned):
                user = pool[i % len(pool)]
                previous = job.assignee.username if job.assignee else ""
                job.update(models.PatchedJobWriteRequest(assignee=user.id))
                writer.writerow([job.id, previous, user.username, user.id])
                print(f"Assigned job {job.id} -> {user.username} (id={user.id})")

        print(f"Wrote {report_path.resolve()}")


if __name__ == "__main__":
    main()
```

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

```python
"""Batch-advance completed jobs to the next workflow stage

Find every job whose state is 'completed' at --from-stage, move each one to
the next stage, and print the list of modified jobs. Optionally restrict the
sweep to a single task with --task-id.

Steps:
  1. Query jobs matching (stage == --from-stage, state == 'completed').
  2. Update each job's stage to the next one in the workflow.
  3. Print the modified job ids.

Usage (run ``python job_workflow.py --help`` for the full list of options):
  # Send everything annotators finished into review:
  python job_workflow.py --host 'https://app.cvat.ai' --token '<your token>' \
      --from-stage annotation
  # Accept everything that passed review, scoped to one task:
  python job_workflow.py --host 'https://app.cvat.ai' --token '<your token>' \
      --from-stage validation --task-id 42
"""

import argparse

from cvat_sdk import make_client, models
from cvat_sdk.core.filters import F, all_

NEXT_STAGE = {"annotation": "validation", "validation": "acceptance"}


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
        "--from-stage",
        required=True,
        choices=sorted(NEXT_STAGE),
        help="advance completed jobs currently at this stage",
    )
    parser.add_argument(
        "--task-id",
        type=int,
        help="restrict the sweep to a single task (default: every task you can see)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    to_stage = NEXT_STAGE[args.from_stage]

    with make_client(args.host, access_token=args.token) as client:
        conditions = [F.stage == args.from_stage, F.state == "completed"]
        if args.task_id is not None:
            conditions.append(F.task_id == args.task_id)

        jobs = client.jobs.list(filter=all_(*conditions))
        print(f"Found {len(jobs)} completed jobs at stage {args.from_stage!r}")

        for job in jobs:
            job.update(models.PatchedJobWriteRequest(stage=to_stage))
            print(f"  job {job.id}: {args.from_stage} -> {to_stage}")

        print(f"Moved {len(jobs)} jobs to stage {to_stage!r}")


if __name__ == "__main__":
    main()
```

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
