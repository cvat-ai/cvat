# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import base64
import json
import os
import os.path
import shutil
from functools import cached_property
from pathlib import Path
from textwrap import dedent
from types import NoneType
from typing import Any, ClassVar
from unittest import mock
from urllib.parse import urljoin
from uuid import UUID, uuid4

import attrs
import django_rq
from django.conf import settings
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework import mixins, status
from rest_framework.decorators import action
from rest_framework.response import Response

from cvat.apps.dataset_manager.util import TmpDirManager
from cvat.apps.engine.background import BackupExporter, DatasetExporter
from cvat.apps.engine.handlers import clear_import_cache
from cvat.apps.engine.log import ServerLogManager
from cvat.apps.engine.models import Location
from cvat.apps.engine.serializers import DataSerializer
from cvat.apps.engine.types import ExtendedRequest
from cvat.apps.redis_handler.serializers import RqIdSerializer

slogger = ServerLogManager(__name__)

class TusFileNotFoundError(FileNotFoundError):
    pass

class TusFileForbiddenError(PermissionError):
    pass

class TusTooLargeFileError(Exception):
    pass

class UploadedFileError(ValueError):
    pass

@attrs.define()
class TusFile:
    @attrs.define(kw_only=True)
    class TusMeta:
        MAX_FILE_SIZE: ClassVar[int] = settings.TUS_MAX_FILE_SIZE

        file_size: int = attrs.field()
        @file_size.validator
        def validate_file_size(self, attribute: attrs.Attribute, value: Any):
            if not isinstance(value, int):
                raise ValueError

            if value > self.MAX_FILE_SIZE:
                raise TusTooLargeFileError

        offset: int = attrs.field(validator=attrs.validators.instance_of(int), default=0)

        # optional fields
        message_id: str | None = attrs.field(
            validator=attrs.validators.instance_of((str, NoneType)),
            default=None,
        )

        filename: str | None = attrs.field(
            validator=attrs.validators.instance_of((str, NoneType)),
            default=None,
        )
        filetype: str | None = attrs.field(
            validator=attrs.validators.instance_of((str, NoneType)),
            default=None,
        )

        @classmethod
        def from_request(cls, request: ExtendedRequest, /) -> TusFile.TusMeta:
            metadata = {
                "file_size": int(request.META.get("HTTP_UPLOAD_LENGTH", "0"))
            }

            if message_id := request.META.get("HTTP_MESSAGE_ID"):
                metadata["message_id"] = base64.b64decode(message_id).decode()

            for kv in request.META.get("HTTP_UPLOAD_METADATA", "").split(","):
                splitted_metadata = kv.split(" ")
                if len(splitted_metadata) == 2:
                    key, value = splitted_metadata
                    metadata[key] = base64.b64decode(value).decode()
                else:
                    metadata[splitted_metadata[0]] = ""

            keys_to_keep = attrs.fields_dict(cls).keys()

            return cls(**{k: v for k, v in metadata.items() if k in keys_to_keep})

    @attrs.frozen(kw_only=True, slots=False)
    class FileID:
        SEPARATOR: ClassVar[str] = "_"
        REGEX: ClassVar[str] = (
            rf"(?P<file_id>\b[0-9]+{SEPARATOR}" + \
            r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b)"
        )

        user_id: int = attrs.field(converter=int)
        uuid: UUID = attrs.field(
            converter=lambda x: x if isinstance(x, UUID) else UUID(x), factory=uuid4
        )

        @cached_property
        def as_str(self) -> str:
            return self.SEPARATOR.join([str(self.user_id), str(self.uuid)])

        @classmethod
        def parse(cls, file_id: str):
            user_id, uuid = file_id.split(cls.SEPARATOR, maxsplit=1)
            return cls(user_id=int(user_id), uuid=UUID(uuid))

    @attrs.define()
    class TusMetaFile:
        SUFFIX: ClassVar[str] = ".meta"

        _path: Path = attrs.field(
            validator=attrs.validators.instance_of(Path),
            on_setattr=attrs.setters.frozen,
        )
        _meta: TusFile.TusMeta = attrs.field(
            kw_only=True,
            on_setattr=attrs.setters.validate,
            default=None,
        )

        @_meta.validator
        def validate_meta(self, attribute: attrs.Attribute, value: Any):
            if not isinstance(value, (TusFile.TusMeta, NoneType)):
                raise TypeError(f"Unsupported type: {type(value)}")

        @property
        def meta(self):
            return self._meta

        def init_from_file(self):
            assert self._meta is None
            assert self.exists()
            with open(self._path, "r") as fp:
                data = json.load(fp)
            self._meta = TusFile.TusMeta(**data)

        def dump(self):
            assert self._meta is not None
            self._path.parent.mkdir(parents=True, exist_ok=True)
            with open(self._path, "w") as fp:
                json.dump(attrs.asdict(self._meta), fp)

        def exists(self):
            return self._path.exists()

        def delete(self):
            os.remove(self._path)

    file_id: TusFile.FileID = attrs.field(
        converter=lambda x: x if isinstance(x, TusFile.FileID) else TusFile.FileID.parse(x)
    )
    upload_dir: Path = attrs.field(
        validator=attrs.validators.instance_of(Path),
        kw_only=True,
    )
    meta_file: TusMetaFile | None = attrs.field(
        validator=attrs.validators.instance_of((TusMetaFile, NoneType)),
        kw_only=True,
        default=None,
    )
    file_path: Path = attrs.field(validator=attrs.validators.instance_of(Path), init=False)

    def __attrs_post_init__(self):
        self.file_path = self.upload_dir / self.file_id.as_str
        if self.meta_file is None:
            self.meta_file = TusFile.TusMetaFile(
                self.upload_dir / (self.file_id.as_str + TusFile.TusMetaFile.SUFFIX)
            )

    @property
    def filename(self):
        return self.meta_file.meta.filename

    @property
    def file_size(self):
        return self.meta_file.meta.file_size

    @property
    def offset(self):
        return self.meta_file.meta.offset

    def exists(self, *, with_meta: bool = True):
        file_exists = self.file_path.exists()

        if with_meta:
            file_exists = file_exists and self.meta_file.exists()

        return file_exists

    def init_file(self):
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        with open(self.file_path, 'wb') as file:
            file.seek(self.file_size - 1)
            file.write(b'\0')

    def write_chunk(self, chunk: TusChunk):
        with open(self.file_path, 'r+b') as file:
            file.seek(chunk.offset)
            file.write(chunk.content)
        self.meta_file.meta.offset += chunk.size
        self.meta_file.dump()

    def is_complete(self):
        return self.offset == self.file_size

    def rename(self):
        original_file_path = self.upload_dir / self.filename

        if original_file_path.exists():
            original_file_name, extension = original_file_path.stem, original_file_path.suffix
            file_amount = 1
            while (self.upload_dir / self.filename).exists():
                # FUTURE-FIXME: find a better way; data out of sync (in memory object/file)
                self.meta_file.meta.filename = "{}_{}{}".format(
                    original_file_name, file_amount, extension
                )
                original_file_path = self.upload_dir / self.filename
                file_amount += 1

        self.file_path.rename(original_file_path)

    def clean(self):
        self.meta_file.delete()

    def validate(self, *, user_id: int, with_meta: bool = True):
        if self.file_id.user_id != user_id:
            raise TusFileForbiddenError

        if not self.exists(with_meta=with_meta):
            raise TusFileNotFoundError

    @staticmethod
    def create_file(
        *,
        metadata: TusFile.TusMeta,
        upload_dir: Path,
        user_id: int,
    ) -> TusFile:
        file_id = TusFile.FileID(user_id=user_id)
        assert metadata.offset == 0

        meta_file = TusFile.TusMetaFile(
            path=upload_dir / (file_id.as_str + TusFile.TusMetaFile.SUFFIX),
            meta=metadata,
        )
        meta_file.dump()

        tus_file = TusFile(
            file_id,
            upload_dir=upload_dir,
            meta_file=meta_file,
        )
        tus_file.init_file()

        return tus_file

class TusChunk:
    def __init__(self, request: ExtendedRequest):
        self.META = request.META
        self.offset = int(request.META.get("HTTP_UPLOAD_OFFSET", 0))
        self.size = int(request.META.get("CONTENT_LENGTH", settings.TUS_DEFAULT_CHUNK_SIZE))
        self.content = request.body

class UploadMixin:
    """
    Implements file uploads to the server. Allows to upload single and multiple files, suspend
    and resume uploading. Uses the TUS open file uploading protocol (https://tus.io/).

    Implements the following protocols:
    a. A single Data request

    and

    b.1. An Upload-Start request
    b.2.a. The regular TUS protocol requests (Upload-Length + Chunks)
    b.2.b. Upload-Multiple requests
    b.3. An Upload-Finish request

    Requests:
    - Data - POST, no extra headers or 'Upload-Start' + 'Upload-Finish' headers
    - Upload-Start - POST, has an 'Upload-Start' header
    - Upload-Length - POST, has an 'Upload-Length' header (read the TUS protocol)
    - Chunk - HEAD/PATCH (read the TUS protocol)
    - Upload-Finish - POST, has an 'Upload-Finish' header
    - Upload-Multiple - POST, has a 'Upload-Multiple' header
    """

    _tus_api_version = '1.0.0'
    _tus_api_version_supported = ['1.0.0']
    _tus_api_extensions = []
    _base_tus_headers = {
        'Tus-Resumable': _tus_api_version,
        'Tus-Version': ",".join(_tus_api_version_supported),
        'Tus-Extension': ",".join(_tus_api_extensions),
        'Tus-Max-Size': str(TusFile.TusMeta.MAX_FILE_SIZE),
        'Access-Control-Allow-Origin': "*",
        'Access-Control-Allow-Methods': "PATCH,HEAD,GET,POST,OPTIONS",
        'Access-Control-Expose-Headers': "Tus-Resumable,upload-length,upload-metadata,Location,Upload-Offset",
        'Access-Control-Allow-Headers': "Tus-Resumable,upload-length,upload-metadata,Location,Upload-Offset,content-type",
        'Cache-Control': 'no-store'
    }

    def _tus_response(self, status, data=None, extra_headers=None):
        response = Response(data, status)
        for key, value in self._base_tus_headers.items():
            response.__setitem__(key, value)
        if extra_headers:
            for key, value in extra_headers.items():
                response.__setitem__(key, value)
        return response

    def upload_data(self, request: ExtendedRequest):
        tus_request = request.headers.get('Upload-Length', None) is not None or request.method == 'OPTIONS'
        bulk_file_upload = request.headers.get('Upload-Multiple', None) is not None
        start_upload = request.headers.get('Upload-Start', None) is not None
        finish_upload = request.headers.get('Upload-Finish', None) is not None
        one_request_upload = start_upload and finish_upload
        if one_request_upload or finish_upload:
            return self.upload_finished(request)
        elif start_upload:
            return self.upload_started(request)
        elif tus_request:
            return self.init_tus_upload(request)
        elif bulk_file_upload:
            return self.append_files(request)
        else: # backward compatibility case - no upload headers were found
            return self.upload_finished(request)

    def should_result_file_be_replaced(self) -> bool:
        return self.action in ("data", "append_data_chunk")

    def init_tus_upload(self, request: ExtendedRequest):
        if request.method == 'OPTIONS':
            return self._tus_response(status=status.HTTP_204_NO_CONTENT)

        upload_dir = Path(self.get_upload_dir())

        try:
            metadata = TusFile.TusMeta.from_request(request)
        except TusTooLargeFileError:
            return self._tus_response(
                status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                data=f"File size exceeds max limit of {TusFile.TusMeta.MAX_FILE_SIZE} bytes"
            )

        replaceable_result_file = self.should_result_file_be_replaced()

        if replaceable_result_file:
            if not metadata.filename:
                return self._tus_response(
                    status=status.HTTP_400_BAD_REQUEST,
                    data="Metadata is expected to contain 'filename' key"
                )

            try:
                self.validate_uploaded_file_name(filename=metadata.filename, upload_dir=upload_dir)
            except UploadedFileError:
                return Response(
                    status=status.HTTP_400_BAD_REQUEST,
                    data=f"File name {metadata.filename} is not allowed",
                    content_type="text/plain"
                )

            if (upload_dir / metadata.filename).exists():
                return self._tus_response(
                    status=status.HTTP_409_CONFLICT,
                    data="File with same name already exists"
                )

        tus_file = TusFile.create_file(
            metadata=metadata, upload_dir=upload_dir, user_id=request.user.id
        )

        location = request.build_absolute_uri()
        if 'HTTP_X_FORWARDED_HOST' not in request.META:
            location = request.META.get('HTTP_ORIGIN') + request.META.get('PATH_INFO')

        # FUTURE-TODO: migrate to common TMP cache where files
        # are deleted automatically by a periodic background job
        if self.action in ("annotations", "dataset") and str(upload_dir) != TmpDirManager.TMP_ROOT:
            scheduler = django_rq.get_scheduler(settings.CVAT_QUEUES.CLEANING.value)
            file_path = upload_dir / (
                tus_file.filename if replaceable_result_file else tus_file.file_id.as_str
            )
            cleaning_job = scheduler.enqueue_in(time_delta=settings.IMPORT_CACHE_CLEAN_DELAY,
                func=clear_import_cache,
                path=file_path,
                creation_time=file_path.stat().st_ctime
            )
            slogger.glob.info(
                f'The cleaning job {cleaning_job.id} is queued.'
                f'The check that the file {file_path} is deleted will be carried out after '
                f'{settings.IMPORT_CACHE_CLEAN_DELAY}.'
            )

        return self._tus_response(
            status=status.HTTP_201_CREATED,
            extra_headers={
                'Location': urljoin(location, tus_file.file_id.as_str),
                'Upload-Filename': tus_file.meta_file.meta.filename if replaceable_result_file else tus_file.file_id.as_str
            }
        )

    def append_tus_chunk(self, request: ExtendedRequest, file_id: str):
        tus_file = TusFile(file_id, upload_dir=Path(self.get_upload_dir()))
        tus_file.meta_file.init_from_file()

        try:
            tus_file.validate(user_id=request.user.id)
        # https://tus.io/protocols/resumable-upload#patch
        except TusFileNotFoundError:
            return self._tus_response(status=status.HTTP_404_NOT_FOUND)
        except TusFileForbiddenError:
            return self._tus_response(status=status.HTTP_403_FORBIDDEN)

        if request.method == 'HEAD':
            return self._tus_response(
                status=status.HTTP_200_OK,
                extra_headers={
                    'Upload-Offset': tus_file.offset,
                    'Upload-Length': tus_file.file_size
                },
            )

        chunk = TusChunk(request)

        if chunk.offset != tus_file.offset:
            return self._tus_response(status=status.HTTP_409_CONFLICT)

        if chunk.offset > tus_file.file_size:
            return self._tus_response(status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)

        tus_file.write_chunk(chunk)

        if tus_file.is_complete():
            if self.should_result_file_be_replaced():
                tus_file.rename()
            tus_file.clean()

        return self._tus_response(
            status=status.HTTP_204_NO_CONTENT,
            extra_headers={
                'Upload-Offset': tus_file.offset,
            }
        )

    def validate_uploaded_file_name(self, *, filename: str, upload_dir: Path) -> None:
        """Checks the file name to be valid"""

        file_path = upload_dir / filename
        if not file_path.resolve().is_relative_to(upload_dir):
            raise UploadedFileError

    def get_upload_dir(self) -> str:
        return self._object.data.get_upload_dirname()

    def _get_request_client_files(self, request: ExtendedRequest):
        serializer = DataSerializer(self._object, data=request.data)
        serializer.is_valid(raise_exception=True)
        return serializer.validated_data.get('client_files')

    def append_files(self, request: ExtendedRequest):
        """
        Processes a single or multiple files sent in a single request inside
        a file uploading session.
        """

        client_files = self._get_request_client_files(request)
        if client_files:
            upload_dir = self.get_upload_dir()
            for client_file in client_files:
                filename = client_file['file'].name
                try:
                    self.validate_uploaded_file_name(filename=filename, upload_dir=Path(upload_dir))
                except UploadedFileError:
                    return Response(
                        status=status.HTTP_400_BAD_REQUEST,
                        data=f"File name {filename} is not allowed",
                        content_type="text/plain"
                    )

                with open(os.path.join(upload_dir, filename), 'ab+') as destination:
                    shutil.copyfileobj(client_file['file'], destination)

        return Response(status=status.HTTP_200_OK)

    def upload_started(self, request: ExtendedRequest):
        """
        Allows to do actions before upcoming file uploading.
        """
        return Response(status=status.HTTP_202_ACCEPTED)

    def upload_finished(self, request: ExtendedRequest):
        """
        Allows to process uploaded files.
        """

        raise NotImplementedError('Must be implemented in the derived class')

class PartialUpdateModelMixin:
    """
    Update fields of a model instance.

    Almost the same as UpdateModelMixin, but has no public PUT / update() method.
    """

    def _update(self, request: ExtendedRequest, *args, **kwargs):
        # This method must not be named "update" not to be matched with the PUT method
        return mixins.UpdateModelMixin.update(self, request, *args, **kwargs)

    def perform_update(self, serializer):
        mixins.UpdateModelMixin.perform_update(self, serializer=serializer)

    def partial_update(self, request: ExtendedRequest, *args, **kwargs):
        with mock.patch.object(self, 'update', new=self._update, create=True):
            return mixins.UpdateModelMixin.partial_update(self, request=request, *args, **kwargs)

class DatasetMixin:
    @extend_schema(
        summary='Initialize process to export resource as a dataset in a specific format',
        description=dedent("""\
             The request `POST /api/<projects|tasks|jobs>/id/dataset/export` will initialize
             a background process to export a dataset. To check status of the process
             please, use `GET /api/requests/<rq_id>` where **rq_id** is request ID returned in the response for this endpoint.
         """),
        parameters=[
            OpenApiParameter('format', location=OpenApiParameter.QUERY,
                description='Desired output format name\nYou can get the list of supported formats at:\n/server/annotation/formats',
                type=OpenApiTypes.STR, required=True),
            OpenApiParameter('filename', description='Desired output file name',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False),
            OpenApiParameter('location', description='Where need to save downloaded dataset',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False,
                enum=Location.list()),
            OpenApiParameter('cloud_storage_id', description='Storage id',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.INT, required=False),
            OpenApiParameter('save_images', description='Include images or not',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.BOOL, required=False, default=False),
        ],
        request=OpenApiTypes.NONE,
        responses={
            '202': OpenApiResponse(response=RqIdSerializer, description='Exporting has been started'),
            '405': OpenApiResponse(description='Format is not available'),
            '409': OpenApiResponse(RqIdSerializer, description='Exporting is already in progress'),
        },
    )
    @action(detail=True, methods=['POST'], serializer_class=None, url_path='dataset/export')
    def initiate_dataset_export(self, request: ExtendedRequest, pk: int):
        self._object = self.get_object() # force call of check_object_permissions()

        export_manager = DatasetExporter(request=request, db_instance=self._object)
        return export_manager.enqueue_job()

    @extend_schema(summary='Download a prepared dataset file',
        parameters=[
            OpenApiParameter('rq_id', description='Request ID',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=True),
        ],
        responses={
            '200': OpenApiResponse(description='Download of file started'),
        },
        exclude=True, # private API endpoint that should be used only as result_url
    )
    @action(methods=['GET'], detail=True, url_path='dataset/download')
    def download_dataset(self, request: ExtendedRequest, pk: int):
        obj = self.get_object()  # force to call check_object_permissions

        downloader = DatasetExporter(request=request, db_instance=obj).get_downloader()
        return downloader.download_file()


class BackupMixin:

    @extend_schema(summary='Initiate process to backup resource',
        description=dedent("""\
             The request `POST /api/<projects|tasks>/id/backup/export` will initialize
             a background process to backup a resource. To check status of the process
             please, use `GET /api/requests/<rq_id>` where **rq_id** is request ID returned in the response for this endpoint.
         """),
        parameters=[
            OpenApiParameter('filename', description='Backup file name',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False),
            OpenApiParameter('location', description='Where need to save downloaded backup',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False,
                enum=Location.list()),
            OpenApiParameter('cloud_storage_id', description='Storage id',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.INT, required=False),
        ],
        request=OpenApiTypes.NONE,
        responses={
            '202': OpenApiResponse(response=RqIdSerializer, description='Creating a backup file has been started'),
            '400': OpenApiResponse(description='Wrong query parameters were passed'),
            '409': OpenApiResponse(RqIdSerializer, description='The backup process has already been initiated and is not yet finished'),
        },
    )
    @action(detail=True, methods=['POST'], serializer_class=None, url_path='backup/export')
    def initiate_backup_export(self, request: ExtendedRequest, pk: int):
        db_object = self.get_object() # force to call check_object_permissions
        export_manager = BackupExporter(request=request, db_instance=db_object)
        return export_manager.enqueue_job()


    @extend_schema(summary='Download a prepared backup file',
        parameters=[
            OpenApiParameter('rq_id', description='Request ID',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=True),
        ],
        responses={
            '200': OpenApiResponse(description='Download of file started'),
        },
        exclude=True, # private API endpoint that should be used only as result_url
    )
    @action(methods=['GET'], detail=True, url_path='backup/download')
    def download_backup(self, request: ExtendedRequest, pk: int):
        obj = self.get_object()  # force to call check_object_permissions

        downloader = BackupExporter(request=request, db_instance=obj).get_downloader()
        return downloader.download_file()
