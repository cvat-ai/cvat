# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""
Signals for the analytics test app.

Hook point: After every annotation batch write in dataset_manager/task.py,
the ORM calls job.save(update_fields=["updated_date", ...]).
This fires post_save on Job with update_fields set, and is the correct
signal for "annotations just changed for this job".

We schedule a debounced RQ background job to recompute and broadcast counts.
The debounce is implemented via a Redis key with a TTL: if a new save arrives
within DEBOUNCE_SECONDS, the TTL is refreshed and the RQ job is delayed.

Bulk annotation writes (bulk_create) bypass model signals, but the code in
dataset_manager/task.py always calls job.save(update_fields=["updated_date"])
after the bulk write, so we correctly capture all writes.
"""

import logging

from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from cvat.apps.engine.models import Job

logger = logging.getLogger(__name__)

DEBOUNCE_SECONDS = 2  # coalesce rapid edits within this window


@receiver(post_save, sender=Job, dispatch_uid="analytics_test_job_post_save")
def _job_updated_handler(sender, instance: Job, created: bool, **kwargs):
    """
    Fires after every Job save.  We only care about annotation changes, which
    manifest as updates to 'updated_date'.  New job creation is skipped.
    """
    if created:
        return

    update_fields = kwargs.get("update_fields")
    # Annotation saves always update 'updated_date'.
    # We also trigger on a general save (update_fields=None) to be safe.
    if update_fields is not None and "updated_date" not in update_fields:
        return

    job_id = instance.id

    # Schedule the broadcast after the current transaction commits,
    # so the DB reflects the new annotations when the worker runs.
    transaction.on_commit(lambda: _schedule_broadcast(job_id))


def _schedule_broadcast(job_id: int) -> None:
    """
    Enqueue a debounced broadcast RQ job.

    Uses Redis to implement debounce: we set a key with TTL DEBOUNCE_SECONDS.
    If the key already exists (job modified very recently), we skip enqueueing;
    the existing RQ job will run after the TTL expires naturally.

    If the key doesn't exist, we set it and enqueue the RQ job with a countdown.
    """
    try:
        import redis as redis_lib
        from django.conf import settings

        redis_client = redis_lib.Redis(
            host=getattr(settings, "CVAT_REDIS_INMEM_HOST", "localhost"),
            port=int(getattr(settings, "CVAT_REDIS_INMEM_PORT", 6379)),
            db=0,
            socket_connect_timeout=1,
        )
        debounce_key = f"analytics:debounce:job:{job_id}"

        # set with NX (only if not exists) and EX (expire)
        was_set = redis_client.set(debounce_key, "1", ex=DEBOUNCE_SECONDS, nx=True)
        if not was_set:
            # Already scheduled within the debounce window — skip
            logger.debug("Analytics broadcast debounced for job %s", job_id)
            return

        # Enqueue the RQ broadcast worker
        import django_rq
        queue = django_rq.get_queue("default")
        queue.enqueue_in(
            __import__("datetime").timedelta(seconds=DEBOUNCE_SECONDS),
            "cvat.apps.test.rq.broadcast_class_counts",
            job_id,
        )
        logger.debug("Scheduled analytics broadcast for job %s", job_id)

    except Exception:  # noqa: BLE001
        # Never let analytics errors propagate to the annotation save path
        logger.exception("Failed to schedule analytics broadcast for job %s", job_id)
