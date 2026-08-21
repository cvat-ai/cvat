---
title: 'Project recipes'
linkTitle: 'Projects'
weight: 2
description: 'Create/list, backup, restore, dataset export — one recipe per file'
---

Four recipes cover the project lifecycle: `project_create_and_list.py` for the
common CRUD path, `project_backup.py` and `project_restore.py` for portable
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

```python
"""Create a project with labels, then list, filter, retrieve, and rename it.

Steps:
  1. Create a project with a simple label schema.
  2. List all projects visible to you (pagination is handled by the SDK).
  3. Filter projects by a name substring.
  4. Retrieve one project by id and read its labels.
  5. Rename it.
  6. Optionally delete it (--cleanup).

Usage (run ``python project_create_and_list.py --help`` for the full list of options):
  python project_create_and_list.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --name 'My project' --labels car person
"""

import argparse

from cvat_sdk import make_client, models
from cvat_sdk.core.filters import F


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--host", required=True, help="CVAT server URL, e.g. 'https://app.cvat.ai'")
    parser.add_argument(
        "--token",
        required=True,
        help="Personal Access Token (CVAT UI: Profile -> Security)",
    )
    parser.add_argument(
        "--name", default="Example project", help="project name (default: '%(default)s')"
    )
    parser.add_argument(
        "--labels",
        nargs="+",
        default=["car", "person"],
        help="label names (default: %(default)s)",
    )
    parser.add_argument(
        "--cleanup", action="store_true", help="delete the created project at the end"
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    with make_client(args.host, access_token=args.token) as client:
        # 1. Create a project with labels
        project = client.projects.create(
            models.ProjectWriteRequest(
                name=args.name,
                labels=[models.PatchedLabelRequest(name=name) for name in args.labels],
            )
        )
        print(f"Created project {project.id}: {args.host}/projects/{project.id}")

        # 2. List all projects
        projects = client.projects.list()
        print(f"Projects visible to you: {len(projects)}")

        # 3. Filter by name substring
        matches = client.projects.list(filter=F.name.contains(args.name))
        print(f"Projects with {args.name!r} in the name: {[p.id for p in matches]}")

        # 4. Retrieve by id
        fetched = client.projects.retrieve(project.id)
        print(f"Project {fetched.id} labels: {[label.name for label in fetched.get_labels()]}")

        # 5. Rename
        renamed = fetched.update(models.PatchedProjectWriteRequest(name=f"{args.name} (renamed)"))
        print(f"Renamed to: {renamed.name}")

        # 6. Opt-in cleanup
        if args.cleanup:
            renamed.remove()
            print(f"Deleted project {project.id}")
        else:
            print("Keeping the project; pass --cleanup to delete it")


if __name__ == "__main__":
    main()
```

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

```python
"""Download a backup zip of an existing project.

A backup contains the project's tasks, jobs, annotations, and settings. Pair
this recipe with project_restore.py to migrate or clone a project.

Steps:
  1. Retrieve the project by id.
  2. Download its backup to --output (default: project_<id>_backup.zip).

Usage (run ``python project_backup.py --help`` for the full list of options):
  python project_backup.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --project-id 42
"""

import argparse
from pathlib import Path

from cvat_sdk import make_client


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--host", required=True, help="CVAT server URL, e.g. 'https://app.cvat.ai'")
    parser.add_argument(
        "--token",
        required=True,
        help="Personal Access Token (CVAT UI: Profile -> Security)",
    )
    parser.add_argument(
        "--project-id", type=int, required=True, help="id of an existing project, e.g. 42"
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="destination file path (default: project_<id>_backup.zip)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    with make_client(args.host, access_token=args.token) as client:
        project = client.projects.retrieve(args.project_id)
        output = args.output or Path(f"project_{project.id}_backup.zip")
        project.download_backup(output)
        print(f"Backed up project {project.id} to {output.resolve()}")


if __name__ == "__main__":
    main()
```

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

```python
"""Restore a project from a backup zip as a new project.

Pair with project_backup.py to migrate or clone a project.

Steps:
  1. Restore --backup as a brand-new project.
  2. Optionally delete the restored copy (--cleanup) — useful when testing a
     backup file.

Usage (run ``python project_restore.py --help`` for the full list of options):
  python project_restore.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --backup './project_42_backup.zip'
"""

import argparse
import sys
from pathlib import Path

from cvat_sdk import make_client


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--host", required=True, help="CVAT server URL, e.g. 'https://app.cvat.ai'")
    parser.add_argument(
        "--token",
        required=True,
        help="Personal Access Token (CVAT UI: Profile -> Security)",
    )
    parser.add_argument("--backup", type=Path, required=True, help="path to a project backup zip")
    parser.add_argument(
        "--cleanup",
        action="store_true",
        help="delete the restored project at the end (never touches the source backup)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if not args.backup.is_file():
        sys.exit(f"--backup {args.backup} does not exist")

    with make_client(args.host, access_token=args.token) as client:
        restored = client.projects.create_from_backup(args.backup)
        print(f"Restored a copy as project {restored.id}: {args.host}/projects/{restored.id}")

        if args.cleanup:
            restored.remove()
            print(f"Deleted restored project {restored.id}")
        else:
            print("Keeping the restored project; pass --cleanup to delete it")


if __name__ == "__main__":
    main()
```

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

```python
"""Export a project's tasks individually, without images, to local zips AND to
a registered cloud storage.

By default every task in the project is exported; pass --task-id to export
only a specific subset. This is the SDK-only stand-in for what could become a
bulk per-task export command in cvat-cli.

Steps:
  1. Fetch the server's export format list and validate --export-format.
  2. Resolve which tasks to export: --task-id filters to a subset of the
     project's tasks; omit it to export every task in the project.
  3. For each task: export to task_<id>_dataset.zip in the current directory,
     then export the same dataset straight to the cloud storage (no local
     download).

Usage (run ``python project_export_dataset.py --help`` for the full list of options):
  # every task in the project
  python project_export_dataset.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --project-id 42 --cloud-storage-id 7 --export-format 'COCO 1.0'

  # only tasks 10 and 11
  python project_export_dataset.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --project-id 42 --cloud-storage-id 7 --task-id 10 11
"""

import argparse
import sys
from pathlib import Path

from cvat_sdk import make_client
from cvat_sdk.core.proxies.types import Location


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=" ".join(__doc__.splitlines()[:2]))
    parser.add_argument("--host", required=True, help="CVAT server URL, e.g. 'https://app.cvat.ai'")
    parser.add_argument(
        "--token",
        required=True,
        help="Personal Access Token (CVAT UI: Profile -> Security)",
    )
    parser.add_argument(
        "--project-id", type=int, required=True, help="id of an existing project, e.g. 42"
    )
    parser.add_argument(
        "--cloud-storage-id",
        type=int,
        required=True,
        help="a registered cloud storage id (see cloud_storage_register.py)",
    )
    parser.add_argument(
        "--export-format",
        default="COCO 1.0",
        help="exporter name, e.g. 'COCO 1.0' (default: '%(default)s')",
    )
    parser.add_argument(
        "--task-id",
        type=int,
        nargs="+",
        metavar="ID",
        help="export only these task ids (must belong to the project); "
        "omit to export every task in the project",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    with make_client(args.host, access_token=args.token) as client:
        # 1. Validate the format against the server's list.
        # Low-level API: there is no high-level proxy for the format list yet.
        formats, _ = client.api_client.server_api.retrieve_annotation_formats()
        names = [f.name for f in formats.exporters]
        if args.export_format not in names:
            sys.exit(
                f"Unknown export format {args.export_format!r}. Choose one of: {', '.join(names)}"
            )

        # 2. Resolve which tasks to export.
        project = client.projects.retrieve(args.project_id)
        tasks_by_id = {task.id: task for task in project.get_tasks()}
        if args.task_id:
            missing = [str(tid) for tid in args.task_id if tid not in tasks_by_id]
            if missing:
                sys.exit(f"Task id(s) {', '.join(missing)} not found in project {project.id}")
            tasks = [tasks_by_id[tid] for tid in args.task_id]
        else:
            tasks = list(tasks_by_id.values())
        if not tasks:
            sys.exit(f"Project {project.id} has no tasks to export")

        # 3. Export each task individually: a local zip AND straight to the cloud storage.
        for task in tasks:
            local_path = Path(f"task_{task.id}_dataset.zip")
            task.export_dataset(
                args.export_format, local_path, include_images=False, location=Location.LOCAL
            )
            print(f"Exported {local_path.resolve()}")

            remote_name = f"task_{task.id}_dataset.zip"
            task.export_dataset(
                args.export_format,
                remote_name,
                include_images=False,
                location=Location.CLOUD_STORAGE,
                cloud_storage_id=args.cloud_storage_id,
            )
            print(f"Exported {remote_name} to cloud storage {args.cloud_storage_id}")

        print(f"Exported {len(tasks)} task dataset(s) from project {project.id}")


if __name__ == "__main__":
    main()
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
- A project backup captures tasks, jobs, users, and settings in a single zip -
  but no raw media beyond what `export_dataset` would include.
- For a CSV overview of a project's jobs (no annotation geometry), use
  `job_list.py --project-id <id> --csv`. For an actual dataset export,
  use `project_export_dataset.py`.
- `include_images=False` exports annotations only and is much smaller.
- Full recipes:
  [`project_create_and_list.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/project_create_and_list.py),
  [`project_backup.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/project_backup.py),
  [`project_restore.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/project_restore.py),
  [`project_export_dataset.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/project_export_dataset.py).
