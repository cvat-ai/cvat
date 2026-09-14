# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Find objects annotated twice: shapes on the same frame whose bounding boxes
overlap by at least --iou-threshold.

Duplicates appear when an import runs twice, when two annotators' job ranges
overlap, or after a merge. Exact copies are the easy case; the ones that hurt
are the near-identical boxes nobody spots by eye, so the recipe compares by
intersection over union instead of by equality.

The recipe only reports. It exits 1 when it finds a duplicate, so it can gate
an export pipeline; --no-fail turns that off.

Steps:
  1. Retrieve the project, its labels, and the tasks to inspect.
  2. For each task, read the annotations and the job that owns each frame.
  3. Group each frame's objects by IoU and keep the groups with more than one.
  4. Print the groups, write the CSV report, and set the exit code.

Usage (run ``python project_data_lint.py --help`` for the full list of options):
  python project_data_lint.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --project-id 7 --iou-threshold 0.8
"""

import argparse
import csv
import sys
from collections import defaultdict
from dataclasses import asdict, dataclass, fields
from itertools import groupby
from pathlib import Path

from cvat_sdk import make_client

# Types whose `points` are plain x/y pairs, so a bounding box can be computed
# from them. Masks, skeletons, ellipses and cuboids are skipped.
COMPARABLE_TYPES = {"rectangle", "polygon", "polyline", "points"}


@dataclass
class Annotated:
    """One annotated object, reduced to what the duplicate search compares."""

    frame: int
    label_id: int
    type: str
    shape_id: int | str
    track_id: int | str
    box: tuple[float, float, float, float]


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
    iou: float
    box: str


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
        "--iou-threshold",
        type=float,
        default=0.9,
        help="two objects are duplicates when their bounding boxes overlap by at least "
        "this much (default: %(default)s)",
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
    args = parser.parse_args()
    if not 0 < args.iou_threshold <= 1:
        parser.error("--iou-threshold must be greater than 0 and at most 1")
    return args


def bounding_box(points: list[float]) -> tuple[float, float, float, float]:
    xs, ys = points[0::2], points[1::2]
    return min(xs), min(ys), max(xs), max(ys)


def iou(first: tuple[float, ...], second: tuple[float, ...]) -> float:
    """Intersection over union of two bounding boxes."""
    width = min(first[2], second[2]) - max(first[0], second[0])
    height = min(first[3], second[3]) - max(first[1], second[1])
    intersection = max(0.0, width) * max(0.0, height)

    first_area = (first[2] - first[0]) * (first[3] - first[1])
    second_area = (second[2] - second[0]) * (second[3] - second[1])
    union = first_area + second_area - intersection
    if union == 0:
        # Neither box has an area: a zero-size shape, or a polyline drawn along
        # one axis. Such objects are duplicates only if they sit in exactly the
        # same place, because IoU cannot tell them apart.
        return 1.0 if first == second else 0.0
    return intersection / union


def iter_objects(annotations):
    """The shapes and the track keyframes the recipe can compare.

    Objects marked `outside` are skipped: they are intentionally out of view.
    Tags are skipped too - they have no geometry to overlap.
    """
    for shape in annotations.shapes:
        if getattr(shape, "outside", False) or str(shape.type) not in COMPARABLE_TYPES:
            continue
        yield Annotated(
            frame=shape.frame,
            label_id=shape.label_id,
            type=str(shape.type),
            shape_id=getattr(shape, "id", "") or "",
            track_id="",
            box=bounding_box(list(shape.points)),
        )
    for track in annotations.tracks:
        for shape in track.shapes:
            if shape.outside or str(shape.type) not in COMPARABLE_TYPES:
                continue
            yield Annotated(
                frame=shape.frame,
                label_id=track.label_id,
                type=str(shape.type),
                shape_id=getattr(shape, "id", "") or "",
                track_id=getattr(track, "id", "") or "",
                box=bounding_box(list(shape.points)),
            )


def group_duplicates(objects: list[Annotated], iou_threshold: float, same_label: bool):
    """Groups of objects that annotate the same thing, as lists of
    (object, IoU with the group's first object).

    Every candidate is compared against the group's first object rather than
    against every member: a duplicate is a second copy of one original, and
    chaining through intermediates would merge a whole row of adjacent objects
    into one group.
    """
    groups: list[list[tuple[Annotated, float]]] = []
    for obj in objects:
        for group in groups:
            first, _ = group[0]
            if same_label and first.label_id != obj.label_id:
                continue
            score = iou(first.box, obj.box)
            if score >= iou_threshold:
                group.append((obj, score))
                break
        else:
            # The first object of a group is its own reference, so its IoU is 1.
            groups.append([(obj, 1.0)])
    return [group for group in groups if len(group) > 1]


def find_duplicates(
    task, label_names: dict[int, str], iou_threshold: float, same_label: bool
) -> list[Duplicate]:
    """The duplicate objects of one task, numbered by group."""
    job_of_frame = {}
    for job in task.get_jobs():
        for frame in range(job.start_frame, job.stop_frame + 1):
            job_of_frame.setdefault(frame, job.id)

    by_frame = defaultdict(list)
    for obj in iter_objects(task.get_annotations()):
        by_frame[obj.frame].append(obj)

    duplicates = []
    group_number = 0
    for frame in sorted(by_frame):
        for group in group_duplicates(by_frame[frame], iou_threshold, same_label):
            group_number += 1
            for obj, score in group:
                duplicates.append(
                    Duplicate(
                        task_id=task.id,
                        job_id=job_of_frame.get(frame, ""),
                        frame=frame,
                        group=group_number,
                        label=label_names[obj.label_id],
                        type=obj.type,
                        shape_id=obj.shape_id,
                        track_id=obj.track_id,
                        iou=round(score, 3),
                        box=",".join(f"{value:.1f}" for value in obj.box),
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
            duplicates.extend(
                find_duplicates(task, label_names, args.iou_threshold, not args.any_label)
            )

    groups = 0
    for _, members in groupby(duplicates, key=lambda d: (d.task_id, d.group)):
        members = list(members)
        first = members[0]
        groups += 1
        print(
            f"duplicate group {first.group} in task {first.task_id}, "
            f"frame {first.frame}: {len(members)} objects"
        )
        for member in members:
            origin = (
                f"track {member.track_id}" if member.track_id != "" else f"shape {member.shape_id}"
            )
            suffix = "" if member is first else f" (IoU {member.iou})"
            print(f"  {member.label} {member.type} {origin} at {member.box}{suffix}")

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
