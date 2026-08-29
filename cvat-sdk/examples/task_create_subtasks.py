# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Split annotation work over one set of images into several subtasks, one per
object type and label group, so boxes, polygons, and tags are annotated in
parallel by different people instead of all at once in one crowded task.

Each --subtask spec is 'NAME:TYPE:label1,label2': the subtask's name, the shape
type its labels are drawn with, and the labels themselves.

The subtasks are standalone tasks, not tasks inside one project: tasks in a
project share the project's label set, so a per-subtask label set cannot exist
inside a single project.

Steps:
  1. Parse and validate every --subtask spec before creating anything.
  2. Collect the images from --image-dir.
  3. Create one task per spec, with that spec's labels typed to its shape type.
  4. Print a summary of what each subtask got.

Usage (run ``python task_create_subtasks.py --help`` for the full list of options):
  python task_create_subtasks.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --image-dir ./images \\
      --subtask 'boxes:rectangle:car,person' \\
      --subtask 'roads:polygon:road,lane' \\
      --subtask 'weather:tag:rain,snow'
"""

import argparse
import sys
from pathlib import Path

from cvat_sdk import make_client, models
from cvat_sdk.core.proxies.tasks import ResourceType

IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
# Skeletons need sub-labels, which a one-line spec cannot express.
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
        "--image-dir", type=Path, required=True, help="directory with the images to split"
    )
    parser.add_argument(
        "--subtask",
        action="append",
        required=True,
        metavar="NAME:TYPE:LABELS",
        help="one subtask, e.g. 'boxes:rectangle:car,person' (repeat for more)",
    )
    parser.add_argument("--segment-size", type=int, help="frames per job, in every subtask")
    parser.add_argument(
        "--cleanup", action="store_true", help="delete the created subtasks at the end"
    )
    return parser.parse_args()


def parse_subtask(spec: str) -> tuple[str, str, list[str]]:
    """'boxes:rectangle:car,person' -> ('boxes', 'rectangle', ['car', 'person'])."""
    name, _, rest = spec.partition(":")
    type_, _, labels = rest.partition(":")
    names = [label.strip() for label in labels.split(",") if label.strip()]
    if not (name and type_ and names):
        sys.exit(f"Bad --subtask {spec!r}: expected 'NAME:TYPE:label1,label2'")
    if type_ not in LABEL_TYPES:
        sys.exit(
            f"Unknown label type {type_!r} in --subtask {spec!r}. "
            f"Choose one of: {', '.join(sorted(LABEL_TYPES))}"
        )
    return name, type_, names


def main() -> None:
    args = parse_args()
    # 1. Validate every spec first, so a typo in the last one costs nothing.
    specs = [parse_subtask(spec) for spec in args.subtask]

    # 2. The same images go into every subtask.
    images = sorted(p for p in args.image_dir.iterdir() if p.suffix.lower() in IMAGE_SUFFIXES)
    if not images:
        sys.exit(f"No images found in {args.image_dir}")

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
                    f"Created subtask {name!r} as task {task.id} "
                    f"({type_}: {', '.join(label_names)}, {len(task.get_jobs())} job(s)): "
                    f"{args.host}/tasks/{task.id}"
                )
            print(f"Created {len(created)} subtask(s) from {len(images)} image(s)")
        finally:
            # Clean up whatever was created, including after a mid-run failure.
            if args.cleanup:
                for task in created:
                    task.remove()
                    print(f"Deleted task {task.id}")
            elif created:
                print("Keeping the subtasks; pass --cleanup to delete them")


if __name__ == "__main__":
    main()
