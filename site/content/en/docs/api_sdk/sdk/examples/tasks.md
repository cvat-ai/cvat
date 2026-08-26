---
title: 'Task recipes'
linkTitle: 'Tasks'
weight: 3
description: 'Create one task or a batch of tasks from a bucket; inspect and export existing tasks'
---

Three recipes cover the task lifecycle: `task_create_from_cloud.py` creates one
task from object keys already in a registered bucket,
`tasks_bulk_from_cloud.py` creates a whole batch of tasks in a project from
that same bucket, and `task_inspect_and_export.py` inspects an existing task,
exports its dataset locally, and reports analytics from its event log.

## Create a task from cloud object keys

Creates a task from images that already live in a registered bucket.

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

{{< include-code "assets/sdk-examples/task_create_from_cloud.py" >}}

## Bulk-create tasks in a project from a bucket

Creates several tasks in one call, all inside the same project, each reading
its data from a registered cloud storage. Two ways to spell a task's data,
repeatable and mixable: `--task KEY[,KEY,...]` lists explicit object keys (a
single key makes a video/single-image task; multiple keys make an image task
whose frames are those keys in order), and `--task-pattern PATTERN` makes one
task from every bucket file matching a fnmatch wildcard (e.g. `'batch_a/*.jpg'`),
resolved from the bucket's manifest instead of listing every key by hand.
Because every task belongs to the project, they share its label schema — no
`--labels` here.

| Flag | Required | Meaning |
| --- | --- | --- |
| `--host` | yes | Server URL |
| `--token` | yes | Personal Access Token |
| `--cloud-storage-id` | yes | Registered cloud storage id (see `cloud_storage_register.py`) |
| `--project-id` | yes | Project the tasks are created in; supplies the labels |
| `--task KEY[,KEY,...]` | one of `--task` / `--task-pattern` | One `--task` per task; repeat the flag for more |
| `--task-pattern PATTERN` | one of `--task` / `--task-pattern` | One task per wildcard, matched via the bucket's manifest; repeat for more |
| `--manifest` | no | Manifest object key used to resolve `--task-pattern` (default `'manifest.jsonl'`) |
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

# the same two batches, without listing every key: one task per wildcard match
python tasks_bulk_from_cloud.py --host 'https://app.cvat.ai' --token '<your token>' \
    --cloud-storage-id 7 --project-id 42 --manifest manifest.jsonl \
    --task-pattern 'batch_a/*.jpg' --task-pattern 'batch_b/*.jpg'
```

### The script

{{< include-code "assets/sdk-examples/tasks_bulk_from_cloud.py" >}}

## Inspect a task and export its dataset

Prints a summary of an existing task (labels, jobs, frames), exports its
dataset to a local zip, then exports the task's event log and reports two
analytics computed from it: how many people are currently assigned to a job,
and how many jobs were rejected in review and sent back for rework.

| Flag | Required | Meaning |
| --- | --- | --- |
| `--host` | yes | Server URL |
| `--token` | yes | Personal Access Token |
| `--task-id` | yes | Id of the task to inspect and export |
| `--export-format` | no | Exporter name (default `'COCO 1.0'`) |

```bash
python task_inspect_and_export.py --host 'https://app.cvat.ai' --token '<your token>' \
    --task-id 42 --export-format 'COCO 1.0'
```

### The script

{{< include-code "assets/sdk-examples/task_inspect_and_export.py" >}}

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
| `Task.export_dataset(..., location=Location.CLOUD_STORAGE, cloud_storage_id=<int>)` | Export straight to a registered cloud storage instead of downloading locally. |
| `client.api_client.events_api.create_export(project_id=, job_id=, user_id=, _from=, to=)` | Scope or time-bound the event-log export beyond a single task. |

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
