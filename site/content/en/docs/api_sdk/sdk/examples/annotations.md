---
title: 'Annotation recipes'
linkTitle: 'Annotations'
weight: 5
description: 'Import annotations into a task, edit them in bulk, aggregate statistics, and lint a project'
---

Four recipes: `task_import_annotations.py` loads an annotation file into an
existing task, `task_edit_annotations.py` reads a task's annotations, applies
a bulk edit, and writes it back, and `project_annotation_stats.py` walks a
project's tasks and aggregates object counts per label and type into a CSV
report, and `project_data_lint.py` checks a project's annotations for broken
geometry, duplicates, and empty work before you export it.

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

## Lint a project's data and annotations

Walks a project's tasks and reports six classes of problem, each with a
severity: shapes that leave the frame, rectangles with (almost) no area, and
duplicated objects are errors; frames nobody annotated and jobs marked
completed with nothing in them are warnings; labels nobody used are info.
Findings are printed grouped by severity and written to `data_lint.csv`. The
script exits 1 when any error exists, so it can gate an export pipeline —
`--no-fail` turns that off.

Masks and skeletons are skipped by the geometry checks (their points are not
plain x/y pairs), and objects marked `outside` are skipped everywhere.

| Flag | Required | Meaning |
| --- | --- | --- |
| `--host` | yes | Server URL |
| `--token` | yes | Personal Access Token |
| `--project-id` | yes | Id of the project to lint |
| `--task-id ID [ID ...]` | no | Lint only these tasks of the project |
| `--min-box-area` | no | Rectangles below this many px² are errors (default `4`) |
| `--output` | no | CSV report path (default `data_lint.csv`) |
| `--no-fail` | no | Exit 0 even when errors were found |

```bash
python project_data_lint.py --host 'https://app.cvat.ai' --token '<your token>' \
    --project-id 7 --min-box-area 16
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
| `Task.set_annotations(LabeledDataRequest(...))` | Replace a task's annotations with the given objects. |
| `Task.update_annotations(PatchedLabeledDataRequest(...), action=AnnotationUpdateAction.CREATE \| UPDATE \| DELETE)` | Partial update: create, update, or delete only the objects in the request. |
| `Task.remove_annotations(ids=[...])` | Delete specific objects by id — or all of them when `ids` is omitted. |
| `Project.get_annotations()` | Read the annotations of every task in a project in one call. |
| `Task.get_frames_info()` | Frame names and sizes — what the geometry checks compare against. |
| `Task.get_jobs()` | Job frame ranges and states, so a finding can name the job to fix. |

_Notes:_

- An object's `label_id` must be a label of the task (or of its project);
  `task.get_labels()` maps names to ids.
- Both editing recipes re-read the annotations after writing, so the printed
  "after" counts show the server's state, not the client's intention.
- The linter reads only; fix what it reports with `task_edit_annotations.py` or in the UI.
- Full recipes:
  [`task_import_annotations.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/task_import_annotations.py),
  [`task_edit_annotations.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/task_edit_annotations.py),
  [`project_annotation_stats.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/project_annotation_stats.py),
  [`project_data_lint.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/project_data_lint.py).
