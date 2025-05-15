# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from contextlib import suppress

import django_rq
from django.conf import settings
from rq.exceptions import NoSuchJobError
from rq.job import Job

from cvat.apps.engine.log import ServerLogManager
from cvat.apps.engine.utils import get_rq_lock_for_job

slogger = ServerLogManager(__name__)


def cleanup_deferred_job_registry():
    def _process_job(enqueue: bool = False):
        queue.deferred_job_registry.remove(child_id)

        if enqueue:
            queue._enqueue_job(child)

    for queue_name in set(settings.RQ_QUEUES.keys()) - {
        settings.CVAT_QUEUES.WEBHOOKS.value,
        settings.CVAT_QUEUES.NOTIFICATIONS.value,
        settings.CVAT_QUEUES.CLEANING.value,
    }:
        queue: django_rq.queues.DjangoRQ = django_rq.get_queue(queue_name)
        job_ids = queue.deferred_job_registry.get_job_ids()

        for child_id in job_ids:
            child: Job | None = None
            parent: Job | None = None

            with get_rq_lock_for_job(queue, child_id):
                with suppress(NoSuchJobError):
                    child = queue.fetch_job(child_id)

                # RQ job HASH was removed, but job_id exists in the rq:deferred:<queue_name> SET
                if not child:
                    _process_job()
                    continue

                parent_ids = child._dependency_ids

                # generally should not happen because any job in deferred job registry must have a dependency
                if not parent_ids:
                    _process_job(enqueue=True)
                    continue

                if len(parent_ids) != 1:
                    # should be handled manually
                    slogger.glob.error(
                        f"RQ job {child_id} has {len(parent_ids)} parents: {parent_ids}"
                    )
                    continue

                parent_id = parent_ids[0]

                with get_rq_lock_for_job(queue, parent_id):
                    with suppress(NoSuchJobError):
                        parent = queue.fetch_job(parent_id)

                    # if a parent job exists then we will wait until it is deleted by timeout
                    # to prevent possible race conditions with RQ job handling logic.
                    # It does not matter in which registry job exists.
                    if parent:
                        continue

                    # parent job has been deleted by timeout
                    _process_job(enqueue=True)
