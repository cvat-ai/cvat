# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Bulk-create tasks inside a project, each task's data read from a registered
cloud storage.

One --task flag creates one task. Its argument is a comma-separated list of
object keys in the bucket:

  * a single key -> a video task (or a single-image task);
  * several keys -> an image task whose frames are those keys, in order.

All tasks land in the same project, so they share its label schema.

Steps:
  1. For each --task, create a task in --project-id using ResourceType.SHARE.
  2. Print the created ids and a summary count.
  3. Optionally delete every created task (--cleanup).

Register a bucket first with cloud_storage_register.py to get the storage id.

Usage (run ``python tasks_bulk_from_cloud.py --help`` for the full list of options):
  # three video tasks in project 42
  python tasks_bulk_from_cloud.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --cloud-storage-id 7 --project-id 42 \\
      --task 'videos/clip_01.mp4' --task 'videos/clip_02.mp4' --task 'videos/clip_03.mp4'

  # two image-batch tasks in project 42
  python tasks_bulk_from_cloud.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --cloud-storage-id 7 --project-id 42 \\
      --task 'batch_a/img_1.jpg,batch_a/img_2.jpg' \\
      --task 'batch_b/img_1.jpg,batch_b/img_2.jpg'
"""

import argparse

from cvat_sdk import make_client, models
from cvat_sdk.core.proxies.tasks import ResourceType


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=" ".join(__doc__.splitlines()[:2]))
    parser.add_argument("--host", required=True, help="CVAT server URL, e.g. 'https://app.cvat.ai'")
    parser.add_argument(
        "--token",
        required=True,
        help="Personal Access Token (CVAT UI: Profile -> Security)",
    )
    parser.add_argument(
        "--cloud-storage-id",
        type=int,
        required=True,
        help="a registered cloud storage id (see cloud_storage_register.py)",
    )
    parser.add_argument(
        "--project-id",
        type=int,
        required=True,
        help="tasks are created in this project and inherit its labels",
    )
    parser.add_argument(
        "--task",
        dest="tasks",
        action="append",
        required=True,
        metavar="KEY[,KEY,...]",
        help="comma-separated object keys for one task; repeat for more tasks",
    )
    parser.add_argument(
        "--name-prefix",
        default="Bulk task",
        help="task name prefix; each task is named '<prefix> N' (default: 'Bulk task')",
    )
    parser.add_argument(
        "--cleanup", action="store_true", help="delete every created task at the end"
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    task_key_groups = [
        [key.strip() for key in spec.split(",") if key.strip()] for spec in args.tasks
    ]
    if any(not group for group in task_key_groups):
        raise SystemExit("each --task must contain at least one non-empty key")

    with make_client(args.host, access_token=args.token) as client:
        created = []
        for i, keys in enumerate(task_key_groups, start=1):
            # Tasks in a project inherit the project's labels — do NOT pass labels.
            # ResourceType.SHARE + cloud_storage_id reads the objects from the bucket.
            task = client.tasks.create_from_data(
                spec=models.TaskWriteRequest(
                    name=f"{args.name_prefix} {i}", project_id=args.project_id
                ),
                resource_type=ResourceType.SHARE,
                resources=keys,
                data_params={"cloud_storage_id": args.cloud_storage_id},
            )
            created.append(task)
            print(f"Created task {task.id} ({task.size} frames): {args.host}/tasks/{task.id}")

        print(f"Created {len(created)} tasks in project {args.project_id}")

        if args.cleanup:
            for task in created:
                task.remove()
            print(f"Deleted {len(created)} tasks")
        else:
            print("Keeping the tasks; pass --cleanup to delete them")


if __name__ == "__main__":
    main()
