# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Task management.

Create tasks from local files or from cloud storage, list/filter/retrieve them,
update and inspect them, delete them, and export a task's dataset to local disk
or to a registered cloud storage.
"""

from pathlib import Path

from cvat_sdk import Client, models
from cvat_sdk.core.filters import F, all_
from cvat_sdk.core.proxies.tasks import ResourceType, Task
from cvat_sdk.core.proxies.types import Location


def create_task_from_local(
    client: Client, name: str, label_names: list[str], image_paths: list[Path]
) -> Task:
    """Create a task and upload local images.

    ``sorting_method="predefined"`` keeps the images in the order you pass them;
    ``image_quality`` (1-100) trades size for fidelity.
    """
    return client.tasks.create_from_data(
        spec=models.TaskWriteRequest(
            name=name,
            labels=[models.PatchedLabelRequest(name=n) for n in label_names],
        ),
        resource_type=ResourceType.LOCAL,
        resources=image_paths,
        data_params={"image_quality": 95, "sorting_method": "predefined"},
    )


def create_task_in_project(
    client: Client, name: str, project_id: int, image_paths: list[Path]
) -> Task:
    """Create a task inside a project. Do NOT pass labels - it inherits the project's."""
    return client.tasks.create_from_data(
        spec=models.TaskWriteRequest(name=name, project_id=project_id),
        resource_type=ResourceType.LOCAL,
        resources=image_paths,
    )


def create_task_from_cloud(
    client: Client, name: str, label_names: list[str], keys: list[str], cloud_storage_id: int
) -> Task:
    """Create a task from objects already in a registered cloud storage (no upload).

    ``keys`` are object keys in the bucket. Register a storage with
    ``cloud_storage.register_cloud_storage`` to obtain ``cloud_storage_id``.
    """
    return client.tasks.create_from_data(
        spec=models.TaskWriteRequest(
            name=name,
            labels=[models.PatchedLabelRequest(name=n) for n in label_names],
        ),
        resource_type=ResourceType.SHARE,
        resources=keys,
        data_params={"cloud_storage_id": cloud_storage_id},
    )


def list_tasks(
    client: Client, project_id: int | None = None, status: str | None = None
) -> list[Task]:
    """List tasks, optionally filtered by project and/or status.

    ``status`` is one of ``annotation``, ``validation``, ``completed``.
    """
    conditions = []
    if project_id is not None:
        conditions.append(F.project_id == project_id)
    if status is not None:
        conditions.append(F.status == status)
    if conditions:
        return client.tasks.list(filter=all_(*conditions))
    return client.tasks.list()


def get_task(client: Client, task_id: int) -> Task:
    """Retrieve a single task by id."""
    return client.tasks.retrieve(task_id)


def rename_task(client: Client, task_id: int, new_name: str) -> Task:
    """Update a task's name."""
    task = client.tasks.retrieve(task_id)
    return task.update(models.PatchedTaskWriteRequest(name=new_name))


def inspect_task(client: Client, task_id: int) -> dict:
    """Return a small summary: label names, job ids, and frame count."""
    task = client.tasks.retrieve(task_id)
    summary = {
        "labels": [label.name for label in task.get_labels()],
        "jobs": [job.id for job in task.get_jobs()],
        "frames": task.size,
    }
    print(summary)
    return summary


def delete_tasks(client: Client, task_ids: list[int]) -> None:
    """Delete tasks, ignoring ids that no longer exist."""
    client.tasks.remove_by_ids(task_ids)


def list_export_formats(client: Client) -> list[str]:
    """Return the valid dataset/annotation export format names for this server.

    The list is server-wide - the same names work for task and project exports.
    """
    formats, _ = client.api_client.server_api.retrieve_annotation_formats()
    return [f.name for f in formats.exporters]


def export_dataset_local(
    client: Client,
    task_id: int,
    format_name: str,
    path: Path,
    include_images: bool = True,
) -> Path:
    """Export a task's dataset to a local zip.

    Pass a ``format_name`` from ``list_export_formats`` (e.g. ``"COCO 1.0"``).
    ``include_images=False`` exports annotations only and is much smaller.
    """
    task = client.tasks.retrieve(task_id)
    return task.export_dataset(
        format_name, path, include_images=include_images, location=Location.LOCAL
    )


def export_dataset_to_cloud(
    client: Client,
    task_id: int,
    format_name: str,
    filename: str,
    cloud_storage_id: int,
    include_images: bool = True,
) -> None:
    """Export a task's dataset directly to a registered cloud storage (no local download).

    ``filename`` is the object name to write in the bucket. Obtain
    ``cloud_storage_id`` from ``cloud_storage.register_cloud_storage``.
    """
    task = client.tasks.retrieve(task_id)
    task.export_dataset(
        format_name,
        filename,
        include_images=include_images,
        location=Location.CLOUD_STORAGE,
        cloud_storage_id=cloud_storage_id,
    )
    print("Exported task", task_id, "to cloud storage", cloud_storage_id)


if __name__ == "__main__":
    import os

    from examples._auth import open_client

    # Space-separated list of local image files, e.g. IMAGE_PATHS="a.jpg b.jpg"
    image_paths = [Path(p) for p in os.environ["IMAGE_PATHS"].split()]
    with open_client() as client:
        task = create_task_from_local(client, "Road signs", ["sign"], image_paths)
        inspect_task(client, task.id)
        print("Available formats:", list_export_formats(client))
        export_dataset_local(client, task.id, "COCO 1.0", Path("dataset.zip"))
