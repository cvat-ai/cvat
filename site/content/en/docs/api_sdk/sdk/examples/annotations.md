---
title: 'Annotation recipes'
linkTitle: 'Annotations'
weight: 5
description: 'Import annotations into a task from a file or a bucket, edit them in bulk, aggregate statistics, and find objects annotated twice'
---

Five recipes: `task_import_annotations.py` loads an annotation file into an
existing task, `task_import_annotations_from_cloud.py` does the same with a
file that stays in a registered cloud storage, `task_edit_annotations.py`
reads a task's annotations, applies a bulk edit, and writes it back,
`project_annotation_stats.py` walks a project's tasks and aggregates object
counts per label and type into a CSV report, and `project_data_lint.py`
finds objects that were annotated twice before you export them.

## Import annotations into a task

Uploads a local annotations file (e.g., predictions of a model, or work
exported from another server) into an existing task, and shows the object
counts before and after, so you can see what the import added. The import
format is validated against the server's importer list.

| Flag | Required | Meaning |
| --- | --- | --- |
| `--host` | yes | Server URL |
| `--token` | yes | Personal Access Token |
| `--task-id` | yes | Id of the task to import into |
| `--annotations-file` | yes | File to import, e.g. `'annotations.zip'` |
| `--import-format` | no | Importer name (default `'COCO 1.0'`) |

```bash
python task_import_annotations.py --host 'https://app.cvat.ai' --token '<your token>' \
    --task-id 42 --annotations-file 'annotations.zip' --import-format 'COCO 1.0'
```

### The script

{{< include-code "assets/sdk-examples/task_import_annotations.py" >}}

## Import annotations from a cloud storage

Imports an annotation file that is already in a registered bucket: CVAT
downloads the object itself, so nothing is uploaded from the machine running
the script. Useful when a model writes its predictions to the bucket, or when
the archive is too big to push through your own connection.

The high-level `Task.import_annotations()` always uploads a local file, so this
recipe posts the import request through the low-level
`client.api_client.tasks_api` with `location=Location.CLOUD_STORAGE` and awaits
the returned `rq_id` with `client.wait_for_completion()`.

Before starting the import, the recipe checks that the object key really is in
the bucket — otherwise a typo would only show up as a failed background
request. Pass `--no-file-check` to skip that listing (for example when the
credentials may read objects but not list them).

| Flag | Required | Meaning |
| --- | --- | --- |
| `--host` | yes | Server URL |
| `--token` | yes | Personal Access Token |
| `--task-id` | yes | Id of the task to import into |
| `--filename` | yes | Object key in the bucket, e.g. `'annotations/task_42.zip'` |
| `--cloud-storage-id` | no | Registered cloud storage id; omit to use the task's own source storage |
| `--import-format` | no | Importer name (default `'COCO 1.0'`) |
| `--import-mode` | no | `replace` (default) or `append` |
| `--no-file-check` | no | Skip the bucket listing that verifies `--filename` |

```bash
# explicit bucket
python task_import_annotations_from_cloud.py --host 'https://app.cvat.ai' --token '<your token>' \
    --task-id 42 --cloud-storage-id 7 --filename 'annotations/task_42.zip' \
    --import-format 'COCO 1.0'

# the bucket configured as the task's source storage, adding to the existing objects
python task_import_annotations_from_cloud.py --host 'https://app.cvat.ai' --token '<your token>' \
    --task-id 42 --filename 'predictions/task_42.zip' --import-mode append
```

Register the bucket first with
[`cloud_storage_register.py`](/docs/api_sdk/sdk/examples/cloud-storage/) to get
the storage id.

### The script

{{< include-code "assets/sdk-examples/task_import_annotations_from_cloud.py" >}}

## Read, edit, and write back annotations

Reads all of a task's annotations (tags, shapes, and tracks), applies one bulk
edit — move every object from one label to another (`--relabel FROM TO`) or
delete every object with a given label (`--delete-label NAME`) — and writes
the edit back with a partial update, so the untouched objects are not
re-uploaded. Prints the per-label object counts before and after.

| Flag | Required | Meaning |
| --- | --- | --- |
| `--host` | yes | Server URL |
| `--token` | yes | Personal Access Token |
| `--task-id` | yes | Id of the task to edit |
| `--relabel FROM TO` | one of `--relabel` / `--delete-label` | Move all objects from label `FROM` to label `TO` |
| `--delete-label NAME` | one of `--relabel` / `--delete-label` | Delete all objects with this label |

```bash
python task_edit_annotations.py --host 'https://app.cvat.ai' --token '<your token>' \
    --task-id 42 --relabel 'car' 'vehicle'
python task_edit_annotations.py --host 'https://app.cvat.ai' --token '<your token>' \
    --task-id 42 --delete-label 'draft'
```

### The script

{{< include-code "assets/sdk-examples/task_edit_annotations.py" >}}

## Aggregate annotation statistics over a project

Walks every task of a project and counts the annotated objects per label and
per type (a shape type such as `rectangle` or `polygon`, `tag`, or `track`).
Prints a per-task breakdown with per-label project totals and writes
`annotation_stats.csv` into the current directory — one row per
(task, label, type).

| Flag | Required | Meaning |
| --- | --- | --- |
| `--host` | yes | Server URL |
| `--token` | yes | Personal Access Token |
| `--project-id` | yes | Id of the project to aggregate |

```bash
python project_annotation_stats.py --host 'https://app.cvat.ai' --token '<your token>' \
    --project-id 7
```

### The script

{{< include-code "assets/sdk-examples/project_annotation_stats.py" >}}

## Find objects annotated twice

Walks a project's tasks and reports groups of objects that annotate the same
thing on the same frame. Duplicates appear when an import runs twice, when two
annotators' job ranges overlap, or after a merge — and the ones that hurt are
not the exact copies but the near-identical boxes nobody spots by eye, so the
recipe compares objects by intersection over union rather than by equality.

Two objects belong to the same group when the IoU of their bounding boxes is at
least `--iou-threshold` (`0.9` by default) and they carry the same label.
`--any-label` drops the label condition, which catches the same car annotated
once as `car` and once as `vehicle`.

Every candidate is compared against the group's first object rather than
against every member: a duplicate is a second copy of one original, and
chaining through intermediates would merge a whole row of adjacent objects into
a single group.

The recipe only reports. Groups are printed and written to `duplicates.csv`
with one row per object (`task_id`, `job_id`, `frame`, `group`, `label`,
`type`, `shape_id`, `track_id`, `iou`, `box`). It exits 1 when any group was
found, so it can gate an export pipeline — `--no-fail` turns that off. Fix what
it reports with `task_edit_annotations.py` or in the UI.

Rectangles, polygons, polylines and points are compared through their axis-aligned
bounding boxes. Masks, skeletons, ellipses and cuboids are skipped, because
their `points` are not plain x/y pairs. Tags are skipped too — they have no
geometry to overlap. Objects marked `outside` are skipped everywhere, and track
keyframes are compared alongside plain shapes, so a shape duplicating a track
is reported.

| Flag | Required | Meaning |
| --- | --- | --- |
| `--host` | yes | Server URL |
| `--token` | yes | Personal Access Token |
| `--project-id` | yes | Id of the project to inspect |
| `--task-id ID [ID ...]` | no | Inspect only these tasks of the project; they are retrieved by id, so a big project is not listed |
| `--iou-threshold` | no | Minimum bounding box overlap for a duplicate, in `(0, 1]` (default `0.9`) |
| `--any-label` | no | Also group objects that carry different labels |
| `--output` | no | CSV report path (default `duplicates.csv`) |
| `--no-fail` | no | Exit 0 even when duplicates were found |

```bash
python project_data_lint.py --host 'https://app.cvat.ai' --token '<your token>' \
    --project-id 7 --iou-threshold 0.8
```

### The script

{{< include-code "assets/sdk-examples/project_data_lint.py" >}}

_Other SDK options:_

| SDK method / parameter | What it adds |
| --- | --- |
| `Task.import_annotations(..., import_mode="append")` | Add the imported objects to the existing annotations instead of replacing them (server support required). |
| `Task.import_annotations(..., conv_mask_to_poly=True)` | Convert imported masks to polygons on the fly. |
| `Task.import_annotations(..., pbar=ProgressReporter())` | Report upload progress (a `cvat_sdk.core.progress.ProgressReporter`). |
| `Job.import_annotations(format_name, path)` | The same import scoped to a single job. |
| `jobs_api.create_annotations(id, format=..., filename=..., location=..., cloud_storage_id=...)` | The bucket import scoped to a single job. |
| `projects_api.create_dataset(id, format=..., filename=..., location=..., cloud_storage_id=...)` | Import a whole dataset into a project from a bucket. |
| `cloudstorages_api.retrieve_content_v2(id, prefix=...)` | List a bucket's objects — how the recipe checks the key before importing. |
| `Task.set_annotations(LabeledDataRequest(...))` | Replace a task's annotations with the given objects. |
| `Task.update_annotations(PatchedLabeledDataRequest(...), action=AnnotationUpdateAction.CREATE \| UPDATE \| DELETE)` | Partial update: create, update, or delete only the objects in the request. |
| `Task.remove_annotations(ids=[...])` | Delete specific objects by id — or all of them when `ids` is omitted. |
| `Project.get_annotations()` | Read the annotations of every task in a project in one call. |
| `Task.get_frames_info()` | Frame names and sizes — useful to report a duplicate by file name rather than by frame index. |
| `Task.get_jobs()` | Job frame ranges and states, so a reported duplicate can name the job to fix. |

_Notes:_

- An object's `label_id` must be a label of the task (or of its project);
  `task.get_labels()` maps names to ids.
- Both editing recipes re-read the annotations after writing, so the printed
  "after" counts show the server's state, not the client's intention.
- The duplicate search reads only; `Task.remove_annotations(ids=[...])` is what
  removes the extra objects once you have decided which copy to keep.
- A bucket import is a background request: the POST only returns an `rq_id`,
  and the annotations appear once `client.wait_for_completion()` returns. A
  missing key or wrong credentials surface as a failed request, not as an error
  on the POST.
- `--filename` is the object key as seen from the bucket root, including any
  "directory" prefix.
- Full recipes:
  [`task_import_annotations.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/task_import_annotations.py),
  [`task_import_annotations_from_cloud.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/task_import_annotations_from_cloud.py),
  [`task_edit_annotations.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/task_edit_annotations.py),
  [`project_annotation_stats.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/project_annotation_stats.py),
  [`project_data_lint.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/project_data_lint.py).
