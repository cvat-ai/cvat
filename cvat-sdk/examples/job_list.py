# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""List the jobs of an existing task with their stage, state, and assignee.

Steps:
  1. Query jobs of the task, most recently updated first. --stage / --state
     filter server-side, so large tasks stay cheap. The same endpoint also
     accepts free-text search, e.g. search='alice'.
  2. Print one row per job.

Usage (run ``python job_list.py --help`` for the full list of options):
  python job_list.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --task-id 42
  python job_list.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --task-id 42 --stage annotation --state new
"""

import argparse

from cvat_sdk import make_client
from cvat_sdk.core.filters import F, all_


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--host", required=True, help="CVAT server URL, e.g. 'https://app.cvat.ai'")
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
