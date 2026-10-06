# SPDX-License-Identifier: MIT

from django.db.models.signals import post_save
from django.dispatch import receiver

from cvat.apps.engine.models import Task

from .live import notify_task_changed


@receiver(post_save, sender=Task, dispatch_uid=__name__ + ".notify_annotation_counts_page")
def notify_annotation_counts_page(instance: Task, **kwargs):
    # Every create, update or delete of annotations marks the task as updated (Task.touch),
    # so this runs after each annotation change
    notify_task_changed(instance.id)
