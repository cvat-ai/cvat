# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.db.models.signals import post_save
from django.dispatch import receiver

from cvat.apps.consensus.models import ConsensusSettings
from cvat.apps.engine.models import Task


@receiver(post_save, sender=Task)
def __save_task__initialize_consensus_settings(instance: Task, created: bool, raw: bool, **kwargs):
    # Initializes default quality settings for the task
    # this is done in a signal to decouple this component from the engine app
    if created and instance.consensus_replicas and not raw:
        ConsensusSettings.objects.get_or_create(task=instance)
