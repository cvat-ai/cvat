# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


from django_rq.queues import DjangoRQ
from redis.client import Pipeline
from rq.job import Job

from cvat.apps.engine.utils import take_by


def force_enqueue_deferred_jobs(queue: DjangoRQ):
    registry = queue.deferred_job_registry
    for subset_with_ids in take_by(set(registry.get_job_ids()), 1000):
        with queue.connection.pipeline() as pipeline:
            for idx, job in enumerate(
                registry.job_class.fetch_many(subset_with_ids, connection=queue.connection)
            ):
                registry.remove(subset_with_ids[idx], pipeline=pipeline)

                if not job:
                    continue

                reset_job_relationships(job, pipeline=pipeline, save_to_redis=False)
                queue._enqueue_job(job, pipeline=pipeline)

            pipeline.execute()


def reset_job_relationships(job: Job, *, pipeline: Pipeline, save_to_redis: bool = True):
    for parent_job in job.fetch_dependencies(): # do not pass pipeline since we need result immediately
        if not parent_job:
            continue

        dependents_key = parent_job.dependents_key
        pipeline.srem(dependents_key, job.id)

    job._dependency_ids = []

    if save_to_redis:
        job.save(pipeline=pipeline)


def get_job_func_name(job: Job) -> str:
    return job.func_name.rsplit(".", maxsplit=1)[1]
