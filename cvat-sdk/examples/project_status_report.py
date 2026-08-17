# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Write a CSV status report for an existing project: one row per job, with
task, stage, state, assignee, and frame count — a quick management overview.

Steps:
  1. Retrieve the project by id.
  2. Walk its tasks and their jobs.
  3. Write report.csv into the current directory.

Usage:
  export CVAT_HOST=https://app.cvat.ai
  export CVAT_ACCESS_TOKEN=...    # CVAT UI: Profile -> Security
  export CVAT_PROJECT_ID=42      # an existing project id
  python project_status_report.py
"""

import csv
import os
import sys
from pathlib import Path

from cvat_sdk import make_client
from cvat_sdk.core.proxies.projects import Project


def require_env(name: str, hint: str) -> str:
    value = os.environ.get(name)
    if not value:
        sys.exit(f"Set the {name} environment variable: {hint}")
    return value


HOST = require_env("CVAT_HOST", "your CVAT server URL, e.g. https://app.cvat.ai")
TOKEN = require_env("CVAT_ACCESS_TOKEN", "create one in the CVAT UI: Profile -> Security")
PROJECT_ID = int(require_env("CVAT_PROJECT_ID", "id of an existing project, e.g. 42"))
REPORT_PATH = Path("report.csv")


def write_report(project: Project, path: Path) -> None:
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
        for task in project.get_tasks():
            for job in task.get_jobs():
                assignee = job.assignee.username if job.assignee else ""
                writer.writerow(
                    [
                        project.id,
                        project.name,
                        task.id,
                        task.name,
                        job.id,
                        job.stage,
                        job.state,
                        assignee,
                        task.size,
                    ]
                )


def main() -> None:
    with make_client(HOST, access_token=TOKEN) as client:
        project = client.projects.retrieve(PROJECT_ID)
        print(f"Reporting on project {project.id}: {project.name!r}")
        write_report(project, REPORT_PATH)
        print(f"Wrote {REPORT_PATH.resolve()}")


if __name__ == "__main__":
    main()
