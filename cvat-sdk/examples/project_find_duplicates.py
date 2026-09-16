# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Find objects annotated twice: objects on the same frame that have the same
label, the same shape type, and exactly the same coordinates.

Duplicates appear when an import runs twice, when two annotators' job ranges
overlap, or after a merge. Shapes whose coordinates differ are different
objects, so the comparison is an exact one and needs no similarity threshold.

The recipe only reports. It exits 1 when it finds a duplicate, so it can gate
an export pipeline; --no-fail turns that off.

Steps:
  1. Retrieve the project, its labels, and the tasks to inspect.
  2. For each task, read the annotations and the job that owns each frame.
  3. Group each frame's objects by (label, type, coordinates) and keep the
     groups with more than one member.
  4. Print the groups, write the CSV report, and set the exit code.

Usage (run ``python project_find_duplicates.py --help`` for the full list of options):
  python project_find_duplicates.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --project-id 7
"""

import argparse
import csv
import sys
from collections import defaultdict
from dataclasses import asdict, dataclass, fields
from itertools import groupby
from pathlib import Path

from cvat_sdk import make_client


@dataclass
class Annotated:
    """One annotated object, reduced to what the duplicate search compares."""

    frame: int
    label_id: int
    type: str
    shape_id: int | str
    track_id: int | str
    points: tuple[float, ...]


@dataclass
class Duplicate:
    """One member of a duplicate group, as reported and written to the CSV."""

    task_id: int
    job_id: int | str
    frame: int
    group: int
    label: str
    type: str
    shape_id: int | str
    track_id: int | str
    points: str


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
    parser.add_argument(
        "--task-id",
        type=int,
        nargs="+",
        metavar="ID",
        help="inspect only these task ids (must belong to the project); "
        "omit to inspect every task in the project",
    )
    parser.add_argument(
        "--any-label",
        action="store_true",
        help="also group objects that carry different labels, e.g. the same car "
        "annotated once as 'car' and once as 'vehicle'",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("duplicates.csv"),
        help="path to write the CSV report to (default: %(default)s)",
    )
    parser.add_argument(
        "--no-fail", action="store_true", help="always exit 0, even when duplicates were found"
    )
    return parser.parse_args()


def iter_objects(annotations):
    """The shapes and the track keyframes the recipe compares.

    Objects marked `outside` are skipped: they are intentionally out of view.
    Tags are skipped too - they have no coordinates to compare.
    """
    for shape in annotations.shapes:
        if getattr(shape, "outside", False):
            continue
        yield Annotated(
            frame=shape.frame,
            label_id=shape.label_id,
            type=str(shape.type),
            shape_id=getattr(shape, "id", "") or "",
            track_id="",
            points=tuple(shape.points),
        )
    for track in annotations.tracks:
        for shape in track.shapes:
            if shape.outside:
                continue
            yield Annotated(
                frame=shape.frame,
                label_id=track.label_id,
                type=str(shape.type),
                shape_id=getattr(shape, "id", "") or "",
                track_id=getattr(track, "id", "") or "",
                points=tuple(shape.points),
            )


def format_points(points: tuple[float, ...], limit: int = 8) -> str:
    """The coordinates as text, cut short: a mask's points are a whole RLE."""
    head = ",".join(f"{value:.2f}" for value in points[:limit])
    return f"{head},..." if len(points) > limit else head


def find_duplicates(task, label_names: dict[int, str], same_label: bool) -> list[Duplicate]:
    """The duplicate objects of one task, numbered by group.

    Two objects are duplicates when they sit on the same frame and share the
    shape type and the coordinates, so the objects can be bucketed by that key
    in one pass instead of compared pairwise.
    """
    job_of_frame = {}
    for job in task.get_jobs():
        for frame in range(job.start_frame, job.stop_frame + 1):
            job_of_frame.setdefault(frame, job.id)

    groups: dict[tuple, list[Annotated]] = defaultdict(list)
    for obj in iter_objects(task.get_annotations()):
        label_part = obj.label_id if same_label else None
        groups[(obj.frame, label_part, obj.type, obj.points)].append(obj)

    duplicates = []
    group_number = 0
    for key in sorted(groups, key=lambda key: key[0]):
        members = groups[key]
        if len(members) < 2:
            continue
        group_number += 1
        for obj in members:
            duplicates.append(
                Duplicate(
                    task_id=task.id,
                    job_id=job_of_frame.get(obj.frame, ""),
                    frame=obj.frame,
                    group=group_number,
                    label=label_names[obj.label_id],
                    type=obj.type,
                    shape_id=obj.shape_id,
                    track_id=obj.track_id,
                    points=format_points(obj.points),
                )
            )
    return duplicates


def select_tasks(client, project, task_ids: list[int] | None) -> list:
    """The project's tasks, or just the requested ones.

    With --task-id the tasks are retrieved by id: listing every task of a large
    project only to throw most of them away would be a waste.
    """
    if not task_ids:
        return list(project.get_tasks())

    tasks = []
    for task_id in task_ids:
        try:
            task = client.tasks.retrieve(task_id)
        except Exception:
            task = None
        if task is None or task.project_id != project.id:
            sys.exit(f"Task id {task_id} was not found in project {project.id}")
        tasks.append(task)
    return tasks


def main() -> None:
    args = parse_args()
    with make_client(args.host, access_token=args.token) as client:
        project = client.projects.retrieve(args.project_id)
        label_names = {label.id: label.name for label in project.get_labels()}

        tasks = select_tasks(client, project, args.task_id)
        if not tasks:
            sys.exit(f"Project {project.id} has no tasks to inspect")

        duplicates: list[Duplicate] = []
        for task in tasks:
            duplicates.extend(find_duplicates(task, label_names, not args.any_label))

    groups = 0
    for _, members in groupby(duplicates, key=lambda d: (d.task_id, d.group)):
        members = list(members)
        first = members[0]
        groups += 1
        print(
            f"duplicate group {first.group} in task {first.task_id}, frame {first.frame}: "
            f"{len(members)} objects at {first.points}"
        )
        for member in members:
            origin = (
                f"track {member.track_id}" if member.track_id != "" else f"shape {member.shape_id}"
            )
            print(f"  {member.label} {member.type} {origin}")

    with args.output.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=[field.name for field in fields(Duplicate)])
        writer.writeheader()
        writer.writerows(asdict(duplicate) for duplicate in duplicates)

    print(f"Found {groups} duplicate group(s), {len(duplicates)} object(s)")
    print(f"Wrote {args.output.resolve()}")
    if duplicates and not args.no_fail:
        sys.exit(1)


if __name__ == "__main__":
    main()
