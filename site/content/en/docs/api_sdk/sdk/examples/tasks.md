---
title: 'Task recipes'
linkTitle: 'Tasks'
weight: 3
description: 'Create one task or a batch of tasks from a bucket; inspect and export existing tasks'
---

Three recipes cover the task lifecycle: `task_create_from_cloud.py` creates one
task from object keys already in a registered bucket,
`tasks_bulk_from_cloud.py` creates a whole batch of tasks in a project from
that same bucket, and `task_inspect_and_export.py` inspects an existing task
and exports its dataset locally + to a bucket.

## Create a task from cloud object keys

Creates a task from images that already live in a registered bucket — nothing
is uploaded from your machine.

| Flag | Required | Meaning |
| --- | --- | --- |
| `--host` | yes | Server URL |
| `--token` | yes | Personal Access Token |
| `--cloud-storage-id` | yes | Registered cloud storage id (see `cloud_storage_register.py`) |
| `--cloud-keys` | yes | Object keys in the bucket, space-separated |
| `--name` | no | Task name (default `'Task from cloud storage'`) |
| `--labels` | no | Label names, space-separated (default `object`) |
| `--cleanup` | no | Delete the created task at the end |

```bash
python task_create_from_cloud.py --host 'https://app.cvat.ai' --token '<your token>' \
    --cloud-storage-id 7 --cloud-keys 'images/0001.jpg' 'images/0002.jpg' \
    --labels car person
```

### The script

```python
"""Create an annotation task from images that already live in a registered
cloud storage.

Steps:
  1. Create a task whose data is a list of object keys in the bucket.
  2. Print the result.
  3. Optionally delete it (--cleanup).

Register a bucket first with cloud_storage_register.py to get the storage id.

Usage (run ``python task_create_from_cloud.py --help`` for the full list of options):
  python task_create_from_cloud.py --host 'https://app.cvat.ai' --token '<your token>' \
      --cloud-storage-id 7 --cloud-keys 'images/0001.jpg' 'images/0002.jpg' \
      --labels car person
"""

import argparse

from cvat_sdk import make_client, models
from cvat_sdk.core.proxies.tasks import ResourceType


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--host", required=True, help="CVAT server URL, e.g. 'https://app.cvat.ai'"
    )
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
    parser.add_argument(
        "--cleanup", action="store_true", help="delete the created task at the end"
    )
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
```

## Bulk-create tasks in a project from a bucket

Creates several tasks in one call, all inside the same project, each reading
its data from a registered cloud storage. One `--task` flag creates one task;
its value is a comma-separated list of object keys. A single key makes a video
(or single-image) task; multiple keys make an image task whose frames are
those keys in order. Because every task belongs to the project, they share its
label schema — no `--labels` here.

| Flag | Required | Meaning |
| --- | --- | --- |
| `--host` | yes | Server URL |
| `--token` | yes | Personal Access Token |
| `--cloud-storage-id` | yes | Registered cloud storage id (see `cloud_storage_register.py`) |
| `--project-id` | yes | Project the tasks are created in; supplies the labels |
| `--task KEY[,KEY,...]` | yes | One `--task` per task; repeat the flag for more |
| `--name-prefix` | no | Task-name prefix; each task is named `<prefix> N` (default `'Bulk task'`) |
| `--cleanup` | no | Delete every created task at the end |

```bash
# three video tasks in project 42
python tasks_bulk_from_cloud.py --host 'https://app.cvat.ai' --token '<your token>' \
    --cloud-storage-id 7 --project-id 42 \
    --task 'videos/clip_01.mp4' --task 'videos/clip_02.mp4' --task 'videos/clip_03.mp4'

# two image-batch tasks in project 42
python tasks_bulk_from_cloud.py --host 'https://app.cvat.ai' --token '<your token>' \
    --cloud-storage-id 7 --project-id 42 \
    --task 'batch_a/img_1.jpg,batch_a/img_2.jpg' \
    --task 'batch_b/img_1.jpg,batch_b/img_2.jpg'
```

### The script

```python
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
  python tasks_bulk_from_cloud.py --host 'https://app.cvat.ai' --token '<your token>' \
      --cloud-storage-id 7 --project-id 42 \
      --task 'videos/clip_01.mp4' --task 'videos/clip_02.mp4' --task 'videos/clip_03.mp4'

  # two image-batch tasks in project 42
  python tasks_bulk_from_cloud.py --host 'https://app.cvat.ai' --token '<your token>' \
      --cloud-storage-id 7 --project-id 42 \
      --task 'batch_a/img_1.jpg,batch_a/img_2.jpg' \
      --task 'batch_b/img_1.jpg,batch_b/img_2.jpg'
"""

import argparse

from cvat_sdk import make_client, models
from cvat_sdk.core.proxies.tasks import ResourceType


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--host", required=True, help="CVAT server URL, e.g. 'https://app.cvat.ai'"
    )
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
```

## Inspect a task and export its dataset

Prints a summary of an existing task (labels, jobs, frames) and exports its
dataset both to a local zip and to a registered cloud storage.

| Flag | Required | Meaning |
| --- | --- | --- |
| `--host` | yes | Server URL |
| `--token` | yes | Personal Access Token |
| `--task-id` | yes | Id of the task to inspect and export |
| `--cloud-storage-id` | yes | Registered cloud storage id |
| `--export-format` | no | Exporter name (default `'COCO 1.0'`) |

```bash
python task_inspect_and_export.py --host 'https://app.cvat.ai' --token '<your token>' \
    --task-id 42 --cloud-storage-id 7 --export-format 'COCO 1.0'
```

### The script

```python
"""Inspect an existing task (labels, jobs, frames) and export its dataset to a
local zip AND to a registered cloud storage.

Steps:
  1. Retrieve the task and print a summary: labels, jobs (stage/state), frames.
  2. Fetch the server's export format list and validate --export-format.
  3. Export to task_<id>_dataset.zip in the current directory.
  4. Export the same dataset straight to the cloud storage.

Usage (run ``python task_inspect_and_export.py --help`` for the full list of options):
  python task_inspect_and_export.py --host 'https://app.cvat.ai' --token '<your token>' \
      --task-id 42 --cloud-storage-id 7 --export-format 'COCO 1.0'
"""

import argparse
import sys
from pathlib import Path

from cvat_sdk import make_client
from cvat_sdk.core.proxies.types import Location


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--host", required=True, help="CVAT server URL, e.g. 'https://app.cvat.ai'"
    )
    parser.add_argument(
        "--token",
        required=True,
        help="Personal Access Token (CVAT UI: Profile -> Security)",
    )
    parser.add_argument(
        "--task-id", type=int, required=True, help="id of an existing task, e.g. 42"
    )
    parser.add_argument(
        "--cloud-storage-id",
        type=int,
        required=True,
        help="a registered cloud storage id (see cloud_storage_register.py)",
    )
    parser.add_argument(
        "--export-format",
        default="COCO 1.0",
        help="exporter name, e.g. 'COCO 1.0' (default: 'COCO 1.0')",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    with make_client(args.host, access_token=args.token) as client:
        # 1. Inspect
        task = client.tasks.retrieve(args.task_id)
        print(f"Task {task.id}: {task.name!r}, {task.size} frames")
        print(f"  labels: {[label.name for label in task.get_labels()]}")
        for job in task.get_jobs():
            print(f"  job {job.id}: stage={job.stage}, state={job.state}")

        # 2. Validate the export format against the server's list.
        # Low-level API: there is no high-level proxy for the format list yet.
        formats, _ = client.api_client.server_api.retrieve_annotation_formats()
        names = [f.name for f in formats.exporters]
        if args.export_format not in names:
            sys.exit(
                f"Unknown export format {args.export_format!r}. Choose one of: {', '.join(names)}"
            )

        # 3. Export to a local zip
        local_path = Path(f"task_{task.id}_dataset.zip")
        task.export_dataset(
            args.export_format, local_path, include_images=True, location=Location.LOCAL
        )
        print(f"Exported {local_path.resolve()}")

        # 4. Export straight to the cloud storage
        remote_name = f"task_{task.id}_dataset.zip"
        task.export_dataset(
            args.export_format,
            remote_name,
            include_images=True,
            location=Location.CLOUD_STORAGE,
            cloud_storage_id=args.cloud_storage_id,
        )
        print(f"Exported {remote_name} to cloud storage {args.cloud_storage_id}")


if __name__ == "__main__":
    main()
```

_Other SDK options:_

| SDK method / parameter | What it adds |
| --- | --- |
| `client.tasks.create_from_data(..., resource_type=ResourceType.LOCAL \| SHARE \| REMOTE)` | Where `resources` come from: `LOCAL` (upload local files), `SHARE` (keys in a cloud storage / mounted share), `REMOTE` (URLs). Defaults to `LOCAL`. |
| `client.tasks.create_from_data(..., data_params={...})` | Extra data options as a `dict`, e.g. `image_quality` (1-100), `sorting_method` (`"lexicographical"`/`"natural"`/`"predefined"`/`"random"`), `cloud_storage_id` (int). |
| `client.tasks.create_from_data(..., annotation_path="path.zip", annotation_format="CVAT XML 1.1")` | Upload an initial annotations file at creation. `annotation_path` is a `str` file path; `annotation_format` is a `str`, default `"CVAT XML 1.1"`. |
| `client.tasks.create_from_data(..., status_check_period=<int seconds>, pbar=ProgressReporter())` | `status_check_period` (`int`, seconds) is the upload status poll interval (defaults to `Config.status_check_period`); `pbar` is a `cvat_sdk.core.progress.ProgressReporter` for upload progress. |
| `client.tasks.list(..., search=, sort=)` | Free-text search and server-side ordering (`sort`), in addition to `filter`. |
| `client.tasks.create_from_backup(path)` | Recreate a task from a task backup archive. |
| `Task.import_annotations(format_name, path)` | Load annotations into an existing task - the import counterpart of `export_dataset`. |
| `Task.get_frame(frame_id: int, *, quality="original" \| "compressed")` | Return a single frame as a file-like object (`io.RawIOBase`) of image bytes. `quality` is an optional keyword argument (`"original"` or `"compressed"`); if omitted, the server default is used. |
| `Task.download_frames(frame_ids: Sequence[int], outdir=".", quality="original", image_extension=None, filename_pattern="frame_{frame_id:06d}{frame_ext}")` | Save the given frames to disk under `outdir`. `image_extension` (e.g. `"png"`) overrides the auto-detected extension; `quality` is `"original"` or `"compressed"`. |
| `Task.get_meta()` / `Task.get_frames_info()` | Read frame count, chunk layout, and per-frame metadata. |
| `Task.export_dataset(..., pbar=ProgressReporter())` | Report local-download progress (a `cvat_sdk.core.progress.ProgressReporter`). |
| `Task.export_dataset(..., status_check_period=<int seconds>)` | Poll interval (`int`, seconds) between server status checks; defaults to `Config.status_check_period`. |
| `Task.export_dataset(filename=<directory>)` | Pass a directory as `filename` for a local export and the server-generated file name is used. |

_Notes:_

- To add a task to a project, pass `project_id` in `TaskWriteRequest` and do
  **not** pass labels — the task inherits the project's label schema.
- Both cloud recipes use `ResourceType.SHARE`, so the images are read from the
  bucket rather than uploaded from your machine.
- `include_images=False` exports annotations only and is much smaller.
- Pass a valid `format_name` from the server's exporter list, e.g. `"COCO 1.0"`
  or `"CVAT for images 1.1"`. An unknown format name is rejected by the recipe.
- Full recipes:
  [`task_create_from_cloud.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/task_create_from_cloud.py),
  [`tasks_bulk_from_cloud.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/tasks_bulk_from_cloud.py),
  [`task_inspect_and_export.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/task_inspect_and_export.py).
