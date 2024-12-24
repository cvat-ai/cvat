# Copyright (C) 2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import math

from django.db.models.signals import post_save
from django.dispatch import receiver

from cvat.apps.consensus.models import ConsensusSettings
from cvat.apps.engine.models import Job, Task


@receiver(
    post_save,
    sender=Task,
    dispatch_uid=__name__ + ".save_task-initialize_consensus_settings",
)
def __save_task__initialize_consensus_settings(instance, created, **kwargs):
    # Initializes default quality settings for the task
    # this is done in a signal to decouple this component from the engine app

    if created:
        ConsensusSettings.objects.get_or_create(
            task=instance, quorum=math.ceil(instance.consensus_jobs_per_regular_job / 2)
        )
