# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.dispatch import receiver

from cvat.apps.engine.models import Job
from cvat.apps.events.handlers import annotations_changed

from .analytics import get_class_wise_image_counts
from .consumers import group_name_for_task


@receiver(annotations_changed, sender=Job)
def broadcast_class_counts_on_annotations_change(sender, instance: Job, action: str, **kwargs):
    task_id = instance.segment.task_id
    counts = get_class_wise_image_counts(task_id)

    channel_layer = get_channel_layer()
    if channel_layer is None:
        # No channel layer configured (e.g. in some test environments); nothing to broadcast to.
        return

    async_to_sync(channel_layer.group_send)(
        group_name_for_task(task_id),
        {
            "type": "class_counts.update",
            "task_id": task_id,
            "counts": counts,
        },
    )
