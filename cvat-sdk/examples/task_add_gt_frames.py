# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Add a ground truth job to an existing task with an exact frame list you choose.

Steps:
  1. Retrieve the task and resolve the requested frames: indexes (--frame) or
     file names (--frame-name, matched against the task's frame list).
  2. Refuse to touch an existing ground truth job unless --replace is given,
     because deleting one discards its annotations.
  3. Create the ground truth job with the "manual" frame selection method.
  4. Read the task's validation layout back and print the frames the server
     recorded, so you can see the request landed exactly as asked.

Usage (run ``python task_add_gt_frames.py --help`` for the full list of options):
  python task_add_gt_frames.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --task-id 42 --frame 0 17 42
  python task_add_gt_frames.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --task-id 42 --frame-name 'img_001.png' 'img_042.png'
"""

import argparse
import sys

from cvat_sdk import make_client, models


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
    frames = parser.add_mutually_exclusive_group(required=True)
    frames.add_argument(
        "--frame", type=int, nargs="+", metavar="N", help="frame indexes to use as ground truth"
    )
    frames.add_argument(
        "--frame-name", nargs="+", metavar="NAME", help="frame file names to use as ground truth"
    )
    parser.add_argument(
        "--replace",
        action="store_true",
        help="delete an existing ground truth job first (discards its annotations)",
    )
    parser.add_argument(
        "--cleanup", action="store_true", help="delete the created ground truth job at the end"
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    with make_client(args.host, access_token=args.token) as client:
        task = client.tasks.retrieve(args.task_id)
        frames_info = task.get_frames_info()

        # 1. Resolve the requested frames to task frame indexes.
        if args.frame_name:
            index_by_name = {frame.name: index for index, frame in enumerate(frames_info)}
            unknown = [name for name in args.frame_name if name not in index_by_name]
            if unknown:
                sys.exit(f"Frame name(s) {', '.join(unknown)} not found in task {task.id}")
            frames = sorted({index_by_name[name] for name in args.frame_name})
        else:
            out_of_range = [f for f in args.frame if not 0 <= f < len(frames_info)]
            if out_of_range:
                sys.exit(
                    f"Frame(s) {out_of_range} out of range: task {task.id} "
                    f"has {len(frames_info)} frames"
                )
            frames = sorted(set(args.frame))

        # 2. An existing ground truth job is never replaced silently.
        existing = client.jobs.list(task_id=task.id, type="ground_truth")
        if existing:
            if not args.replace:
                sys.exit(
                    f"Task {task.id} already has a ground truth job ({existing[0].id}). "
                    "Pass --replace to delete it first - its annotations will be lost."
                )
            client.api_client.jobs_api.destroy(existing[0].id)
            print(f"Deleted the previous ground truth job {existing[0].id}")

        # 3. "manual" frame selection means: exactly these frames.
        job, _ = client.api_client.jobs_api.create(
            models.JobWriteRequest(
                type="ground_truth",
                task_id=task.id,
                frame_selection_method="manual",
                frames=frames,
            )
        )
        names = [frames_info[index].name for index in frames]
        print(f"Created ground truth job {job.id} with {len(frames)} frames: {', '.join(names)}")

        # 4. What the server recorded.
        layout, _ = client.api_client.tasks_api.retrieve_validation_layout(task.id)
        print(f"Validation frames: {sorted(layout.validation_frames)}")
        print("Upload the ground truth with: task_create_with_validation.py --gt-annotations ...")

        if args.cleanup:
            client.api_client.jobs_api.destroy(job.id)
            print(f"Deleted ground truth job {job.id}")
        else:
            print("Keeping the ground truth job; pass --cleanup to delete it")


if __name__ == "__main__":
    main()
