# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Aggregate what was annotated across a project: object counts per label and
per object type for every task, printed and written to a CSV report.

Steps:
  1. Retrieve the project and its label names.
  2. Walk the project's tasks and read each task's annotations.
  3. Count objects per (label, type), where the type is a shape type such as
     'rectangle' or 'polygon', 'tag' for tags, or 'track' for tracks.
  4. Print a per-task breakdown with per-label project totals, and write
     annotation_stats.csv into the current directory.

Usage (run ``python project_annotation_stats.py --help`` for the full list of options):
  python project_annotation_stats.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --project-id 7
"""

import argparse
import csv
from collections import Counter
from pathlib import Path

from cvat_sdk import make_client


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--host", required=True, help="CVAT server URL, e.g. 'https://app.cvat.ai'")
    parser.add_argument(
        "--token",
        required=True,
        help="Personal Access Token (CVAT UI: Profile -> Security)",
    )
    parser.add_argument(
        "--project-id", type=int, required=True, help="id of an existing project, e.g. 7"
    )
    return parser.parse_args()


def task_counts(task, label_names: dict[int, str]) -> Counter:
    """Objects per (label name, object type) in one task."""
    annotations = task.get_annotations()
    counts = Counter()
    for tag in annotations.tags:
        counts[(label_names[tag.label_id], "tag")] += 1
    for shape in annotations.shapes:
        counts[(label_names[shape.label_id], str(shape.type))] += 1
    for track in annotations.tracks:
        counts[(label_names[track.label_id], "track")] += 1
    return counts


def main() -> None:
    args = parse_args()
    report_path = Path("annotation_stats.csv")
    with make_client(args.host, access_token=args.token) as client:
        project = client.projects.retrieve(args.project_id)
        label_names = {label.id: label.name for label in project.get_labels()}
        tasks = project.get_tasks()

        label_totals = Counter()
        total = 0
        with report_path.open("w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["task_id", "task_name", "label", "type", "count"])
            for task in tasks:
                counts = task_counts(task, label_names)
                print(f"Task {task.id} {task.name!r}: {sum(counts.values())} objects")
                for (label, type_), count in sorted(counts.items()):
                    print(f"  {label}/{type_}: {count}")
                    writer.writerow([task.id, task.name, label, type_, count])
                    label_totals[label] += count
                total += sum(counts.values())

        print(f"Project {project.id}: {total} objects across {len(tasks)} tasks")
        for label, count in sorted(label_totals.items()):
            print(f"  {label}: {count}")
        print(f"Wrote {report_path.resolve()}")


if __name__ == "__main__":
    main()
