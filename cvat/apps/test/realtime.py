# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Realtime annotation-change notifications for class-counts (assessment #8/#9)."""

from __future__ import annotations

import json
import logging
from typing import Any

from django.conf import settings

logger = logging.getLogger(__name__)

CHANNEL_PREFIX = "cvat:test:task:"


def channel_for_task(task_id: int) -> str:
    return f"{CHANNEL_PREFIX}{int(task_id)}:annotations"


def redis_url() -> str:
    host = getattr(settings, "REDIS_INMEM_SETTINGS", {}).get("HOST", "localhost")
    port = getattr(settings, "REDIS_INMEM_SETTINGS", {}).get("PORT", 6379)
    password = getattr(settings, "REDIS_INMEM_SETTINGS", {}).get("PASSWORD", "") or ""
    db = 2  # dedicated pub/sub DB; RQ uses 0, cache uses 1
    if password:
        return f"redis://:{password}@{host}:{port}/{db}"
    return f"redis://{host}:{port}/{db}"


def publish_annotation_change(*, task_id: int | None, job_id: int | None, action: str) -> None:
    if not task_id:
        return
    try:
        import redis

        payload = {
            "type": "annotations_changed",
            "task_id": int(task_id),
            "job_id": int(job_id) if job_id is not None else None,
            "action": action,
        }
        client = redis.Redis.from_url(redis_url(), decode_responses=True)
        client.publish(channel_for_task(task_id), json.dumps(payload))
    except Exception:  # noqa: BLE001 — never break annotation saves
        logger.exception("Failed to publish annotation change for task %s", task_id)


def notify_from_job(job, action: str) -> None:
    try:
        from cvat.apps.events.handlers import job_id, task_id

        publish_annotation_change(
            task_id=task_id(job),
            job_id=job_id(job),
            action=action,
        )
    except Exception:  # noqa: BLE001
        logger.exception("Failed to notify class-counts listeners")
