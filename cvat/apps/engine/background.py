# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from abc import abstractmethod
from dataclasses import asdict as dataclass_asdict
from dataclasses import dataclass
from pathlib import Path
from tempfile import NamedTemporaryFile
from uuid import uuid4

from attrs.converters import to_bool
from django.conf import settings
from django.db.models import Model
from rest_framework import serializers
from rest_framework.exceptions import MethodNotAllowed
from rest_framework.reverse import reverse

import cvat.apps.dataset_manager as dm
from cvat.apps.dataset_manager.formats.registry import EXPORT_FORMATS
from cvat.apps.dataset_manager.util import TmpDirManager
from cvat.apps.dataset_manager.views import get_export_callback
from cvat.apps.engine.backup import (
    ProjectExporter,
    TaskExporter,
    create_backup,
    import_project,
    import_task,
)
from cvat.apps.engine.cloud_provider import import_resource_from_cloud_storage
from cvat.apps.engine.location import LocationConfig, StorageType, get_location_configuration
from cvat.apps.engine.log import ServerLogManager
from cvat.apps.engine.models import (
    Data,
    Job,
    Location,
    Project,
    RequestAction,
    RequestSubresource,
    RequestTarget,
    StorageChoice,
    Task,
)
from cvat.apps.engine.permissions import get_cloud_storage_for_import_or_export
from cvat.apps.engine.rq import ExportRequestId, ImportRequestId
from cvat.apps.engine.serializers import (
    AnnotationFileSerializer,
    DatasetFileSerializer,
    ProjectFileSerializer,
    TaskFileSerializer,
)
from cvat.apps.engine.task import create_thread as create_task
from cvat.apps.engine.tus import TusFile, TusFileForbiddenError, TusFileNotFoundError
from cvat.apps.engine.types import ExtendedRequest
from cvat.apps.engine.utils import (
    build_annotations_file_name,
    build_backup_file_name,
    import_resource_with_clean_up_after,
    is_dataset_export,
)
from cvat.apps.events.handlers import handle_dataset_export, handle_dataset_import
from cvat.apps.redis_handler.background import AbstractExporter, AbstractRequestManager

slogger = ServerLogManager(__name__)

REQUEST_TIMEOUT = 60
# it's better to return LockNotAvailableError instead of response with 504 status
LOCK_TTL = REQUEST_TIMEOUT - 5
LOCK_ACQUIRE_TIMEOUT = LOCK_TTL - 5


class DatasetExporter(AbstractExporter):
    SUPPORTED_TARGETS = {RequestTarget.PROJECT, RequestTarget.TASK, RequestTarget.JOB}

    @dataclass
    class ExportArgs(AbstractExporter.ExportArgs):
        format: str
        save_images: bool

    def init_request_args(self) -> None:
        super().init_request_args()
        save_images = is_dataset_export(self.request)
        format_name = self.request.query_params.get("format", "")

        self.export_args: DatasetExporter.ExportArgs = self.ExportArgs(
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
            raise serializers.ValidationError("Unknown format specified for the request")
        elif not format_desc.ENABLED:
            raise MethodNotAllowed(self.request.method, detail="Format is disabled")

    def build_request_id(self):
        return ExportRequestId(
            action=RequestAction.EXPORT,
            target=RequestTarget(self.target),
            target_id=self.db_instance.pk,
            user_id=self.user_id,
            subresource=(
                RequestSubresource.DATASET
                if self.export_args.save_images
                else RequestSubresource.ANNOTATIONS
            ),
            format=self.export_args.format,
        ).render()

    def validate_request_id(self, request_id, /) -> None:
        # FUTURE-TODO: optimize, request_id is parsed 2 times (first one when checking permissions)
        parsed_request_id: ExportRequestId = ExportRequestId.parse_and_validate_queue(
            request_id, expected_queue=self.QUEUE_NAME, try_legacy_format=True
        )

        if (
            parsed_request_id.action != RequestAction.EXPORT
            or parsed_request_id.target != RequestTarget(self.target)
            or parsed_request_id.target_id != self.db_instance.pk
            or parsed_request_id.subresource
            not in {RequestSubresource.DATASET, RequestSubresource.ANNOTATIONS}
        ):
            raise ValueError(
                "The provided request id does not match exported target or subresource"
            )

    def _init_callback_with_params(self):
        self.callback = get_export_callback(
            self.db_instance, save_images=self.export_args.save_images
        )
        self.callback_args = (self.db_instance.pk, self.export_args.format)

        try:
            server_address = self.request.scheme + "://" + self.request.get_host()
        except Exception:
            server_address = None

        self.callback_kwargs = {
            "server_url": server_address,
        }

    def finalize_request(self):
        handle_dataset_export(
            self.db_instance,
            format_name=self.export_args.format,
            cloud_storage_id=self.export_args.location_config.cloud_storage_id,
            save_images=self.export_args.save_images,
        )

    def get_result_filename(self) -> str:
        filename = self.export_args.filename

        if not filename:
            timestamp = self.get_file_timestamp()
            filename = build_annotations_file_name(
                class_name=self.target,
                identifier=self.db_instance.pk,
                timestamp=timestamp,
                format_name=self.export_args.format,
                is_annotation_file=not self.export_args.save_images,
                extension=(EXPORT_FORMATS[self.export_args.format].EXT).lower(),
            )

        return filename

    def get_result_endpoint_url(self) -> str:
        return reverse(
            f"{self.target}-download-dataset", args=[self.db_instance.pk], request=self.request
        )


class BackupExporter(AbstractExporter):
    SUPPORTED_TARGETS = {RequestTarget.PROJECT, RequestTarget.TASK}

    @dataclass
    class ExportArgs(AbstractExporter.ExportArgs):
        lightweight: bool

    def is_lightweight_possible(self):
        if isinstance(self.db_instance, Task):
            return self.db_instance.data.storage == StorageChoice.CLOUD_STORAGE
        if isinstance(self.db_instance, Project):
            return Task.objects.filter(
                project=self.db_instance, data__storage=StorageChoice.CLOUD_STORAGE
            ).exists()

        return False

    def init_request_args(self) -> None:
        super().init_request_args()
        lightweight = to_bool(self.request.query_params.get("lightweight", False))

        if lightweight:
            lightweight = self.is_lightweight_possible()

        self.export_args: BackupExporter.ExportArgs = self.ExportArgs(
            **self.export_args.to_dict(),
            lightweight=lightweight,
        )

    def validate_request(self):
        super().validate_request()

        # do not add this check when a project is backed up, as empty tasks are skipped
        if isinstance(self.db_instance, Task) and not self.db_instance.data:
            raise serializers.ValidationError("Backup of a task without data is not allowed")

    def validate_request_id(self, request_id, /) -> None:
        # FUTURE-TODO: optimize, request_id is parsed 2 times (first one when checking permissions)
        parsed_request_id: ExportRequestId = ExportRequestId.parse_and_validate_queue(
            request_id, expected_queue=self.QUEUE_NAME, try_legacy_format=True
        )

        if (
            parsed_request_id.action != RequestAction.EXPORT
            or parsed_request_id.target != RequestTarget(self.target)
            or parsed_request_id.target_id != self.db_instance.pk
            or parsed_request_id.subresource != RequestSubresource.BACKUP
        ):
            raise ValueError(
                "The provided request id does not match exported target or subresource"
            )

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
        self.callback_kwargs = {
            "lightweight": self.export_args.lightweight,
        }

    def get_result_filename(self):
        filename = self.export_args.filename

        if not filename:
            instance_timestamp = self.get_file_timestamp()

            filename = build_backup_file_name(
                class_name=self.target,
                identifier=self.db_instance.name,
                timestamp=instance_timestamp,
                lightweight=self.export_args.lightweight,
            )

        return filename

    def build_request_id(self):
        return ExportRequestId(
            action=RequestAction.EXPORT,
            target=RequestTarget(self.target),
            target_id=self.db_instance.pk,
            user_id=self.user_id,
            subresource=RequestSubresource.BACKUP,
            lightweight=self.export_args.lightweight,
        ).render()

    def get_result_endpoint_url(self) -> str:
        return reverse(
            f"{self.target}-download-backup", args=[self.db_instance.pk], request=self.request
        )

    def finalize_request(self):
        # FUTURE-TODO: send events to event store
        pass


class ResourceImporter(AbstractRequestManager):
    QUEUE_NAME = settings.CVAT_QUEUES.IMPORT_DATA.value

    @dataclass
    class ImportArgs:
        location_config: LocationConfig
        filename: str | None

        def to_dict(self):
            return dataclass_asdict(self)

    import_args: ImportArgs | None

    def __init__(self, *, request: ExtendedRequest, db_instance: Model | None, tmp_dir: Path):
        super().__init__(request=request, db_instance=db_instance)
        self.tmp_dir = tmp_dir

    @property
    def job_result_ttl(self):
        return int(settings.IMPORT_CACHE_SUCCESS_TTL.total_seconds())

    @property
    def job_failed_ttl(self):
        return int(settings.IMPORT_CACHE_FAILED_TTL.total_seconds())

    def init_request_args(self):
        try:
            location_config = get_location_configuration(
                db_instance=self.db_instance,
                query_params=self.request.query_params,
                field_name=StorageType.SOURCE,
            )
        except ValueError as ex:
            raise serializers.ValidationError(str(ex)) from ex

        self.import_args = ResourceImporter.ImportArgs(
            location_config=location_config,
            filename=self.request.query_params.get("filename"),
        )

    def validate_request(self):
        super().validate_request()

        if (
            self.import_args.location_config.location == Location.CLOUD_STORAGE
            and not self.import_args.filename
        ):
            raise serializers.ValidationError("The filename was not specified")

        # file was uploaded via TUS
        if (
            self.import_args.location_config.location == Location.LOCAL
            and self.import_args.filename
        ):
            try:
                TusFile(file_id=self.import_args.filename, upload_dir=self.tmp_dir).validate(
                    user_id=self.user_id, with_meta=False
                )
            except (TusFileNotFoundError, TusFileForbiddenError, ValueError):
                raise serializers.ValidationError("No such file were uploaded")

    def _handle_cloud_storage_file_upload(self):
        storage_id = self.import_args.location_config.cloud_storage_id
        db_storage = get_cloud_storage_for_import_or_export(
            storage_id=storage_id,
            request=self.request,
            is_default=self.import_args.location_config.is_default,
        )

        key = self.import_args.filename
        with NamedTemporaryFile(prefix="cvat_", dir=self.tmp_dir, delete=False) as tf:
            self.import_args.filename = Path(tf.name).relative_to(self.tmp_dir).name

        return db_storage, key

    @abstractmethod
    def _get_payload_file(self): ...

    def _handle_non_tus_file_upload(self):
        payload_file = self._get_payload_file()

        with NamedTemporaryFile(prefix="cvat_", dir=self.tmp_dir, delete=False) as tf:
            for chunk in payload_file.chunks():
                tf.write(chunk)

            self.import_args.filename = Path(tf.name).relative_to(self.tmp_dir).name

    @abstractmethod
    def _init_callback_with_params(self): ...

    def init_callback_with_params(self):
        # Note: self.import_args is changed here
        if self.import_args.location_config.location == Location.CLOUD_STORAGE:
            db_storage, key = self._handle_cloud_storage_file_upload()
        elif not self.import_args.filename:
            self._handle_non_tus_file_upload()

        self._init_callback_with_params()

        # redefine here callback and callback args in order to:
        # - (optional) download file from cloud storage
        # - remove uploaded file at the end
        if self.import_args.location_config.location == Location.CLOUD_STORAGE:
            self.callback_args = (
                self.callback_args[0],
                db_storage,
                key,
                self.callback,
                *self.callback_args[1:],
            )
            self.callback = import_resource_from_cloud_storage

        self.callback_args = (self.callback, *self.callback_args)
        self.callback = import_resource_with_clean_up_after


class DatasetImporter(ResourceImporter):
    SUPPORTED_TARGETS = {RequestTarget.PROJECT, RequestTarget.TASK, RequestTarget.JOB}

    @dataclass
    class ImportArgs(ResourceImporter.ImportArgs):
        format: str
        conv_mask_to_poly: bool

    def __init__(
        self,
        *,
        request: ExtendedRequest,
        db_instance: Project | Task | Job,
    ):
        super().__init__(
            request=request, db_instance=db_instance, tmp_dir=Path(db_instance.get_tmp_dirname())
        )

    def init_request_args(self) -> None:
        super().init_request_args()
        format_name = self.request.query_params.get("format", "")
        conv_mask_to_poly = to_bool(self.request.query_params.get("conv_mask_to_poly", True))

        self.import_args: DatasetImporter.ImportArgs = self.ImportArgs(
            **self.import_args.to_dict(),
            format=format_name,
            conv_mask_to_poly=conv_mask_to_poly,
        )

    def _get_payload_file(self):
        # Common serializer is not used to not break API
        if isinstance(self.db_instance, Project):
            serializer_class = DatasetFileSerializer
            file_field = "dataset_file"
        else:
            serializer_class = AnnotationFileSerializer
            file_field = "annotation_file"

        file_serializer = serializer_class(data=self.request.data)
        file_serializer.is_valid(raise_exception=True)
        return file_serializer.validated_data[file_field]

    def _init_callback_with_params(self):
        if isinstance(self.db_instance, Project):
            self.callback = dm.project.import_dataset_as_project
        elif isinstance(self.db_instance, Task):
            self.callback = dm.task.import_task_annotations
        else:
            assert isinstance(self.db_instance, Job)
            self.callback = dm.task.import_job_annotations

        self.callback_args = (
            str(self.tmp_dir / self.import_args.filename),
            self.db_instance.pk,
            self.import_args.format,
            self.import_args.conv_mask_to_poly,
        )

    def validate_request(self):
        super().validate_request()

        format_desc = {f.DISPLAY_NAME: f for f in dm.views.get_import_formats()}.get(
            self.import_args.format
        )
        if format_desc is None:
            raise serializers.ValidationError(f"Unknown input format {self.import_args.format!r}")
        elif not format_desc.ENABLED:
            raise MethodNotAllowed(self.request.method, detail="Format is disabled")

    def build_request_id(self):
        return ImportRequestId(
            action=RequestAction.IMPORT,
            target=RequestTarget(self.target),
            target_id=self.db_instance.pk,
            subresource=(
                RequestSubresource.DATASET
                if isinstance(self.db_instance, Project)
                else RequestSubresource.ANNOTATIONS
            ),
        ).render()

    def finalize_request(self):
        handle_dataset_import(
            self.db_instance,
            format_name=self.import_args.format,
            cloud_storage_id=self.import_args.location_config.cloud_storage_id,
        )


class BackupImporter(ResourceImporter):
    SUPPORTED_TARGETS = {RequestTarget.PROJECT, RequestTarget.TASK}

    @dataclass
    class ImportArgs(ResourceImporter.ImportArgs):
        org_id: int | None

    def __init__(
        self,
        *,
        request: ExtendedRequest,
        target: RequestTarget,
    ):
        super().__init__(request=request, db_instance=None, tmp_dir=Path(TmpDirManager.TMP_ROOT))
        assert target in self.SUPPORTED_TARGETS, f"Unsupported target: {target}"
        self.target = target

    def init_request_args(self) -> None:
        super().init_request_args()

        self.import_args: BackupImporter.ImportArgs = self.ImportArgs(
            **self.import_args.to_dict(),
            org_id=getattr(self.request.iam_context["organization"], "id", None),
        )

    def build_request_id(self):
        return ImportRequestId(
            action=RequestAction.IMPORT,
            target=self.target,
            id=uuid4(),
            subresource=RequestSubresource.BACKUP,
        ).render()

    def _get_payload_file(self):
        # Common serializer is not used to not break API
        if self.target == RequestTarget.PROJECT:
            serializer_class = ProjectFileSerializer
            file_field = "project_file"
        else:
            serializer_class = TaskFileSerializer
            file_field = "task_file"

        file_serializer = serializer_class(data=self.request.data)
        file_serializer.is_valid(raise_exception=True)
        return file_serializer.validated_data[file_field]

    def _init_callback_with_params(self):
        self.callback = import_project if self.target == RequestTarget.PROJECT else import_task
        self.callback_args = (
            str(self.tmp_dir / self.import_args.filename),
            self.user_id,
            self.import_args.org_id,
        )

    def finalize_request(self):
        # FUTURE-TODO: send logs to event store
        pass


class TaskCreator(AbstractRequestManager):
    QUEUE_NAME = settings.CVAT_QUEUES.IMPORT_DATA.value
    SUPPORTED_TARGETS = {RequestTarget.TASK}

    def __init__(
        self,
        *,
        request: ExtendedRequest,
        db_instance: Task,
        db_data: Data,
    ):
        super().__init__(request=request, db_instance=db_instance)
        self.db_data = db_data

    @property
    def job_failure_ttl(self):
        return int(settings.IMPORT_CACHE_FAILED_TTL.total_seconds())

    def build_request_id(self):
        return ImportRequestId(
            action=RequestAction.CREATE,
            target=RequestTarget.TASK,
            target_id=self.db_instance.pk,
        ).render()

    def init_callback_with_params(self):
        self.callback = create_task
        self.callback_args = (self.db_instance.pk, self.db_data)
