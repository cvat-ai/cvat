# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Import annotations into an existing task straight from a registered cloud
storage: the server pulls the file out of the bucket itself, nothing is
uploaded from this machine. Handy when a model writes its predictions to a
bucket, or when the annotation archive is too big to push through your own
connection.

The high-level Task.import_annotations() always uploads a local file, so the
import request is made with the low-level API (client.api_client.tasks_api)
and awaited with client.wait_for_completion.

Steps:
  1. Retrieve the task and count the objects it already has.
  2. Fetch the server's import format list and validate --import-format.
  3. Resolve the storage to read from: --cloud-storage-id, or the task's own
     source storage when the flag is omitted.
  4. Check that --filename really is in the bucket, to fail with a clear
     message instead of a failed background job.
  5. Start the import and wait for the background request to finish.
  6. Count the objects again to show what the import added.

Register a bucket first with cloud_storage_register.py to get the storage id.

Usage (run ``python task_import_annotations_from_cloud.py --help`` for the full list of options):
  python task_import_annotations_from_cloud.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --task-id 42 --cloud-storage-id 7 --filename 'annotations/task_42.zip' \\
      --import-format 'COCO 1.0'
"""

import argparse
import json
import sys

from cvat_sdk import make_client
from cvat_sdk.core.proxies.types import Location


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
    parser.add_argument(
        "--filename",
        required=True,
        help="object key of the annotation file in the bucket, e.g. 'annotations/task_42.zip'",
    )
    parser.add_argument(
        "--cloud-storage-id",
        type=int,
        help="a registered cloud storage id (see cloud_storage_register.py); "
        "omit to use the source storage configured in the task",
    )
    parser.add_argument(
        "--import-format",
        default="COCO 1.0",
        help="importer name, e.g. 'COCO 1.0' (default: '%(default)s')",
    )
    parser.add_argument(
        "--import-mode",
        choices=["replace", "append"],
        default="replace",
        help="replace the task's annotations or add to them (default: '%(default)s')",
    )
    parser.add_argument(
        "--no-file-check",
        action="store_true",
        help="skip the bucket listing of step 4 (e.g. when the credentials may only read "
        "objects, not list them)",
    )
    return parser.parse_args()


def count_objects(task) -> int:
    """All annotation objects of a task: tags, shapes, and tracks."""
    annotations = task.get_annotations()
    return len(annotations.tags) + len(annotations.shapes) + len(annotations.tracks)


def resolve_cloud_storage_id(task, requested_id: int | None) -> int:
    """The explicitly requested storage, or the one configured in the task."""
    if requested_id is not None:
        return requested_id

    storage = task.source_storage
    if not storage or storage.location.value != Location.CLOUD_STORAGE.value:
        sys.exit(f"Task {task.id} has no cloud source storage configured; pass --cloud-storage-id")
    return storage.cloud_storage_id


def bucket_contains(api, cloud_storage_id: int, key: str) -> bool:
    """Whether the bucket has an object with this key.

    retrieve_content_v2 lists one "directory" of the bucket per call and
    returns the names inside it, so the key is split into prefix + name.
    """
    prefix, _, name = key.rpartition("/")
    next_token = None
    while True:
        content, _ = api.retrieve_content_v2(
            cloud_storage_id,
            **({"prefix": f"{prefix}/"} if prefix else {}),
            **({"next_token": next_token} if next_token else {}),
        )
        if any(entry.type.value == "REG" and entry.name == name for entry in content.content):
            return True
        if not content.next:
            return False
        next_token = content.next


def main() -> None:
    args = parse_args()
    with make_client(args.host, access_token=args.token) as client:
        # 1. The state before the import, to compare against.
        task = client.tasks.retrieve(args.task_id)
        print(f"Task {task.id}: {count_objects(task)} objects before import")

        # 2. Validate the format against the server's list.
        formats, _ = client.api_client.server_api.retrieve_annotation_formats()
        names = [f.name for f in formats.importers]
        if args.import_format not in names:
            sys.exit(
                f"Unknown import format {args.import_format!r}. Choose one of: {', '.join(names)}"
            )

        # 3. Where to read from.
        cloud_storage_id = resolve_cloud_storage_id(task, args.cloud_storage_id)
        print(f"Reading {args.filename!r} from cloud storage {cloud_storage_id}")

        # 4. A missing key would only surface as a failed background job.
        if not args.no_file_check and not bucket_contains(
            client.api_client.cloudstorages_api, cloud_storage_id, args.filename
        ):
            sys.exit(f"{args.filename!r} was not found in cloud storage {cloud_storage_id}")

        # 5. location=cloud_storage makes the server fetch the file itself; the
        # response only starts a background request, whose id is awaited below.
        _, response = client.api_client.tasks_api.create_annotations(
            task.id,
            format=args.import_format,
            filename=args.filename,
            location=Location.CLOUD_STORAGE,
            cloud_storage_id=cloud_storage_id,
            import_mode=args.import_mode,
        )
        rq_id = json.loads(response.data).get("rq_id") if response.data else None
        if not rq_id:
            sys.exit("The server did not return a request id (rq_id) for the import")

        client.wait_for_completion(rq_id, log_prefix=f"Task {task.id} annotation import")
        print(f"Imported {args.filename} as {args.import_format!r} ({args.import_mode})")

        # 6. Re-read the annotations, so the count is the server's state.
        print(f"Task {task.id}: {count_objects(task)} objects after import")


if __name__ == "__main__":
    main()
