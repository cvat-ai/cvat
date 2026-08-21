# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Inspect an existing task (labels, jobs, frames), export its dataset to a
local zip, and export its event log to report quick analytics.

Steps:
  1. Retrieve the task and print a summary: labels, jobs (stage/state), frames.
  2. Fetch the server's export format list and validate --export-format.
  3. Export the dataset to task_<id>_dataset.zip in the current directory.
  4. Export the task's event log to task_<id>_events.csv and report two
     analytics: how many people are currently assigned to a job, and how
     many jobs were rejected in review and sent back for rework - the second
     one needs the log, since a job's current state doesn't show its history.

Usage (run ``python task_inspect_and_export.py --help`` for the full list of options):
  python task_inspect_and_export.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --task-id 42 --export-format 'COCO 1.0'
"""

import argparse
import csv
import sys
from pathlib import Path

from cvat_sdk import make_client
from cvat_sdk.core.downloading import Downloader
from cvat_sdk.core.proxies.types import Location


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=" ".join(__doc__.splitlines()[:2]))
    parser.add_argument("--host", required=True, help="CVAT server URL, e.g. 'https://app.cvat.ai'")
    parser.add_argument(
        "--token",
        required=True,
        help="Personal Access Token (CVAT UI: Profile -> Security)",
    )
    parser.add_argument(
        "--task-id", type=int, required=True, help="id of an existing task, e.g. 42"
    )
    parser.add_argument(
        "--export-format",
        default="COCO 1.0",
        help="exporter name, e.g. 'COCO 1.0' (default: '%(default)s')",
    )
    return parser.parse_args()


def count_reworks(events_path: Path) -> int:
    """Count how many times a job in the log was rejected in review, i.e. sent
    back to the annotator for rework. A job's current state only shows where
    it stands now, not how many times it got there, so this needs the log.
    """
    with events_path.open(newline="") as f:
        return sum(
            1
            for row in csv.DictReader(f)
            if row["scope"] == "update:job"
            and row["obj_name"] == "state"
            and row["obj_val"] == "rejected"
        )


def main() -> None:
    args = parse_args()
    with make_client(args.host, access_token=args.token) as client:
        # 1. Inspect
        task = client.tasks.retrieve(args.task_id)
        jobs = task.get_jobs()
        print(f"Task {task.id}: {task.name!r}, {task.size} frames")
        print(f"  labels: {[label.name for label in task.get_labels()]}")
        for job in jobs:
            print(f"  job {job.id}: stage={job.stage}, state={job.state}")

        # 2. Validate the export format against the server's list.
        # Low-level API: there is no high-level proxy for the format list yet.
        formats, _ = client.api_client.server_api.retrieve_annotation_formats()
        names = [f.name for f in formats.exporters]
        if args.export_format not in names:
            sys.exit(
                f"Unknown export format {args.export_format!r}. Choose one of: {', '.join(names)}"
            )

        # 3. Export the dataset to a local zip
        local_path = Path(f"task_{task.id}_dataset.zip")
        task.export_dataset(
            args.export_format, local_path, include_images=False, location=Location.LOCAL
        )
        print(f"Exported {local_path.resolve()}")

        # 4. Export the task's event log and report quick analytics.
        # Low-level API: there is no high-level proxy for events yet.
        events_path = Path(f"task_{task.id}_events.csv")
        Downloader(client).prepare_and_download_file_from_endpoint(
            client.api_client.events_api.create_export_endpoint,
            events_path,
            query_params={"task_id": task.id},
        )
        print(f"Exported {events_path.resolve()}")

        assigned = {job.assignee.id for job in jobs if job.assignee}
        print(f"  {len(assigned)} people currently assigned, {count_reworks(events_path)} reworks")


if __name__ == "__main__":
    main()
