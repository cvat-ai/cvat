# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""
RQ background worker: recomputes class-wise counts and publishes to Redis pub/sub.

Clients (WebSocket consumers) subscribe to the channel and relay the message
to the browser.

Redis pub/sub channel names:
  analytics:task:<task_id>    – for task-scoped WebSocket connections
  analytics:project:<id>      – for project-scoped connections
  analytics:job:<job_id>      – for job-scoped connections

Message schema (JSON):
{
  "type": "class_counts",
  "version": 1,
  "scope": {"task_id": 5},        # or project_id / job_id
  "data": [                       # list of ClassCountItemSerializer dicts
    {"label_id": 1, "label_name": "car", "color": "#ff0000",
     "parent_id": null, "image_count": 42, "annotation_count": 87},
    ...
  ],
  "ts": "2026-09-21T10:00:00Z"   # ISO-8601 UTC timestamp
}
"""

import json
import logging
from datetime import datetime, timezone

import redis as redis_lib
from django.conf import settings

from cvat.apps.engine.models import Job

from .service import get_class_counts

logger = logging.getLogger(__name__)


def _get_redis_client() -> redis_lib.Redis:
    return redis_lib.Redis(
        host=getattr(settings, "CVAT_REDIS_INMEM_HOST", "localhost"),
        port=int(getattr(settings, "CVAT_REDIS_INMEM_PORT", 6379)),
        db=0,
    )


def broadcast_class_counts(job_id: int) -> None:
    """
    Recompute class counts for the job's task (and project if applicable),
    then publish a message to every relevant Redis pub/sub channel.

    This function is called by RQ workers — it must be importable at module
    level without side effects.
    """
    try:
        job = Job.objects.select_related("segment__task__project").get(pk=job_id)
    except Job.DoesNotExist:
        logger.warning("broadcast_class_counts: job %s not found", job_id)
        return

    task = job.segment.task
    project = task.project
    ts = datetime.now(tz=timezone.utc).isoformat()

    redis_client = _get_redis_client()

    # Publish task-scoped update
    _publish(redis_client, task_id=task.id, ts=ts)

    # Publish project-scoped update (if the task belongs to a project)
    if project:
        _publish(redis_client, project_id=project.id, ts=ts)

    # Publish job-scoped update
    _publish(redis_client, job_id=job_id, ts=ts)


def _publish(
    redis_client: redis_lib.Redis,
    *,
    project_id: int | None = None,
    task_id: int | None = None,
    job_id: int | None = None,
    ts: str,
) -> None:
    try:
        counts = get_class_counts(
            project_id=project_id, task_id=task_id, job_id=job_id
        )
    except Exception:  # noqa: BLE001
        logger.exception(
            "Failed to compute class counts for scope p=%s t=%s j=%s",
            project_id, task_id, job_id,
        )
        return

    if project_id is not None:
        scope = {"project_id": project_id}
        channel = f"analytics:project:{project_id}"
    elif task_id is not None:
        scope = {"task_id": task_id}
        channel = f"analytics:task:{task_id}"
    else:
        scope = {"job_id": job_id}
        channel = f"analytics:job:{job_id}"

    message = json.dumps({
        "type": "class_counts",
        "version": 1,
        "scope": scope,
        "data": counts,
        "ts": ts,
    })

    try:
        redis_client.publish(channel, message)
        logger.debug("Published analytics update to %s", channel)
    except Exception:  # noqa: BLE001
        logger.exception("Failed to publish analytics update to %s", channel)
