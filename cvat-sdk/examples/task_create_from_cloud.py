# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Create an annotation task from images that already live in a registered
cloud storage.

Steps:
  1. Create a task whose data is a list of object keys in the bucket.
  2. Print the result.
  3. Optionally delete it (--cleanup).

Register a bucket first with cloud_storage_register.py to get the storage id.

Usage (run ``python task_create_from_cloud.py --help`` for the full list of options):
  python task_create_from_cloud.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --cloud-storage-id 7 --cloud-keys 'images/0001.jpg' 'images/0002.jpg' \\
      --labels car person
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
        "--cloud-keys",
        nargs="+",
        required=True,
        help="object keys in the bucket, e.g. 'images/0001.jpg' 'images/0002.jpg'",
    )
    parser.add_argument(
        "--name",
        default="Task from cloud storage",
        help="task name (default: 'Task from cloud storage')",
    )
    parser.add_argument(
        "--labels", nargs="+", default=["object"], help="label names (default: object)"
    )
    parser.add_argument("--cleanup", action="store_true", help="delete the created task at the end")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    with make_client(args.host, access_token=args.token) as client:
        # ResourceType.SHARE + cloud_storage_id = read images from the bucket
        task = client.tasks.create_from_data(
            spec=models.TaskWriteRequest(
                name=args.name,
                labels=[models.PatchedLabelRequest(name=name) for name in args.labels],
            ),
            resource_type=ResourceType.SHARE,
            resources=args.cloud_keys,
            data_params={"cloud_storage_id": args.cloud_storage_id},
        )
        print(f"Created task {task.id} with {task.size} frames: {args.host}/tasks/{task.id}")

        if args.cleanup:
            task.remove()
            print(f"Deleted task {task.id}")
        else:
            print("Keeping the task; pass --cleanup to delete it")


if __name__ == "__main__":
    main()
