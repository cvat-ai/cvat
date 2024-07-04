# Copyright (C) 2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

# from cvat.apps.quality_control import quality_reports as qc
from cvat.apps.consensus.models import ConsensusSettings
from cvat.apps.engine.models import Annotation, Job, Project, Task


@receiver(
    post_save,
    sender=Task,
    dispatch_uid=__name__ + ".save_task-initialize_consensus_settings",
)
@receiver(
    post_save,
    sender=Job,
    dispatch_uid=__name__ + ".save_job-initialize_consensus_settings",
)
def __save_task__initialize_consensus_settings(instance, created, **kwargs):
    # Initializes default quality settings for the task
    # this is done in a signal to decouple this component from the engine app

    if created:
        if isinstance(instance, Task):
            task = instance
        elif isinstance(instance, Job):
            task = instance.segment.task
        else:
            assert False

        ConsensusSettings.objects.get_or_create(task=task)
