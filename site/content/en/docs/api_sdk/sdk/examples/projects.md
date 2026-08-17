---
title: 'Project recipes'
linkTitle: 'Projects'
weight: 2
description: 'Create/list, status report, backup/restore, dataset export — one recipe per file'
---

Four recipes cover the project lifecycle: `project_create_and_list.py` for the
common CRUD path, `project_status_report.py` for a CSV overview,
`project_backup_restore.py` for portable copies, and `project_export_dataset.py`
for dataset export (local + cloud).

## Create, list, filter, retrieve, rename

Creates a project with labels, then lists all projects, filters by name, retrieves
by id, and renames it. Opt into deletion with `CVAT_EXAMPLES_CLEANUP=1`.

| Variable | Required | Meaning |
| --- | --- | --- |
| `CVAT_HOST` | yes | Server URL, e.g. `https://app.cvat.ai` |
| `CVAT_ACCESS_TOKEN` | yes | Personal Access Token |
| `CVAT_PROJECT_NAME` | no | Project name (default `Example project`) |
| `CVAT_LABELS` | no | Comma-separated label names (default `car,person`) |
| `CVAT_EXAMPLES_CLEANUP` | no | Set to `1` to delete the project at the end |

```bash
export CVAT_HOST=https://app.cvat.ai
export CVAT_ACCESS_TOKEN=...
python project_create_and_list.py
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
  6. Optionally delete it (CVAT_EXAMPLES_CLEANUP=1).

Usage:
  export CVAT_HOST=https://app.cvat.ai
  export CVAT_ACCESS_TOKEN=...            # CVAT UI: Profile -> Security
  export CVAT_PROJECT_NAME="My project"   # optional, default "Example project"
  export CVAT_LABELS=car,person           # optional, comma-separated
  python project_create_and_list.py
"""

import os
import sys

from cvat_sdk import make_client, models
from cvat_sdk.core.filters import F


def require_env(name: str, hint: str) -> str:
    value = os.environ.get(name)
    if not value:
        sys.exit(f"Set the {name} environment variable: {hint}")
    return value


HOST = require_env("CVAT_HOST", "your CVAT server URL, e.g. https://app.cvat.ai")
TOKEN = require_env("CVAT_ACCESS_TOKEN", "create one in the CVAT UI: Profile -> Security")
PROJECT_NAME = os.environ.get("CVAT_PROJECT_NAME", "Example project")
LABELS = os.environ.get("CVAT_LABELS", "car,person").split(",")
CLEANUP = os.environ.get("CVAT_EXAMPLES_CLEANUP") == "1"


def main() -> None:
    with make_client(HOST, access_token=TOKEN) as client:
        # 1. Create a project with labels
        project = client.projects.create(
            models.ProjectWriteRequest(
                name=PROJECT_NAME,
                labels=[models.PatchedLabelRequest(name=name) for name in LABELS],
            )
        )
        print(f"Created project {project.id}: {HOST}/projects/{project.id}")

        # 2. List all projects
        projects = client.projects.list()
        print(f"Projects visible to you: {len(projects)}")

        # 3. Filter by name substring
        matches = client.projects.list(filter=F.name.contains(PROJECT_NAME))
        print(f"Projects with {PROJECT_NAME!r} in the name: {[p.id for p in matches]}")

        # 4. Retrieve by id
        fetched = client.projects.retrieve(project.id)
        print(f"Project {fetched.id} labels: {[label.name for label in fetched.get_labels()]}")

        # 5. Rename
        renamed = fetched.update(
            models.PatchedProjectWriteRequest(name=f"{PROJECT_NAME} (renamed)")
        )
        print(f"Renamed to: {renamed.name}")

        # 6. Opt-in cleanup
        if CLEANUP:
            renamed.remove()
            print(f"Deleted project {project.id}")
        else:
            print("Keeping the project; set CVAT_EXAMPLES_CLEANUP=1 to delete it")


if __name__ == "__main__":
    main()
```

## CSV status report of an existing project

Walks a project's tasks and jobs and writes a CSV overview with stage, state,
assignee, and frame count — one row per job.

| Variable | Required | Meaning |
| --- | --- | --- |
| `CVAT_HOST` | yes | Server URL |
| `CVAT_ACCESS_TOKEN` | yes | Personal Access Token |
| `CVAT_PROJECT_ID` | yes | Id of an existing project |

```bash
export CVAT_HOST=https://app.cvat.ai
export CVAT_ACCESS_TOKEN=...
export CVAT_PROJECT_ID=42
python project_status_report.py
```

### The script

```python
"""Write a CSV status report for an existing project: one row per job, with
task, stage, state, assignee, and frame count — a quick management overview.

Steps:
  1. Retrieve the project by id.
  2. Walk its tasks and their jobs.
  3. Write report.csv into the current directory.

Usage:
  export CVAT_HOST=https://app.cvat.ai
  export CVAT_ACCESS_TOKEN=...    # CVAT UI: Profile -> Security
  export CVAT_PROJECT_ID=42      # an existing project id
  python project_status_report.py
"""

import csv
import os
import sys
from pathlib import Path

from cvat_sdk import make_client
from cvat_sdk.core.proxies.projects import Project


def require_env(name: str, hint: str) -> str:
    value = os.environ.get(name)
    if not value:
        sys.exit(f"Set the {name} environment variable: {hint}")
    return value


HOST = require_env("CVAT_HOST", "your CVAT server URL, e.g. https://app.cvat.ai")
TOKEN = require_env("CVAT_ACCESS_TOKEN", "create one in the CVAT UI: Profile -> Security")
PROJECT_ID = int(require_env("CVAT_PROJECT_ID", "id of an existing project, e.g. 42"))
REPORT_PATH = Path("report.csv")


def write_report(project: Project, path: Path) -> None:
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
        for task in project.get_tasks():
            for job in task.get_jobs():
                assignee = job.assignee.username if job.assignee else ""
                writer.writerow(
                    [
                        project.id,
                        project.name,
                        task.id,
                        task.name,
                        job.id,
                        job.stage,
                        job.state,
                        assignee,
                        task.size,
                    ]
                )


def main() -> None:
    with make_client(HOST, access_token=TOKEN) as client:
        project = client.projects.retrieve(PROJECT_ID)
        print(f"Reporting on project {project.id}: {project.name!r}")
        write_report(project, REPORT_PATH)
        print(f"Wrote {REPORT_PATH.resolve()}")


if __name__ == "__main__":
    main()
```

## Backup and restore

Downloads a full project backup and restores it as a brand-new copy — handy for
migrations or spinning up a working duplicate of an existing project.

| Variable | Required | Meaning |
| --- | --- | --- |
| `CVAT_HOST` | yes | Server URL |
| `CVAT_ACCESS_TOKEN` | yes | Personal Access Token |
| `CVAT_PROJECT_ID` | yes | Id of the project to back up |
| `CVAT_EXAMPLES_CLEANUP` | no | Set to `1` to delete the restored copy (never the original) |

```bash
export CVAT_HOST=https://app.cvat.ai
export CVAT_ACCESS_TOKEN=...
export CVAT_PROJECT_ID=42
python project_backup_restore.py
```

### The script

```python
"""Back up an existing project to a zip and restore it as a new copy.

A backup contains the project's tasks, jobs, annotations, and settings, so
this doubles as a copy-a-project recipe.

Steps:
  1. Download a backup of the project to project_backup.zip.
  2. Restore the backup as a brand-new project.
  3. Optionally delete the restored copy (CVAT_EXAMPLES_CLEANUP=1).

Usage:
  export CVAT_HOST=https://app.cvat.ai
  export CVAT_ACCESS_TOKEN=...    # CVAT UI: Profile -> Security
  export CVAT_PROJECT_ID=42      # an existing project id
  python project_backup_restore.py
"""

import os
import sys
from pathlib import Path

from cvat_sdk import make_client


def require_env(name: str, hint: str) -> str:
    value = os.environ.get(name)
    if not value:
        sys.exit(f"Set the {name} environment variable: {hint}")
    return value


HOST = require_env("CVAT_HOST", "your CVAT server URL, e.g. https://app.cvat.ai")
TOKEN = require_env("CVAT_ACCESS_TOKEN", "create one in the CVAT UI: Profile -> Security")
PROJECT_ID = int(require_env("CVAT_PROJECT_ID", "id of an existing project, e.g. 42"))
BACKUP_PATH = Path("project_backup.zip")
CLEANUP = os.environ.get("CVAT_EXAMPLES_CLEANUP") == "1"


def main() -> None:
    with make_client(HOST, access_token=TOKEN) as client:
        # 1. Backup
        project = client.projects.retrieve(PROJECT_ID)
        project.download_backup(BACKUP_PATH)
        print(f"Backed up project {project.id} to {BACKUP_PATH.resolve()}")

        # 2. Restore as a new project
        restored = client.projects.create_from_backup(BACKUP_PATH)
        print(f"Restored a copy as project {restored.id}: {HOST}/projects/{restored.id}")

        # 3. Opt-in cleanup (only the copy — never the original)
        if CLEANUP:
            restored.remove()
            print(f"Deleted restored project {restored.id}")
        else:
            print("Keeping the restored project; set CVAT_EXAMPLES_CLEANUP=1 to delete it")


if __name__ == "__main__":
    main()
```

## Export the project's dataset (local + cloud)

Exports a project's dataset both to a local zip and straight to a registered cloud
storage. Validates the format name against the server's list before starting.

| Variable | Required | Meaning |
| --- | --- | --- |
| `CVAT_HOST` | yes | Server URL |
| `CVAT_ACCESS_TOKEN` | yes | Personal Access Token |
| `CVAT_PROJECT_ID` | yes | Id of the project to export |
| `CVAT_CLOUD_STORAGE_ID` | yes | Registered cloud storage id (see `cloud_storage_register.py`) |
| `CVAT_EXPORT_FORMAT` | no | Server format name (default `COCO 1.0`) |

```bash
export CVAT_HOST=https://app.cvat.ai
export CVAT_ACCESS_TOKEN=...
export CVAT_PROJECT_ID=42
export CVAT_CLOUD_STORAGE_ID=7
python project_export_dataset.py
```

### The script

```python
"""Export an existing project's dataset (all tasks) to a local zip AND to a
registered cloud storage.

Steps:
  1. Fetch the server's export format list and validate CVAT_EXPORT_FORMAT.
  2. Export to project_<id>_dataset.zip in the current directory.
  3. Export the same dataset straight to the cloud storage (no local download).

Usage:
  export CVAT_HOST=https://app.cvat.ai
  export CVAT_ACCESS_TOKEN=...          # CVAT UI: Profile -> Security
  export CVAT_PROJECT_ID=42            # an existing project id
  export CVAT_CLOUD_STORAGE_ID=7       # see cloud_storage_register.py
  export CVAT_EXPORT_FORMAT="COCO 1.0" # optional, default "COCO 1.0"
  python project_export_dataset.py
"""

import os
import sys
from pathlib import Path

from cvat_sdk import make_client
from cvat_sdk.core.proxies.types import Location


def require_env(name: str, hint: str) -> str:
    value = os.environ.get(name)
    if not value:
        sys.exit(f"Set the {name} environment variable: {hint}")
    return value


HOST = require_env("CVAT_HOST", "your CVAT server URL, e.g. https://app.cvat.ai")
TOKEN = require_env("CVAT_ACCESS_TOKEN", "create one in the CVAT UI: Profile -> Security")
PROJECT_ID = int(require_env("CVAT_PROJECT_ID", "id of an existing project, e.g. 42"))
CLOUD_STORAGE_ID = int(
    require_env(
        "CVAT_CLOUD_STORAGE_ID", "a registered cloud storage id (cloud_storage_register.py)"
    )
)
EXPORT_FORMAT = os.environ.get("CVAT_EXPORT_FORMAT", "COCO 1.0")


def main() -> None:
    with make_client(HOST, access_token=TOKEN) as client:
        # 1. Validate the format against the server's list.
        # Low-level API: there is no high-level proxy for the format list yet.
        formats, _ = client.api_client.server_api.retrieve_annotation_formats()
        names = [f.name for f in formats.exporters]
        if EXPORT_FORMAT not in names:
            sys.exit(f"Unknown export format {EXPORT_FORMAT!r}. Choose one of: {', '.join(names)}")

        project = client.projects.retrieve(PROJECT_ID)

        # 2. Export to a local zip
        local_path = Path(f"project_{project.id}_dataset.zip")
        project.export_dataset(
            EXPORT_FORMAT, local_path, include_images=True, location=Location.LOCAL
        )
        print(f"Exported {local_path.resolve()}")

        # 3. Export straight to the cloud storage
        remote_name = f"project_{project.id}_dataset.zip"
        project.export_dataset(
            EXPORT_FORMAT,
            remote_name,
            include_images=True,
            location=Location.CLOUD_STORAGE,
            cloud_storage_id=CLOUD_STORAGE_ID,
        )
        print(f"Exported {remote_name} to cloud storage {CLOUD_STORAGE_ID}")


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
- A project backup captures tasks, jobs, users, and settings in a single zip - but
  no raw media beyond what `export_dataset` would include.
- The CSV report contains no annotation geometry. For an actual dataset export, use
  `project_export_dataset.py`.
- `include_images=False` exports annotations only and is much smaller.
- Full recipes:
  [`project_create_and_list.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/project_create_and_list.py),
  [`project_status_report.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/project_status_report.py),
  [`project_backup_restore.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/project_backup_restore.py),
  [`project_export_dataset.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/project_export_dataset.py).
