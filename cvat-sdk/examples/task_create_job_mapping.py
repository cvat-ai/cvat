# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Create a task whose jobs are defined by you, file by file, instead of by a
frame count: one job per camera, per scene, per delivery batch.

Two ways to group:
  --job FILE [FILE ...]   one job per occurrence, in the given file order
  --files-per-job N       chunk the sorted directory listing into jobs of N files

Steps:
  1. Build the file groups and check them against --image-dir: every file must
     exist, appear once, and belong to a job.
  2. Create the task with the job_file_mapping data parameter.
  3. Read the jobs back from the server and print/write the resulting mapping,
     so what you see is what the server built, not what was requested.

job_file_mapping implies predefined file ordering and works with images, not video.

Usage (run ``python task_create_job_mapping.py --help`` for the full list of options):
  python task_create_job_mapping.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --image-dir ./images \\
      --job 'cam1_001.png' 'cam1_002.png' --job 'cam2_001.png' 'cam2_002.png'
  python task_create_job_mapping.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --image-dir ./images --files-per-job 50
"""

import argparse
import csv
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
    grouping = parser.add_mutually_exclusive_group(required=True)
    grouping.add_argument(
        "--job",
        action="append",
        nargs="+",
        metavar="FILE",
        help="the files of one job (repeat for more jobs)",
    )
    grouping.add_argument("--files-per-job", type=int, help="chunk the directory into jobs of N")
    parser.add_argument("--name", default="Task with a job file mapping", help="task name")
    parser.add_argument(
        "--labels", nargs="+", default=["object"], metavar="NAME", help="label names to create"
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("job_file_mapping.csv"),
        help="path to write the resulting mapping to (default: %(default)s)",
    )
    parser.add_argument("--cleanup", action="store_true", help="delete the created task at the end")
    return parser.parse_args()


def build_groups(args: argparse.Namespace, available: list[str]) -> list[list[str]]:
    """The file groups to send as job_file_mapping, validated against the directory."""
    if args.files_per_job:
        if args.files_per_job < 1:
            sys.exit("--files-per-job must be at least 1")
        return [
            available[start : start + args.files_per_job]
            for start in range(0, len(available), args.files_per_job)
        ]

    groups = [list(group) for group in args.job]
    known = set(available)
    assigned = []
    for group in groups:
        assigned.extend(group)

    unknown = [name for name in assigned if name not in known]
    if unknown:
        sys.exit(f"File(s) {', '.join(unknown)} not found in {args.image_dir}")

    duplicates = sorted({name for name in assigned if assigned.count(name) > 1})
    if duplicates:
        sys.exit(f"File(s) {', '.join(duplicates)} appear in more than one job")

    unassigned = sorted(known - set(assigned))
    if unassigned:
        sys.exit(
            f"File(s) {', '.join(unassigned)} are not assigned to any job. "
            "Every file in --image-dir must belong to exactly one --job."
        )
    return groups


def main() -> None:
    args = parse_args()
    available = sorted(
        p.name for p in args.image_dir.iterdir() if p.suffix.lower() in IMAGE_SUFFIXES
    )
    if not available:
        sys.exit(f"No images found in {args.image_dir}")

    groups = build_groups(args, available)
    resources = [args.image_dir / name for group in groups for name in group]
    print(f"Requesting {len(groups)} job(s) over {len(resources)} file(s)")

    with make_client(args.host, access_token=args.token) as client:
        task = client.tasks.create_from_data(
            spec=models.TaskWriteRequest(
                name=args.name,
                labels=[models.PatchedLabelRequest(name=name) for name in args.labels],
            ),
            resource_type=ResourceType.LOCAL,
            resources=resources,
            data_params={"job_file_mapping": groups},
        )
        print(f"Created task {task.id} with {task.size} frames: {args.host}/tasks/{task.id}")

        # 3. The mapping the server actually built.
        rows = []
        for job in sorted(task.get_jobs(), key=lambda job: job.start_frame):
            names = [frame.name for frame in job.get_frames_info()]
            print(f"  job {job.id} frames {job.start_frame}-{job.stop_frame}: {', '.join(names)}")
            rows.extend(
                {
                    "job_id": job.id,
                    "start_frame": job.start_frame,
                    "stop_frame": job.stop_frame,
                    "file_name": name,
                }
                for name in names
            )

        with args.output.open("w", newline="") as f:
            writer = csv.DictWriter(
                f, fieldnames=["job_id", "start_frame", "stop_frame", "file_name"]
            )
            writer.writeheader()
            writer.writerows(rows)
        print(f"Wrote {args.output.resolve()}")

        if args.cleanup:
            task.remove()
            print(f"Deleted task {task.id}")
        else:
            print("Keeping the task; pass --cleanup to delete it")


if __name__ == "__main__":
    main()
