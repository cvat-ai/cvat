---
title: 'Manage tasks'
linkTitle: 'Tasks'
weight: 3
description: 'Create tasks from local files or cloud storage, list/filter, inspect, and delete'
---

Create tasks from local files or from cloud storage, list/filter/retrieve them,
inspect, and delete them.

_Prerequisites:_ an authenticated `client`. Cloud creation also needs a registered cloud storage
(see [Register a cloud storage]({{< ref "cloud-storage" >}})).

```python
from pathlib import Path

from cvat_sdk import Client, models
from cvat_sdk.core.filters import F, all_
from cvat_sdk.core.proxies.tasks import ResourceType, Task


def create_task_from_local(
    client: Client, name: str, label_names: list[str], image_paths: list[Path]
) -> Task:
    return client.tasks.create_from_data(
        spec=models.TaskWriteRequest(
            name=name,
            labels=[models.PatchedLabelRequest(name=n) for n in label_names],
        ),
        resource_type=ResourceType.LOCAL,
        resources=image_paths,
        data_params={"image_quality": 95, "sorting_method": "predefined"},
    )


def create_task_from_cloud(
    client: Client, name: str, label_names: list[str], keys: list[str], cloud_storage_id: int
) -> Task:
    return client.tasks.create_from_data(
        spec=models.TaskWriteRequest(
            name=name,
            labels=[models.PatchedLabelRequest(name=n) for n in label_names],
        ),
        resource_type=ResourceType.SHARE,
        resources=keys,
        data_params={"cloud_storage_id": cloud_storage_id},
    )


def list_tasks(
    client: Client, project_id: int | None = None, status: str | None = None
) -> list[Task]:
    conditions = []
    if project_id is not None:
        conditions.append(F.project_id == project_id)
    if status is not None:
        conditions.append(F.status == status)
    if conditions:
        return client.tasks.list(filter=all_(*conditions))
    return client.tasks.list()


def inspect_task(client: Client, task_id: int) -> dict:
    task = client.tasks.retrieve(task_id)
    return {
        "labels": [label.name for label in task.get_labels()],
        "jobs": [job.id for job in task.get_jobs()],
        "frames": task.size,
    }
```

Export a task's dataset to local disk or straight to a registered cloud storage.
`list_export_formats` returns the server-wide format names (the same list works for
[project exports]({{< ref "projects" >}}), too):

```python
from cvat_sdk.core.proxies.types import Location


def list_export_formats(client: Client) -> list[str]:
    # Low-level API: no high-level proxy for the format list yet.
    formats, _ = client.api_client.server_api.retrieve_annotation_formats()
    return [f.name for f in formats.exporters]


def export_dataset_local(
    client: Client, task_id: int, format_name: str, path: Path, include_images: bool = True
) -> Path:
    task = client.tasks.retrieve(task_id)
    return task.export_dataset(
        format_name, path, include_images=include_images, location=Location.LOCAL
    )


def export_dataset_to_cloud(
    client: Client, task_id: int, format_name: str, filename: str,
    cloud_storage_id: int, include_images: bool = True,
) -> None:
    task = client.tasks.retrieve(task_id)
    task.export_dataset(
        format_name, filename, include_images=include_images,
        location=Location.CLOUD_STORAGE, cloud_storage_id=cloud_storage_id,
    )
```

_Other SDK options:_

| SDK method / parameter | What it adds |
| --- | --- |
| `client.tasks.create_from_data(..., resource_type=ResourceType.LOCAL \| SHARE \| REMOTE)` | Where `resources` come from: `LOCAL` (upload local files), `SHARE` (keys in a cloud storage / mounted share), `REMOTE` (URLs). Defaults to `LOCAL`. |
| `client.tasks.create_from_data(..., data_params={...})` | Extra data options as a `dict`, e.g. `image_quality` (1-100), `sorting_method` (`"lexicographical"`/`"natural"`/`"predefined"`/`"random"`), `cloud_storage_id` (int). |
| `client.tasks.create_from_data(..., annotation_path="path.zip", annotation_format="CVAT XML 1.1")` | Upload an initial annotations file at creation. `annotation_path` is a `str` file path; `annotation_format` is a `str`, default `"CVAT XML 1.1"`. |
| `client.tasks.create_from_data(..., status_check_period=<int seconds>, pbar=ProgressReporter())` | `status_check_period` (`int`, seconds) is the upload status poll interval (defaults to `Config.status_check_period`); `pbar` is a `cvat_sdk.core.progress.ProgressReporter` for upload progress. |
| `client.tasks.list(..., search=, ordering=)` | Free-text search and server-side ordering, in addition to `filter`. |
| `client.tasks.create_from_backup(path)` | Recreate a task from a task backup archive. |
| `Task.import_annotations(format_name, path)` | Load annotations into an existing task - the import counterpart of `export_dataset`. |
| `Task.get_frame(frame_id: int, quality="original" \| "compressed")` | Return a single frame as a file-like object (`io.RawIOBase`) of image bytes. `quality` defaults to `"original"`. |
| `Task.download_frames(frame_ids: Sequence[int], outdir=".", quality="original", image_extension=None, filename_pattern="frame_{frame_id:06d}{frame_ext}")` | Save the given frames to disk under `outdir`. `image_extension` (e.g. `"png"`) overrides the auto-detected extension; `quality` is `"original"` or `"compressed"`. |
| `Task.get_meta()` / `Task.get_frames_info()` | Read frame count, chunk layout, and per-frame metadata. |
| `Task.export_dataset(..., pbar=ProgressReporter())` | Report local-download progress (a `cvat_sdk.core.progress.ProgressReporter`). |
| `Task.export_dataset(..., status_check_period=<int seconds>)` | Poll interval (`int`, seconds) between server status checks; defaults to `Config.status_check_period`. |
| `Task.export_dataset(filename=<directory>)` | Pass a directory as `filename` for a local export and the server-generated file name is used. |

_Notes:_

- To add a task to a project, pass `project_id` in `TaskWriteRequest` and do **not** pass labels -
  the task inherits the project's label schema.
- `create_task_from_cloud` uses `ResourceType.SHARE`, so the images are read from the bucket rather
  than uploaded from your machine.
- `include_images=False` exports annotations only and is much smaller.
- Pass a valid `format_name` from `list_export_formats`, e.g. `"COCO 1.0"` or
  `"CVAT for images 1.1"`. An unknown format name is rejected by the server.
- Full module:
  [`task_management.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/task_management.py).
