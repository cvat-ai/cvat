# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""List the jobs of an existing task or project with their stage, state, and
assignee, optionally as a CSV report.

Steps:
  1. Query jobs scoped to --task-id or --project-id, most recently updated
     first. --stage / --state filter server-side, so large tasks/projects
     stay cheap. The same endpoint also accepts free-text search, e.g.
     search='alice'.
  2. Print one row per job.
  3. If --csv is passed, also write report.csv into the current directory
     (project_id, project_name, task_id, task_name, job_id, stage, state,
     assignee, frames).

Usage (run ``python job_list.py --help`` for the full list of options):
  python job_list.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --task-id 42
  python job_list.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --task-id 42 --stage annotation --state new
  python job_list.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --project-id 7 --csv
"""

import argparse
import csv
from collections.abc import Iterable
from pathlib import Path

from cvat_sdk import make_client
from cvat_sdk.core.filters import F, all_
from cvat_sdk.core.proxies.jobs import Job


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=" ".join(__doc__.splitlines()[:2]))
    parser.add_argument("--host", required=True, help="CVAT server URL, e.g. 'https://app.cvat.ai'")
    parser.add_argument(
        "--token",
        required=True,
        help="Personal Access Token (CVAT UI: Profile -> Security)",
    )
    scope = parser.add_mutually_exclusive_group(required=True)
    scope.add_argument("--task-id", type=int, help="id of an existing task, e.g. 42")
    scope.add_argument("--project-id", type=int, help="id of an existing project, e.g. 7")
    parser.add_argument("--stage", help="only jobs at this stage, e.g. 'annotation'")
    parser.add_argument("--state", help="only jobs in this state, e.g. 'new'")
    parser.add_argument(
        "--csv", action="store_true", help="also write report.csv into the current directory"
    )
    return parser.parse_args()


def write_report(jobs: Iterable[Job], path: Path) -> None:
    with path.open("w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(
            [
                "project_id",
                "project_name",
                "task_id",
                "task_name",
                "job_id",
                "stage",
                "state",
                "assignee",
                "frames",
            ]
        )
        for job in jobs:
            assignee = job.assignee.username if job.assignee else ""
            writer.writerow(
                [
                    job.project_id or "",
                    job.project_name or "",
                    job.task_id,
                    job.task_name,
                    job.id,
                    job.stage,
                    job.state,
                    assignee,
                    job.stop_frame - job.start_frame + 1,
                ]
            )


def main() -> None:
    args = parse_args()
    with make_client(args.host, access_token=args.token) as client:
        if args.task_id is not None:
            conditions = [F.task_id == args.task_id]
            scope_label = f"Task {args.task_id}"
        else:
            conditions = [F.project_id == args.project_id]
            scope_label = f"Project {args.project_id}"
        if args.stage:
            conditions.append(F.stage == args.stage)
        if args.state:
            conditions.append(F.state == args.state)

        jobs = client.jobs.list(filter=all_(*conditions), sort="-updated_date")
        print(f"{scope_label}: {len(jobs)} matching jobs")
        for job in jobs:
            assignee = job.assignee.username if job.assignee else "-"
            print(f"  job {job.id}: stage={job.stage}, state={job.state}, assignee={assignee}")

        if args.csv:
            report_path = Path("report.csv")
            write_report(jobs, report_path)
            print(f"Wrote {report_path.resolve()}")


if __name__ == "__main__":
    main()
