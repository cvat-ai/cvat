# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Create a task with honeypots: a pool of ground truth frames, a few of which
are mixed into every annotation job, so each annotator's work can be scored
against known answers without a separate review pass.

Steps:
  1. Collect the files from --image-dir.
  2. Create the task with validation_params in "gt_pool" mode: the honeypot
     frames (--honeypot-frame or --honeypot-frame-count) plus how many of them
     each annotation job gets (--honeypots-per-job).
  3. Print the layout the server built: the validation pool, and per annotation
     job which frame of the job stands in for which pool frame.

Honeypots are only supported by image tasks (not video) with randomly sorted
images, so the script always creates the task with sorting_method="random".
Each annotation job becomes --honeypots-per-job frames longer than --segment-size,
since that many honeypots are injected into it.

Usage (run ``python task_create_with_honeypots.py --help`` for the full list of options):
  python task_create_with_honeypots.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --image-dir ./images --honeypot-frame-count 20 --honeypots-per-job 2 --segment-size 50
  python task_create_with_honeypots.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --image-dir ./images --honeypot-frame 'img_001.png' 'img_042.png' --honeypots-per-job 2
"""

import argparse
import sys
from pathlib import Path

from cvat_sdk import make_client, models
from cvat_sdk.core.proxies.tasks import ResourceType


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
        help="directory with the task's images; every file in it is uploaded, "
        "and the server decides which media it accepts",
    )
    parser.add_argument("--name", default="Task with honeypots", help="task name")
    parser.add_argument(
        "--labels", nargs="+", default=["object"], metavar="NAME", help="label names to create"
    )
    parser.add_argument("--segment-size", type=int, help="frames per annotation job")
    # Naming the frames and counting them are two ways to say the same thing,
    # so argparse rejects a command line that passes both.
    pool = parser.add_mutually_exclusive_group(required=True)
    pool.add_argument(
        "--honeypot-frame",
        nargs="+",
        metavar="NAME",
        help="exact file names to use as honeypot frames",
    )
    pool.add_argument(
        "--honeypot-frame-count", type=int, help="number of randomly chosen honeypot frames"
    )
    parser.add_argument(
        "--honeypots-per-job",
        type=int,
        required=True,
        help="honeypot frames mixed into each annotation job",
    )
    parser.add_argument("--cleanup", action="store_true", help="delete the created task at the end")
    return parser.parse_args()


def collect_images(image_dir: Path) -> list[Path]:
    """The files to upload, passed as they are found.

    The server is the authority on which media formats it supports, so
    filtering by extension here would only reject files CVAT can read.
    """
    images = sorted(p for p in image_dir.iterdir() if p.is_file())
    if not images:
        sys.exit(f"No files found in {image_dir}")
    return images


def print_layout(client, task_id: int) -> None:
    """The server's honeypot layout: the pool, and job -> (honeypot <- pool frame)."""
    layout, _ = client.api_client.tasks_api.retrieve_validation_layout(task_id)
    print(f"Validation pool frames: {list(layout.validation_frames)}")

    real_by_honeypot = dict(zip(layout.honeypot_frames, layout.honeypot_real_frames))
    for job in sorted(client.jobs.list(task_id=task_id, type="annotation"), key=lambda j: j.id):
        pairs = [
            f"{honeypot}<-{real}"
            for honeypot, real in real_by_honeypot.items()
            if job.start_frame <= honeypot <= job.stop_frame
        ]
        print(f"  job {job.id} frames {job.start_frame}-{job.stop_frame}: {', '.join(pairs)}")


def main() -> None:
    args = parse_args()
    images = collect_images(args.image_dir)

    # 2. "gt_pool" mode injects pool frames into every annotation job.
    validation_params = {
        "mode": "gt_pool",
        "frames_per_job_count": args.honeypots_per_job,
    }
    if args.honeypot_frame:
        available = {path.name for path in images}
        unknown = [name for name in args.honeypot_frame if name not in available]
        if unknown:
            sys.exit(f"Frame(s) {', '.join(unknown)} not in {args.image_dir}")
        validation_params["frame_selection_method"] = "manual"
        validation_params["frames"] = list(args.honeypot_frame)
    else:
        if args.honeypot_frame_count >= len(images):
            sys.exit(
                f"--honeypot-frame-count must be smaller than the {len(images)} files available"
            )
        validation_params["frame_selection_method"] = "random_uniform"
        validation_params["frame_count"] = args.honeypot_frame_count

    with make_client(args.host, access_token=args.token) as client:
        task = client.tasks.create_from_data(
            spec=models.TaskWriteRequest(
                name=args.name,
                labels=[models.PatchedLabelRequest(name=name) for name in args.labels],
                **({"segment_size": args.segment_size} if args.segment_size else {}),
            ),
            resource_type=ResourceType.LOCAL,
            resources=images,
            # "gt_pool" requires the task's frames to be laid out randomly, so
            # annotators cannot learn "this position is always a honeypot".
            data_params={"validation_params": validation_params, "sorting_method": "random"},
        )
        print(f"Created task {task.id} with {task.size} frames: {args.host}/tasks/{task.id}")

        # 3. What the server actually built.
        print_layout(client, task.id)

        if args.cleanup:
            task.remove()
            print(f"Deleted task {task.id}")
        else:
            print("Keeping the task; pass --cleanup to delete it")


if __name__ == "__main__":
    main()
