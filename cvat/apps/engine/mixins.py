# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import os
import os.path
import shutil
from pathlib import Path
from textwrap import dedent
from unittest import mock
from urllib.parse import urljoin

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
from cvat.apps.engine.tus import (
    TusChunk,
    TusFile,
    TusFileForbiddenError,
    TusFileNotFoundError,
    TusTooLargeFileError,
)
from cvat.apps.engine.types import ExtendedRequest
from cvat.apps.redis_handler.serializers import RqIdSerializer

slogger = ServerLogManager(__name__)

class UploadedFileError(ValueError):
    pass

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

        if chunk.end_offset > tus_file.file_size:
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
            OpenApiParameter('lightweight',
                description='Makes a lightweight backup (without media files) for tasks whose media is located in cloud storage',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.BOOL, required=False, default=True),
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
