# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from abc import ABCMeta, abstractmethod
from typing import ClassVar, Optional

import django_rq
from django_rq.queues import DjangoRQ, DjangoScheduler
from rest_framework import status
from rest_framework.response import Response
from rq.job import Job as RQJob
from rq.job import JobStatus as RQJobStatus

from cvat.apps.engine.log import ServerLogManager
from cvat.apps.engine.serializers import RqIdSerializer
from cvat.apps.engine.types import ExtendedRequest
from cvat.apps.engine.utils import get_rq_lock_for_job

slogger = ServerLogManager(__name__)
from django.conf import settings

from cvat.apps.engine.models import Job, Project, RequestSubresource, RequestTarget, Task

# TODO: describe here protocol


class AbstractRQJobManager(metaclass=ABCMeta):
    QUEUE_NAME: ClassVar[str]
    SUPPORTED_RESOURCES: ClassVar[set[RequestSubresource]]

    @classmethod
    def get_queue(cls) -> DjangoRQ:
        return django_rq.get_queue(cls.QUEUE_NAME)

    @classmethod
    # @abstractmethod
    def validate_rq_id(rq_id: str, /) -> None: ...

    @classmethod
    def get_job_by_id(cls, rq_id: str, /, *, validate: bool = True) -> RQJob | None:
        if validate:
            try:
                cls.validate_rq_id(rq_id)
            except Exception:
                return None

        queue = cls.get_queue()
        return queue.fetch_job(rq_id)

    def __init__(
        self,
        db_instance: Project | Task | Job,
        request: ExtendedRequest,
    ) -> None:
        """
        Args:
            db_instance (Union[models.Project, models.Task, models.Job]): Model instance
            request (ExtendedRequest): Incoming HTTP request
        """
        self.db_instance = db_instance
        self.request = request
        self.resource = db_instance.__class__.__name__.lower()
        if self.resource not in self.SUPPORTED_RESOURCES:
            raise ValueError("Unexpected type of db_instance: {}".format(type(db_instance)))

    def handle_existing_rq_job(
        self, rq_job: Optional[RQJob], queue: DjangoRQ
    ) -> Optional[Response]:
        if not rq_job:
            return None

        rq_job_status = rq_job.get_status(refresh=False)

        if rq_job_status in {RQJobStatus.STARTED, RQJobStatus.QUEUED}:
            return Response(
                data="Request is being processed",
                status=status.HTTP_409_CONFLICT,
            )

        if rq_job_status == RQJobStatus.DEFERRED:
            rq_job.cancel(enqueue_dependents=settings.ONE_RUNNING_JOB_IN_QUEUE_PER_USER)

        if rq_job_status == RQJobStatus.SCHEDULED:
            scheduler: DjangoScheduler = django_rq.get_scheduler(queue.name, queue=queue)
            # remove the job id from the set with scheduled keys
            scheduler.cancel(rq_job)
            rq_job.cancel(enqueue_dependents=settings.ONE_RUNNING_JOB_IN_QUEUE_PER_USER)

        rq_job.delete()
        return None

    def validate_request(self) -> Response | None:
        """Hook to run some validations before processing a request"""

    def after_processing(self) -> None:
        """Hook to run some actions (e.g. collect events) after processing a request"""

    @abstractmethod
    def setup_background_job(self, queue: DjangoRQ, rq_id: str) -> None: ...

    @abstractmethod
    def build_rq_id(self): ...

    def get_response(self, rq_id: str) -> Response:
        serializer = RqIdSerializer({"rq_id": rq_id})
        return Response(serializer.data, status=status.HTTP_202_ACCEPTED)

    def process(self) -> Response:
        if invalid_response := self.validate_request():
            return invalid_response

        queue: DjangoRQ = django_rq.get_queue(self.QUEUE_NAME)
        rq_id = self.build_rq_id()

        # ensure that there is no race condition when processing parallel requests
        with get_rq_lock_for_job(queue, rq_id):
            rq_job = queue.fetch_job(rq_id)

            if response := self.handle_existing_rq_job(rq_job, queue):
                return response

            self.setup_background_job(queue, rq_id)

        self.after_processing()
        return self.get_response(rq_id)
