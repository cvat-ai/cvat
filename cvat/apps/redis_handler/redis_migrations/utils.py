# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


import django_rq
from rq.job import Job

from cvat.apps.engine.utils import take_by


def force_enqueue_deferred_jobs(queue: django_rq.queues.DjangoRQ):
    registry = queue.deferred_job_registry
    for subset_with_ids in take_by(set(registry.get_job_ids()), 1000):
        for idx, job in enumerate(
            registry.job_class.fetch_many(subset_with_ids, connection=queue.connection)
        ):
            registry.remove(subset_with_ids[idx])

            if not job:
                continue

            job._dependency_ids = []

            for parent_job in job.fetch_dependencies():
                if not parent_job:
                    continue

                dependents_key = parent_job.dependents_key
                queue.connection.srem(dependents_key, job.id)

                queue._enqueue_job(job)


def get_job_func_name(job: Job) -> str:
    return job.func_name.rsplit(".", maxsplit=1)[1]
