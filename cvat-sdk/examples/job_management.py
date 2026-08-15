# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Job management.

List/filter/retrieve jobs (including free-text search and server-side ordering),
change a job's stage/state, assign jobs to annotators - including a round-robin
"automatic assignment" over a team - and import annotations into a single job.
"""

from pathlib import Path

from cvat_sdk import Client, models
from cvat_sdk.core.filters import F, all_, not_
from cvat_sdk.core.proxies.jobs import Job


def list_jobs(
    client: Client, task_id: int | None = None, stage: str | None = None, state: str | None = None
) -> list[Job]:
    """List jobs, optionally filtered by task, stage, and/or state.

    ``stage`` is one of ``annotation``, ``validation``, ``acceptance``;
    ``state`` is one of ``new``, ``in progress``, ``rejected``, ``completed``.
    """
    conditions = []
    if task_id is not None:
        conditions.append(F.task_id == task_id)
    if stage is not None:
        conditions.append(F.stage == stage)
    if state is not None:
        conditions.append(F.state == state)
    if conditions:
        return client.jobs.list(filter=all_(*conditions))
    return client.jobs.list()


def list_unassigned_jobs(client: Client, task_id: int) -> list[Job]:
    """List jobs in a task that have no assignee yet."""
    return client.jobs.list(filter=all_(F.task_id == task_id, not_(F.assignee.is_set())))


def get_job(client: Client, job_id: int) -> Job:
    """Retrieve a single job by id (e.g. parsed from an app.cvat.ai URL)."""
    return client.jobs.retrieve(job_id)


def search_jobs(
    client: Client, search: str | None = None, ordering: str | None = None
) -> list[Job]:
    """List jobs with server-side free-text ``search`` and/or ``ordering``.

    Where ``list_jobs`` builds a structured ``filter``, these are passed straight
    through to the list endpoint as query parameters. ``ordering`` is a field name,
    optionally prefixed with ``-`` for descending order (e.g. ``"-updated_date"``).
    """
    kwargs = {}
    if search is not None:
        kwargs["search"] = search
    if ordering is not None:
        kwargs["ordering"] = ordering
    return client.jobs.list(**kwargs)


def import_job_annotations(
    client: Client, job_id: int, format_name: str, path: Path
) -> None:
    """Load annotations from a file into a single job.

    ``format_name`` is one of the server's importer names (e.g. ``"COCO 1.0"`` or
    ``"CVAT for images 1.1"``) and must match the file's format. This is the import
    counterpart of the dataset export helpers.
    """
    job = client.jobs.retrieve(job_id)
    job.import_annotations(format_name, path)
    print("Imported annotations into job", job_id)


def set_job_stage(client: Client, job_id: int, stage: str) -> Job:
    """Move a job to a workflow stage (``annotation`` / ``validation`` / ``acceptance``)."""
    job = client.jobs.retrieve(job_id)
    return job.update(models.PatchedJobWriteRequest(stage=stage))


def assign_job(client: Client, job_id: int, user_id: int) -> Job:
    """Assign a single job to a user."""
    job = client.jobs.retrieve(job_id)
    return job.update(models.PatchedJobWriteRequest(assignee=user_id))


def auto_assign_task_jobs(
    client: Client, task_id: int, assignee_ids: list[int]
) -> dict[int, int]:
    """Round-robin every job in a task across the given annotators.

    CVAT has no built-in auto-assignment; this is the scripted pattern. To pull a
    team automatically instead of passing ids, use ``client.users.list(...)``.
    Returns a mapping of {job_id: user_id}.
    """
    if not assignee_ids:
        raise ValueError("assignee_ids must not be empty")

    task = client.tasks.retrieve(task_id)
    mapping: dict[int, int] = {}
    for i, job in enumerate(task.get_jobs()):
        user_id = assignee_ids[i % len(assignee_ids)]
        job.update(models.PatchedJobWriteRequest(assignee=user_id))
        mapping[job.id] = user_id
    print("Assigned", len(mapping), "jobs across", len(assignee_ids), "annotators")
    return mapping


if __name__ == "__main__":
    from examples._auth import open_client

    with open_client() as client:
        # Distribute task 42's jobs across three annotators by user id.
        auto_assign_task_jobs(client, task_id=42, assignee_ids=[10, 11, 12])
