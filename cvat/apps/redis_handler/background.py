# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from abc import ABCMeta, abstractmethod
from collections.abc import Callable
from typing import Any, ClassVar

import django_rq
from django.conf import settings
from django.db.models import Model
from django_rq.queues import DjangoRQ, DjangoScheduler
from rest_framework import status
from rest_framework.response import Response
from rq import Callback
from rq.job import Job as RQJob
from rq.job import JobStatus as RQJobStatus

from cvat.apps.engine.log import ServerLogManager
from cvat.apps.engine.models import RequestTarget
from cvat.apps.engine.rq import BaseRQMeta, define_dependent_job
from cvat.apps.engine.types import ExtendedRequest
from cvat.apps.engine.utils import get_rq_lock_by_user, get_rq_lock_for_job
from cvat.apps.redis_handler.serializers import RqIdSerializer

slogger = ServerLogManager(__name__)

REQUEST_TIMEOUT = 60
# it's better to return LockNotAvailableError instead of response with 504 status
LOCK_TTL = REQUEST_TIMEOUT - 5
LOCK_ACQUIRE_TIMEOUT = LOCK_TTL - 5


class AbstractRequestManager(metaclass=ABCMeta):
    SUPPORTED_TARGETS: ClassVar[set[RequestTarget] | None] = None
    QUEUE_NAME: ClassVar[str]
    REQUEST_ID_KEY = "rq_id"

    callback: Callable
    callback_args: tuple | None
    callback_kwargs: dict[str, Any] | None

    job_on_success_callback: Callback | None
    job_on_failure_callback: Callback | None

    def __init__(
        self,
        *,
        request: ExtendedRequest,
        db_instance: Model | None = None,
    ) -> None:
        self.request = request
        self.user_id = request.user.id
        self.db_instance = db_instance

        if db_instance:
            assert self.SUPPORTED_TARGETS, "Should be defined"
            self.target = RequestTarget(db_instance.__class__.__name__.lower())
            assert self.target in self.SUPPORTED_TARGETS, f"Unsupported target: {self.target}"

    @classmethod
    def get_queue(cls) -> DjangoRQ:
        return django_rq.get_queue(cls.QUEUE_NAME)

    @property
    def job_result_ttl(self) -> int | None:
        """
        Time to live for successful job result in seconds,
        if not set, the default result TTL will be used
        """
        return None

    @property
    def job_failed_ttl(self) -> int | None:
        """
        Time to live for failures in seconds,
        if not set, the default failure TTL will be used
        """
        return None

    @abstractmethod
    def build_request_id(self): ...

    def validate_request_id(self, request_id: str, /) -> None: ...

    def get_job_by_id(self, id_: str, /) -> RQJob | None:
        try:
            self.validate_request_id(id_)
        except Exception:
            return None

        queue = self.get_queue()
        return queue.fetch_job(id_)

    def init_request_args(self):
        """
        Hook to initialize operation args based on the request
        """

    @abstractmethod
    def init_callback_with_params(self) -> None:
        """
        Method should initialize callback function with its args/kwargs:

        self.callback = ...
        (optional) self.callback_args = ...
        (optional) self.callback_kwargs = ...
        """

    def _set_default_callback_params(self):
        self.callback_args = None
        self.callback_kwargs = None
        self.job_on_success_callback = None
        self.job_on_failure_callback = None

    def init_job_callbacks(self) -> None:
        """Hook to initialize RQ lifecycle callbacks for the job"""

    def validate_request(self) -> Response | None:
        """Hook to run some validations before processing a request"""

        # prevent architecture bugs
        assert (
            "POST" == self.request.method
        ), "Only POST requests can be used to initiate a background process"

    def handle_existing_job(self, job: RQJob | None, queue: DjangoRQ) -> Response | None:
        if not job:
            return None

        job_status = job.get_status(refresh=False)

        if job_status in {
            # FUTURE-TODO: cancelling and re-enqueuing a started job should probably be allowed
            RQJobStatus.STARTED,
            RQJobStatus.QUEUED,
            RQJobStatus.DEFERRED,
        }:
            return Response(
                RqIdSerializer({"rq_id": job.id}).data,
                status=status.HTTP_409_CONFLICT,
            )

        # RQ jobs can be scheduled only by CVAT internal logic, in that case job has no dependencies
        if job_status == RQJobStatus.SCHEDULED:
            scheduler: DjangoScheduler = django_rq.get_scheduler(queue.name, queue=queue)
            # remove the job id from the set with scheduled keys
            scheduler.cancel(job)
            job.cancel(enqueue_dependents=settings.ONE_RUNNING_JOB_IN_QUEUE_PER_USER)

        job.delete()
        return None

    def build_meta(self, *, request_id: str) -> dict[str, Any]:
        return BaseRQMeta.build(request=self.request, db_obj=self.db_instance)

    def setup_new_job(self, queue: DjangoRQ, request_id: str, /, **kwargs):
        with get_rq_lock_by_user(queue, self.user_id):
            queue.enqueue_call(
                func=self.callback,
                args=self.callback_args,
                kwargs=self.callback_kwargs,
                job_id=request_id,
                meta=self.build_meta(request_id=request_id),
                depends_on=define_dependent_job(queue, self.user_id, rq_id=request_id),
                result_ttl=self.job_result_ttl,
                failure_ttl=self.job_failed_ttl,
                on_success=self.job_on_success_callback,
                on_failure=self.job_on_failure_callback,
                **kwargs,
            )

    def finalize_request(self) -> None:
        """Hook to run some actions (e.g. collect events) after processing a request"""

    def get_response(self, request_id: str) -> Response:
        serializer = RqIdSerializer({"rq_id": request_id})
        return Response(serializer.data, status=status.HTTP_202_ACCEPTED)

    def enqueue_job(self) -> Response:
        self.init_request_args()
        self.validate_request()
        self._set_default_callback_params()
        self.init_callback_with_params()
        self.init_job_callbacks()

        queue: DjangoRQ = django_rq.get_queue(self.QUEUE_NAME)
        request_id = self.build_request_id()

        # ensure that there is no race condition when processing parallel requests
        with get_rq_lock_for_job(queue, request_id):
            job = queue.fetch_job(request_id)

            if response := self.handle_existing_job(job, queue):
                return response

            self.setup_new_job(queue, request_id)

        self.finalize_request()
        return self.get_response(request_id)
