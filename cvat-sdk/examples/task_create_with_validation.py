# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Create a task with a ground truth validation set (a "gold set") and upload
the ground truth annotations into it.

The validation frames are moved into a separate ground truth job, which the
annotators never see. Quality reports compare the annotation jobs against it.

Steps:
  1. Collect the images from --image-dir.
  2. Create the task with validation_params in "gt" mode: either the exact
     frames you name (--validation-frame) or a random sample (--frame-count,
     reproducible with --random-seed).
  3. Find the created ground truth job and print its frames.
  4. Upload --gt-annotations into that job and print how many objects landed.

Usage (run ``python task_create_with_validation.py --help`` for the full list of options):
  python task_create_with_validation.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --image-dir ./images --validation-frame 'img_001.png' 'img_042.png' \\
      --gt-annotations ground_truth.zip --gt-format 'COCO 1.0'
  python task_create_with_validation.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --image-dir ./images --frame-count 20 --random-seed 42
"""

import argparse
import sys
from pathlib import Path

from cvat_sdk import make_client, models
from cvat_sdk.core.proxies.tasks import ResourceType

IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--host", required=True, help="CVAT server URL, e.g. 'https://app.cvat.ai'")
    parser.add_argument(
        "--token",
        required=True,
        help="Personal Access Token (CVAT UI: Profile -> Security)",
    )
    parser.add_argument(
        "--image-dir", type=Path, required=True, help="directory with the task's images"
    )
    parser.add_argument("--name", default="Task with a validation set", help="task name")
    parser.add_argument(
        "--labels",
        nargs="+",
        default=["object"],
        metavar="NAME",
        help="label names to create (default: %(default)s)",
    )
    parser.add_argument("--segment-size", type=int, help="frames per annotation job")
    frames = parser.add_mutually_exclusive_group(required=True)
    frames.add_argument(
        "--validation-frame",
        nargs="+",
        metavar="NAME",
        help="exact file names to use as validation frames",
    )
    frames.add_argument(
        "--frame-count", type=int, help="number of randomly chosen validation frames"
    )
    parser.add_argument(
        "--random-seed", type=int, help="seed for --frame-count, for a reproducible split"
    )
    parser.add_argument(
        "--gt-annotations", type=Path, help="annotations file to upload into the ground truth job"
    )
    parser.add_argument(
        "--gt-format",
        default="COCO 1.0",
        help="importer name for --gt-annotations (default: '%(default)s')",
    )
    parser.add_argument("--cleanup", action="store_true", help="delete the created task at the end")
    return parser.parse_args()


def collect_images(image_dir: Path) -> list[Path]:
    images = sorted(p for p in image_dir.iterdir() if p.suffix.lower() in IMAGE_SUFFIXES)
    if not images:
        sys.exit(f"No images found in {image_dir}")
    return images


def main() -> None:
    args = parse_args()
    images = collect_images(args.image_dir)

    # 2. "gt" mode puts the validation frames into a separate ground truth job.
    validation_params = {"mode": "gt"}
    if args.validation_frame:
        available = {path.name for path in images}
        unknown = [name for name in args.validation_frame if name not in available]
        if unknown:
            sys.exit(f"Frame(s) {', '.join(unknown)} not in {args.image_dir}")
        validation_params["frame_selection_method"] = "manual"
        validation_params["frames"] = list(args.validation_frame)
    else:
        if args.frame_count >= len(images):
            sys.exit(f"--frame-count must be smaller than the {len(images)} images available")
        validation_params["frame_selection_method"] = "random_uniform"
        validation_params["frame_count"] = args.frame_count
        if args.random_seed is not None:
            validation_params["random_seed"] = args.random_seed

    with make_client(args.host, access_token=args.token) as client:
        spec = models.TaskWriteRequest(
            name=args.name,
            labels=[models.PatchedLabelRequest(name=name) for name in args.labels],
            **({"segment_size": args.segment_size} if args.segment_size else {}),
        )
        task = client.tasks.create_from_data(
            spec=spec,
            resource_type=ResourceType.LOCAL,
            resources=images,
            data_params={"validation_params": validation_params},
        )
        print(f"Created task {task.id} with {task.size} frames: {args.host}/tasks/{task.id}")

        # 3. The ground truth job the server built from validation_params.
        gt_jobs = client.jobs.list(task_id=task.id, type="ground_truth")
        if not gt_jobs:
            sys.exit(f"Task {task.id} has no ground truth job; check validation_params")
        gt_job = gt_jobs[0]
        layout, _ = client.api_client.tasks_api.retrieve_validation_layout(task.id)
        task_frames = task.get_frames_info()
        frame_names = [task_frames[index].name for index in layout.validation_frames]
        print(f"Ground truth job {gt_job.id}: {len(frame_names)} frames")
        print(f"Validation frames: {', '.join(frame_names)}")

        # 4. Upload the ground truth itself.
        if args.gt_annotations:
            formats, _ = client.api_client.server_api.retrieve_annotation_formats()
            importers = [f.name for f in formats.importers]
            if args.gt_format not in importers:
                sys.exit(
                    f"Unknown import format {args.gt_format!r}. "
                    f"Choose one of: {', '.join(importers)}"
                )
            gt_job.import_annotations(args.gt_format, args.gt_annotations)
            annotations = gt_job.get_annotations()
            count = len(annotations.tags) + len(annotations.shapes) + len(annotations.tracks)
            print(f"Imported {count} objects into ground truth job {gt_job.id}")
        else:
            print("No --gt-annotations given; the ground truth job is empty")

        if args.cleanup:
            task.remove()
            print(f"Deleted task {task.id}")
        else:
            print("Keeping the task; pass --cleanup to delete it")


if __name__ == "__main__":
    main()
