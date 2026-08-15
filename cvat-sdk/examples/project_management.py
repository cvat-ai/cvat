# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Project management.

Create, list/filter, retrieve, update, and delete projects; back them up and
restore them; write a CSV status report of a project's tasks and jobs; and export
a whole project's dataset to local disk or to a registered cloud storage.
"""

import csv
from pathlib import Path

from cvat_sdk import Client, models
from cvat_sdk.core.filters import F
from cvat_sdk.core.proxies.projects import Project
from cvat_sdk.core.proxies.types import Location


def create_project(client: Client, name: str, label_names: list[str]) -> Project:
    """Create a project with a simple label schema (one rectangle label per name)."""
    project = client.projects.create(
        models.ProjectWriteRequest(
            name=name,
            labels=[models.PatchedLabelRequest(name=n) for n in label_names],
        )
    )
    print("Created project", project.id)
    return project


def list_projects(client: Client, name_contains: str | None = None) -> list[Project]:
    """List projects, optionally filtered by a substring of the name.

    ``client.projects.list()`` returns the whole collection - pagination is
    handled for you.
    """
    if name_contains:
        return client.projects.list(filter=F.name.contains(name_contains))
    return client.projects.list()


def get_project(client: Client, project_id: int) -> Project:
    """Retrieve a single project by id (e.g. parsed from an app.cvat.ai URL)."""
    return client.projects.retrieve(project_id)


def rename_project(client: Client, project_id: int, new_name: str) -> Project:
    """Update a project's name."""
    project = client.projects.retrieve(project_id)
    return project.update(models.PatchedProjectWriteRequest(name=new_name))


def delete_projects(client: Client, project_ids: list[int]) -> None:
    """Delete projects, ignoring ids that no longer exist."""
    client.projects.remove_by_ids(project_ids)


def backup_project(client: Client, project_id: int, path: Path) -> Path:
    """Download a full project backup (tasks, jobs, users, settings)."""
    project = client.projects.retrieve(project_id)
    return project.download_backup(path)


def restore_project(client: Client, path: Path) -> Project:
    """Restore a project from a backup file created by ``backup_project``."""
    return client.projects.create_from_backup(path)


def export_project_report_csv(client: Client, project_id: int, path: Path) -> Path:
    """Write a CSV status report: one row per (task, job) in the project.

    This is a management overview - it contains no annotation geometry. For an
    actual dataset export, see ``export_dataset_local`` / ``export_dataset_to_cloud``.
    """
    project = client.projects.retrieve(project_id)
    path = Path(path)
    with path.open("w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(
            ["project_id", "project_name", "task_id", "task_name",
             "job_id", "stage", "state", "assignee", "frames"]
        )
        for task in project.get_tasks():
            for job in task.get_jobs():
                assignee = job.assignee.username if job.assignee else ""
                writer.writerow(
                    [project.id, project.name, task.id, task.name,
                     job.id, job.stage, job.state, assignee, task.size]
                )
    print("Wrote report to", path)
    return path


def export_dataset_local(
    client: Client,
    project_id: int,
    format_name: str,
    path: Path,
    include_images: bool = True,
) -> Path:
    """Export a whole project's dataset (all tasks) to a local zip.

    Discover valid ``format_name`` values with
    ``task_management.list_export_formats`` (the list is server-wide, e.g.
    ``"COCO 1.0"``). ``include_images=False`` exports annotations only.
    """
    project = client.projects.retrieve(project_id)
    return project.export_dataset(
        format_name, path, include_images=include_images, location=Location.LOCAL
    )


def export_dataset_to_cloud(
    client: Client,
    project_id: int,
    format_name: str,
    filename: str,
    cloud_storage_id: int,
    include_images: bool = True,
) -> None:
    """Export a project's dataset directly to a registered cloud storage (no local download).

    ``filename`` is the object name to write in the bucket. Obtain
    ``cloud_storage_id`` from ``cloud_storage.register_cloud_storage``.
    """
    project = client.projects.retrieve(project_id)
    project.export_dataset(
        format_name,
        filename,
        include_images=include_images,
        location=Location.CLOUD_STORAGE,
        cloud_storage_id=cloud_storage_id,
    )
    print("Exported project", project_id, "to cloud storage", cloud_storage_id)


if __name__ == "__main__":
    from examples._auth import open_client

    with open_client() as client:
        project = create_project(client, "Road signs", ["sign"])
        export_project_report_csv(client, project.id, Path("project_report.csv"))
