# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from cvat.apps.engine.models import Task

from .live import publish_task_changed


@receiver(post_save, sender=Task, dispatch_uid=__name__ + ".notify_annotation_stats")
def notify_annotation_stats(sender, instance: Task, update_fields=None, **kwargs):
    # Every annotation create/update/delete ends with Task.touch(), which saves only updated_date
    if update_fields is not None and set(update_fields) == {"updated_date"}:
        transaction.on_commit(lambda: publish_task_changed(instance.id))
