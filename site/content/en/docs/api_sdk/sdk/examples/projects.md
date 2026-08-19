---
title: 'Project recipes'
linkTitle: 'Projects'
weight: 2
description: 'Create/list, status report, backup, restore, dataset export — one recipe per file'
---

Five recipes cover the project lifecycle: `project_create_and_list.py` for the
common CRUD path, `project_status_report.py` for a CSV overview,
`project_backup.py` and `project_restore.py` for portable copies, and
`project_export_dataset.py` for dataset export (local + cloud).

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
  python project_create_and_list.py --host 'https://app.cvat.ai' --token '<your token>' \
      --name 'My project' --labels car person
"""

import argparse

from cvat_sdk import make_client, models
from cvat_sdk.core.filters import F


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--host", required=True, help="CVAT server URL, e.g. 'https://app.cvat.ai'"
    )
    parser.add_argument(
        "--token",
        required=True,
        help="Personal Access Token (CVAT UI: Profile -> Security)",
    )
    parser.add_argument(
        "--name", default="Example project", help="project name (default: 'Example project')"
    )
    parser.add_argument(
        "--labels",
        nargs="+",
        default=["car", "person"],
        help="label names (default: car person)",
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
        renamed = fetched.update(
            models.PatchedProjectWriteRequest(name=f"{args.name} (renamed)")
        )
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

## CSV status report of an existing project

Lists every job in a project with one server call and writes a CSV overview
with task, stage, state, assignee, and frame count — one row per job.

| Flag | Required | Meaning |
| --- | --- | --- |
| `--host` | yes | Server URL |
| `--token` | yes | Personal Access Token |
| `--project-id` | yes | Id of an existing project |

```bash
python project_status_report.py --host 'https://app.cvat.ai' --token '<your token>' \
    --project-id 42
```

### The script

```python
"""Write a CSV status report for an existing project: one row per job, with
task, stage, state, assignee, and frame count — a quick management overview.

Steps:
  1. Retrieve the project by id (for its name in the report).
  2. List every job in the project with one server call.
  3. Write report.csv into the current directory.

Usage (run ``python project_status_report.py --help`` for the full list of options):
  python project_status_report.py --host 'https://app.cvat.ai' --token '<your token>' \
      --project-id 42
"""

import argparse
import csv
from collections.abc import Iterable
from pathlib import Path

from cvat_sdk import make_client
from cvat_sdk.core.filters import F
from cvat_sdk.core.proxies.jobs import Job
from cvat_sdk.core.proxies.projects import Project


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--host", required=True, help="CVAT server URL, e.g. 'https://app.cvat.ai'"
    )
    parser.add_argument(
        "--token",
        required=True,
        help="Personal Access Token (CVAT UI: Profile -> Security)",
    )
    parser.add_argument(
        "--project-id", type=int, required=True, help="id of an existing project, e.g. 42"
    )
    return parser.parse_args()


def write_report(project: Project, jobs: Iterable[Job], path: Path) -> None:
    with path.open("w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(
            [
                "project_id",
                "project_name",
                "task_id",
                "task_name",
                "job_id",
                "stage",
                "state",
                "assignee",
                "frames",
            ]
        )
        for job in jobs:
            assignee = job.assignee.username if job.assignee else ""
            writer.writerow(
                [
                    project.id,
                    project.name,
                    job.task_id,
                    job.task_name,
                    job.id,
                    job.stage,
                    job.state,
                    assignee,
                    job.stop_frame - job.start_frame + 1,
                ]
            )


def main() -> None:
    args = parse_args()
    report_path = Path("report.csv")
    with make_client(args.host, access_token=args.token) as client:
        project = client.projects.retrieve(args.project_id)
        print(f"Reporting on project {project.id}: {project.name!r}")
        # One server call for every job in the project; each job carries
        # task_id/task_name/assignee, so no per-task fetch is needed.
        jobs = client.jobs.list(filter=F.project_id == args.project_id)
        write_report(project, jobs, report_path)
        print(f"Wrote {report_path.resolve()}")


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
  python project_backup.py --host 'https://app.cvat.ai' --token '<your token>' \
      --project-id 42
"""

import argparse
from pathlib import Path

from cvat_sdk import make_client


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--host", required=True, help="CVAT server URL, e.g. 'https://app.cvat.ai'"
    )
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
  python project_restore.py --host 'https://app.cvat.ai' --token '<your token>' \
      --backup './project_42_backup.zip'
"""

import argparse
import sys
from pathlib import Path

from cvat_sdk import make_client


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--host", required=True, help="CVAT server URL, e.g. 'https://app.cvat.ai'"
    )
    parser.add_argument(
        "--token",
        required=True,
        help="Personal Access Token (CVAT UI: Profile -> Security)",
    )
    parser.add_argument(
        "--backup", type=Path, required=True, help="path to a project backup zip"
    )
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

## Export the project's dataset (local + cloud)

Exports a project's dataset both to a local zip and straight to a registered
cloud storage. Validates the format name against the server's list before
starting.

| Flag | Required | Meaning |
| --- | --- | --- |
| `--host` | yes | Server URL |
| `--token` | yes | Personal Access Token |
| `--project-id` | yes | Id of the project to export |
| `--cloud-storage-id` | yes | Registered cloud storage id (see `cloud_storage_register.py`) |
| `--export-format` | no | Exporter name (default `'COCO 1.0'`) |

```bash
python project_export_dataset.py --host 'https://app.cvat.ai' --token '<your token>' \
    --project-id 42 --cloud-storage-id 7 --export-format 'COCO 1.0'
```

### The script

```python
"""Export an existing project's dataset (all tasks) to a local zip AND to a
registered cloud storage.

Steps:
  1. Fetch the server's export format list and validate --export-format.
  2. Export to project_<id>_dataset.zip in the current directory.
  3. Export the same dataset straight to the cloud storage (no local download).

Usage (run ``python project_export_dataset.py --help`` for the full list of options):
  python project_export_dataset.py --host 'https://app.cvat.ai' --token '<your token>' \
      --project-id 42 --cloud-storage-id 7 --export-format 'COCO 1.0'
"""

import argparse
import sys
from pathlib import Path

from cvat_sdk import make_client
from cvat_sdk.core.proxies.types import Location


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--host", required=True, help="CVAT server URL, e.g. 'https://app.cvat.ai'"
    )
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
        help="exporter name, e.g. 'COCO 1.0' (default: 'COCO 1.0')",
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

        project = client.projects.retrieve(args.project_id)

        # 2. Export to a local zip
        local_path = Path(f"project_{project.id}_dataset.zip")
        project.export_dataset(
            args.export_format, local_path, include_images=True, location=Location.LOCAL
        )
        print(f"Exported {local_path.resolve()}")

        # 3. Export straight to the cloud storage
        remote_name = f"project_{project.id}_dataset.zip"
        project.export_dataset(
            args.export_format,
            remote_name,
            include_images=True,
            location=Location.CLOUD_STORAGE,
            cloud_storage_id=args.cloud_storage_id,
        )
        print(f"Exported {remote_name} to cloud storage {args.cloud_storage_id}")


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
- The CSV report contains no annotation geometry. For an actual dataset export,
  use `project_export_dataset.py`.
- `include_images=False` exports annotations only and is much smaller.
- Full recipes:
  [`project_create_and_list.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/project_create_and_list.py),
  [`project_status_report.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/project_status_report.py),
  [`project_backup.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/project_backup.py),
  [`project_restore.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/project_restore.py),
  [`project_export_dataset.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/project_export_dataset.py).
