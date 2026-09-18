# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Create one task per shape type and label group over the same set of images,
so boxes, polygons, and tags are annotated in parallel by different people
instead of all at once in one crowded task.

Each --task spec is 'NAME:TYPE:label1,label2': the task's name, the shape type
its labels are drawn with, and the labels themselves.

The tasks are standalone, not tasks of one project: tasks in a project share the
project's label set, so a per-task label set cannot exist inside a single
project.

Steps:
  1. Parse and validate every --task spec before creating anything.
  2. Collect the files from --image-dir.
  3. Create one task per spec, with that spec's labels typed to its shape type.
  4. Print a summary of what each task got.

Usage (run ``python tasks_create_per_label_group.py --help`` for the full list of options):
  python tasks_create_per_label_group.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --image-dir ./images \\
      --task 'boxes:rectangle:car,person' \\
      --task 'roads:polygon:road,lane' \\
      --task 'weather:tag:rain,snow'
"""

import argparse
import sys
from pathlib import Path

from cvat_sdk import make_client, models
from cvat_sdk.core.proxies.tasks import ResourceType

LABEL_TYPES = {
    "any",
    "cuboid",
    "ellipse",
    "mask",
    "points",
    "polygon",
    "polyline",
    "rectangle",
    "tag",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--host", required=True, help="CVAT server URL, e.g. 'https://app.cvat.ai'")
    parser.add_argument(
        "--token",
        required=True,
        help="Personal Access Token (CVAT UI: Profile -> Security)",
    )
    parser.add_argument(
        "--image-dir",
        type=Path,
        required=True,
        help="directory with the images to annotate; every file in it is uploaded, "
        "and the server decides which media it accepts",
    )
    parser.add_argument(
        "--task",
        action="append",
        required=True,
        metavar="NAME:TYPE:LABELS",
        help="one task, e.g. 'boxes:rectangle:car,person' (repeat for more)",
    )
    parser.add_argument("--segment-size", type=int, help="frames per job, in every task")
    parser.add_argument(
        "--cleanup", action="store_true", help="delete the created tasks at the end"
    )
    return parser.parse_args()


def parse_spec(spec: str) -> tuple[str, str, list[str]]:
    """'boxes:rectangle:car,person' -> ('boxes', 'rectangle', ['car', 'person'])."""
    name, _, rest = spec.partition(":")
    type_, _, labels = rest.partition(":")
    names = [label.strip() for label in labels.split(",") if label.strip()]
    if not (name and type_ and names):
        sys.exit(f"Bad --task {spec!r}: expected 'NAME:TYPE:label1,label2'")
    if type_ not in LABEL_TYPES:
        sys.exit(
            f"Unknown label type {type_!r} in --task {spec!r}. "
            f"Choose one of: {', '.join(sorted(LABEL_TYPES))}"
        )
    return name, type_, names


def main() -> None:
    args = parse_args()
    # 1. Validate every spec first, so a typo in the last one costs nothing.
    specs = [parse_spec(spec) for spec in args.task]

    # 2. The same files go into every task. They are passed as they are found:
    # the server is the authority on which media formats it supports, so
    # filtering by extension here would only reject files CVAT can read.
    images = sorted(p for p in args.image_dir.iterdir() if p.is_file())
    if not images:
        sys.exit(f"No files found in {args.image_dir}")

    created = []
    with make_client(args.host, access_token=args.token) as client:
        try:
            for name, type_, label_names in specs:
                task = client.tasks.create_from_data(
                    spec=models.TaskWriteRequest(
                        name=name,
                        labels=[
                            models.PatchedLabelRequest(name=label, type=type_)
                            for label in label_names
                        ],
                        **({"segment_size": args.segment_size} if args.segment_size else {}),
                    ),
                    resource_type=ResourceType.LOCAL,
                    resources=images,
                )
                created.append(task)
                print(
                    f"Created task {task.id} {name!r} "
                    f"({type_}: {', '.join(label_names)}, {len(task.get_jobs())} job(s)): "
                    f"{args.host}/tasks/{task.id}"
                )
            print(f"Created {len(created)} task(s) from {len(images)} file(s)")
        finally:
            # Clean up whatever was created, including after a mid-run failure.
            if args.cleanup:
                for task in created:
                    task.remove()
                    print(f"Deleted task {task.id}")
            elif created:
                print("Keeping the tasks; pass --cleanup to delete them")


if __name__ == "__main__":
    main()
