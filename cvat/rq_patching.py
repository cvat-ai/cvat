# Copyright (C) 2023-2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import traceback
import sys
from datetime import datetime
from typing import Optional

import rq.registry
from rq.exceptions import AbandonedJobError, NoSuchJobError
from rq.job import JobStatus
from rq.utils import current_timestamp, utcformat
from rq.version import VERSION
from rq.worker import StopRequested


# NOTE: we should patch implementation of original method because
# there is no enqueuing dependent jobs in original function
# https://github.com/rq/rq/issues/2006
# Link to PR: https://github.com/rq/rq/pull/2008
def custom_started_job_registry_cleanup(self, timestamp: Optional[float] = None):
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
        failed_job_registry = rq.registry.FailedJobRegistry(self.name, self.connection, serializer=self.serializer)
        queue = self.get_queue()

        with self.connection.pipeline() as pipeline:
            for job_id in job_ids:
                try:
                    job = self.job_class.fetch(job_id, connection=self.connection, serializer=self.serializer)
                except NoSuchJobError:
                    continue

                job.execute_failure_callback(
                    self.death_penalty_class, AbandonedJobError, AbandonedJobError(), traceback.extract_stack()
                )

                retry = job.retries_left and job.retries_left > 0

                if retry:
                    job.retry(queue, pipeline)

                else:
                    exc_string = f"due to {AbandonedJobError.__name__}"
                    rq.registry.logger.warning(
                        f'{self.__class__.__name__} cleanup: Moving job to {rq.registry.FailedJobRegistry.__name__} '
                        f'({exc_string})'
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

def custom_heartbeat(self, timestamp: datetime, ttl: int, pipeline: Optional['Pipeline'] = None, xx: bool = False):
    self.last_heartbeat = timestamp
    connection = pipeline if pipeline is not None else self.connection
    connection.hset(self.key, 'last_heartbeat', utcformat(self.last_heartbeat))

    # the only difference with the default implementation
    # is to avoid adding job to started job registry
    # that is not clear why they adds a job to started_job_registry when the job has failed
    # also, as far as I see they also commented this line in unrealeased (2.0) version
    exc_info = sys.exc_info()
    is_stopped_job = isinstance(exc_info[1], (StopRequested, SystemExit))
    if not is_stopped_job:
        self.started_job_registry.add(self, ttl, pipeline=pipeline, xx=xx)

def update_started_job_registry_cleanup() -> None:
    # don't forget to check if the issue https://github.com/rq/rq/issues/2006 has been resolved in upstream
    assert VERSION == '1.16.0'
    rq.registry.StartedJobRegistry.cleanup = custom_started_job_registry_cleanup
    rq.job.Job.heartbeat = custom_heartbeat
