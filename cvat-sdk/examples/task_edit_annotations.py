# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Read a task's annotations, edit them, and write the edit back: move every
object from one label to another (--relabel) or delete every object with a
given label (--delete-label).

Steps:
  1. Retrieve the task and map its label names to ids.
  2. Read all annotations (tags, shapes, and tracks) and count objects per label.
  3. Write the edit back with a partial annotation update, so the objects that
     are not affected by it are not re-uploaded.
  4. Re-read the annotations and print the per-label object counts diff.

Usage (run ``python task_edit_annotations.py --help`` for the full list of options):
  python task_edit_annotations.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --task-id 42 --relabel 'car' 'vehicle'
  python task_edit_annotations.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --task-id 42 --delete-label 'draft'
"""

import argparse
import sys
from collections import Counter

from cvat_sdk import make_client, models
from cvat_sdk.core.proxies.annotations import AnnotationUpdateAction


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--host", required=True, help="CVAT server URL, e.g. 'https://app.cvat.ai'")
    parser.add_argument(
        "--token",
        required=True,
        help="Personal Access Token (CVAT UI: Profile -> Security)",
    )
    parser.add_argument(
        "--task-id", type=int, required=True, help="id of an existing task, e.g. 42"
    )
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument(
        "--relabel",
        nargs=2,
        metavar=("FROM", "TO"),
        help="move all objects from label FROM to label TO",
    )
    action.add_argument("--delete-label", metavar="NAME", help="delete all objects with this label")
    return parser.parse_args()


def label_counts(annotations, label_names: dict[int, str]) -> Counter:
    """Objects per label name, over tags, shapes, and tracks alike."""
    return Counter(
        label_names[obj.label_id]
        for obj in [*annotations.tags, *annotations.shapes, *annotations.tracks]
    )


def main() -> None:
    args = parse_args()
    with make_client(args.host, access_token=args.token) as client:
        task = client.tasks.retrieve(args.task_id)
        label_ids = {label.name: label.id for label in task.get_labels()}
        label_names = {id: name for name, id in label_ids.items()}

        source = args.relabel[0] if args.relabel else args.delete_label
        affected = set(args.relabel) if args.relabel else {source}
        for name in affected:
            if name not in label_ids:
                sys.exit(f"Label {name!r} not found in task {task.id}")

        annotations = task.get_annotations()
        before = label_counts(annotations, label_names)

        tags = [tag for tag in annotations.tags if tag.label_id == label_ids[source]]
        shapes = [shape for shape in annotations.shapes if shape.label_id == label_ids[source]]
        tracks = [track for track in annotations.tracks if track.label_id == label_ids[source]]
        matched = len(tags) + len(shapes) + len(tracks)

        if args.relabel:
            target_id = label_ids[args.relabel[1]]
            task.update_annotations(
                models.PatchedLabeledDataRequest(
                    tags=[
                        models.LabeledImageRequest(**{**tag.to_dict(), "label_id": target_id})
                        for tag in tags
                    ],
                    shapes=[
                        models.LabeledShapeRequest(**{**shape.to_dict(), "label_id": target_id})
                        for shape in shapes
                    ],
                    tracks=[
                        models.LabeledTrackRequest(**{**track.to_dict(), "label_id": target_id})
                        for track in tracks
                    ],
                ),
                action=AnnotationUpdateAction.UPDATE,
            )
            print(f"Moved {matched} objects from {source!r} to {args.relabel[1]!r}")
        else:
            task.remove_annotations(ids=[obj.id for obj in [*tags, *shapes, *tracks]])
            print(f"Deleted {matched} objects with label {source!r}")

        after = label_counts(task.get_annotations(), label_names)
        for name in sorted(affected):
            print(f"  {name}: {before[name]} -> {after[name]}")


if __name__ == "__main__":
    main()
