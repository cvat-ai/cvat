import functools
from collections import namedtuple
from collections.abc import Iterable
from typing import cast

import django_rq
from django.conf import settings
from django.http import HttpResponseBadRequest, HttpResponseNotFound
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from django_rq.queues import DjangoRQ
from drf_spectacular.utils import OpenApiResponse, extend_schema, extend_schema_view
from redis.exceptions import ConnectionError as RedisConnectionError
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rq.job import Job as RQJob
from rq.job import JobStatus as RQJobStatus

from cvat.apps.engine.filters import (
    NonModelJsonLogicFilter,
    NonModelOrderingFilter,
    NonModelSimpleFilter,
)
from cvat.apps.engine.log import ServerLogManager
from cvat.apps.engine.rq import is_rq_job_owner
from cvat.apps.engine.types import ExtendedRequest
from cvat.apps.redis_handler.apps import SELECTOR_TO_QUEUE
from cvat.apps.redis_handler.permissions import RequestPermission
from cvat.apps.redis_handler.rq import CustomRQJob, RequestId
from cvat.apps.redis_handler.serializers import RequestSerializer, RequestStatus

slogger = ServerLogManager(__name__)


@extend_schema(tags=["requests"])
@extend_schema_view(
    list=extend_schema(
        summary="List requests",
        responses={
            "200": RequestSerializer(many=True),
        },
    ),
    retrieve=extend_schema(
        summary="Get request details",
        responses={
            "200": RequestSerializer,
        },
    ),
)
class RequestViewSet(viewsets.GenericViewSet):
    serializer_class = RequestSerializer
    iam_organization_field = None
    iam_permission_class = RequestPermission
    filter_backends = [
        NonModelSimpleFilter,
        NonModelJsonLogicFilter,
        NonModelOrderingFilter,
    ]

    ordering_fields = ["created_date", "status", "action"]
    ordering = "-created_date"

    filter_fields = [
        # RQ job fields
        "status",
        # derivatives fields (from meta)
        "project_id",
        "task_id",
        "job_id",
        # derivatives fields (from parsed rq_id)
        "action",
        "target",
        "subresource",
        "format",
    ]

    simple_filters = filter_fields + ["org"]

    lookup_fields = {
        "created_date": "created_at",
        "action": "parsed_id.action",
        "target": "parsed_id.target",
        "subresource": "parsed_id.subresource",
        "format": "parsed_id.format",
        "status": "get_status",
        "project_id": "meta.project_id",
        "task_id": "meta.task_id",
        "job_id": "meta.job_id",
        "org": "meta.org_slug",
    }

    SchemaField = namedtuple("SchemaField", ["type", "choices"], defaults=(None,))

    simple_filters_schema = {
        "status": SchemaField("string", RequestStatus.choices),
        "project_id": SchemaField("integer"),
        "task_id": SchemaField("integer"),
        "job_id": SchemaField("integer"),
        "action": SchemaField("string"),
        "target": SchemaField("string"),
        "subresource": SchemaField("string"),
        "format": SchemaField("string"),
        "org": SchemaField("string"),
    }

    def get_queryset(self):
        return None

    @property
    def queues(self) -> Iterable[DjangoRQ]:
        return (django_rq.get_queue(queue_name) for queue_name in set(SELECTOR_TO_QUEUE.values()))

    def _get_rq_jobs_from_queue(self, queue: DjangoRQ, user_id: int) -> list[RQJob]:
        job_ids = set(
            queue.get_job_ids()
            + queue.started_job_registry.get_job_ids()
            + queue.finished_job_registry.get_job_ids()
            + queue.failed_job_registry.get_job_ids()
            + queue.deferred_job_registry.get_job_ids()
        )
        jobs = []

        for job in queue.job_class.fetch_many(job_ids, queue.connection):
            if job and is_rq_job_owner(job, user_id):
                job = cast(CustomRQJob, job)
                try:
                    parsed_request_id = RequestId.parse_and_validate_queue(
                        job.id, expected_queue=queue.name
                    )
                except Exception:  # nosec B112
                    continue

                job.parsed_id = parsed_request_id
                jobs.append(job)

        return jobs

    def _get_rq_jobs(self, user_id: int) -> list[RQJob]:
        """
        Get all RQ jobs for a specific user and return them as a list of RQJob objects.

        Parameters:
            user_id (int): The ID of the user for whom to retrieve jobs.

        Returns:
            list[RQJob]: A list of RQJob objects representing all jobs for the specified user.
        """
        all_jobs = []
        for queue in self.queues:
            jobs = self._get_rq_jobs_from_queue(queue, user_id)
            all_jobs.extend(jobs)

        return all_jobs

    def _get_rq_job_by_id(self, rq_id: str) -> RQJob | None:
        """
        Get a RQJob by its ID from the queues.

        Args:
            rq_id (str): The ID of the RQJob to retrieve.

        Returns:
            RQJob | None: The retrieved RQJob, or None if not found.
        """
        try:
            parsed_request_id, queue_name = RequestId.parse(rq_id, try_legacy_format=True)
            rq_id = parsed_request_id.render()
        except Exception:
            return None

        queue: DjangoRQ = django_rq.get_queue(queue_name)
        job: CustomRQJob | None = queue.fetch_job(rq_id)

        if job:
            job.parsed_id = parsed_request_id

        return job

    def _handle_redis_exceptions(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except RedisConnectionError as ex:
                msg = "Redis service is not available"
                slogger.glob.exception(f"{msg}: {str(ex)}")
                return Response(msg, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        return wrapper

    @method_decorator(never_cache)
    @_handle_redis_exceptions
    def retrieve(self, request: ExtendedRequest, pk: str):
        job = self._get_rq_job_by_id(pk)

        if not job:
            return HttpResponseNotFound("There is no request with specified id")

        self.check_object_permissions(request, job)

        serializer = self.get_serializer(job, context={"request": request})
        return Response(data=serializer.data, status=status.HTTP_200_OK)

    @method_decorator(never_cache)
    @_handle_redis_exceptions
    def list(self, request: ExtendedRequest):
        user_id = request.user.id
        user_jobs = self._get_rq_jobs(user_id)

        filtered_jobs = self.filter_queryset(user_jobs)

        page = self.paginate_queryset(filtered_jobs)
        if page is not None:
            serializer = self.get_serializer(page, many=True, context={"request": request})
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(filtered_jobs, many=True, context={"request": request})
        return Response(data=serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Cancel request",
        request=None,
        responses={
            "200": OpenApiResponse(description="The request has been cancelled"),
        },
    )
    @method_decorator(never_cache)
    @action(detail=True, methods=["POST"], url_path="cancel")
    @_handle_redis_exceptions
    def cancel(self, request: ExtendedRequest, pk: str):
        rq_job = self._get_rq_job_by_id(pk)

        if not rq_job:
            return HttpResponseNotFound("There is no request with specified id")

        self.check_object_permissions(request, rq_job)

        if rq_job.get_status(refresh=False) not in {RQJobStatus.QUEUED, RQJobStatus.DEFERRED}:
            return HttpResponseBadRequest(
                "Only requests that have not yet been started can be cancelled"
            )

        # FUTURE-TODO: race condition is possible here
        rq_job.cancel(enqueue_dependents=settings.ONE_RUNNING_JOB_IN_QUEUE_PER_USER)
        rq_job.delete()

        return Response(status=status.HTTP_200_OK)
