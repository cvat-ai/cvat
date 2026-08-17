---
title: 'Task recipes'
linkTitle: 'Tasks'
weight: 3
description: 'Create tasks from local images or a bucket; inspect and export existing tasks'
---

Three recipes cover the task lifecycle: `task_create_from_images.py` uploads a
folder of images, `task_create_from_cloud.py` uses object keys already in a
registered bucket, and `task_inspect_and_export.py` inspects an existing task
and exports its dataset locally + to a bucket.

## Create a task from local images

Uploads a folder of `*.jpg`/`*.jpeg`/`*.png` files as a new task. With
`CVAT_PROJECT_ID` set the task is created inside that project and inherits its
labels; otherwise it uses `CVAT_LABELS`.

| Variable | Required | Meaning |
| --- | --- | --- |
| `CVAT_HOST` | yes | Server URL |
| `CVAT_ACCESS_TOKEN` | yes | Personal Access Token |
| `IMAGE_DIR` | yes | Directory containing images |
| `CVAT_PROJECT_ID` | no | Id of the project to create the task in |
| `CVAT_LABELS` | no | Comma-separated labels (used only without a project) |
| `CVAT_TASK_NAME` | no | Task name (default `Example task`) |
| `CVAT_EXAMPLES_CLEANUP` | no | Set to `1` to delete the task at the end |

```bash
export CVAT_HOST=https://app.cvat.ai
export CVAT_ACCESS_TOKEN=...
export IMAGE_DIR=./images
python task_create_from_images.py
```

### The script

```python
"""Create an annotation task from a local directory of images, then list,
retrieve, and rename it.

Steps:
  1. Collect *.jpg / *.jpeg / *.png files from IMAGE_DIR (sorted).
  2. Create the task and upload the images. With CVAT_PROJECT_ID the task is
     created inside that project and inherits its labels; without it, the task
     gets its own labels from CVAT_LABELS.
  3. List tasks currently in the "annotation" status.
  4. Retrieve the new task by id and rename it.
  5. Optionally delete it (CVAT_EXAMPLES_CLEANUP=1).

Usage:
  export CVAT_HOST=https://app.cvat.ai
  export CVAT_ACCESS_TOKEN=...       # CVAT UI: Profile -> Security
  export IMAGE_DIR=./images
  export CVAT_PROJECT_ID=42          # optional: create inside a project
  export CVAT_LABELS=car,person      # optional, used only without a project
  python task_create_from_images.py
"""

import os
import sys
from pathlib import Path

from cvat_sdk import make_client, models
from cvat_sdk.core.filters import F
from cvat_sdk.core.proxies.tasks import ResourceType


def require_env(name: str, hint: str) -> str:
    value = os.environ.get(name)
    if not value:
        sys.exit(f"Set the {name} environment variable: {hint}")
    return value


HOST = require_env("CVAT_HOST", "your CVAT server URL, e.g. https://app.cvat.ai")
TOKEN = require_env("CVAT_ACCESS_TOKEN", "create one in the CVAT UI: Profile -> Security")
IMAGE_DIR = Path(require_env("IMAGE_DIR", "a directory containing *.jpg/*.png images"))
PROJECT_ID = os.environ.get("CVAT_PROJECT_ID")
TASK_NAME = os.environ.get("CVAT_TASK_NAME", "Example task")
LABELS = os.environ.get("CVAT_LABELS", "object").split(",")
CLEANUP = os.environ.get("CVAT_EXAMPLES_CLEANUP") == "1"


def find_images(directory: Path) -> list[Path]:
    if not directory.is_dir():
        sys.exit(f"IMAGE_DIR {directory} is not a directory")
    images = sorted(p for p in directory.iterdir() if p.suffix.lower() in (".jpg", ".jpeg", ".png"))
    if not images:
        sys.exit(f"No images found in {directory}")
    return images


def main() -> None:
    images = find_images(IMAGE_DIR)
    print(f"Found {len(images)} images in {IMAGE_DIR}")

    with make_client(HOST, access_token=TOKEN) as client:
        # 1-2. Create the task and upload the images.
        if PROJECT_ID:
            # Tasks in a project inherit the project's labels — do NOT pass labels.
            spec = models.TaskWriteRequest(name=TASK_NAME, project_id=int(PROJECT_ID))
        else:
            spec = models.TaskWriteRequest(
                name=TASK_NAME,
                labels=[models.PatchedLabelRequest(name=name) for name in LABELS],
            )
        task = client.tasks.create_from_data(
            spec=spec,
            resource_type=ResourceType.LOCAL,
            resources=images,
            # predefined = keep the order we pass; image_quality trades size for fidelity
            data_params={"image_quality": 95, "sorting_method": "predefined"},
        )
        where = f" into project {PROJECT_ID}" if PROJECT_ID else ""
        print(f"Created task {task.id}{where} with {task.size} frames: {HOST}/tasks/{task.id}")

        # 3. List tasks that are still being annotated
        in_annotation = client.tasks.list(filter=F.status == "annotation")
        print(f"Tasks in 'annotation' status: {len(in_annotation)}")

        # 4. Retrieve by id and rename
        fetched = client.tasks.retrieve(task.id)
        renamed = fetched.update(models.PatchedTaskWriteRequest(name=f"{TASK_NAME} (renamed)"))
        print(f"Renamed to: {renamed.name}")

        # 5. Opt-in cleanup
        if CLEANUP:
            renamed.remove()
            print(f"Deleted task {task.id}")
        else:
            print("Keeping the task; set CVAT_EXAMPLES_CLEANUP=1 to delete it")


if __name__ == "__main__":
    main()
```

## Create a task from cloud object keys

Creates a task from images that already live in a registered bucket — nothing is
uploaded from your machine.

| Variable | Required | Meaning |
| --- | --- | --- |
| `CVAT_HOST` | yes | Server URL |
| `CVAT_ACCESS_TOKEN` | yes | Personal Access Token |
| `CVAT_CLOUD_STORAGE_ID` | yes | Registered cloud storage id (see `cloud_storage_register.py`) |
| `CLOUD_KEYS` | yes | Comma-separated object keys in the bucket |
| `CVAT_LABELS` | no | Comma-separated labels (default `object`) |
| `CVAT_TASK_NAME` | no | Task name (default `Task from cloud storage`) |
| `CVAT_EXAMPLES_CLEANUP` | no | Set to `1` to delete the task at the end |

```bash
export CVAT_HOST=https://app.cvat.ai
export CVAT_ACCESS_TOKEN=...
export CVAT_CLOUD_STORAGE_ID=7
export CLOUD_KEYS=images/0001.jpg,images/0002.jpg
python task_create_from_cloud.py
```

### The script

```python
"""Create an annotation task from images that already live in a registered
cloud storage — nothing is uploaded from your machine.

Steps:
  1. Create a task whose data is a list of object keys in the bucket.
  2. Print the result.
  3. Optionally delete it (CVAT_EXAMPLES_CLEANUP=1).

Register a bucket first with cloud_storage_register.py to get the storage id.

Usage:
  export CVAT_HOST=https://app.cvat.ai
  export CVAT_ACCESS_TOKEN=...                       # CVAT UI: Profile -> Security
  export CVAT_CLOUD_STORAGE_ID=7
  export CLOUD_KEYS=images/0001.jpg,images/0002.jpg  # comma-separated object keys
  export CVAT_LABELS=car,person                      # optional
  python task_create_from_cloud.py
"""

import os
import sys

from cvat_sdk import make_client, models
from cvat_sdk.core.proxies.tasks import ResourceType


def require_env(name: str, hint: str) -> str:
    value = os.environ.get(name)
    if not value:
        sys.exit(f"Set the {name} environment variable: {hint}")
    return value


HOST = require_env("CVAT_HOST", "your CVAT server URL, e.g. https://app.cvat.ai")
TOKEN = require_env("CVAT_ACCESS_TOKEN", "create one in the CVAT UI: Profile -> Security")
CLOUD_STORAGE_ID = int(
    require_env(
        "CVAT_CLOUD_STORAGE_ID", "a registered cloud storage id (cloud_storage_register.py)"
    )
)
CLOUD_KEYS = require_env(
    "CLOUD_KEYS", "comma-separated object keys, e.g. images/0001.jpg,images/0002.jpg"
).split(",")
TASK_NAME = os.environ.get("CVAT_TASK_NAME", "Task from cloud storage")
LABELS = os.environ.get("CVAT_LABELS", "object").split(",")
CLEANUP = os.environ.get("CVAT_EXAMPLES_CLEANUP") == "1"


def main() -> None:
    with make_client(HOST, access_token=TOKEN) as client:
        # ResourceType.SHARE + cloud_storage_id = read images from the bucket
        task = client.tasks.create_from_data(
            spec=models.TaskWriteRequest(
                name=TASK_NAME,
                labels=[models.PatchedLabelRequest(name=name) for name in LABELS],
            ),
            resource_type=ResourceType.SHARE,
            resources=CLOUD_KEYS,
            data_params={"cloud_storage_id": CLOUD_STORAGE_ID},
        )
        print(f"Created task {task.id} with {task.size} frames: {HOST}/tasks/{task.id}")

        if CLEANUP:
            task.remove()
            print(f"Deleted task {task.id}")
        else:
            print("Keeping the task; set CVAT_EXAMPLES_CLEANUP=1 to delete it")


if __name__ == "__main__":
    main()
```

## Inspect a task and export its dataset

Prints a summary of an existing task (labels, jobs, frames) and exports its
dataset both to a local zip and to a registered cloud storage.

| Variable | Required | Meaning |
| --- | --- | --- |
| `CVAT_HOST` | yes | Server URL |
| `CVAT_ACCESS_TOKEN` | yes | Personal Access Token |
| `CVAT_TASK_ID` | yes | Id of the task to inspect and export |
| `CVAT_CLOUD_STORAGE_ID` | yes | Registered cloud storage id |
| `CVAT_EXPORT_FORMAT` | no | Server format name (default `COCO 1.0`) |

```bash
export CVAT_HOST=https://app.cvat.ai
export CVAT_ACCESS_TOKEN=...
export CVAT_TASK_ID=42
export CVAT_CLOUD_STORAGE_ID=7
python task_inspect_and_export.py
```

### The script

```python
"""Inspect an existing task (labels, jobs, frames) and export its dataset to a
local zip AND to a registered cloud storage.

Steps:
  1. Retrieve the task and print a summary: labels, jobs (stage/state), frames.
  2. Fetch the server's export format list and validate CVAT_EXPORT_FORMAT.
  3. Export to task_<id>_dataset.zip in the current directory.
  4. Export the same dataset straight to the cloud storage.

Usage:
  export CVAT_HOST=https://app.cvat.ai
  export CVAT_ACCESS_TOKEN=...          # CVAT UI: Profile -> Security
  export CVAT_TASK_ID=42               # an existing task id
  export CVAT_CLOUD_STORAGE_ID=7       # see cloud_storage_register.py
  export CVAT_EXPORT_FORMAT="COCO 1.0" # optional, default "COCO 1.0"
  python task_inspect_and_export.py
"""

import os
import sys
from pathlib import Path

from cvat_sdk import make_client
from cvat_sdk.core.proxies.types import Location


def require_env(name: str, hint: str) -> str:
    value = os.environ.get(name)
    if not value:
        sys.exit(f"Set the {name} environment variable: {hint}")
    return value


HOST = require_env("CVAT_HOST", "your CVAT server URL, e.g. https://app.cvat.ai")
TOKEN = require_env("CVAT_ACCESS_TOKEN", "create one in the CVAT UI: Profile -> Security")
TASK_ID = int(require_env("CVAT_TASK_ID", "id of an existing task, e.g. 42"))
CLOUD_STORAGE_ID = int(
    require_env(
        "CVAT_CLOUD_STORAGE_ID", "a registered cloud storage id (cloud_storage_register.py)"
    )
)
EXPORT_FORMAT = os.environ.get("CVAT_EXPORT_FORMAT", "COCO 1.0")


def main() -> None:
    with make_client(HOST, access_token=TOKEN) as client:
        # 1. Inspect
        task = client.tasks.retrieve(TASK_ID)
        print(f"Task {task.id}: {task.name!r}, {task.size} frames")
        print(f"  labels: {[label.name for label in task.get_labels()]}")
        for job in task.get_jobs():
            print(f"  job {job.id}: stage={job.stage}, state={job.state}")

        # 2. Validate the export format against the server's list.
        # Low-level API: there is no high-level proxy for the format list yet.
        formats, _ = client.api_client.server_api.retrieve_annotation_formats()
        names = [f.name for f in formats.exporters]
        if EXPORT_FORMAT not in names:
            sys.exit(f"Unknown export format {EXPORT_FORMAT!r}. Choose one of: {', '.join(names)}")

        # 3. Export to a local zip
        local_path = Path(f"task_{task.id}_dataset.zip")
        task.export_dataset(EXPORT_FORMAT, local_path, include_images=True, location=Location.LOCAL)
        print(f"Exported {local_path.resolve()}")

        # 4. Export straight to the cloud storage
        remote_name = f"task_{task.id}_dataset.zip"
        task.export_dataset(
            EXPORT_FORMAT,
            remote_name,
            include_images=True,
            location=Location.CLOUD_STORAGE,
            cloud_storage_id=CLOUD_STORAGE_ID,
        )
        print(f"Exported {remote_name} to cloud storage {CLOUD_STORAGE_ID}")


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

- To add a task to a project, pass `project_id` in `TaskWriteRequest` and do **not**
  pass labels — the task inherits the project's label schema.
- `task_create_from_cloud.py` uses `ResourceType.SHARE`, so the images are read
  from the bucket rather than uploaded from your machine.
- `include_images=False` exports annotations only and is much smaller.
- Pass a valid `format_name` from the server's exporter list, e.g. `"COCO 1.0"` or
  `"CVAT for images 1.1"`. An unknown format name is rejected by the recipe.
- Full recipes:
  [`task_create_from_images.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/task_create_from_images.py),
  [`task_create_from_cloud.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/task_create_from_cloud.py),
  [`task_inspect_and_export.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/task_inspect_and_export.py).
