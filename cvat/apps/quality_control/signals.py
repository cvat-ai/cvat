# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.db.models.signals import post_save
from django.dispatch import receiver

from cvat.apps.engine.models import Project, Task
from cvat.apps.quality_control.models import QualitySettings


@receiver(post_save, sender=Project)
def __save_project__initialize_quality_settings(
    instance: Project, created: bool, raw: bool, **kwargs
):
    if created and not raw:
        QualitySettings.objects.get_or_create(project_id=instance.id)


@receiver(post_save, sender=Task)
def __save_task__initialize_quality_settings(instance: Task, created: bool, **kwargs):
    if created and not kwargs.get("raw"):
        QualitySettings.objects.get_or_create(task_id=instance.id)
