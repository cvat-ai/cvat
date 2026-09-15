# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Create a task with honeypots: a pool of ground truth frames, a few of which
are mixed into every annotation job, so each annotator's work can be scored
against known answers without a separate review pass.

Steps:
  1. Collect the images from --image-dir.
  2. Create the task with validation_params in "gt_pool" mode: the pool frames
     (--pool-frame or --pool-frame-count) plus how many of them each annotation
     job gets (--honeypots-per-job).
  3. Print the layout the server built: the pool, and per annotation job which
     honeypot frame stands in for which pool frame.
  4. Optionally maintain the layout: --refresh reshuffles which pool frames land
     in which job, --disable-frame retires a bad pool frame.

Honeypots need an image task (not video). The task grows by the injected frames,
and its segment_size reads back as 0, meaning "custom segments".

Usage (run ``python task_create_with_honeypots.py --help`` for the full list of options):
  python task_create_with_honeypots.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --image-dir ./images --pool-frame-count 20 --honeypots-per-job 2 --segment-size 50
  python task_create_with_honeypots.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --image-dir ./images --pool-frame-count 20 --honeypots-per-job 2 --refresh
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
    parser.add_argument("--name", default="Task with honeypots", help="task name")
    parser.add_argument(
        "--labels", nargs="+", default=["object"], metavar="NAME", help="label names to create"
    )
    parser.add_argument("--segment-size", type=int, help="frames per annotation job")
    pool = parser.add_mutually_exclusive_group(required=True)
    pool.add_argument(
        "--pool-frame", nargs="+", metavar="NAME", help="exact file names to use as pool frames"
    )
    pool.add_argument("--pool-frame-count", type=int, help="number of randomly chosen pool frames")
    parser.add_argument(
        "--honeypots-per-job",
        type=int,
        required=True,
        help="pool frames mixed into each annotation job",
    )
    parser.add_argument(
        "--refresh", action="store_true", help="reshuffle which pool frames land in which job"
    )
    parser.add_argument(
        "--disable-frame",
        type=int,
        nargs="+",
        metavar="FRAME",
        help="retire these pool frames (frame indexes, as printed by this script)",
    )
    parser.add_argument("--cleanup", action="store_true", help="delete the created task at the end")
    return parser.parse_args()


def collect_images(image_dir: Path) -> list[Path]:
    images = sorted(p for p in image_dir.iterdir() if p.suffix.lower() in IMAGE_SUFFIXES)
    if not images:
        sys.exit(f"No images found in {image_dir}")
    return images


def print_layout(client, task_id: int) -> models.ITaskValidationLayoutRead:
    """The server's honeypot layout: the pool, and job -> (honeypot <- pool frame)."""
    layout, _ = client.api_client.tasks_api.retrieve_validation_layout(task_id)
    print(f"Validation pool frames: {list(layout.validation_frames)}")
    print(f"Disabled frames: {list(layout.disabled_frames)}")

    real_by_honeypot = dict(zip(layout.honeypot_frames, layout.honeypot_real_frames))
    for job in sorted(client.jobs.list(task_id=task_id, type="annotation"), key=lambda j: j.id):
        pairs = [
            f"{honeypot}<-{real}"
            for honeypot, real in real_by_honeypot.items()
            if job.start_frame <= honeypot <= job.stop_frame
        ]
        print(f"  job {job.id} frames {job.start_frame}-{job.stop_frame}: {', '.join(pairs)}")
    return layout


def main() -> None:
    args = parse_args()
    images = collect_images(args.image_dir)

    # 2. "gt_pool" mode injects pool frames into every annotation job.
    validation_params = {
        "mode": "gt_pool",
        "frames_per_job_count": args.honeypots_per_job,
    }
    if args.pool_frame:
        available = {path.name for path in images}
        unknown = [name for name in args.pool_frame if name not in available]
        if unknown:
            sys.exit(f"Frame(s) {', '.join(unknown)} not in {args.image_dir}")
        validation_params["frame_selection_method"] = "manual"
        validation_params["frames"] = list(args.pool_frame)
    else:
        if args.pool_frame_count >= len(images):
            sys.exit(f"--pool-frame-count must be smaller than the {len(images)} images available")
        validation_params["frame_selection_method"] = "random_uniform"
        validation_params["frame_count"] = args.pool_frame_count

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
        layout = print_layout(client, task.id)

        # 4. Maintenance operations, each followed by the new layout.
        if args.refresh:
            client.api_client.tasks_api.partial_update_validation_layout(
                task.id,
                patched_task_validation_layout_write_request=(
                    models.PatchedTaskValidationLayoutWriteRequest(
                        frame_selection_method="random_uniform"
                    )
                ),
            )
            print("Refreshed the honeypots")
            layout = print_layout(client, task.id)

        if args.disable_frame:
            unknown = [f for f in args.disable_frame if f not in layout.validation_frames]
            if unknown:
                sys.exit(f"Frame(s) {unknown} are not pool frames of task {task.id}")
            disabled = sorted(set(layout.disabled_frames) | set(args.disable_frame))
            client.api_client.tasks_api.partial_update_validation_layout(
                task.id,
                patched_task_validation_layout_write_request=(
                    models.PatchedTaskValidationLayoutWriteRequest(disabled_frames=disabled)
                ),
            )
            print(f"Retired pool frame(s) {args.disable_frame}")
            print_layout(client, task.id)

        if args.cleanup:
            task.remove()
            print(f"Deleted task {task.id}")
        else:
            print("Keeping the task; pass --cleanup to delete it")


if __name__ == "__main__":
    main()
