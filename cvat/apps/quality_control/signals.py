# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.db.models.signals import post_save
from django.dispatch import receiver

from cvat.apps.engine.models import Job, Task
from cvat.apps.quality_control.models import QualitySettings


@receiver(post_save, sender=Task, dispatch_uid=__name__ + ".save_task-initialize_quality_settings")
@receiver(post_save, sender=Job, dispatch_uid=__name__ + ".save_job-initialize_quality_settings")
def __save_task__initialize_quality_settings(instance, created, **kwargs):
    # Initializes default quality settings for the task
    # this is done in a signal to decouple this component from the engine app

    if created:
        if isinstance(instance, Task):
            task = instance
        elif isinstance(instance, Job):
            task = instance.segment.task
        else:
            assert False

        QualitySettings.objects.get_or_create(task=task)
