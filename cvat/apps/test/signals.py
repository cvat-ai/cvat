# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
import logging
import time
from django.conf import settings
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver
import redis

from cvat.apps.engine.models import LabeledShape, LabeledTrack

logger = logging.getLogger(__name__)


def get_redis_client():
    host = getattr(settings, "CVAT_REDIS_INMEM_HOST", "cvat_redis_inmem")
    port = getattr(settings, "CVAT_REDIS_INMEM_PORT", 6379)
    password = getattr(settings, "CVAT_REDIS_INMEM_PASSWORD", "")
    return redis.Redis(
        host=host,
        port=port,
        password=password if password else None,
        db=0,
        socket_timeout=0.5,
    )


def broadcast_annotation_change(task_id: int):
    """
    Publish an annotation change event to the task's Redis channel.
    WebSocket consumers subscribe to this channel and broadcast to connected clients.
    """
    try:
        r = get_redis_client()
        channel = f"task_{task_id}_annotations"
        payload = json.dumps({
            "event": "annotations_changed",
            "task_id": task_id,
            "timestamp": time.time(),
        })
        r.publish(channel, payload)
        logger.info(f"Broadcast annotation change for task {task_id} to Redis channel {channel}")
    except Exception as e:
        logger.warning(f"Failed to publish annotation change for task {task_id}: {e}")


@receiver(post_save, sender=LabeledShape)
def on_labeled_shape_saved(sender, instance, created, **kwargs):
    try:
        task_id = instance.job.segment.task_id
        broadcast_annotation_change(task_id)
    except Exception:
        pass


@receiver(post_delete, sender=LabeledShape)
def on_labeled_shape_deleted(sender, instance, **kwargs):
    try:
        task_id = instance.job.segment.task_id
        broadcast_annotation_change(task_id)
    except Exception:
        pass


@receiver(post_save, sender=LabeledTrack)
def on_labeled_track_saved(sender, instance, created, **kwargs):
    try:
        task_id = instance.job.segment.task_id
        broadcast_annotation_change(task_id)
    except Exception:
        pass


@receiver(post_delete, sender=LabeledTrack)
def on_labeled_track_deleted(sender, instance, **kwargs):
    try:
        task_id = instance.job.segment.task_id
        broadcast_annotation_change(task_id)
    except Exception:
        pass
