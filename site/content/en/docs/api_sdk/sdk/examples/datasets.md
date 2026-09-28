---
title: 'Dataset recipes'
linkTitle: 'Datasets'
weight: 7
description: 'Download only what changed, and export many tasks in one run'
---

Two recipes for getting data out of CVAT at scale:
`dataset_incremental_download.py` keeps a local cache of a project's tasks and
re-downloads only what the server has changed, and `dataset_bulk_export.py`
exports a given list of tasks as dataset archives in one go, with support for
resuming local exports. For exporting a single project's tasks locally and to a bucket, see
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

Each call downloads one archive, rebuilt by the server every time — there is
no incremental path through `export_dataset`. The incremental recipe below
uses a different part of the SDK; the bulk recipe adds multi-task exports to
this basic workflow.

## Download only what changed

`cvat_sdk.datasets.TaskDataset` mirrors a task on the local file system and
keeps that copy current. Each time you construct it, the SDK compares the
cached task's `updated_date` with the server's: an unchanged task is served
from disk, a changed one is fetched again. Chunks already cached are never
downloaded twice.

```python
from cvat_sdk.datasets import TaskDataset, UpdatePolicy

dataset = TaskDataset(client, 10, update_policy=UpdatePolicy.IF_MISSING_OR_STALE)
for sample in dataset.samples:
    image = sample.media.load_image()   # PIL.Image, from the cache
    shapes = sample.annotations.shapes
```

The cache lives under `client.config.cache_dir` (a per-user directory by
default), keyed by server host and task id, so several projects and servers can
share one cache without colliding.

Two limits to design around:

- **Staleness is per task, not per frame.** Any change to a task — including an
  annotation edit — purges that task's whole cache entry, so its media is
  downloaded again on the next run.
- **Metadata is always re-fetched.** Each run asks the server for the task and
  its labels; that request is how staleness is detected. Only chunks and
  annotations are skipped when the cache is fresh.

`UpdatePolicy.NEVER` is the other half of the pair: it reads the cache and
performs no network access at all, failing on anything not already cached. The
recipe exposes it as `--offline`, which needs explicit `--task-id` values,
because listing a project's tasks is itself a server call.

| Flag | Required | Meaning |
| --- | --- | --- |
| `--host` | yes | Server URL |
| `--token` | yes | Personal Access Token |
| `--project-id` | one of `--project-id` / `--task-id` | Download every task of this project |
| `--task-id ID [ID ...]` | one of `--project-id` / `--task-id` | Download these task ids |
| `--cache-dir` | no | Where the cache goes (default: the SDK's per-user cache directory) |
| `--offline` | no | Use `UpdatePolicy.NEVER` — read the cache, contact no server; needs `--task-id` |
| `--quiet` | no | Hide the SDK's per-file cache and download log |

```bash
python dataset_incremental_download.py --host 'https://app.cvat.ai' --token '<your token>' \
    --project-id 7 --cache-dir ./cvat-cache
```

Run it twice: the second run reports `cache grew by 0 B`, and the SDK's log
shows the annotations and chunks coming from the cache rather than the network.

Video tasks are skipped with a message — `TaskDataset` supports tasks whose
media can be read as images.

### The script

{{< include-code "assets/sdk-examples/dataset_incremental_download.py" >}}

## Export many tasks in one run

Takes an explicit list of task ids, optionally narrowed by status, and
exports each one to a local directory, to a registered cloud storage, or both.
The script prints each result and a summary of exported, skipped, and failed tasks.
One failing task never aborts the run: the script exports the rest and exits 1.
`--skip-existing` makes an interrupted local run resumable — it takes the
exported file as proof a task is done, so it needs `--output-dir` and refuses
to pair with `--cloud-storage-id`, where nothing lands locally to check.

| Flag | Required | Meaning |
| --- | --- | --- |
| `--host` | yes | Server URL |
| `--token` | yes | Personal Access Token |
| `--task-id ID [ID ...]` | yes | Export these task ids |
| `--status` | no | Keep only tasks in `annotation`, `validation`, or `completed`; applied after the ids are resolved, so an id in another status is reported as filtered out rather than as missing |
| `--output-dir` | one of `--output-dir` / `--cloud-storage-id` | Local destination |
| `--cloud-storage-id` | one of `--output-dir` / `--cloud-storage-id` | Cloud destination; checked for existence and access before the run. Every selected task must belong to the storage's workspace (the same organization, or both in the personal workspace); a mismatch stops the run before any export. |
| `--export-format` | no | Exporter name (default `'COCO 1.0'`) |
| `--skip-existing` | no | Skip tasks already exported into `--output-dir`; local exports only, so it cannot be combined with `--cloud-storage-id` |
| `--with-images` | no | Include images |

```bash
python dataset_bulk_export.py --host 'https://app.cvat.ai' --token '<your token>' \
    --task-id 10 11 12 --output-dir datasets
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
| `TaskDataset(..., media_download_policy=MediaDownloadPolicy.FETCH_CHUNKS_ON_DEMAND)` | Fetch a chunk only when a sample in it is read, instead of preloading every chunk. |
| `TaskDataset.iter_samples(temporary_chunks=True)` | Stream samples through a temporary directory, leaving the shared cache untouched. |
| `TaskDataset(..., load_annotations=False)` | Cache media only, when the labels are not needed. |
| `cvat_sdk.pytorch.TaskVisionDataset` | The same cache behind a `torch.utils.data.Dataset`; see the [PyTorch adapter](../../pytorch-adapter). |

_Notes:_

- `updated_date` changes when a task's fields, data, or annotations change, so it
  is what the cache compares against, and why an annotation edit re-downloads
  that task's media too.
- Delete the cache directory to force a full re-download.
- `export_dataset` and `TaskDataset` produce different things: the first a
  format-converted archive to hand off, the second a live local mirror to read
  frame by frame.
- Full recipes:
  [`dataset_incremental_download.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/dataset_incremental_download.py),
  [`dataset_bulk_export.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/dataset_bulk_export.py).
