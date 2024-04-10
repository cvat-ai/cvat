# Copyright (C) 2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from collections.abc import Callable
from datetime import datetime

import django_rq

def schedule_job_with_throttling(
    queue_name: str,
    job_id_base: str,
    scheduled_time: datetime,
    func: Callable,
    **func_kwargs
) -> None:
    """
    This function schedules an RQ job to run at `scheduled_time`,
    unless it had already been used to schedule a job to run at some future time
    with the same values of `queue_name` and `job_id_base`,
    in which case it does nothing.

    The scheduled job will have an ID beginning with `job_id_base`,
    and will execute `func(**func_kwargs)`.
    """
    with django_rq.get_connection(queue_name) as connection:
        # The blocker key is used to implement the throttling.
        # The first time this function is called for a given tuple of
        # (queue_name, job_id_base), we schedule the job and create a blocker
        # that expires at the same time as the job is supposed to start.
        # Until the blocker expires, we don't schedule any more jobs
        # with the same tuple.
        blocker_key = f"cvat:utils:scheduling-blocker:{queue_name}:{job_id_base}"
        if connection.exists(blocker_key):
            return

        queue_job_id = f"{job_id_base}-{scheduled_time.timestamp()}"

        # TODO: reuse the Redis connection if Django-RQ allows it.
        # See <https://github.com/rq/django-rq/issues/652>.
        django_rq.get_scheduler(queue_name).enqueue_at(
            scheduled_time,
            func,
            **func_kwargs,
            job_id=queue_job_id,
        )

        connection.set(blocker_key, queue_job_id, exat=scheduled_time)
