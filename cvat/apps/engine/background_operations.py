# Copyright (C) 2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os
import os.path as osp
from datetime import datetime
from typing import Callable, Optional, Union

import django_rq
from attrs.converters import to_bool
from django.conf import settings
from django.http import HttpRequest
from django.http.request import HttpRequest
from django.utils import timezone
from django_rq.queues import DjangoRQ
from rest_framework import serializers, status
from rest_framework.response import Response
from rq.job import Job as RQJob
from rq.job import JobStatus as RQJobStatus

import cvat.apps.dataset_manager as dm
from cvat.apps.dataset_manager.views import PROJECT_CACHE_TTL, TASK_CACHE_TTL
from cvat.apps.engine import models
from cvat.apps.engine.backup import ProjectExporter, TaskExporter, _create_backup
from cvat.apps.engine.cloud_provider import export_resource_to_cloud_storage
from cvat.apps.engine.location import StorageType, get_location_configuration
from cvat.apps.engine.log import ServerLogManager
from cvat.apps.engine.models import Job, Location, Project, Task
from cvat.apps.engine.rq_job_handler import RQIdManager, RQJobMetaField
from cvat.apps.engine.serializers import RqIdSerializer
from cvat.apps.engine.utils import (
    build_annotations_file_name,
    build_backup_file_name,
    define_dependent_job,
    get_rq_job_meta,
    get_rq_lock_by_user,
    sendfile,
)
from cvat.apps.engine.permissions import get_cloud_storage_for_import_or_export
from cvat.apps.events.handlers import handle_dataset_export

slogger = ServerLogManager(__name__)
from rest_framework.reverse import reverse


class DatasetExportManager:
    QUEUE_NAME = settings.CVAT_QUEUES.EXPORT_DATA.value

    def __init__(
        self,
        db_instance: Union[models.Project, models.Task, models.Job],
        request: HttpRequest,
        callback: Callable,
        save_images: Optional[bool] = None,
        *,
        version: int = 2,
    ) -> None:
        self.version = version
        self.request = request
        self.db_instance = db_instance
        self.obj_type = db_instance.__class__.__name__.lower()
        if self.obj_type not in {"project", "task", "job"}:
            raise ValueError(
                "Unexpected type of db_instance: {}".format(type(db_instance))
            )

        self.format_name = request.query_params.get("format", "")
        self.filename = request.query_params.get("filename", "")
        self.callback = callback
        self.save_images = (
            save_images
            if save_images is not None
            else to_bool(request.query_params.get("save_images", False))
        )

        # cache_ttl = dm.views.get_export_cache_ttl(db_instance)
        self.instance_update_time = timezone.localtime(db_instance.updated_date)
        if isinstance(db_instance, Project):
            tasks_update = list(
                map(
                    lambda db_task: timezone.localtime(db_task.updated_date),
                    db_instance.tasks.all(),
                )
            )
            self.instance_update_time = max(tasks_update + [self.instance_update_time])

        self.instance_timestamp = datetime.strftime(
            self.instance_update_time, "%Y_%m_%d_%H_%M_%S"
        )

        # initialize parameters related to background process
        self.queue = django_rq.get_queue(self.QUEUE_NAME)
        self.rq_id = RQIdManager.build(
            "export",
            self.obj_type,
            self.db_instance.pk,
            subresource="dataset" if self.save_images else "annotations",
            anno_format=self.format_name,
            user_id=request.user.id,
        )

        # initialize location
        try:
            self.location_conf = get_location_configuration(
                db_instance=db_instance,
                query_params=request.query_params,
                field_name=StorageType.TARGET,
            )
        except ValueError as ex:
            raise serializers.ValidationError(str(ex)) from ex

        self.location = self.location_conf["location"]

        if self.location not in Location.list():
            raise serializers.ValidationError(
                f"Unexpected location {self.location} specified for the request"
            )

    def _handle_rq_job_v1(
        self,
        rq_job: RQJob,
    ) -> Response:
        action = self.request.query_params.get("action")
        if action not in {"", "download"}:
            raise serializers.ValidationError(
                "Unexpected action specified for the request"
            )

        rq_request = rq_job.meta.get("request", None)
        request_time = rq_request.get("timestamp", None) if rq_request else None
        if request_time is None or request_time < self.instance_update_time:
            # The result is outdated, need to restart the export.
            # Cancel the current job.
            # The new attempt will be made after the last existing job.
            # In the case the server is configured with ONE_RUNNING_JOB_IN_QUEUE_PER_USER
            # we have to enqueue dependent jobs after canceling one.
            rq_job.cancel(enqueue_dependents=settings.ONE_RUNNING_JOB_IN_QUEUE_PER_USER)
            rq_job.delete()
        else:
            if rq_job.is_finished:
                if self.location == Location.CLOUD_STORAGE:
                    rq_job.delete()
                    return Response(status=status.HTTP_200_OK)

                elif self.location == Location.LOCAL:
                    file_path = rq_job.return_value()

                    if not file_path:
                        return Response(
                            "A result for exporting job was not found for finished RQ job",
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        )

                    with dm.util.get_export_cache_lock(
                        file_path,
                        ttl=60,  # request timeout
                    ):
                        if action == "download":
                            if not osp.exists(file_path):
                                return Response(
                                    "The exported file has expired, please retry exporting",
                                    status=status.HTTP_404_NOT_FOUND,
                                )

                            filename = self.filename or build_annotations_file_name(
                                class_name=self.db_instance.__class__.__name__,
                                identifier=(
                                    self.db_instance.name
                                    if isinstance(self.db_instance, (Task, Project))
                                    else self.db_instance.id
                                ),
                                timestamp=self.instance_timestamp,
                                format_name=self.format_name,
                                is_annotation_file=not self.save_images,
                                extension=osp.splitext(file_path)[1],
                            )

                            rq_job.delete()
                            return sendfile(
                                self.request,
                                file_path,
                                attachment=True,
                                attachment_filename=filename,
                            )
                        else:
                            if osp.exists(file_path):
                                # Update last update time to prolong the export lifetime
                                # as the last access time is not available on every filesystem
                                os.utime(file_path, None)

                                return Response(status=status.HTTP_201_CREATED)
                            else:
                                # Cancel and reenqueue the job.
                                # The new attempt will be made after the last existing job.
                                # In the case the server is configured with ONE_RUNNING_JOB_IN_QUEUE_PER_USER
                                # we have to enqueue dependent jobs after canceling one.
                                rq_job.cancel(
                                    enqueue_dependents=settings.ONE_RUNNING_JOB_IN_QUEUE_PER_USER
                                )
                                rq_job.delete()
                else:
                    raise NotImplementedError(
                        f"Export to {self.location} location is not implemented yet"
                    )
            elif rq_job.is_failed:
                exc_info = rq_job.meta.get("formatted_exception", str(rq_job.exc_info))
                rq_job.delete()
                return Response(exc_info, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            elif (
                rq_job.is_deferred
                and self.rq_id not in self.queue.deferred_job_registry.get_job_ids()
            ):
                # Sometimes jobs can depend on outdated jobs in the deferred jobs registry.
                # They can be fetched by their specific ids, but are not listed by get_job_ids().
                # Supposedly, this can happen because of the server restarts
                # (potentially, because the redis used for the queue is inmemory).
                # Another potential reason is canceling without enqueueing dependents.
                # Such dependencies are never removed or finished,
                # as there is no TTL for deferred jobs,
                # so the current job can be blocked indefinitely.

                # Cancel the current job and then reenqueue it, considering the current situation.
                # The new attempt will be made after the last existing job.
                # In the case the server is configured with ONE_RUNNING_JOB_IN_QUEUE_PER_USER
                # we have to enqueue dependent jobs after canceling one.
                rq_job.cancel(
                    enqueue_dependents=settings.ONE_RUNNING_JOB_IN_QUEUE_PER_USER
                )
                rq_job.delete()
            else:
                return Response(status=status.HTTP_202_ACCEPTED)

    def _handle_rq_job_v2(self, rq_job: RQJob) -> Optional[Response]:
        if rq_job.get_status(refresh=False) not in {
            RQJobStatus.STARTED,
            RQJobStatus.DEFERRED,
        }:
            rq_job.delete()
            rq_job = None
        else:
            return Response(
                data="Export process is already in progress/queued",
                status=status.HTTP_409_CONFLICT,
            )

    def handle_rq_job(self, *args, **kwargs) -> Optional[Response]:
        if self.version == 1:
            return self._handle_rq_job_v1(*args, **kwargs)
        elif self.version == 2:
            return self._handle_rq_job_v2(*args, **kwargs)
        else:
            raise ValueError("Unsupported version")

    def export(self):
        format_desc = {f.DISPLAY_NAME: f for f in dm.views.get_export_formats()}.get(
            self.format_name
        )
        if format_desc is None:
            raise serializers.ValidationError(
                "Unknown format specified for the request"
            )
        elif not format_desc.ENABLED:
            return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)

        # queue = django_rq.get_queue(settings.CVAT_QUEUES.EXPORT_DATA.value)
        rq_job = self.queue.fetch_job(self.rq_id)

        if rq_job:
            response = self.handle_rq_job(rq_job)
            if response:
                return response

        self.setup_background_job(self.queue, self.rq_id)

        handle_dataset_export(
            self.db_instance,
            format_name=self.format_name,
            cloud_storage_id=self.location_conf.get("storage_id"),
            save_images=self.save_images,
        )

        return Response(status=status.HTTP_202_ACCEPTED, data={"rq_id": self.rq_id})

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

        TTL_CONSTS = {
            "project": dm.views.PROJECT_CACHE_TTL,
            "task": dm.views.TASK_CACHE_TTL,
            "job": dm.views.JOB_CACHE_TTL,
        }
        ttl = TTL_CONSTS[self.db_instance.__class__.__name__.lower()].total_seconds()
        user_id = self.request.user.id

        func = (
            self.callback
            if self.location == Location.LOCAL
            else export_resource_to_cloud_storage
        )
        func_args = (self.db_instance.id, self.format_name, server_address)
        result_url = None

        if self.location == Location.CLOUD_STORAGE:
            try:
                storage_id = self.location_conf["storage_id"]
            except KeyError:
                raise serializers.ValidationError(
                    "Cloud storage location was selected as the destination,"
                    " but cloud storage id was not specified"
                )

            db_storage = get_cloud_storage_for_import_or_export(
                storage_id=storage_id,
                request=self.request,
                is_default=self.location_conf["is_default"],
            )
            filename_pattern = build_annotations_file_name(
                class_name=self.db_instance.__class__.__name__,
                identifier=(
                    self.db_instance.name
                    if isinstance(self.db_instance, (models.Task, models.Project))
                    else self.db_instance.id
                ),
                timestamp=self.instance_timestamp,
                format_name=self.format_name,
                is_annotation_file=not self.save_images,
            )
            func_args = (
                db_storage,
                self.filename,
                filename_pattern,
                self.callback,
            ) + func_args
        else:
            db_storage = None
            result_url = self.make_result_url()

        with get_rq_lock_by_user(queue, user_id):
            queue.enqueue_call(
                func=func,
                args=func_args,
                job_id=rq_id,
                meta=get_rq_job_meta(
                    request=self.request, db_obj=self.db_instance, result_url=result_url
                ),
                depends_on=define_dependent_job(queue, user_id, rq_id=rq_id),
                result_ttl=ttl,
                failure_ttl=ttl,
            )

    def make_result_url(self) -> str:
        v1_endpoint = (
            (
                f"{self.obj_type}-dataset"
                + ("-export" if self.obj_type != "project" else "")
            )
            if self.save_images
            else f"{self.obj_type}-annotations"
        )
        result_url = reverse(
            v1_endpoint, args=[self.db_instance.pk], request=self.request
        )
        query_dict = self.request.query_params.copy()
        query_dict["action"] = "download"
        result_url += "?" + query_dict.urlencode()

        return result_url


class BackupExportManager:
    QUEUE_NAME = settings.CVAT_QUEUES.EXPORT_DATA.value

    def __init__(
        self,
        db_instance: Union[models.Project, models.Task, models.Job],
        request: HttpRequest,
        *,
        version: int = 2,
    ) -> None:
        self.version = version
        self.request = request
        self.db_instance = db_instance
        self.obj_type = db_instance.__class__.__name__.lower()
        if self.obj_type not in {"project", "task"}:
            raise ValueError(
                "Unexpected type of db_instance: {}".format(type(db_instance))
            )

    def _handle_rq_job_v1(
        self,
        rq_job: RQJob,
    ) -> Response:
        last_instance_update_time = timezone.localtime(self.db_instance.updated_date)
        timestamp = datetime.strftime(last_instance_update_time, "%Y_%m_%d_%H_%M_%S")
        location_conf = get_location_configuration(
            db_instance=self.db_instance,
            query_params=self.request.query_params,
            field_name=StorageType.TARGET,
        )
        location = location_conf["location"]

        if rq_job.is_finished:
            if location == Location.LOCAL:
                file_path = rq_job.return_value()

                if not file_path:
                    return Response(
                        "A result for exporting job was not found for finished RQ job",
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )

                elif not os.path.exists(file_path):
                    return Response(
                        "The result file does not exist in export cache",
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )

                action = self.request.query_params.get("action")

                if action not in (None, "download"):
                    raise serializers.ValidationError(
                        "Unexpected action specified for the request"
                    )

                filename = self.request.query_params.get(
                    "filename"
                ) or build_backup_file_name(
                    class_name=self.obj_type,
                    identifier=self.db_instance.name,
                    timestamp=timestamp,
                    extension=os.path.splitext(file_path)[1],
                )

                if action == "download":
                    rq_job.delete()
                    return sendfile(
                        self.request,
                        file_path,
                        attachment=True,
                        attachment_filename=filename,
                    )

                return Response(status=status.HTTP_201_CREATED)

            elif location == Location.CLOUD_STORAGE:
                rq_job.delete()
                return Response(status=status.HTTP_200_OK)
            else:
                raise NotImplementedError()
        elif rq_job.is_failed:
            exc_info = rq_job.meta.get(
                RQJobMetaField.FORMATTED_EXCEPTION, str(rq_job.exc_info)
            )
            rq_job.delete()
            return Response(exc_info, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            rq_request = rq_job.meta.get(RQJobMetaField.REQUEST, None)
            request_time = rq_request.get("timestamp", None) if rq_request else None
            if request_time is None or request_time < last_instance_update_time:
                # in case the server is configured with ONE_RUNNING_JOB_IN_QUEUE_PER_USER
                # we have to enqueue dependent jobs after canceling one
                rq_job.cancel(
                    enqueue_dependents=settings.ONE_RUNNING_JOB_IN_QUEUE_PER_USER
                )
                rq_job.delete()
            return Response(status=status.HTTP_202_ACCEPTED)

    def _handle_rq_job_v2(self, rq_job: RQJob) -> Optional[Response]:
        if rq_job.get_status(refresh=False) not in {
            RQJobStatus.STARTED,
            RQJobStatus.DEFERRED,
        }:
            rq_job.delete()
            rq_job = None
        else:
            return Response(
                data="Export process is already in progress/queued",
                status=status.HTTP_409_CONFLICT,
            )

    def handle_rq_job(self, *args, **kwargs) -> Optional[Response]:
        if self.version == 1:
            return self._handle_rq_job_v1(*args, **kwargs)
        elif self.version == 2:
            return self._handle_rq_job_v2(*args, **kwargs)
        else:
            raise ValueError("Unsupported version")

    def export(self):
        queue = django_rq.get_queue(self.QUEUE_NAME)
        rq_id = RQIdManager.build(
            "export",
            self.obj_type,
            self.db_instance.pk,
            subresource="backup",
            user_id=self.request.user.id,
        )
        rq_job = queue.fetch_job(rq_id)

        if rq_job:
            response = self.handle_rq_job(rq_job)
            if response:
                return response

        self._setup_backup_job(queue, rq_id)
        serializer = RqIdSerializer(data={"rq_id": rq_id})
        serializer.is_valid(raise_exception=True)

        return Response(serializer.data, status=status.HTTP_202_ACCEPTED)

    def _setup_backup_job(
        self,
        queue: DjangoRQ,
        rq_id: str,
    ) -> None:
        filename = self.request.query_params.get("filename", None)
        if isinstance(self.db_instance, Task):
            logger = slogger.task[self.db_instance.pk]
            Exporter = TaskExporter
            cache_ttl = TASK_CACHE_TTL
        else:
            logger = slogger.project[self.db_instance.pk]
            Exporter = ProjectExporter
            cache_ttl = PROJECT_CACHE_TTL

        location_conf = get_location_configuration(
            db_instance=self.db_instance,
            query_params=self.request.query_params,
            field_name=StorageType.TARGET,
        )
        location = location_conf["location"]
        func = (
            _create_backup
            if location == Location.LOCAL
            else export_resource_to_cloud_storage
        )
        func_args = (
            self.db_instance,
            Exporter,
            "{}_backup.zip".format(self.obj_type),
            logger,
            cache_ttl,
        )
        result_url = None

        if location == Location.CLOUD_STORAGE:
            try:
                storage_id = location_conf["storage_id"]
            except KeyError:
                raise serializers.ValidationError(
                    "Cloud storage location was selected as the destination,"
                    " but cloud storage id was not specified"
                )

            db_storage = get_cloud_storage_for_import_or_export(
                storage_id=storage_id,
                request=self.request,
                is_default=location_conf["is_default"],
            )

            last_instance_update_time = timezone.localtime(
                self.db_instance.updated_date
            )
            timestamp = datetime.strftime(
                last_instance_update_time, "%Y_%m_%d_%H_%M_%S"
            )

            filename_pattern = build_backup_file_name(
                class_name=self.obj_type,
                identifier=self.db_instance.name,
                timestamp=timestamp,
            )
            func_args = (
                db_storage,
                filename,
                filename_pattern,
                _create_backup,
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

    def make_result_url(self) -> str:
        v1_endpoint = f"{self.obj_type}-export-backup"
        result_url = reverse(
            v1_endpoint, args=[self.db_instance.pk], request=self.request
        )
        query_dict = self.request.query_params.copy()
        query_dict["action"] = "download"
        result_url += "?" + query_dict.urlencode()

        return result_url
