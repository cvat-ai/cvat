# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import importlib
from copy import copy
from pathlib import Path
from typing import Any, Self

import rq
from rq.job import Job as RQJob
from rq.job import JobStatus

from cvat.apps.redis_handler import signals


class DetachedJob(RQJob):
    """
    A read-only in-memory RQ job copy detached from Redis.

    It is intended for serialization paths that need a stable in-memory job view
    without refreshing the status from Redis and without mutating the real job.
    """

    @classmethod
    def create_from_job(cls, rq_job: RQJob) -> Self:
        detached_job = copy(rq_job)
        detached_job.connection = None
        detached_job.meta = rq_job.meta.copy()
        detached_job.__class__ = cls
        return detached_job

    def get_status(self, refresh: bool = False) -> JobStatus:
        return self._status

    def return_value(self, refresh: bool = False) -> Any:
        return self._result

    def set_status(self, *args: Any, **kwargs: Any) -> None:
        raise ValueError("Detached RQ job status cannot be changed")

    def save(self, *args: Any, **kwargs: Any) -> None:
        raise ValueError("Detached RQ job cannot be saved")

    @property
    def exc_info(self) -> str | None:
        return self._exc_info


def get_class_from_module(module_path: str | Path, class_name: str) -> type | None:
    module = importlib.import_module(module_path)
    klass = getattr(module, class_name, None)
    return klass


def get_class_from_full_path(full_path: str) -> type | None:
    module_path, class_name = full_path.rsplit(".", 1)
    return get_class_from_module(module_path, class_name)


def rq_job_will_be_retried(rq_job: RQJob) -> bool:
    return bool(rq_job.retries_left and rq_job.retries_left > 0)


def send_request_succeeded_signal(
    rq_job: RQJob,
    connection: Any,
    result: Any,
) -> None:
    from cvat.apps.engine.rq import BaseRQMeta

    request_manager_cls_path = BaseRQMeta.for_job(rq_job).request_manager_cls
    sender = (
        get_class_from_full_path(full_path=request_manager_cls_path)
        if request_manager_cls_path
        else None
    )

    _ = signals.request_succeeded.send_robust(
        sender=sender,
        rq_job=rq_job,
        result=result,
        status=JobStatus.FINISHED,
        exc_type=None,
        exc_value=None,
        exc_traceback=None,
    )


def send_request_failed_signal(
    rq_job: RQJob,
    connection: Any,
    exc_type: type[BaseException],
    exc_value: BaseException,
    exc_traceback: Any,
) -> None:
    from cvat.apps.engine.rq import BaseRQMeta

    if rq_job_will_be_retried(rq_job=rq_job):
        return

    request_manager_cls_path = BaseRQMeta.for_job(rq_job).request_manager_cls
    sender = (
        get_class_from_full_path(request_manager_cls_path) if request_manager_cls_path else None
    )

    _ = signals.request_failed.send_robust(
        sender=sender,
        rq_job=rq_job,
        result=None,
        status=JobStatus.FAILED,
        exc_type=exc_type,
        exc_value=exc_value,
        exc_traceback=exc_traceback,
    )


def get_current_job_attempt() -> int:
    job = rq.get_current_job()

    if job is None:
        raise ValueError("Cannot determine current job outside of an RQ job context")

    if job.retry_intervals is None or job.retries_left is None:
        return 1

    max_retry_attempts = len(job.retry_intervals)
    retries_left = job.retries_left
    # NOTE @sosov: first ever attempt is not scored as a "retry" attempt,
    # so on it max_retry_attempts == retries_left; the "+ 1" makes the
    # current overall attempt 1-based.
    return max_retry_attempts - retries_left + 1
