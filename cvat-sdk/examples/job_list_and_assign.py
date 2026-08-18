# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

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

        task = client.tasks.retrieve(TASK_ID)
        unassigned = client.jobs.list(filter=all_(F.task_id == TASK_ID, not_(F.assignee.is_set())))
        print(f"Unassigned jobs: {[job.id for job in unassigned]} out of {task.jobs.count}")

        # 3. Round-robin assignment. To pull a team automatically instead of
        # passing ids, use client.users.list(...).
        assignees = ASSIGNEE_IDS or [client.users.retrieve_current_user().id]
        for i, job in enumerate(unassigned):
            user_id = assignees[i % len(assignees)]
            job.update(models.PatchedJobWriteRequest(assignee=user_id))
            print(f"Assigned job {job.id} -> user {user_id}")


if __name__ == "__main__":
    main()
