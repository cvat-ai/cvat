# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os.path as osp
from abc import ABCMeta, abstractmethod
from collections.abc import Callable
from dataclasses import asdict as dataclass_asdict
from dataclasses import dataclass
from datetime import datetime
from typing import Any, ClassVar
from urllib.parse import quote

import django_rq
from django.conf import settings
from django.db.models import Model
from django.http.response import HttpResponseBadRequest
from django.utils import timezone
from django_rq.queues import DjangoRQ, DjangoScheduler
from rest_framework import serializers, status
from rest_framework.response import Response
from rq.job import Job as RQJob
from rq.job import JobStatus as RQJobStatus

from cvat.apps.dataset_manager.util import get_export_cache_lock
from cvat.apps.engine.cloud_provider import export_resource_to_cloud_storage
from cvat.apps.engine.location import (
    Location,
    LocationConfig,
    StorageType,
    get_location_configuration,
)
from cvat.apps.engine.log import ServerLogManager
from cvat.apps.engine.models import RequestTarget
from cvat.apps.engine.permissions import get_cloud_storage_for_import_or_export
from cvat.apps.engine.rq import BaseRQMeta, ExportRQMeta, define_dependent_job
from cvat.apps.engine.types import ExtendedRequest
from cvat.apps.engine.utils import get_rq_lock_by_user, get_rq_lock_for_job, sendfile
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


class AbstractExporter(AbstractRequestManager):

    class Downloader:
        def __init__(
            self,
            *,
            request: ExtendedRequest,
            queue: DjangoRQ,
            request_id: str,
        ):
            self.request = request
            self.queue = queue
            self.request_id = request_id

        def validate_request(self):
            # prevent architecture bugs
            assert self.request.method in (
                "GET",
                "HEAD",
            ), "Only GET/HEAD requests can be used to download a file"

        def download_file(self) -> Response:
            self.validate_request()

            # ensure that there is no race condition when processing parallel requests
            with get_rq_lock_for_job(self.queue, self.request_id):
                job = self.queue.fetch_job(self.request_id)

                if not job:
                    return HttpResponseBadRequest("Unknown export request id")

                # define status once to avoid refreshing it on each check
                # FUTURE-TODO: get_status will raise InvalidJobOperation exception instead of returning None in one of the next releases
                job_status = job.get_status(refresh=False)

                if job_status != RQJobStatus.FINISHED:
                    return HttpResponseBadRequest("The export process is not finished")

                job_meta = ExportRQMeta.for_job(job)
                file_path = job.return_value()

                if not file_path:
                    return (
                        Response(
                            "A result for exporting job was not found for finished RQ job",
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        )
                        if job_meta.result_url
                        # user tries to download a final file locally while the export is made to cloud storage
                        else HttpResponseBadRequest(
                            "The export process has no result file to be downloaded locally"
                        )
                    )

                with get_export_cache_lock(
                    file_path, ttl=LOCK_TTL, acquire_timeout=LOCK_ACQUIRE_TIMEOUT
                ):
                    if not osp.exists(file_path):
                        return Response(
                            "The exported file has expired, please retry exporting",
                            status=status.HTTP_404_NOT_FOUND,
                        )

                    return sendfile(
                        self.request,
                        file_path,
                        attachment=True,
                        attachment_filename=job_meta.result_filename,
                    )

    @dataclass
    class ExportArgs:
        filename: str | None
        location_config: LocationConfig

        def to_dict(self):
            return dataclass_asdict(self)

    QUEUE_NAME = settings.CVAT_QUEUES.EXPORT_DATA.value

    export_args: ExportArgs | None

    @property
    def job_result_ttl(self):
        from cvat.apps.dataset_manager.views import get_export_cache_ttl

        return int(get_export_cache_ttl(self.db_instance).total_seconds())

    @property
    def job_failed_ttl(self):
        return self.job_result_ttl

    @abstractmethod
    def get_result_filename(self) -> str: ...

    @abstractmethod
    def get_result_endpoint_url(self) -> str: ...

    def make_result_url(self, *, request_id: str) -> str:
        return self.get_result_endpoint_url() + f"?{self.REQUEST_ID_KEY}={quote(request_id)}"

    def get_file_timestamp(self) -> str:
        # use only updated_date for the related resource, don't check children objects
        # because every child update should touch the updated_date of the parent resource
        date = self.db_instance.updated_date if self.db_instance else timezone.now()
        return datetime.strftime(date, "%Y_%m_%d_%H_%M_%S")

    def init_request_args(self) -> None:
        try:
            location_config = get_location_configuration(
                db_instance=self.db_instance,
                query_params=self.request.query_params,
                field_name=StorageType.TARGET,
            )
        except ValueError as ex:
            raise serializers.ValidationError(str(ex)) from ex

        self.export_args = AbstractExporter.ExportArgs(
            location_config=location_config, filename=self.request.query_params.get("filename")
        )

    @abstractmethod
    def _init_callback_with_params(self):
        """
        Private method that should initialize callback function with its args/kwargs
        like the init_callback_with_params method in the parent class.
        """

    def init_callback_with_params(self):
        """
        Method should not be overridden
        """
        self._init_callback_with_params()

        if self.export_args.location_config.location == Location.CLOUD_STORAGE:
            storage_id = self.export_args.location_config.cloud_storage_id
            db_storage = get_cloud_storage_for_import_or_export(
                storage_id=storage_id,
                request=self.request,
                is_default=self.export_args.location_config.is_default,
            )

            self.callback_args = (db_storage, self.callback) + self.callback_args
            self.callback = export_resource_to_cloud_storage

    def build_meta(self, *, request_id):
        return ExportRQMeta.build_for(
            request=self.request,
            db_obj=self.db_instance,
            result_url=(
                self.make_result_url(request_id=request_id)
                if self.export_args.location_config.location != Location.CLOUD_STORAGE
                else None
            ),
            result_filename=self.get_result_filename(),
        )

    def get_downloader(self):
        request_id = self.request.query_params.get(self.REQUEST_ID_KEY)

        if not request_id:
            raise serializers.ValidationError("Missing request id in the query parameters")

        try:
            self.validate_request_id(request_id)
        except ValueError:
            raise serializers.ValidationError("Invalid export request id")

        return self.Downloader(request=self.request, queue=self.get_queue(), request_id=request_id)
