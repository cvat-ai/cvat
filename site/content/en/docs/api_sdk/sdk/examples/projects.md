---
title: 'Manage projects'
linkTitle: 'Projects'
weight: 2
description: 'Create, list, update, and delete projects; back them up; write a CSV status report'
---

Create, list/filter/search, retrieve, rename, and delete projects; back them up
(locally or to cloud storage) and restore them; export datasets with a progress bar; and write a
CSV status report.

_Prerequisites:_ an authenticated `client`.

```python
import csv
from pathlib import Path

from cvat_sdk import Client, models
from cvat_sdk.core.filters import F
from cvat_sdk.core.proxies.projects import Project


def create_project(client: Client, name: str, label_names: list[str]) -> Project:
    project = client.projects.create(
        models.ProjectWriteRequest(
            name=name,
            labels=[models.PatchedLabelRequest(name=n) for n in label_names],
        )
    )
    return project


def list_projects(client: Client, name_contains: str | None = None) -> list[Project]:
    if name_contains:
        return client.projects.list(filter=F.name.contains(name_contains))
    return client.projects.list()


def rename_project(client: Client, project_id: int, new_name: str) -> Project:
    project = client.projects.retrieve(project_id)
    return project.update(models.PatchedProjectWriteRequest(name=new_name))


def delete_projects(client: Client, project_ids: list[int]) -> None:
    client.projects.remove_by_ids(project_ids)
```

Free-text search and server-side ordering. Unlike the structured `filter` used by
`list_projects`, `search` and `ordering` go straight through to the list endpoint as query
params. `ordering` is a field name, optionally prefixed with `-` for descending order
(e.g. `"-updated_date"`):

```python
def search_projects(
    client: Client, search: str | None = None, ordering: str | None = None
) -> list[Project]:
    kwargs = {}
    if search is not None:
        kwargs["search"] = search
    if ordering is not None:
        kwargs["ordering"] = ordering
    return client.projects.list(**kwargs)
```

Back up a project to a zip and restore it later:

```python
def backup_project(client: Client, project_id: int, path: Path) -> Path:
    project = client.projects.retrieve(project_id)
    return project.download_backup(path)


def restore_project(client: Client, path: Path) -> Project:
    return client.projects.create_from_backup(path)
```

Write the backup straight to a registered cloud storage instead of local disk. `filename` is the
key (object name) to create in the bucket, and `cloud_storage_id` is the ID of a cloud storage
already registered in CVAT:

```python
from cvat_sdk.core.proxies.types import Location


def backup_project_to_cloud(
    client: Client, project_id: int, filename: str, cloud_storage_id: int
) -> None:
    project = client.projects.retrieve(project_id)
    project.download_backup(
        filename, location=Location.CLOUD_STORAGE, cloud_storage_id=cloud_storage_id
    )
```

Write a management overview (one row per task/job) to CSV:

```python
def export_project_report_csv(client: Client, project_id: int, path: Path) -> Path:
    project = client.projects.retrieve(project_id)
    path = Path(path)
    with path.open("w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(
            ["project_id", "project_name", "task_id", "task_name",
             "job_id", "stage", "state", "assignee", "frames"]
        )
        for task in project.get_tasks():
            for job in task.get_jobs():
                assignee = job.assignee.username if job.assignee else ""
                writer.writerow(
                    [project.id, project.name, task.id, task.name,
                     job.id, job.stage, job.state, assignee, task.size]
                )
    return path
```

Export the whole project's dataset (all its tasks) to local disk or straight to a
registered cloud storage. Discover valid `format_name` values with the server-wide
[`list_export_formats`]({{< ref "tasks" >}}) helper (e.g. `"COCO 1.0"`):

```python
from cvat_sdk.core.proxies.types import Location


def export_dataset_local(
    client: Client, project_id: int, format_name: str, path: Path, include_images: bool = True
) -> Path:
    project = client.projects.retrieve(project_id)
    return project.export_dataset(
        format_name, path, include_images=include_images, location=Location.LOCAL
    )


def export_dataset_to_cloud(
    client: Client, project_id: int, format_name: str, filename: str,
    cloud_storage_id: int, include_images: bool = True,
) -> None:
    project = client.projects.retrieve(project_id)
    project.export_dataset(
        format_name, filename, include_images=include_images,
        location=Location.CLOUD_STORAGE, cloud_storage_id=cloud_storage_id,
    )
```

Export a dataset with a download progress bar. `pbar` takes any
`cvat_sdk.core.progress.ProgressReporter`; `DeferredTqdmProgressReporter` renders a `tqdm` bar
while the file downloads. `status_check_period` is the interval, in seconds, between polls of the
server while it prepares the export (defaults to `Config.status_check_period`) - lower it for a
snappier progress display on small datasets, raise it to poll less often:

```python
from cvat_sdk.core.helpers import DeferredTqdmProgressReporter
from cvat_sdk.core.proxies.types import Location


def export_dataset_with_progress(
    client: Client, project_id: int, format_name: str, path: Path,
    status_check_period: int = 2, include_images: bool = True,
) -> Path:
    project = client.projects.retrieve(project_id)
    return project.export_dataset(
        format_name, path, include_images=include_images, location=Location.LOCAL,
        pbar=DeferredTqdmProgressReporter(),
        status_check_period=status_check_period,
    )
```

_Other SDK options:_

| SDK method / parameter | What it adds |
| --- | --- |
| `Project.download_backup(..., lightweight=True)` | Produce a smaller backup that omits media. |
| `client.projects.create_from_dataset(...)` | Create a project directly from a dataset archive. |
| `Project.import_dataset(format_name, path)` | Import annotations/data into an existing project - the import counterpart of `export_dataset`. |
| `Project.get_annotations()` | Fetch the project's labeled data. |

_Notes:_

- `list()` returns the whole collection; pagination is handled for you.
- `backup_project` captures tasks, jobs, users, and settings in a single zip - but no raw media
  beyond what the `export_dataset` would include.
- The CSV report contains no annotation geometry. For an actual dataset export, use
  `export_dataset_local` / `export_dataset_to_cloud` above.
- `include_images=False` exports annotations only and is much smaller.
- Full module:
  [`project_management.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/project_management.py).
