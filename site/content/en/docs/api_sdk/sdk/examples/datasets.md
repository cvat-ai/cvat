---
title: 'Dataset recipes'
linkTitle: 'Datasets'
weight: 7
description: 'Download only what changed, and export many tasks in one run'
---

Two recipes for getting datasets out of CVAT at scale:
`dataset_incremental_download.py` re-exports only the tasks that changed since
its previous run, and `dataset_bulk_export.py` exports a whole selection of
tasks in one go, with a manifest and resume. For exporting a single project's
tasks locally and to a bucket, see
[`project_export_dataset.py`](../projects#export-a-projects-tasks-as-datasets).

## Download only what changed

Keeps a small JSON state file next to the exports. On each run it asks the
server for the project's tasks updated after the previous run — the
`updated_date__gt` keyword becomes a server-side filter — exports only those,
and records each task's `updated_date` immediately after its export succeeds,
so an interrupted run resumes instead of starting over. Tasks that vanished
from the server are reported, not silently forgotten.

| Flag | Required | Meaning |
| --- | --- | --- |
| `--host` | yes | Server URL |
| `--token` | yes | Personal Access Token |
| `--project-id` | yes | Id of the project to track |
| `--state` | no | State file (default `incremental_state.json`) |
| `--output-dir` | no | Where the exports go (default `datasets`) |
| `--export-format` | no | Exporter name (default `'COCO 1.0'`) |
| `--with-images` | no | Include images — much larger and slower |

```bash
python dataset_incremental_download.py --host 'https://app.cvat.ai' --token '<your token>' \
    --project-id 7 --output-dir datasets
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
| `--status` | no | Keep only tasks in `annotation`, `validation`, or `completed` |
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
- The state file is plain JSON — delete it to force a full re-download, or keep
  one per project.
- Full recipes:
  [`dataset_incremental_download.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/dataset_incremental_download.py),
  [`dataset_bulk_export.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/dataset_bulk_export.py).
