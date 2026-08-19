# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

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
  python job_workflow.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --from-stage annotation
  # Accept everything that passed review, scoped to one task:
  python job_workflow.py --host 'https://app.cvat.ai' --token '<your token>' \\
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
