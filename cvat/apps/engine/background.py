# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from abc import abstractmethod
from dataclasses import asdict as dataclass_asdict
from dataclasses import dataclass
from datetime import datetime
from functools import cached_property
from pathlib import Path
from tempfile import NamedTemporaryFile
from types import NoneType
from typing import Any, Callable, ClassVar
from uuid import uuid4

import attrs
from attrs.converters import to_bool
from django.conf import settings
from rest_framework import serializers
from rest_framework.exceptions import MethodNotAllowed, ValidationError
from rest_framework.reverse import reverse
from rq.job import Job as RQJob

import cvat.apps.dataset_manager as dm
from cvat.apps.dataset_manager.formats.registry import EXPORT_FORMATS
from cvat.apps.dataset_manager.util import TmpDirManager
from cvat.apps.dataset_manager.views import get_export_cache_ttl, get_export_callback
from cvat.apps.engine.backup import (
    ProjectExporter,
    TaskExporter,
    create_backup,
    import_project,
    import_task,
)
from cvat.apps.engine.cloud_provider import (
    export_resource_to_cloud_storage,
    import_resource_from_cloud_storage,
)
from cvat.apps.engine.location import StorageType, get_location_configuration
from cvat.apps.engine.log import ServerLogManager
from cvat.apps.engine.models import (
    Data,
    Job,
    Location,
    Project,
    RequestAction,
    RequestSubresource,
    RequestTarget,
    Task,
)
from cvat.apps.engine.permissions import get_cloud_storage_for_import_or_export
from cvat.apps.engine.rq import (
    ExportRequestId,
    ExportRQMeta,
    ImportRequestId,
    ImportRQMeta,
    define_dependent_job,
)
from cvat.apps.engine.serializers import UploadedFileSerializer, UploadedZipFileSerializer
from cvat.apps.engine.task import create_thread as create_task
from cvat.apps.engine.types import ExtendedRequest
from cvat.apps.engine.utils import (
    build_annotations_file_name,
    build_backup_file_name,
    get_rq_lock_by_user,
    is_dataset_export,
)
from cvat.apps.events.handlers import handle_dataset_export, handle_dataset_import
from cvat.apps.redis_handler.background import (
    AbstractExportableRequestManager,
    AbstractRequestManager,
)
from cvat.apps.redis_handler.rq import RequestId

slogger = ServerLogManager(__name__)

REQUEST_TIMEOUT = 60
# it's better to return LockNotAvailableError instead of response with 504 status
LOCK_TTL = REQUEST_TIMEOUT - 5
LOCK_ACQUIRE_TIMEOUT = LOCK_TTL - 5


def cancel_and_delete(rq_job: RQJob) -> None:
    # In the case the server is configured with ONE_RUNNING_JOB_IN_QUEUE_PER_USER
    # we have to enqueue dependent jobs after canceling one.
    rq_job.cancel(enqueue_dependents=settings.ONE_RUNNING_JOB_IN_QUEUE_PER_USER)
    rq_job.delete()


class DatasetExporter(AbstractExportableRequestManager):
    SUPPORTED_RESOURCES = {RequestTarget.PROJECT, RequestTarget.TASK, RequestTarget.JOB}

    @dataclass
    class ExportArgs(AbstractExportableRequestManager.ExportArgs):
        format: str
        save_images: bool

    def init_request_args(self) -> None:
        super().init_request_args()
        save_images = is_dataset_export(self.request)
        format_name = self.request.query_params.get("format", "")

        self.export_args = self.ExportArgs(
            **self.export_args.to_dict(),
            format=format_name,
            save_images=save_images,
        )

    def validate_request(self):
        super().validate_request()

        format_desc = {f.DISPLAY_NAME: f for f in dm.views.get_export_formats()}.get(
            self.export_args.format
        )
        if format_desc is None:
            raise ValidationError("Unknown format specified for the request")
        elif not format_desc.ENABLED:
            raise MethodNotAllowed(self.request.method, detail="Format is disabled")

    def build_request_id(self):
        return ExportRequestId(
            queue=self.QUEUE_NAME,
            action=RequestAction.EXPORT,
            target=RequestTarget(self.resource),
            id=self.db_instance.pk,
            extra={
                "subresource": (
                    RequestSubresource.DATASET
                    if self.export_args.save_images
                    else RequestSubresource.ANNOTATIONS
                ),
                "format": self.export_args.format,
                "user_id": self.user_id,
            },
        ).render()

    def validate_request_id(self, request_id, /) -> None:
        parsed_rq_id = ExportRequestId.parse(request_id)

        if (
            parsed_rq_id.action != RequestAction.EXPORT
            or parsed_rq_id.target != RequestTarget(self.resource)
            or parsed_rq_id.id != self.db_instance.pk
            or parsed_rq_id.subresource
            not in {RequestSubresource.DATASET, RequestSubresource.ANNOTATIONS}
        ):
            raise ValueError("The provided request id does not match exported target or resource")

    def _init_callback_with_params(self):
        self.callback = get_export_callback(
            self.db_instance, save_images=self.export_args.save_images
        )
        self.callback_args = (self.db_instance.pk, self.export_args.format)

        try:
            if self.request.scheme:
                server_address = self.request.scheme + "://"
            server_address += self.request.get_host()
        except Exception:
            server_address = None

        self.callback_kwargs = {
            "server_url": server_address,
        }

    def finalize_request(self):
        handle_dataset_export(
            self.db_instance,
            format_name=self.export_args.format,
            cloud_storage_id=self.export_args.location_config.get("storage_id"),
            save_images=self.export_args.save_images,
        )

    def get_result_filename(self) -> str:
        filename = self.export_args.filename

        if not filename:
            timestamp = self.get_file_timestamp()
            filename = build_annotations_file_name(
                class_name=self.resource,
                identifier=self.db_instance.pk,
                timestamp=timestamp,
                format_name=self.export_args.format,
                is_annotation_file=not self.export_args.save_images,
                extension=(EXPORT_FORMATS[self.export_args.format].EXT).lower(),
            )

        return filename

    def where_to_redirect(self) -> str:
        return reverse(
            f"{self.resource}-download-dataset", args=[self.db_instance.pk], request=self.request
        )


class BackupExporter(AbstractExportableRequestManager):
    SUPPORTED_RESOURCES = {RequestTarget.PROJECT, RequestTarget.TASK}

    def validate_request_id(self, request_id, /) -> None:
        parsed_rq_id = ExportRequestId.parse(request_id)

        if (
            parsed_rq_id.action != RequestAction.EXPORT
            or parsed_rq_id.target != RequestTarget(self.resource)
            or parsed_rq_id.id != self.db_instance.pk
            or parsed_rq_id.subresource is not RequestSubresource.BACKUP
        ):
            raise ValueError("The provided request id does not match exported target or resource")

    def _init_callback_with_params(self):
        self.callback = create_backup

        if isinstance(self.db_instance, Task):
            logger = slogger.task[self.db_instance.pk]
            Exporter = TaskExporter
        else:
            logger = slogger.project[self.db_instance.pk]
            Exporter = ProjectExporter

        self.callback_args = (
            self.db_instance.pk,
            Exporter,
            logger,
            self.job_result_ttl,
        )

    def get_result_filename(self):
        filename = self.export_args.filename

        if not filename:
            instance_timestamp = self.get_file_timestamp()

            filename = build_backup_file_name(
                class_name=self.resource,
                identifier=self.db_instance.name,
                timestamp=instance_timestamp,
            )

        return filename

    def build_request_id(self):
        return ExportRequestId(
            queue=self.QUEUE_NAME,
            action=RequestAction.EXPORT,
            target=RequestTarget(self.resource),
            id=self.db_instance.pk,
            extra={
                "subresource": RequestSubresource.BACKUP,
                "user_id": self.user_id,
            },
        ).render()

    def where_to_redirect(self) -> str:
        return reverse(
            f"{self.resource}-download-backup", args=[self.db_instance.pk], request=self.request
        )

    def finalize_request(self):
        # FUTURE-TODO: send events to event store
        pass


@attrs.define(kw_only=True)
class ResourceImporter(AbstractRequestManager):
    QUEUE_NAME = settings.CVAT_QUEUES.IMPORT_DATA.value

    upload_serializer_class: type[UploadedFileSerializer | UploadedZipFileSerializer] = attrs.field(
        init=False
    )

    tmp_dir: Path = attrs.field(init=False)

    @property
    def job_result_ttl(self):
        return int(settings.IMPORT_CACHE_SUCCESS_TTL.total_seconds())

    @property
    def job_failed_ttl(self):
        return int(settings.IMPORT_CACHE_FAILED_TTL.total_seconds())

    @dataclass
    class ImportArgs:
        location_config: dict[str, Any]
        file_path: str | None

        @property
        def location(self) -> Location:
            return self.location_config["location"]

        def to_dict(self):
            return dataclass_asdict(self)

    def init_request_args(self):
        filename = self.request.query_params.get("filename")
        file_path = (self.tmp_dir / filename) if filename else None

        try:
            location_config = get_location_configuration(
                db_instance=self.db_instance,
                query_params=self.request.query_params,
                field_name=StorageType.SOURCE,
            )
        except ValueError as ex:
            raise ValidationError(str(ex)) from ex

        self.import_args = self.ImportArgs(
            location_config=location_config,
            file_path=file_path,
        )

    def validate_request(self):
        super().validate_request()

        if self.import_args.location not in Location.list():
            raise ValidationError(
                f"Unexpected location {self.import_args.location} specified for the request"
            )

        if self.import_args.location == Location.CLOUD_STORAGE:
            if not self.import_args.file_path:
                raise ValidationError("The filename was not specified")

            if self.import_args.location_config.get("storage_id") is None:
                raise ValidationError(
                    "Cloud storage location was selected as the source,"
                    + " but cloud storage id was not specified"
                )

    def _handle_cloud_storage_file_upload(self):
        storage_id = self.import_args.location_config["storage_id"]
        db_storage = get_cloud_storage_for_import_or_export(
            storage_id=storage_id,
            request=self.request,
            is_default=self.import_args.location_config["is_default"],
        )

        key = self.import_args.file_path
        with NamedTemporaryFile(prefix="cvat_", dir=TmpDirManager.TMP_ROOT, delete=False) as tf:
            self.import_args.file_path = tf.name
        return db_storage, key

    def _handle_non_tus_file_upload(self):
        file_serializer = self.upload_serializer_class(data=self.request.data)
        file_serializer.is_valid(raise_exception=True)
        payload_file = file_serializer.validated_data[file_serializer.file.field_name]

        with NamedTemporaryFile(prefix="cvat_", dir=TmpDirManager.TMP_ROOT, delete=False) as tf:
            self.import_args.file_path = tf.name
            for chunk in payload_file.chunks():
                tf.write(chunk)


@attrs.define(kw_only=True)
class DatasetImporter(ResourceImporter):
    SUPPORTED_RESOURCES = {RequestTarget.PROJECT, RequestTarget.TASK, RequestTarget.JOB}

    @dataclass
    class ImportArgs(ResourceImporter.ImportArgs):
        format: str
        conv_mask_to_poly: bool

    def __attrs_post_init__(self) -> None:
        super().__attrs_post_init__()
        self.upload_serializer_class = (
            UploadedZipFileSerializer
            if isinstance(self.db_instance, Project)
            else UploadedFileSerializer
        )
        self.tmp_dir = Path(self.db_instance.get_tmp_dirname())

    def init_request_args(self) -> None:
        super().init_request_args()
        format_name = self.request.query_params.get("format", "")
        conv_mask_to_poly = to_bool(self.request.query_params.get("conv_mask_to_poly", True))

        self.import_args = self.ImportArgs(
            **self.import_args.to_dict(),
            format=format_name,
            conv_mask_to_poly=conv_mask_to_poly,
        )

    def init_callback_with_params(self):
        if isinstance(self.db_instance, Project):
            self.callback = dm.project.import_dataset_as_project
        elif isinstance(self.db_instance, Task):
            self.callback = dm.task.import_task_annotations
        else:
            assert isinstance(self.db_instance, Job)
            self.callback = dm.task.import_job_annotations

        if self.import_args.location == Location.CLOUD_STORAGE:
            db_storage, key = self._handle_cloud_storage_file_upload()
        elif not self.import_args.file_path:
            self._handle_non_tus_file_upload()

        self.callback_args = (
            self.import_args.file_path,
            self.db_instance.pk,
            self.import_args.format,
            self.import_args.conv_mask_to_poly,
        )

        if self.import_args.location == Location.CLOUD_STORAGE:
            self.callback_args = (db_storage, key, self.callback) + self.callback_args
            self.callback = import_resource_from_cloud_storage

    def validate_request(self):
        super().validate_request()

        format_desc = {f.DISPLAY_NAME: f for f in dm.views.get_import_formats()}.get(
            self.import_args.format
        )
        if format_desc is None:
            raise ValidationError(f"Unknown input format {self.import_args.format!r}")
        elif not format_desc.ENABLED:
            raise MethodNotAllowed(self.request.method, detail="Format is disabled")

    def build_request_id(self):
        return ExportRequestId(
            queue=self.QUEUE_NAME,
            action=RequestAction.IMPORT,
            target=RequestTarget(self.resource),
            id=self.db_instance.pk,
            extra={
                "subresource": (
                    RequestSubresource.DATASET
                    if isinstance(self.db_instance, Project)
                    else RequestSubresource.ANNOTATIONS
                ),
            },
        ).render()

    def build_meta(self, *, file_path: str):
        return ImportRQMeta.build_for(  # TODO: looks like tmp_file is not used anywhere
            request=self.request, db_obj=self.db_instance, tmp_file=file_path
        )

    def finalize_request(self):
        handle_dataset_import(
            self.db_instance,
            format_name=self.import_args.format,
            cloud_storage_id=self.import_args.location_config.get("storage_id"),
        )


@attrs.define(kw_only=True)
class BackupImporter(ResourceImporter):
    SUPPORTED_RESOURCES = {RequestTarget.PROJECT, RequestTarget.TASK}

    resource: RequestTarget = attrs.field(validator=attrs.validators.in_(SUPPORTED_RESOURCES))
    upload_serializer_class: type[UploadedZipFileSerializer] = attrs.field(
        init=False, default=UploadedZipFileSerializer
    )

    @dataclass
    class ImportArgs(ResourceImporter.ImportArgs):
        org_id: int | None

    def __attrs_post_init__(self) -> None:
        super().__attrs_post_init__()
        self.tmp_dir = Path(TmpDirManager.TMP_ROOT)

    def init_request_args(self) -> None:
        super().init_request_args()

        self.import_args = self.ImportArgs(
            **self.import_args.to_dict(),
            org_id=getattr(self.request.iam_context["organization"], "id", None),
        )

    def build_request_id(self):
        return ImportRequestId(
            queue=self.QUEUE_NAME,
            action=RequestAction.IMPORT,
            target=self.resource,
            id=uuid4(),
            extra={
                "subresource": RequestSubresource.BACKUP,
            },
        ).render()

    def init_callback_with_params(self):
        self.callback = import_project if self.resource == RequestTarget.PROJECT else import_task

        if self.import_args.location == Location.CLOUD_STORAGE:
            db_storage, key = self._handle_cloud_storage_file_upload()
        elif not self.import_args.file_path:
            self._handle_non_tus_file_upload()

        self.callback_args = (self.import_args.file_path, self.user_id, self.import_args.org_id)

        if self.import_args.location == Location.CLOUD_STORAGE:
            self.callback_args = (db_storage, key, self.callback) + self.callback_args
            self.callback = import_resource_from_cloud_storage

    def finalize_request(self):
        # FUTURE-TODO: send logs to event store
        pass


@attrs.define(kw_only=True)
class TaskCreator(AbstractRequestManager):
    QUEUE_NAME = settings.CVAT_QUEUES.IMPORT_DATA.value
    SUPPORTED_RESOURCES = {RequestTarget.TASK}

    db_data: Data = attrs.field()

    @property
    def job_failure_ttl(self):
        return int(settings.IMPORT_CACHE_FAILED_TTL.total_seconds())

    def build_request_id(self):
        return RequestId(
            queue=self.QUEUE_NAME,
            action=RequestAction.CREATE,
            target=RequestTarget.TASK,
            id=self.db_instance.pk,
        ).render()

    def init_callback_with_params(self):
        self.callback = create_task
        self.callback_args = (self.db_instance.pk, self.db_data)
