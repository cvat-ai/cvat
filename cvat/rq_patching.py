# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import traceback
from datetime import datetime

import rq.registry
from redis import WatchError
from redis.client import Pipeline
from rq.exceptions import AbandonedJobError, InvalidJobOperation, NoSuchJobError
from rq.job import Job, JobStatus
from rq.queue import Queue
from rq.utils import current_timestamp
from rq.version import VERSION


# NOTE: we should patch implementation of original method because
# there is no enqueuing dependent jobs in original function
# https://github.com/rq/rq/issues/2006
# Link to PR: https://github.com/rq/rq/pull/2008
def custom_started_job_registry_cleanup(self, timestamp: float | None = None):
    """Remove abandoned jobs from registry and add them to FailedJobRegistry.

    Removes jobs with an expiry time earlier than timestamp, specified as
    seconds since the Unix epoch. timestamp defaults to call time if
    unspecified. Removed jobs are added to the global failed job queue.

    Args:
        timestamp (datetime): The datetime to use as the limit.
    """

    score = timestamp if timestamp is not None else current_timestamp()
    job_ids = self.get_expired_job_ids(score)

    if job_ids:
        failed_job_registry = rq.registry.FailedJobRegistry(
            self.name, self.connection, serializer=self.serializer
        )
        queue = self.get_queue()

        with self.connection.pipeline() as pipeline:
            for job_id in job_ids:
                try:
                    job = self.job_class.fetch(
                        job_id, connection=self.connection, serializer=self.serializer
                    )
                except NoSuchJobError:
                    continue

                job.execute_failure_callback(
                    self.death_penalty_class,
                    AbandonedJobError,
                    AbandonedJobError(),
                    traceback.extract_stack(),
                )

                retry = job.retries_left and job.retries_left > 0

                if retry:
                    job.retry(queue, pipeline)

                else:
                    exc_string = f"due to {AbandonedJobError.__name__}"
                    rq.registry.logger.warning(
                        f"{self.__class__.__name__} cleanup: Moving job to {rq.registry.FailedJobRegistry.__name__} "
                        f"({exc_string})"
                    )
                    job.set_status(JobStatus.FAILED)
                    job._exc_info = f"Moved to {rq.registry.FailedJobRegistry.__name__}, {exc_string}, at {datetime.now()}"
                    job.save(pipeline=pipeline, include_meta=False)
                    job.cleanup(ttl=-1, pipeline=pipeline)
                    failed_job_registry.add(job, job.failure_ttl)
                    queue.enqueue_dependents(job)

            pipeline.zremrangebyscore(self.key, 0, score)
            pipeline.execute()

    return job_ids


def cancel_job(self: Job, pipeline: Pipeline | None = None, enqueue_dependents: bool = False):
    """Cancels the given job, which will prevent the job from ever being
    ran (or inspected).

    This method merely exists as a high-level API call to cancel jobs
    without worrying about the internals required to implement job
    cancellation.

    You can enqueue the jobs dependents optionally,
    Same pipelining behavior as Queue.enqueue_dependents on whether or not a pipeline is passed in.

    Args:
        pipeline (Optional[Pipeline], optional): The Redis' pipeline to use. Defaults to None.
        enqueue_dependents (bool, optional): Whether to enqueue dependents jobs. Defaults to False.

    Raises:
        InvalidJobOperation: If the job has already been cancelled.
    """
    if self.is_canceled:
        raise InvalidJobOperation("Cannot cancel already canceled job: {}".format(self.get_id()))

    pipe = pipeline or self.connection.pipeline()

    while True:
        try:
            q = Queue(
                name=self.origin,
                connection=self.connection,
                job_class=self.__class__,
                serializer=self.serializer,
            )

            self.set_status(JobStatus.CANCELED, pipeline=pipe)
            if enqueue_dependents:
                # Only WATCH if no pipeline passed, otherwise caller is responsible
                if pipeline is None:
                    pipe.watch(self.dependents_key)
                q.enqueue_dependents(self, pipeline=pipeline, exclude_job_id=self.id)

            # ---block with custom changes---
            # go through all dependencies and remove the current job from dependency's dependents_key
            for dependency in self.fetch_dependencies(pipeline=pipe):
                pipe.srem(dependency.dependents_key, self.id)
            # ---block with custom changes---

            self._remove_from_registries(pipeline=pipe, remove_from_queue=True)

            registry = rq.registry.CanceledJobRegistry(
                self.origin, self.connection, job_class=self.__class__, serializer=self.serializer
            )
            registry.add(self, pipeline=pipe)
            if pipeline is None:
                pipe.execute()
            break
        except WatchError:
            if pipeline is None:
                continue
            else:
                # if the pipeline comes from the caller, we re-raise the
                # exception as it is the responsibility of the caller to
                # handle it
                raise


def patch_rq() -> None:
    assert VERSION == "1.16.0"
    # don't forget to check if the issue https://github.com/rq/rq/issues/2006 has been resolved in upstream
    rq.registry.StartedJobRegistry.cleanup = custom_started_job_registry_cleanup
    # don't forget to check if the PR https://github.com/rq/rq/pull/2241 has been merged
    rq.job.Job.cancel = cancel_job
