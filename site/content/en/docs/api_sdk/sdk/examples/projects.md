---
title: 'Project recipes'
linkTitle: 'Projects'
weight: 2
description: 'Create/list, backup, restore, dataset export — one recipe per file'
---

Five recipes cover the project lifecycle: `project_create_and_list.py` for the
common CRUD path, `project_add_labels.py` for extending an existing project's
label schema, `project_backup.py` and `project_restore.py` for portable
copies, and `project_export_dataset.py` for dataset export (local + cloud).
For a CSV overview of a project's jobs, see `job_list.py --project-id --csv`
in the [job recipes](../jobs).

## Create, list, filter, retrieve, rename

Creates a project with labels, then lists all projects, filters by name,
retrieves by id, and renames it. Pass `--cleanup` to delete it at the end.

| Flag | Required | Meaning |
| --- | --- | --- |
| `--host` | yes | Server URL, e.g. `'https://app.cvat.ai'` |
| `--token` | yes | Personal Access Token |
| `--name` | no | Project name (default `'Example project'`) |
| `--labels` | no | Label names, space-separated (default `car person`) |
| `--cleanup` | no | Delete the created project at the end |

```bash
python project_create_and_list.py --host 'https://app.cvat.ai' --token '<your token>' \
    --name 'My project' --labels car person
```

### The script

{{< include-code "assets/sdk-examples/project_create_and_list.py" >}}

## Add labels to an existing project

Adds labels — optionally with selectable attributes — to a project that
already exists. Labels that are already there are skipped, so the recipe is
safe to re-run. The tasks inside the project take their labels from the
project itself, so they all pick up the change.

| Flag | Required | Meaning |
| --- | --- | --- |
| `--host` | yes | Server URL |
| `--token` | yes | Personal Access Token |
| `--project-id` | yes | Id of the project to extend |
| `--labels` | yes | Label names to add, space-separated |
| `--attr LABEL NAME VALUE [...]` | no | Selectable attribute for one of the `--labels`; repeat for more |

```bash
python project_add_labels.py --host 'https://app.cvat.ai' --token '<your token>' \
    --project-id 7 --labels car person
python project_add_labels.py --host 'https://app.cvat.ai' --token '<your token>' \
    --project-id 7 --labels car --attr car color red green blue
```

### The script

{{< include-code "assets/sdk-examples/project_add_labels.py" >}}

## Back up a project

Downloads a full project backup zip — tasks, jobs, annotations, and settings.
Pair with `project_restore.py` to migrate or clone.

| Flag | Required | Meaning |
| --- | --- | --- |
| `--host` | yes | Server URL |
| `--token` | yes | Personal Access Token |
| `--project-id` | yes | Id of the project to back up |
| `--output` | no | Destination file (default `project_<id>_backup.zip`) |

```bash
python project_backup.py --host 'https://app.cvat.ai' --token '<your token>' \
    --project-id 42
```

### The script

{{< include-code "assets/sdk-examples/project_backup.py" >}}

## Restore a project

Restores a project from a backup zip as a brand-new project. Pass `--cleanup`
to delete the restored copy afterwards — useful when validating a backup file.

| Flag | Required | Meaning |
| --- | --- | --- |
| `--host` | yes | Server URL |
| `--token` | yes | Personal Access Token |
| `--backup` | yes | Path to a project backup zip |
| `--cleanup` | no | Delete the restored copy (never touches the backup file) |

```bash
python project_restore.py --host 'https://app.cvat.ai' --token '<your token>' \
    --backup './project_42_backup.zip'
```

### The script

{{< include-code "assets/sdk-examples/project_restore.py" >}}

## Export a project's tasks individually (local + cloud)

Exports each task in a project as its own dataset, both to a local zip and
straight to a registered cloud storage. By default every task is exported;
pass `--task-id` to export only a specific subset. Validates the format name
against the server's list before starting.

| Flag | Required | Meaning |
| --- | --- | --- |
| `--host` | yes | Server URL |
| `--token` | yes | Personal Access Token |
| `--project-id` | yes | Id of the project to export |
| `--cloud-storage-id` | yes | Registered cloud storage id (see `cloud_storage_register.py`) |
| `--export-format` | no | Exporter name (default `'COCO 1.0'`) |
| `--task-id` | no | Task ids to export, space-separated (default: every task in the project) |

```bash
python project_export_dataset.py --host 'https://app.cvat.ai' --token '<your token>' \
    --project-id 42 --cloud-storage-id 7 --export-format 'COCO 1.0'
```

### The script

{{< include-code "assets/sdk-examples/project_export_dataset.py" >}}

_Other SDK options:_

| SDK method / parameter | What it adds |
| --- | --- |
| `Project.download_backup(..., lightweight=True)` | Produce a smaller backup that omits media. |
| `client.projects.create_from_dataset(...)` | Create a project directly from a dataset archive. |
| `Project.import_dataset(format_name, path)` | Import annotations/data into an existing project - the import counterpart of `export_dataset`. |
| `Project.get_annotations()` | Fetch the project's labeled data. |

_Notes:_

- `list()` returns the whole collection; pagination is handled for you.
- A project backup captures tasks, jobs, users, and settings in a single zip -
  but no raw media beyond what `export_dataset` would include.
- For a CSV overview of a project's jobs (no annotation geometry), use
  `job_list.py --project-id <id> --csv`. For an actual dataset export,
  use `project_export_dataset.py`.
- `include_images=False` exports annotations only and is much smaller.
- Full recipes:
  [`project_create_and_list.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/project_create_and_list.py),
  [`project_add_labels.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/project_add_labels.py),
  [`project_backup.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/project_backup.py),
  [`project_restore.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/project_restore.py),
  [`project_export_dataset.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/project_export_dataset.py).
