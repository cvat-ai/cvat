# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import importlib
import traceback
from enum import StrEnum, auto
from pathlib import Path
from typing import Any

import rq
from rq.job import Job as RQJob

from cvat.utils.exceptions import parse_exception_message


def get_class_from_module(module_path: str | Path, class_name: str) -> type | None:
    module = importlib.import_module(module_path)
    klass = getattr(module, class_name, None)
    return klass


class RequestStatusEnum(StrEnum):
    SUCCEEDED = auto()
    FAILED = auto()


def rq_job_will_be_retried(rq_job: RQJob) -> bool:
    return bool(rq_job.retries_left and rq_job.retries_left > 0)


def send_request_succeeded_signal(
    rq_job: RQJob,
    connection: Any,
    result: Any,
) -> None:
    from cvat.apps.redis_handler import signals
    from cvat.apps.redis_handler.background import AbstractRequestManager

    _ = signals.request_succeeded.send_robust(
        sender=AbstractRequestManager,
        request_id=rq_job.id,
        status=RequestStatusEnum.SUCCEEDED,
        message=None,
    )


def send_request_failed_signal(
    rq_job: RQJob,
    connection: Any,
    exc_type: type[BaseException],
    exc_value: BaseException,
    exc_traceback: Any,
) -> None:
    from cvat.apps.redis_handler import signals
    from cvat.apps.redis_handler.background import AbstractRequestManager

    if rq_job_will_be_retried(rq_job=rq_job):
        return

    _ = signals.request_failed.send_robust(
        sender=AbstractRequestManager,
        request_id=rq_job.id,
        status=RequestStatusEnum.FAILED,
        message=parse_exception_message(
            "".join(traceback.format_exception_only(exc_type, exc_value))
        ),
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
