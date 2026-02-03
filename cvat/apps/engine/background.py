# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os.path as osp
import shutil
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Any, ClassVar, Optional, Union
from urllib.parse import quote

import django_rq
from django.conf import settings
from django.http.response import HttpResponseBadRequest
from django_rq.queues import DjangoRQ, DjangoScheduler
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.reverse import reverse
from rq.job import Job as RQJob
from rq.job import JobStatus as RQJobStatus

import cvat.apps.dataset_manager as dm
from cvat.apps.dataset_manager.formats.registry import EXPORT_FORMATS
from cvat.apps.dataset_manager.util import get_export_cache_lock
from cvat.apps.dataset_manager.views import get_export_cache_ttl, get_export_callback
from cvat.apps.engine import models
from cvat.apps.engine.backup import ProjectExporter, TaskExporter, create_backup
from cvat.apps.engine.cloud_provider import export_resource_to_cloud_storage
from cvat.apps.engine.location import StorageType, get_location_configuration
from cvat.apps.engine.log import ServerLogManager
from cvat.apps.engine.models import Location, RequestAction, RequestSubresource, RequestTarget, Task
from cvat.apps.engine.permissions import get_cloud_storage_for_import_or_export
from cvat.apps.engine.rq import ExportRQMeta, RQId, define_dependent_job
from cvat.apps.engine.serializers import RqIdSerializer
from cvat.apps.engine.types import ExtendedRequest
from cvat.apps.engine.utils import (
    build_annotations_file_name,
    build_backup_file_name,
    get_rq_lock_by_user,
    get_rq_lock_for_job,
    is_dataset_export,
    sendfile,
    validate_server_path,
)
from cvat.apps.events.handlers import handle_dataset_export

slogger = ServerLogManager(__name__)

REQUEST_TIMEOUT = 60
# it's better to return LockNotAvailableError instead of response with 504 status
LOCK_TTL = REQUEST_TIMEOUT - 5
LOCK_ACQUIRE_TIMEOUT = LOCK_TTL - 5


class ResourceExportManager(ABC):
    QUEUE_NAME = settings.CVAT_QUEUES.EXPORT_DATA.value
    SUPPORTED_RESOURCES: ClassVar[set[RequestSubresource]]
    SUPPORTED_SUBRESOURCES: ClassVar[set[RequestSubresource]]

    def __init__(
        self,
        db_instance: Union[models.Project, models.Task, models.Job],
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

    ### Initialization logic ###

    @abstractmethod
    def initialize_export_args(self) -> None: ...

    @abstractmethod
    def validate_export_args(self) -> Response | None: ...

    @abstractmethod
    def build_rq_id(self) -> str: ...

    def handle_existing_rq_job(
        self, rq_job: Optional[RQJob], queue: DjangoRQ
    ) -> Optional[Response]:
        if not rq_job:
            return None

        rq_job_status = rq_job.get_status(refresh=False)

        if rq_job_status in {RQJobStatus.STARTED, RQJobStatus.QUEUED}:
            return Response(
                data="Export request is being processed",
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

    @abstractmethod
    def get_download_api_endpoint_view_name(self) -> str: ...

    def make_result_url(self, *, rq_id: str) -> str:
        view_name = self.get_download_api_endpoint_view_name()
        result_url = reverse(view_name, args=[self.db_instance.pk], request=self.request)

        return result_url + f"?rq_id={quote(rq_id)}"

    def get_updated_date_timestamp(self) -> str:
        # use only updated_date for the related resource, don't check children objects
        # because every child update should touch the updated_date of the parent resource
        return datetime.strftime(self.db_instance.updated_date, "%Y_%m_%d_%H_%M_%S")

    @abstractmethod
    def get_result_filename(self) -> str: ...

    @abstractmethod
    def send_events(self) -> None: ...

    @abstractmethod
    def setup_background_job(self, queue: DjangoRQ, rq_id: str) -> None: ...

    def export(self) -> Response:
        self.initialize_export_args()

        if invalid_response := self.validate_export_args():
            return invalid_response

        queue: DjangoRQ = django_rq.get_queue(self.QUEUE_NAME)
        rq_id = self.build_rq_id()

        # ensure that there is no race condition when processing parallel requests
        with get_rq_lock_for_job(queue, rq_id):
            rq_job = queue.fetch_job(rq_id)
            if response := self.handle_existing_rq_job(rq_job, queue):
                return response
            self.setup_background_job(queue, rq_id)

        self.send_events()

        serializer = RqIdSerializer({"rq_id": rq_id})
        return Response(serializer.data, status=status.HTTP_202_ACCEPTED)

    ### Logic related to prepared file downloading ###

    def validate_rq_id(self, rq_id: str) -> None:
        parsed_rq_id = RQId.parse(rq_id)

        if (
            parsed_rq_id.action != RequestAction.EXPORT
            or parsed_rq_id.target != RequestTarget(self.resource)
            or parsed_rq_id.identifier != self.db_instance.pk
            or parsed_rq_id.subresource not in self.SUPPORTED_SUBRESOURCES
        ):
            raise ValueError("The provided request id does not match exported target or resource")

    def download_file(self) -> Response:
        queue: DjangoRQ = django_rq.get_queue(self.QUEUE_NAME)
        rq_id = self.request.query_params.get("rq_id")

        if not rq_id:
            return HttpResponseBadRequest("Missing request id in the query parameters")

        try:
            self.validate_rq_id(rq_id)
        except ValueError:
            return HttpResponseBadRequest("Invalid export request id")

        # ensure that there is no race condition when processing parallel requests
        with get_rq_lock_for_job(queue, rq_id):
            rq_job = queue.fetch_job(rq_id)

            if not rq_job:
                return HttpResponseBadRequest("Unknown export request id")

            # define status once to avoid refreshing it on each check
            # FUTURE-TODO: get_status will raise InvalidJobOperation exception instead of returning None in one of the next releases
            rq_job_status = rq_job.get_status(refresh=False)

            if rq_job_status != RQJobStatus.FINISHED:
                return HttpResponseBadRequest("The export process is not finished")

            rq_job_meta = ExportRQMeta.for_job(rq_job)
            file_path = rq_job.return_value()

            if not file_path:
                return (
                    Response(
                        "A result for exporting job was not found for finished RQ job",
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )
                    if rq_job_meta.result_url  # user tries to download a final file locally while the export is made to cloud storage
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
                    attachment_filename=rq_job_meta.result_filename,
                )


def cancel_and_delete(rq_job: RQJob) -> None:
    # In the case the server is configured with ONE_RUNNING_JOB_IN_QUEUE_PER_USER
    # we have to enqueue dependent jobs after canceling one.
    rq_job.cancel(enqueue_dependents=settings.ONE_RUNNING_JOB_IN_QUEUE_PER_USER)
    rq_job.delete()


def export_resource_to_server_path(
    server_path: str,
    callback: callable,
    resource_id: int,
    format_name: str,
    **kwargs
) -> str:
    """
    Export resource to a specified server path.

    Args:
        server_path: Validated absolute path on the server where file will be saved
        callback: Export callback function (e.g., export_task_annotations)
        resource_id: ID of the resource to export
        format_name: Format name for export
        **kwargs: Additional arguments to pass to callback

    Returns:
        The server path where the file was saved
    """
    # Validate the server path first
    validated_path = validate_server_path(server_path)

    # Call the export callback which generates the file
    result_path = callback(resource_id, format_name, **kwargs)

    # Copy the generated file to the server path
    if result_path and osp.exists(result_path):
        # If validated_path is a directory, append the filename
        if osp.isdir(validated_path):
            filename = osp.basename(result_path)
            final_path = osp.join(validated_path, filename)
        else:
            final_path = validated_path

        # Copy the file to the destination
        shutil.copy2(result_path, final_path)
        slogger.glob.info(f"Exported file copied to server path: {final_path}")

        # Return the original cache path so RQ job result handling still works
        return result_path
    else:
        raise Exception(f"Export callback did not generate a file at {result_path}")


class DatasetExportManager(ResourceExportManager):
    SUPPORTED_RESOURCES = {RequestTarget.PROJECT, RequestTarget.TASK, RequestTarget.JOB}
    SUPPORTED_SUBRESOURCES = {RequestSubresource.DATASET, RequestSubresource.ANNOTATIONS}

    @dataclass
    class ExportArgs:
        format: str
        filename: str
        save_images: bool
        location_config: dict[str, Any]

        @property
        def location(self) -> Location:
            return self.location_config["location"]

    def initialize_export_args(self) -> None:
        save_images = is_dataset_export(self.request)
        self.export_callback = get_export_callback(self.db_instance, save_images=save_images)

        format_name = self.request.query_params.get("format", "")
        filename = self.request.query_params.get("filename", "")

        try:
            location_config = get_location_configuration(
                db_instance=self.db_instance,
                query_params=self.request.query_params,
                field_name=StorageType.TARGET,
            )
        except ValueError as ex:
            raise serializers.ValidationError(str(ex)) from ex

        location = location_config["location"]

        if location not in Location.list():
            raise serializers.ValidationError(
                f"Unexpected location {location} specified for the request"
            )

        self.export_args = self.ExportArgs(
            format=format_name,
            filename=filename,
            save_images=save_images,
            location_config=location_config,
        )

    def validate_export_args(self):
        format_desc = {f.DISPLAY_NAME: f for f in dm.views.get_export_formats()}.get(
            self.export_args.format
        )
        if format_desc is None:
            raise serializers.ValidationError("Unknown format specified for the request")
        elif not format_desc.ENABLED:
            return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)

    def build_rq_id(self):
        return RQId(
            RequestAction.EXPORT,
            RequestTarget(self.resource),
            self.db_instance.pk,
            subresource=(
                RequestSubresource.DATASET
                if self.export_args.save_images
                else RequestSubresource.ANNOTATIONS
            ),
            format=self.export_args.format,
            user_id=self.request.user.id,
        ).render()

    def send_events(self):
        handle_dataset_export(
            self.db_instance,
            format_name=self.export_args.format,
            cloud_storage_id=self.export_args.location_config.get("storage_id"),
            save_images=self.export_args.save_images,
        )

    def setup_background_job(
        self,
        queue: DjangoRQ,
        rq_id: str,
    ) -> None:
        try:
            if self.request.scheme:
                server_address = self.request.scheme + "://"
            server_address += self.request.get_host()
        except Exception:
            server_address = None

        cache_ttl = get_export_cache_ttl(self.db_instance)

        user_id = self.request.user.id

        func = self.export_callback
        func_args = (self.db_instance.id, self.export_args.format)
        result_url = None

        if self.export_args.location == Location.CLOUD_STORAGE:
            try:
                storage_id = self.export_args.location_config["storage_id"]
            except KeyError:
                raise serializers.ValidationError(
                    "Cloud storage location was selected as the destination,"
                    " but cloud storage id was not specified"
                )

            db_storage = get_cloud_storage_for_import_or_export(
                storage_id=storage_id,
                request=self.request,
                is_default=self.export_args.location_config["is_default"],
            )

            func = export_resource_to_cloud_storage
            func_args = (
                db_storage,
                self.export_callback,
            ) + func_args
        elif self.export_args.location == Location.SERVER_PATH:
            try:
                server_path = self.export_args.location_config["server_path"]
            except KeyError:
                raise serializers.ValidationError(
                    "Server path location was selected as the destination,"
                    " but server_path was not specified"
                )

            func = export_resource_to_server_path
            func_args = (
                server_path,
                self.export_callback,
            ) + func_args
            # Still provide result_url for potential local download
            result_url = self.make_result_url(rq_id=rq_id)
        else:
            db_storage = None
            result_url = self.make_result_url(rq_id=rq_id)

        with get_rq_lock_by_user(queue, user_id):
            result_filename = self.get_result_filename()
            meta = ExportRQMeta.build_for(
                request=self.request,
                db_obj=self.db_instance,
                result_url=result_url,
                result_filename=result_filename,
            )
            queue.enqueue_call(
                func=func,
                args=func_args,
                kwargs={
                    "server_url": server_address,
                },
                job_id=rq_id,
                meta=meta,
                depends_on=define_dependent_job(queue, user_id, rq_id=rq_id),
                result_ttl=cache_ttl.total_seconds(),
                failure_ttl=cache_ttl.total_seconds(),
            )

    def get_result_filename(self) -> str:
        filename = self.export_args.filename

        if not filename:
            instance_timestamp = self.get_updated_date_timestamp()
            filename = build_annotations_file_name(
                class_name=self.resource,
                identifier=self.db_instance.id,
                timestamp=instance_timestamp,
                format_name=self.export_args.format,
                is_annotation_file=not self.export_args.save_images,
                extension=(EXPORT_FORMATS[self.export_args.format].EXT).lower(),
            )

        return filename

    def get_download_api_endpoint_view_name(self) -> str:
        return f"{self.resource}-download-dataset"


class BackupExportManager(ResourceExportManager):
    SUPPORTED_RESOURCES = {RequestTarget.PROJECT, RequestTarget.TASK}
    SUPPORTED_SUBRESOURCES = {RequestSubresource.BACKUP}

    @dataclass
    class ExportArgs:
        filename: str
        location_config: dict[str, Any]

        @property
        def location(self) -> Location:
            return self.location_config["location"]

    def initialize_export_args(self) -> None:
        self.export_callback = create_backup
        filename = self.request.query_params.get("filename", "")

        location_config = get_location_configuration(
            db_instance=self.db_instance,
            query_params=self.request.query_params,
            field_name=StorageType.TARGET,
        )
        self.export_args = self.ExportArgs(filename, location_config)

    def validate_export_args(self):
        return

    def get_result_filename(self) -> str:
        filename = self.export_args.filename

        if not filename:
            instance_timestamp = self.get_updated_date_timestamp()

            filename = build_backup_file_name(
                class_name=self.resource,
                identifier=self.db_instance.name,
                timestamp=instance_timestamp,
            )

        return filename

    def build_rq_id(self):
        return RQId(
            RequestAction.EXPORT,
            RequestTarget(self.resource),
            self.db_instance.pk,
            subresource=RequestSubresource.BACKUP,
            user_id=self.request.user.id,
        ).render()

    # FUTURE-TODO: move into ResourceExportManager
    def setup_background_job(
        self,
        queue: DjangoRQ,
        rq_id: str,
    ) -> None:
        cache_ttl = get_export_cache_ttl(self.db_instance)
        user_id = self.request.user.id

        if isinstance(self.db_instance, Task):
            logger = slogger.task[self.db_instance.pk]
            Exporter = TaskExporter
        else:
            logger = slogger.project[self.db_instance.pk]
            Exporter = ProjectExporter

        func = self.export_callback
        func_args = (
            self.db_instance.id,
            Exporter,
            logger,
            cache_ttl,
        )
        result_url = None

        if self.export_args.location == Location.CLOUD_STORAGE:
            try:
                storage_id = self.export_args.location_config["storage_id"]
            except KeyError:
                raise serializers.ValidationError(
                    "Cloud storage location was selected as the destination,"
                    " but cloud storage id was not specified"
                )

            db_storage = get_cloud_storage_for_import_or_export(
                storage_id=storage_id,
                request=self.request,
                is_default=self.export_args.location_config["is_default"],
            )

            func = export_resource_to_cloud_storage
            func_args = (
                db_storage,
                self.export_callback,
            ) + func_args
        elif self.export_args.location == Location.SERVER_PATH:
            try:
                server_path = self.export_args.location_config["server_path"]
            except KeyError:
                raise serializers.ValidationError(
                    "Server path location was selected as the destination,"
                    " but server_path was not specified"
                )

            func = export_resource_to_server_path
            func_args = (
                server_path,
                self.export_callback,
            ) + func_args
            # Still provide result_url for potential local download
            result_url = self.make_result_url(rq_id=rq_id)
        else:
            result_url = self.make_result_url(rq_id=rq_id)

        with get_rq_lock_by_user(queue, user_id):
            result_filename = self.get_result_filename()
            meta = ExportRQMeta.build_for(
                request=self.request,
                db_obj=self.db_instance,
                result_url=result_url,
                result_filename=result_filename,
            )

            queue.enqueue_call(
                func=func,
                args=func_args,
                job_id=rq_id,
                meta=meta,
                depends_on=define_dependent_job(queue, user_id, rq_id=rq_id),
                result_ttl=cache_ttl.total_seconds(),
                failure_ttl=cache_ttl.total_seconds(),
            )

    def get_download_api_endpoint_view_name(self) -> str:
        return f"{self.resource}-download-backup"

    def send_events(self):
        # FUTURE-TODO: send events to event store
        pass
