# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.db.models.signals import pre_delete
from django.dispatch import receiver

from .models import AugmentationJob


@receiver(pre_delete, sender=AugmentationJob)
def augmentation_job_pre_delete(sender, instance, **kwargs):
    """
    Cleanup handler for augmentation job deletion.

    Cancels running RQ job if exists.
    """
    if instance.rq_job_id:
        try:
            import django_rq
            import rq

            queue = django_rq.get_queue('augmentation')
            try:
                rq_job = queue.fetch_job(instance.rq_job_id)
                if rq_job and not rq_job.is_finished:
                    rq_job.cancel()
            except rq.exceptions.NoSuchJobError:
                pass
        except Exception:
            # Ignore errors during cleanup
            pass
