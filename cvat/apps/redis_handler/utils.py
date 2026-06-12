# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import importlib
from pathlib import Path

import rq
from rq.job import Job as RQJob


def get_class_from_module(module_path: str | Path, class_name: str) -> type | None:
    module = importlib.import_module(module_path)
    klass = getattr(module, class_name, None)
    return klass


def rq_job_will_be_retried(rq_job: RQJob) -> bool:
    return bool(rq_job.retries_left and rq_job.retries_left > 0)


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
