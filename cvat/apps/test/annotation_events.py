# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
import logging
from functools import lru_cache

from django.conf import settings
from django.db import transaction
from redis import Redis
from redis.exceptions import RedisError

logger = logging.getLogger(__name__)

ANNOTATION_COUNTS_CHANNEL = "cvat:annotation-counts:task:{task_id}"


@lru_cache(maxsize=1)
def _redis_client() -> Redis:
    redis_settings = settings.REDIS_INMEM_SETTINGS
    return Redis(
        host=redis_settings["HOST"],
        port=redis_settings["PORT"],
        db=int(settings.REDIS_INMEM_DATABASES.CACHE),
        password=redis_settings["PASSWORD"],
        decode_responses=True,
        socket_connect_timeout=2,
        socket_timeout=2,
    )


def publish_annotation_change(task_id: int) -> None:
    channel = ANNOTATION_COUNTS_CHANNEL.format(task_id=task_id)
    message = json.dumps({"type": "annotations_changed", "task_id": task_id})

    try:
        _redis_client().publish(channel, message)
    except RedisError:
        logger.exception("Could not publish annotation count update for task %s", task_id)


def schedule_annotation_counts_update(task_id: int) -> None:
    transaction.on_commit(lambda: publish_annotation_change(task_id))
