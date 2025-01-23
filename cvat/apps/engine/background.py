# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os
import os.path as osp
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Callable, Optional, Union

import django_rq
from attrs.converters import to_bool
from django.conf import settings
from django.http.response import HttpResponseBadRequest
from django.utils import timezone
from django_rq.queues import DjangoRQ, DjangoScheduler
from rest_framework import serializers, status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.reverse import reverse
from rq.job import Job as RQJob
from rq.job import JobStatus as RQJobStatus

import cvat.apps.dataset_manager as dm
from cvat.apps.dataset_manager.util import extend_export_file_lifetime
from cvat.apps.engine import models
from cvat.apps.engine.backup import ProjectExporter, TaskExporter, create_backup
from cvat.apps.engine.cloud_provider import export_resource_to_cloud_storage
from cvat.apps.engine.location import StorageType, get_location_configuration
from cvat.apps.engine.log import ServerLogManager
from cvat.apps.engine.models import (
    Location,
    Project,
    RequestAction,
    RequestSubresource,
    RequestTarget,
    Task,
)
from cvat.apps.engine.permissions import get_cloud_storage_for_import_or_export
from cvat.apps.engine.rq_job_handler import RQId, RQJobMetaField
from cvat.apps.engine.serializers import RqIdSerializer
from cvat.apps.engine.utils import (
    build_annotations_file_name,
    build_backup_file_name,
    define_dependent_job,
    get_rq_job_meta,
    get_rq_lock_by_user,
    get_rq_lock_for_job,
    sendfile,
)
from cvat.apps.events.handlers import handle_dataset_export

slogger = ServerLogManager(__name__)

REQUEST_TIMEOUT = 60
# it's better to return LockNotAvailableError instead of response with 504 status
LOCK_TTL = REQUEST_TIMEOUT - 5
LOCK_ACQUIRE_TIMEOUT = LOCK_TTL - 5


class _ResourceExportManager(ABC):
    QUEUE_NAME = settings.CVAT_QUEUES.EXPORT_DATA.value

    def __init__(
        self,
        version: int,
        db_instance: Union[models.Project, models.Task, models.Job],
        *,
        export_callback: Callable,
    ) -> None:
        """
        Args:
            version (int): API endpoint version to use. Possible options: 1 or 2
            db_instance (Union[models.Project, models.Task, models.Job]): Model instance
            export_callback (Callable): Main function that will be executed in the background
        """
        self.version = version
        self.db_instance = db_instance
        self.resource = db_instance.__class__.__name__.lower()
        if self.resource not in self.SUPPORTED_RESOURCES:
            raise ValueError("Unexpected type of db_instance: {}".format(type(db_instance)))

        self.export_callback = export_callback

    @abstractmethod
    def export(self) -> Response:
        pass

    @abstractmethod
    def setup_background_job(self, queue: DjangoRQ, rq_id: str) -> None:
        pass

    @abstractmethod
    def _handle_rq_job_v1(self, rq_job: Optional[RQJob], queue: DjangoRQ) -> Optional[Response]:
        pass

    def _handle_rq_job_v2(self, rq_job: Optional[RQJob], queue: DjangoRQ) -> Optional[Response]:
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

    def handle_rq_job(self, rq_job: RQJob | None, queue: DjangoRQ) -> Optional[Response]:
        if self.version == 1:
            return self._handle_rq_job_v1(rq_job, queue)
        elif self.version == 2:
            return self._handle_rq_job_v2(rq_job, queue)

        raise ValueError("Unsupported version")

    @abstractmethod
    def get_v1_endpoint_view_name(self) -> str:
        pass

    def make_result_url(self) -> str:
        view_name = self.get_v1_endpoint_view_name()
        result_url = reverse(view_name, args=[self.db_instance.pk], request=self.request)
        query_dict = self.request.query_params.copy()
        query_dict["action"] = "download"
        result_url += "?" + query_dict.urlencode()

        return result_url

    def get_instance_update_time(self) -> datetime:
        instance_update_time = timezone.localtime(self.db_instance.updated_date)
        if isinstance(self.db_instance, Project):
            tasks_update = list(
                map(
                    lambda db_task: timezone.localtime(db_task.updated_date),
                    self.db_instance.tasks.all(),
                )
            )
            instance_update_time = max(tasks_update + [instance_update_time])
        return instance_update_time

    def get_timestamp(self, time_: datetime) -> str:
        return datetime.strftime(time_, "%Y_%m_%d_%H_%M_%S")


def cancel_and_delete(rq_job: RQJob) -> None:
    # In the case the server is configured with ONE_RUNNING_JOB_IN_QUEUE_PER_USER
    # we have to enqueue dependent jobs after canceling one.
    rq_job.cancel(enqueue_dependents=settings.ONE_RUNNING_JOB_IN_QUEUE_PER_USER)
    rq_job.delete()


class DatasetExportManager(_ResourceExportManager):
    SUPPORTED_RESOURCES = {"project", "task", "job"}

    @dataclass
    class ExportArgs:
        format: str
        filename: str
        save_images: bool
        location_config: dict[str, Any]

        @property
        def location(self) -> Location:
            return self.location_config["location"]

    def __init__(
        self,
        db_instance: Union[models.Project, models.Task, models.Job],
        request: Request,
        export_callback: Callable,
        save_images: Optional[bool] = None,
        *,
        version: int = 2,
    ) -> None:
        super().__init__(version, db_instance, export_callback=export_callback)
        self.request = request

        format_name = request.query_params.get("format", "")
        filename = request.query_params.get("filename", "")

        # can be passed directly when it is initialized based on API request, not query param
        save_images = (
            save_images
            if save_images is not None
            else to_bool(request.query_params.get("save_images", False))
        )

        try:
            location_config = get_location_configuration(
                db_instance=db_instance,
                query_params=request.query_params,
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

    def _handle_rq_job_v1(
        self,
        rq_job: Optional[RQJob],
        queue: DjangoRQ,
    ) -> Optional[Response]:

        def is_result_outdated() -> bool:
            return rq_job.meta[RQJobMetaField.REQUEST]["timestamp"] < instance_update_time

        def handle_local_download() -> Response:
            with dm.util.get_export_cache_lock(
                file_path, ttl=LOCK_TTL, acquire_timeout=LOCK_ACQUIRE_TIMEOUT
            ):
                if not osp.exists(file_path):
                    return Response(
                        "The exported file has expired, please retry exporting",
                        status=status.HTTP_404_NOT_FOUND,
                    )

                filename = self.export_args.filename or build_annotations_file_name(
                    class_name=self.resource,
                    identifier=(
                        self.db_instance.name
                        if isinstance(self.db_instance, (Task, Project))
                        else self.db_instance.id
                    ),
                    timestamp=instance_timestamp,
                    format_name=self.export_args.format,
                    is_annotation_file=not self.export_args.save_images,
                    extension=osp.splitext(file_path)[1],
                )

                rq_job.delete()
                return sendfile(
                    self.request,
                    file_path,
                    attachment=True,
                    attachment_filename=filename,
                )

        action = self.request.query_params.get("action")

        if action not in {None, "download"}:
            raise serializers.ValidationError(
                f"Unexpected action {action!r} specified for the request"
            )

        msg_no_such_job_when_downloading = (
            "Unknown export request id. "
            "Please request export first by sending a request without the action=download parameter."
        )
        if not rq_job:
            return (
                None
                if action != "download"
                else HttpResponseBadRequest(msg_no_such_job_when_downloading)
            )

        # define status once to avoid refreshing it on each check
        # FUTURE-TODO: get_status will raise InvalidJobOperation exception instead of returning None in one of the next releases
        rq_job_status = rq_job.get_status(refresh=False)

        # handle cases where the status is None for some reason
        if not rq_job_status:
            rq_job.delete()
            return (
                None
                if action != "download"
                else HttpResponseBadRequest(msg_no_such_job_when_downloading)
            )

        if action == "download":
            if self.export_args.location != Location.LOCAL:
                return HttpResponseBadRequest(
                    'Action "download" is only supported for a local dataset location'
                )
            if rq_job_status not in {
                RQJobStatus.FINISHED,
                RQJobStatus.FAILED,
                RQJobStatus.CANCELED,
                RQJobStatus.STOPPED,
            }:
                return HttpResponseBadRequest("Dataset export has not been finished yet")

        instance_update_time = self.get_instance_update_time()
        instance_timestamp = self.get_timestamp(instance_update_time)

        if rq_job_status == RQJobStatus.FINISHED:
            if self.export_args.location == Location.CLOUD_STORAGE:
                rq_job.delete()
                return Response(status=status.HTTP_200_OK)
            elif self.export_args.location == Location.LOCAL:
                file_path = rq_job.return_value()

                if not file_path:
                    return Response(
                        "A result for exporting job was not found for finished RQ job",
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )

                if action == "download":
                    return handle_local_download()
                else:
                    with dm.util.get_export_cache_lock(
                        file_path,
                        ttl=LOCK_TTL,
                        acquire_timeout=LOCK_ACQUIRE_TIMEOUT,
                    ):
                        if osp.exists(file_path) and not is_result_outdated():
                            extend_export_file_lifetime(file_path)

                            return Response(status=status.HTTP_201_CREATED)

                        cancel_and_delete(rq_job)
                        return None
            else:
                raise NotImplementedError(
                    f"Export to {self.export_args.location} location is not implemented yet"
                )
        elif rq_job_status == RQJobStatus.FAILED:
            exc_info = rq_job.meta.get(RQJobMetaField.FORMATTED_EXCEPTION, str(rq_job.exc_info))
            rq_job.delete()
            return Response(exc_info, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        elif (
            rq_job_status == RQJobStatus.DEFERRED
            and rq_job.id not in queue.deferred_job_registry.get_job_ids()
        ):
            # Sometimes jobs can depend on outdated jobs in the deferred jobs registry.
            # They can be fetched by their specific ids, but are not listed by get_job_ids().
            # Supposedly, this can happen because of the server restarts
            # (potentially, because the redis used for the queue is in memory).
            # Another potential reason is canceling without enqueueing dependents.
            # Such dependencies are never removed or finished,
            # as there is no TTL for deferred jobs,
            # so the current job can be blocked indefinitely.
            cancel_and_delete(rq_job)
            return None

        elif rq_job_status in {RQJobStatus.CANCELED, RQJobStatus.STOPPED}:
            rq_job.delete()
            return (
                None
                if action != "download"
                else Response(
                    "Export was cancelled, please request it one more time",
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
            )

        if is_result_outdated():
            cancel_and_delete(rq_job)
            return None

        return Response(RqIdSerializer({"rq_id": rq_job.id}).data, status=status.HTTP_202_ACCEPTED)

    def export(self) -> Response:
        format_desc = {f.DISPLAY_NAME: f for f in dm.views.get_export_formats()}.get(
            self.export_args.format
        )
        if format_desc is None:
            raise serializers.ValidationError("Unknown format specified for the request")
        elif not format_desc.ENABLED:
            return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)

        queue: DjangoRQ = django_rq.get_queue(self.QUEUE_NAME)
        rq_id = RQId(
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

        # ensure that there is no race condition when processing parallel requests
        with get_rq_lock_for_job(queue, rq_id):
            rq_job = queue.fetch_job(rq_id)
            if response := self.handle_rq_job(rq_job, queue):
                return response
            self.setup_background_job(queue, rq_id)

        handle_dataset_export(
            self.db_instance,
            format_name=self.export_args.format,
            cloud_storage_id=self.export_args.location_config.get("storage_id"),
            save_images=self.export_args.save_images,
        )

        serializer = RqIdSerializer(data={"rq_id": rq_id})
        serializer.is_valid(raise_exception=True)

        return Response(serializer.data, status=status.HTTP_202_ACCEPTED)

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

        cache_ttl = dm.views.get_export_cache_ttl(self.db_instance)

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
            instance_update_time = self.get_instance_update_time()
            instance_timestamp = self.get_timestamp(instance_update_time)
            filename_pattern = build_annotations_file_name(
                class_name=self.db_instance.__class__.__name__,
                identifier=(
                    self.db_instance.name
                    if isinstance(self.db_instance, (models.Task, models.Project))
                    else self.db_instance.id
                ),
                timestamp=instance_timestamp,
                format_name=self.export_args.format,
                is_annotation_file=not self.export_args.save_images,
            )
            func = export_resource_to_cloud_storage
            func_args = (
                db_storage,
                self.export_args.filename,
                filename_pattern,
                self.export_callback,
            ) + func_args
        else:
            db_storage = None
            result_url = self.make_result_url()

        with get_rq_lock_by_user(queue, user_id):
            queue.enqueue_call(
                func=func,
                args=func_args,
                kwargs={
                    "server_url": server_address,
                },
                job_id=rq_id,
                meta=get_rq_job_meta(
                    request=self.request, db_obj=self.db_instance, result_url=result_url
                ),
                depends_on=define_dependent_job(queue, user_id, rq_id=rq_id),
                result_ttl=cache_ttl.total_seconds(),
                failure_ttl=cache_ttl.total_seconds(),
            )

    def get_v1_endpoint_view_name(self) -> str:
        """
        Get view name of the endpoint for the first API version

        Possible view names:
            - project-dataset
            - task|job-dataset-export
            - project|task|job-annotations
        """
        if self.export_args.save_images:
            template = "{}-dataset" + ("-export" if self.resource != "project" else "")
        else:
            template = "{}-annotations"

        return template.format(self.resource)


class BackupExportManager(_ResourceExportManager):
    SUPPORTED_RESOURCES = {"project", "task"}

    @dataclass
    class ExportArgs:
        filename: str
        location_config: dict[str, Any]

        @property
        def location(self) -> Location:
            return self.location_config["location"]

    def __init__(
        self,
        db_instance: Union[models.Project, models.Task],
        request: Request,
        *,
        version: int = 2,
    ) -> None:
        super().__init__(version, db_instance, export_callback=create_backup)
        self.request = request

        filename = request.query_params.get("filename", "")

        location_config = get_location_configuration(
            db_instance=self.db_instance,
            query_params=self.request.query_params,
            field_name=StorageType.TARGET,
        )
        self.export_args = self.ExportArgs(filename, location_config)

    def _handle_rq_job_v1(
        self,
        rq_job: Optional[RQJob],
        queue: DjangoRQ,
    ) -> Optional[Response]:

        def is_result_outdated() -> bool:
            return rq_job.meta[RQJobMetaField.REQUEST]["timestamp"] < last_instance_update_time

        last_instance_update_time = timezone.localtime(self.db_instance.updated_date)
        timestamp = self.get_timestamp(last_instance_update_time)

        action = self.request.query_params.get("action")
        if action not in (None, "download"):
            raise serializers.ValidationError(
                f"Unexpected action {action!r} specified for the request"
            )

        msg_no_such_job_when_downloading = (
            "Unknown export request id. "
            "Please request export first by sending a request without the action=download parameter."
        )
        if not rq_job:
            return (
                None
                if action != "download"
                else HttpResponseBadRequest(msg_no_such_job_when_downloading)
            )

        # define status once to avoid refreshing it on each check
        # FUTURE-TODO: get_status will raise InvalidJobOperation exception instead of None in one of the next releases
        rq_job_status = rq_job.get_status(refresh=False)

        # handle cases where the status is None for some reason
        if not rq_job_status:
            rq_job.delete()
            return (
                None
                if action != "download"
                else HttpResponseBadRequest(msg_no_such_job_when_downloading)
            )

        if action == "download":
            if self.export_args.location != Location.LOCAL:
                return HttpResponseBadRequest(
                    'Action "download" is only supported for a local backup location'
                )
            if rq_job_status not in {
                RQJobStatus.FINISHED,
                RQJobStatus.FAILED,
                RQJobStatus.CANCELED,
                RQJobStatus.STOPPED,
            }:
                return HttpResponseBadRequest("Backup export has not been finished yet")

        if rq_job_status == RQJobStatus.FINISHED:
            if self.export_args.location == Location.CLOUD_STORAGE:
                rq_job.delete()
                return Response(status=status.HTTP_200_OK)
            elif self.export_args.location == Location.LOCAL:
                file_path = rq_job.return_value()

                if not file_path:
                    return Response(
                        "Export is completed, but has no results",
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )

                if action == "download":
                    with dm.util.get_export_cache_lock(
                        file_path, ttl=LOCK_TTL, acquire_timeout=LOCK_ACQUIRE_TIMEOUT
                    ):
                        if not os.path.exists(file_path):
                            return Response(
                                "The backup file has been expired, please retry backing up",
                                status=status.HTTP_404_NOT_FOUND,
                            )

                        filename = self.export_args.filename or build_backup_file_name(
                            class_name=self.resource,
                            identifier=self.db_instance.name,
                            timestamp=timestamp,
                            extension=os.path.splitext(file_path)[1],
                        )

                        rq_job.delete()
                        return sendfile(
                            self.request, file_path, attachment=True, attachment_filename=filename
                        )
                with dm.util.get_export_cache_lock(
                    file_path, ttl=LOCK_TTL, acquire_timeout=LOCK_ACQUIRE_TIMEOUT
                ):
                    if osp.exists(file_path) and not is_result_outdated():
                        extend_export_file_lifetime(file_path)
                        return Response(status=status.HTTP_201_CREATED)

                cancel_and_delete(rq_job)
                return None
            else:
                raise NotImplementedError(
                    f"Export to {self.export_args.location} location is not implemented yet"
                )
        elif rq_job_status == RQJobStatus.FAILED:
            exc_info = rq_job.meta.get(RQJobMetaField.FORMATTED_EXCEPTION, str(rq_job.exc_info))
            rq_job.delete()
            return Response(exc_info, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        elif (
            rq_job_status == RQJobStatus.DEFERRED
            and rq_job.id not in queue.deferred_job_registry.get_job_ids()
        ):
            # Sometimes jobs can depend on outdated jobs in the deferred jobs registry.
            # They can be fetched by their specific ids, but are not listed by get_job_ids().
            # Supposedly, this can happen because of the server restarts
            # (potentially, because the redis used for the queue is in memory).
            # Another potential reason is canceling without enqueueing dependents.
            # Such dependencies are never removed or finished,
            # as there is no TTL for deferred jobs,
            # so the current job can be blocked indefinitely.
            cancel_and_delete(rq_job)
            return None

        elif rq_job_status in {RQJobStatus.CANCELED, RQJobStatus.STOPPED}:
            rq_job.delete()
            return (
                None
                if action != "download"
                else Response(
                    "Export was cancelled, please request it one more time",
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
            )

        return Response(RqIdSerializer({"rq_id": rq_job.id}).data, status=status.HTTP_202_ACCEPTED)

    def export(self) -> Response:
        queue: DjangoRQ = django_rq.get_queue(self.QUEUE_NAME)
        rq_id = RQId(
            RequestAction.EXPORT,
            RequestTarget(self.resource),
            self.db_instance.pk,
            subresource=RequestSubresource.BACKUP,
            user_id=self.request.user.id,
        ).render()

        # ensure that there is no race condition when processing parallel requests
        with get_rq_lock_for_job(queue, rq_id):
            rq_job = queue.fetch_job(rq_id)
            if response := self.handle_rq_job(rq_job, queue):
                return response
            self.setup_background_job(queue, rq_id)

        serializer = RqIdSerializer(data={"rq_id": rq_id})
        serializer.is_valid(raise_exception=True)

        return Response(serializer.data, status=status.HTTP_202_ACCEPTED)

    def setup_background_job(
        self,
        queue: DjangoRQ,
        rq_id: str,
    ) -> None:
        if isinstance(self.db_instance, Task):
            logger = slogger.task[self.db_instance.pk]
            Exporter = TaskExporter
            cache_ttl = dm.views.TASK_CACHE_TTL
        else:
            logger = slogger.project[self.db_instance.pk]
            Exporter = ProjectExporter
            cache_ttl = dm.views.PROJECT_CACHE_TTL

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

            last_instance_update_time = timezone.localtime(self.db_instance.updated_date)
            timestamp = self.get_timestamp(last_instance_update_time)

            filename_pattern = build_backup_file_name(
                class_name=self.resource,
                identifier=self.db_instance.name,
                timestamp=timestamp,
            )
            func = export_resource_to_cloud_storage
            func_args = (
                db_storage,
                self.export_args.filename,
                filename_pattern,
                self.export_callback,
            ) + func_args
        else:
            result_url = self.make_result_url()

        user_id = self.request.user.id

        with get_rq_lock_by_user(queue, user_id):
            queue.enqueue_call(
                func=func,
                args=func_args,
                job_id=rq_id,
                meta=get_rq_job_meta(
                    request=self.request, db_obj=self.db_instance, result_url=result_url
                ),
                depends_on=define_dependent_job(queue, user_id, rq_id=rq_id),
                result_ttl=cache_ttl.total_seconds(),
                failure_ttl=cache_ttl.total_seconds(),
            )

    def get_v1_endpoint_view_name(self) -> str:
        """Get view name of the endpoint for the first API version"""

        return f"{self.resource}-export-backup"
