# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


from django_rq.queues import DjangoRQ
from redis.client import Pipeline
from rq.job import Job
from rq.results import Result

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
    # do not pass pipeline since we need result immediately
    if job_dependencies := job.fetch_dependencies():
        for parent_job in job_dependencies:
            if not parent_job:
                continue

            dependents_key = parent_job.dependents_key
            pipeline.srem(dependents_key, job.id)

        job._dependency_ids = []

        if save_to_redis:
            job.save(pipeline=pipeline)


def delete_job_from_redis(job: Job, *, pipeline: Pipeline):
    pipeline.delete(job.key, job.dependents_key, job.dependencies_key)


def rename_redis_key(old_key: str, new_key: str, *, pipeline: Pipeline):
    # KEYS[1] - old key, KEYS[2] - new key
    lua_script = """
    if redis.call('EXISTS', KEYS[1]) == 1 then
        return redis.call('RENAMENX', KEYS[1], KEYS[2])
    else
        return 0
    end
    """
    pipeline.eval(lua_script, 2, old_key, new_key)


def rename_job_result(outdated_job_id: str, updated_job_id: str, *, pipeline: Pipeline):
    rename_redis_key(
        Result.get_key(outdated_job_id), Result.get_key(updated_job_id), pipeline=pipeline
    )


def get_job_func_name(job: Job) -> str:
    return job.func_name.rsplit(".", maxsplit=1)[1]
