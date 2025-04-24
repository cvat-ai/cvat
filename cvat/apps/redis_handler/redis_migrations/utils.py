# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


import django_rq
from rq.job import Job
from rq.registry import DeferredJobRegistry


def force_deferred_jobs_into_queue(
    job: Job, *, queue: django_rq.queues.DjangoRQ, registry: DeferredJobRegistry, **kwargs
):
    registry.remove(job)
    job._dependency_ids = []

    pipeline = job.connection.pipeline()  # todo
    for parent_job in job.fetch_dependencies(pipeline=pipeline):
        if not parent_job:
            continue

        dependents_key = parent_job.dependents_key
        pipeline.srem(dependents_key, job.id)

    queue._enqueue_job(job)


def get_job_func_name(job: Job) -> str:
    return job.func_name.rsplit(".", maxsplit=1)[1]
