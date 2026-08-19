# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Write a CSV status report for an existing project: one row per job, with
task, stage, state, assignee, and frame count — a quick management overview.

Steps:
  1. Retrieve the project by id (for its name in the report).
  2. List every job in the project with one server call.
  3. Write report.csv into the current directory.

Usage (run ``python project_status_report.py --help`` for the full list of options):
  python project_status_report.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --project-id 42
"""

import argparse
import csv
from collections.abc import Iterable
from pathlib import Path

from cvat_sdk import make_client
from cvat_sdk.core.filters import F
from cvat_sdk.core.proxies.jobs import Job
from cvat_sdk.core.proxies.projects import Project


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--host", required=True, help="CVAT server URL, e.g. 'https://app.cvat.ai'")
    parser.add_argument(
        "--token",
        required=True,
        help="Personal Access Token (CVAT UI: Profile -> Security)",
    )
    parser.add_argument(
        "--project-id", type=int, required=True, help="id of an existing project, e.g. 42"
    )
    return parser.parse_args()


def write_report(project: Project, jobs: Iterable[Job], path: Path) -> None:
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
                    project.id,
                    project.name,
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
    report_path = Path("report.csv")
    with make_client(args.host, access_token=args.token) as client:
        project = client.projects.retrieve(args.project_id)
        print(f"Reporting on project {project.id}: {project.name!r}")
        # One server call for every job in the project; each job carries
        # task_id/task_name/assignee, so no per-task fetch is needed.
        jobs = client.jobs.list(filter=F.project_id == args.project_id)
        write_report(project, jobs, report_path)
        print(f"Wrote {report_path.resolve()}")


if __name__ == "__main__":
    main()
