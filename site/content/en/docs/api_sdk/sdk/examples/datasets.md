---
title: 'Dataset recipes'
linkTitle: 'Datasets'
weight: 7
description: 'Download only what changed, and export many tasks in one run'
---

Two recipes for getting datasets out of CVAT at scale:
`dataset_incremental_download.py` re-exports only the tasks that changed since
a supplied timestamp, and `dataset_bulk_export.py` exports a whole selection of
tasks in one go, with a manifest and resume. For exporting a single project's
tasks locally and to a bucket, see
[`project_export_dataset.py`](../projects#export-a-projects-tasks-as-datasets).

## Export a task or project

The core calls are `task.export_dataset(...)` and `project.export_dataset(...)`:

```python
from cvat_sdk import make_client
from cvat_sdk.core.proxies.types import Location

with make_client("https://app.cvat.ai", access_token="<your token>") as client:
    task = client.tasks.retrieve(10)
    task.export_dataset("COCO 1.0", "task_10.zip", include_images=False, location=Location.LOCAL)

    project = client.projects.retrieve(7)
    project.export_dataset("COCO 1.0", "project_7.zip", include_images=False, location=Location.LOCAL)
```

Each call downloads one archive. The recipes below add incremental selection
or exports of multiple tasks to this basic workflow.

## Download only what changed

Pass `--updated-after` to export tasks changed after an ISO 8601 timestamp.
The `updated_date__gt` filter selects those tasks on the server. Omit the
option for a full download. Each selected task replaces its previous archive.

Your pipeline owns the synchronization timestamp and its storage, whether
that is a file, a database, or another service. Advance the timestamp only
after all exports succeed; retry a failed run with the same timestamp. Choose
a checkpoint from before the run, using a clock consistent with the server,
so changes made during export are included on the next run.

| Flag | Required | Meaning |
| --- | --- | --- |
| `--host` | yes | Server URL |
| `--token` | yes | Personal Access Token |
| `--project-id` | yes | Id of the project to track |
| `--updated-after` | no | Export tasks updated after this ISO 8601 timestamp, e.g. `'2026-09-01T00:00:00+00:00'` |
| `--output-dir` | no | Where the exports go (default `datasets`) |
| `--export-format` | no | Exporter name (default `'COCO 1.0'`) |
| `--with-images` | no | Include images — much larger and slower |

```bash
python dataset_incremental_download.py --host 'https://app.cvat.ai' --token '<your token>' \
    --project-id 7 --output-dir datasets --updated-after '2026-09-01T00:00:00+00:00'
```

### The script

{{< include-code "assets/sdk-examples/dataset_incremental_download.py" >}}

## Export many tasks in one run

Picks tasks by project, by explicit ids, by status, or a combination, and
exports each one to a local directory, to a registered cloud storage, or both.
Every result — including failures — lands in a CSV manifest, and one failing
task never aborts the run: the script finishes the rest and exits 1.
`--skip-existing` makes an interrupted run resumable, and `--jobs N` exports
in parallel with **one client per worker thread**, because a `Client` is not
safe to share across threads.

| Flag | Required | Meaning |
| --- | --- | --- |
| `--host` | yes | Server URL |
| `--token` | yes | Personal Access Token |
| `--project-id` | one of `--project-id` / `--task-id` | Export every task of this project |
| `--task-id ID [ID ...]` | one of `--project-id` / `--task-id` | Export these task ids |
| `--status` | no | Keep only tasks in `annotation`, `validation`, or `completed`; with `--task-id` it is applied after the ids are resolved, so an id in another status is reported as filtered out rather than as missing |
| `--output-dir` | one of `--output-dir` / `--cloud-storage-id` | Local destination |
| `--cloud-storage-id` | one of `--output-dir` / `--cloud-storage-id` | Cloud destination |
| `--export-format` | no | Exporter name (default `'COCO 1.0'`) |
| `--jobs` | no | Parallel exports (default `1`) |
| `--skip-existing` | no | Skip tasks already exported into `--output-dir` |
| `--with-images` | no | Include images |
| `--output` | no | Manifest path (default `bulk_export.csv`) |

```bash
python dataset_bulk_export.py --host 'https://app.cvat.ai' --token '<your token>' \
    --project-id 7 --output-dir datasets --jobs 4
```

### The script

{{< include-code "assets/sdk-examples/dataset_bulk_export.py" >}}

_Other SDK options:_

| SDK method / parameter | What it adds |
| --- | --- |
| `Task.export_dataset(..., include_images=True)` | Ship the media with the annotations. |
| `Task.export_dataset(..., location=Location.CLOUD_STORAGE, cloud_storage_id=N)` | Write the result to a bucket instead of downloading it. |
| `Project.export_dataset(format_name, path)` | One archive for a whole project instead of per-task archives. |
| `Job.export_dataset(format_name, path)` | The same export scoped to a single job. |
| `Task.download_backup(path)` | A backup (data + annotations + settings) rather than a dataset. |
| `client.tasks.list(updated_date__gt=..., status=..., name__contains=...)` | Server-side selection; see the [filtering guide](../../highlevel-api). |

_Notes:_

- `updated_date` changes when a task's fields, data, or annotations change, so it
  is what the incremental recipe keys on.
- Omit `--updated-after` to force a full re-download.
- Full recipes:
  [`dataset_incremental_download.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/dataset_incremental_download.py),
  [`dataset_bulk_export.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/dataset_bulk_export.py).
