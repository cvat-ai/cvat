# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Lint a project's annotations before exporting them: find shapes that leave the
frame, boxes with (almost) no area, duplicated objects, frames nobody annotated,
jobs marked completed with nothing in them, and labels nobody used.

Every finding has a severity. The script exits 1 when any error-severity finding
exists, so it can gate a pipeline; --no-fail turns that off.

Steps:
  1. Retrieve the project, its labels, and the tasks to inspect.
  2. For each task, read the frame sizes, the jobs, and the annotations.
  3. Run the checks and collect the findings.
  4. Print them grouped by severity, write the CSV report, and set the exit code.

Usage (run ``python project_data_lint.py --help`` for the full list of options):
  python project_data_lint.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --project-id 7 --min-box-area 16
"""

import argparse
import csv
import sys
from collections import Counter
from dataclasses import asdict, dataclass, fields
from pathlib import Path

from cvat_sdk import make_client

# Shapes whose points are plain x/y pairs. Masks carry RLE data and skeletons carry
# their points in sub-elements, so the geometry checks skip them.
GEOMETRY_TYPES = {"rectangle", "polygon", "polyline", "points"}
SEVERITY_ORDER = {"error": 0, "warning": 1, "info": 2}


@dataclass
class Finding:
    severity: str
    check: str
    # Project-wide findings leave the location fields empty, hence the str union.
    task_id: int | str
    job_id: int | str
    frame: int | str
    label: str
    detail: str


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
        help="lint only these task ids (must belong to the project); "
        "omit to lint every task in the project",
    )
    parser.add_argument(
        "--min-box-area",
        type=float,
        default=4.0,
        help="rectangles smaller than this many square pixels are errors (default: %(default)s)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("data_lint.csv"),
        help="path to write the CSV report to (default: %(default)s)",
    )
    parser.add_argument(
        "--no-fail", action="store_true", help="always exit 0, even when errors were found"
    )
    return parser.parse_args()


def iter_objects(annotations):
    """(frame, label_id, type, points) for tags, shapes, and every track keyframe.

    Objects marked `outside` are skipped: they are intentionally out of view.
    """
    for tag in annotations.tags:
        yield tag.frame, tag.label_id, "tag", []
    for shape in annotations.shapes:
        if getattr(shape, "outside", False):
            continue
        yield shape.frame, shape.label_id, str(shape.type), list(shape.points)
    for track in annotations.tracks:
        for shape in track.shapes:
            if shape.outside:
                continue
            yield shape.frame, track.label_id, str(shape.type), list(shape.points)


def lint_task(task, label_names: dict[int, str], min_box_area: float):
    """The findings for one task, plus how often each label was used in it."""
    frames = task.get_frames_info()
    jobs = task.get_jobs()
    job_of_frame = {}
    for job in jobs:
        for frame in range(job.start_frame, job.stop_frame + 1):
            job_of_frame.setdefault(frame, job.id)

    findings: list[Finding] = []
    label_usage = Counter()
    annotated_frames = set()
    seen = set()

    for frame, label_id, type_, points in iter_objects(task.get_annotations()):
        label = label_names.get(label_id, str(label_id))
        label_usage[label] += 1
        annotated_frames.add(frame)
        job_id = job_of_frame.get(frame, "")

        key = (frame, label_id, type_, tuple(round(value, 3) for value in points))
        if points and key in seen:
            findings.append(
                Finding(
                    "error",
                    "duplicate-object",
                    task.id,
                    job_id,
                    frame,
                    label,
                    f"a second {type_} with identical points on this frame",
                )
            )
        seen.add(key)

        if frame >= len(frames):
            continue
        meta = frames[frame]

        if type_ in GEOMETRY_TYPES and points:
            xs, ys = points[0::2], points[1::2]
            if min(xs) < 0 or min(ys) < 0 or max(xs) > meta.width or max(ys) > meta.height:
                findings.append(
                    Finding(
                        "error",
                        "out-of-bounds",
                        task.id,
                        job_id,
                        frame,
                        label,
                        f"{type_} spans x {min(xs):.1f}..{max(xs):.1f}, "
                        f"y {min(ys):.1f}..{max(ys):.1f} in a {meta.width}x{meta.height} frame",
                    )
                )

        if type_ == "rectangle" and len(points) == 4:
            area = abs(points[2] - points[0]) * abs(points[3] - points[1])
            if area < min_box_area:
                findings.append(
                    Finding(
                        "error",
                        "degenerate-box",
                        task.id,
                        job_id,
                        frame,
                        label,
                        f"area {area:.2f} px2 is below --min-box-area {min_box_area}",
                    )
                )

    for frame, meta in enumerate(frames):
        if frame not in annotated_frames:
            findings.append(
                Finding(
                    "warning",
                    "empty-frame",
                    task.id,
                    job_of_frame.get(frame, ""),
                    frame,
                    "",
                    f"{meta.name} has no objects",
                )
            )

    for job in jobs:
        job_frames = range(job.start_frame, job.stop_frame + 1)
        if str(job.state) == "completed" and not annotated_frames.intersection(job_frames):
            findings.append(
                Finding(
                    "warning",
                    "completed-but-empty",
                    task.id,
                    job.id,
                    "",
                    "",
                    f"job is completed but frames {job.start_frame}-{job.stop_frame} are empty",
                )
            )

    return findings, label_usage


def main() -> None:
    args = parse_args()
    with make_client(args.host, access_token=args.token) as client:
        project = client.projects.retrieve(args.project_id)
        label_names = {label.id: label.name for label in project.get_labels()}

        tasks_by_id = {task.id: task for task in project.get_tasks()}
        if args.task_id:
            missing = [str(tid) for tid in args.task_id if tid not in tasks_by_id]
            if missing:
                sys.exit(f"Task id(s) {', '.join(missing)} not found in project {project.id}")
            tasks = [tasks_by_id[tid] for tid in args.task_id]
        else:
            tasks = list(tasks_by_id.values())
        if not tasks:
            sys.exit(f"Project {project.id} has no tasks to lint")

        findings: list[Finding] = []
        usage = Counter()
        for task in tasks:
            task_findings, task_usage = lint_task(task, label_names, args.min_box_area)
            findings.extend(task_findings)
            usage.update(task_usage)

        for name in sorted(set(label_names.values()) - set(usage)):
            findings.append(
                Finding("info", "unused-label", "", "", "", name, "no objects in the linted tasks")
            )

    findings.sort(key=lambda f: (SEVERITY_ORDER[f.severity], f.check, str(f.task_id), str(f.frame)))
    for finding in findings:
        location = f"task {finding.task_id}" if finding.task_id != "" else "project"
        if finding.frame != "":
            location += f" frame {finding.frame}"
        print(f"{finding.severity} {finding.check}: {location}: {finding.detail}")

    with args.output.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=[field.name for field in fields(Finding)])
        writer.writeheader()
        writer.writerows(asdict(finding) for finding in findings)

    counts = Counter(finding.severity for finding in findings)
    print(
        f"Found {len(findings)} issue(s): {counts['error']} error(s), "
        f"{counts['warning']} warning(s), {counts['info']} info"
    )
    print(f"Wrote {args.output.resolve()}")
    if counts["error"] and not args.no_fail:
        sys.exit(1)


if __name__ == "__main__":
    main()
