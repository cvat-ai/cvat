# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import base64
import json
import os
import os.path
import uuid
from collections.abc import Mapping
from dataclasses import asdict, dataclass
from pathlib import Path
from tempfile import NamedTemporaryFile
from textwrap import dedent
from typing import Any, Callable, Optional
from unittest import mock
from urllib.parse import urljoin

import django_rq
from attr.converters import to_bool
from django.conf import settings
from django.http import HttpRequest
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework import mixins, status
from rest_framework.authentication import SessionAuthentication
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from cvat.apps.engine.background import BackupExportManager, DatasetExportManager
from cvat.apps.engine.handlers import clear_import_cache
from cvat.apps.engine.location import StorageType, get_location_configuration
from cvat.apps.engine.log import ServerLogManager
from cvat.apps.engine.models import Location, RequestAction, RequestSubresource, RequestTarget
from cvat.apps.engine.rq_job_handler import RQId
from cvat.apps.engine.serializers import DataSerializer, RqIdSerializer
from cvat.apps.engine.utils import is_dataset_export

slogger = ServerLogManager(__name__)

class TusFile:
    @dataclass
    class TusMeta:
        metadata: dict
        filename: str
        file_size: int
        offset: int = 0

    class TusMetaFile():
        def __init__(self, path) -> None:
            self._path = path
            self._meta = None
            if os.path.exists(self._path):
                self._meta = self._read()

        @property
        def meta(self):
            return self._meta

        @meta.setter
        def meta(self, meta):
            self._meta = meta

        def _read(self):
            with open(self._path, "r") as fp:
                data = json.load(fp)
            return TusFile.TusMeta(**data)

        def save(self):
            if self._meta is not None:
                os.makedirs(os.path.dirname(self._path), exist_ok=True)
                with open(self._path, "w") as fp:
                    json.dump(asdict(self._meta), fp)

        def exists(self):
            return os.path.exists(self._path)

        def delete(self):
            os.remove(self._path)

    def __init__(self, file_id, upload_dir, meta=None):
        self.file_id = file_id
        self.upload_dir = upload_dir
        self.file_path = os.path.join(self.upload_dir, self.file_id)
        self.meta_file = self.TusMetaFile(self._get_tus_meta_file_path(file_id, upload_dir))
        if meta is not None:
            self.meta_file.meta = meta
            self.meta_file.save()

    @property
    def filename(self):
        return self.meta_file.meta.filename

    @property
    def file_size(self):
        return self.meta_file.meta.file_size

    @property
    def offset(self):
        return self.meta_file.meta.offset

    def exists(self):
        return self.meta_file.exists()

    @staticmethod
    def _get_tus_meta_file_path(file_id, upload_dir):
        return os.path.join(upload_dir, f"{file_id}.meta")

    def init_file(self):
        os.makedirs(self.upload_dir, exist_ok=True)
        file_path = os.path.join(self.upload_dir, self.file_id)
        with open(file_path, 'wb') as file:
            file.seek(self.file_size - 1)
            file.write(b'\0')

    def write_chunk(self, chunk):
        with open(self.file_path, 'r+b') as file:
            file.seek(chunk.offset)
            file.write(chunk.content)
        self.meta_file.meta.offset += chunk.size
        self.meta_file.save()

    def is_complete(self):
        return self.offset == self.file_size

    def rename(self):
        file_path = os.path.join(self.upload_dir, self.filename)
        if os.path.lexists(file_path):
            original_file_name, extension = os.path.splitext(self.filename)
            file_amount = 1
            while os.path.lexists(os.path.join(self.upload_dir, self.filename)):
                self.meta_file.meta.filename = "{}_{}{}".format(original_file_name, file_amount, extension)
                file_path = os.path.join(self.upload_dir, self.filename)
                file_amount += 1
        os.rename(self.file_path, file_path)

    def clean(self):
        self.meta_file.delete()

    @staticmethod
    def create_file(metadata, file_size, upload_dir):
        file_id = str(uuid.uuid4())
        filename = metadata.get("filename")

        tus_file = TusFile(
            file_id,
            upload_dir,
            TusFile.TusMeta(
                filename=filename,
                file_size=file_size,
                offset=0,
                metadata=metadata,
            ),
        )
        tus_file.init_file()

        return tus_file

class TusChunk:
    def __init__(self, request):
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
    _tus_max_file_size = str(settings.TUS_MAX_FILE_SIZE)
    _base_tus_headers = {
        'Tus-Resumable': _tus_api_version,
        'Tus-Version': ",".join(_tus_api_version_supported),
        'Tus-Extension': ",".join(_tus_api_extensions),
        'Tus-Max-Size': _tus_max_file_size,
        'Access-Control-Allow-Origin': "*",
        'Access-Control-Allow-Methods': "PATCH,HEAD,GET,POST,OPTIONS",
        'Access-Control-Expose-Headers': "Tus-Resumable,upload-length,upload-metadata,Location,Upload-Offset",
        'Access-Control-Allow-Headers': "Tus-Resumable,upload-length,upload-metadata,Location,Upload-Offset,content-type",
        'Cache-Control': 'no-store'
    }
    file_id_regex = r'(?P<file_id>\b[0-9a-f]{8}\b-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\b[0-9a-f]{12}\b)'

    def _tus_response(self, status, data=None, extra_headers=None):
        response = Response(data, status)
        for key, value in self._base_tus_headers.items():
            response.__setitem__(key, value)
        if extra_headers:
            for key, value in extra_headers.items():
                response.__setitem__(key, value)
        return response

    def _get_metadata(self, request):
        metadata = {}
        if request.META.get("HTTP_UPLOAD_METADATA"):
            for kv in request.META.get("HTTP_UPLOAD_METADATA").split(","):
                splited_metadata = kv.split(" ")
                if len(splited_metadata) == 2:
                    key, value = splited_metadata
                    value = base64.b64decode(value)
                    if isinstance(value, bytes):
                        value = value.decode()
                    metadata[key] = value
                else:
                    metadata[splited_metadata[0]] = ""
        return metadata

    def upload_data(self, request):
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

    def init_tus_upload(self, request):
        if request.method == 'OPTIONS':
            return self._tus_response(status=status.HTTP_204)
        else:
            metadata = self._get_metadata(request)
            filename = metadata.get('filename', '')
            if not self.is_valid_uploaded_file_name(filename):
                return self._tus_response(status=status.HTTP_400_BAD_REQUEST,
                    data="File name {} is not allowed".format(filename))


            message_id = request.META.get("HTTP_MESSAGE_ID")
            if message_id:
                metadata["message_id"] = base64.b64decode(message_id)

            import_type = request.path.strip('/').split('/')[-1]
            if import_type == 'backup':
                # we need to create unique temp file here because
                # users can try to import backups with the same name at the same time
                with NamedTemporaryFile(prefix=f'cvat-backup-{filename}-by-{request.user}', suffix='.zip', dir=self.get_upload_dir()) as tmp_file:
                    filename = os.path.relpath(tmp_file.name, self.get_upload_dir())
                metadata['filename'] = filename
            file_path = os.path.join(self.get_upload_dir(), filename)
            file_exists = os.path.lexists(file_path) and import_type != 'backup'

            if file_exists:
                # check whether the rq_job is in progress or has been finished/failed
                object_class_name = self._object.__class__.__name__.lower()
                template = RQId(
                    RequestAction.IMPORT, RequestTarget(object_class_name), self._object.pk,
                    subresource=RequestSubresource(import_type)
                ).render()
                queue = django_rq.get_queue(settings.CVAT_QUEUES.IMPORT_DATA.value)
                finished_job_ids = queue.finished_job_registry.get_job_ids()
                failed_job_ids = queue.failed_job_registry.get_job_ids()
                if template in finished_job_ids or template in failed_job_ids:
                    os.remove(file_path)
                    file_exists = False

            if file_exists:
                return self._tus_response(status=status.HTTP_409_CONFLICT,
                    data="File with same name already exists")

            file_size = int(request.META.get("HTTP_UPLOAD_LENGTH", "0"))
            if file_size > int(self._tus_max_file_size):
                return self._tus_response(status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    data="File size exceeds max limit of {} bytes".format(self._tus_max_file_size))


            tus_file = TusFile.create_file(metadata, file_size, self.get_upload_dir())

            location = request.build_absolute_uri()
            if 'HTTP_X_FORWARDED_HOST' not in request.META:
                location = request.META.get('HTTP_ORIGIN') + request.META.get('PATH_INFO')

            if import_type in ('backup', 'annotations', 'datasets'):
                scheduler = django_rq.get_scheduler(settings.CVAT_QUEUES.CLEANING.value)
                path = Path(self.get_upload_dir()) / tus_file.filename
                cleaning_job = scheduler.enqueue_in(time_delta=settings.IMPORT_CACHE_CLEAN_DELAY,
                    func=clear_import_cache,
                    path=path,
                    creation_time=Path(tus_file.file_path).stat().st_ctime
                )
                slogger.glob.info(
                    f'The cleaning job {cleaning_job.id} is queued.'
                    f'The check that the file {path} is deleted will be carried out after '
                    f'{settings.IMPORT_CACHE_CLEAN_DELAY}.'
                )

            return self._tus_response(
                status=status.HTTP_201_CREATED,
                extra_headers={'Location': urljoin(location, tus_file.file_id),
                               'Upload-Filename': tus_file.filename})

    def append_tus_chunk(self, request, file_id):
        tus_file = TusFile(str(file_id), self.get_upload_dir())
        if request.method == 'HEAD':
            if tus_file.exists():
                return self._tus_response(status=status.HTTP_200_OK, extra_headers={
                               'Upload-Offset': tus_file.offset,
                               'Upload-Length': tus_file.file_size})
            return self._tus_response(status=status.HTTP_404_NOT_FOUND)

        chunk = TusChunk(request)

        if chunk.offset != tus_file.offset:
            return self._tus_response(status=status.HTTP_409_CONFLICT)

        if chunk.offset > tus_file.file_size:
            return self._tus_response(status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)

        tus_file.write_chunk(chunk)

        if tus_file.is_complete():
            tus_file.rename()
            tus_file.clean()

        return self._tus_response(status=status.HTTP_204_NO_CONTENT,
                                    extra_headers={'Upload-Offset': tus_file.offset,
                                                    'Upload-Filename': tus_file.filename})

    def is_valid_uploaded_file_name(self, filename: str) -> bool:
        """
        Checks the file name to be valid.
        Returns True if the filename is valid, otherwise returns False.
        """

        upload_dir = self.get_upload_dir()
        file_path = os.path.join(upload_dir, filename)
        return os.path.commonprefix((os.path.realpath(file_path), upload_dir)) == upload_dir

    def get_upload_dir(self) -> str:
        return self._object.data.get_upload_dirname()

    def _get_request_client_files(self, request):
        serializer = DataSerializer(self._object, data=request.data)
        serializer.is_valid(raise_exception=True)
        return serializer.validated_data.get('client_files')

    def append_files(self, request):
        """
        Processes a single or multiple files sent in a single request inside
        a file uploading session.
        """

        client_files = self._get_request_client_files(request)
        if client_files:
            upload_dir = self.get_upload_dir()
            for client_file in client_files:
                filename = client_file['file'].name
                if not self.is_valid_uploaded_file_name(filename):
                    return Response(status=status.HTTP_400_BAD_REQUEST,
                        data=f"File name {filename} is not allowed", content_type="text/plain")

                with open(os.path.join(upload_dir, filename), 'ab+') as destination:
                    destination.write(client_file['file'].read())
        return Response(status=status.HTTP_200_OK)

    def upload_started(self, request):
        """
        Allows to do actions before upcoming file uploading.
        """
        return Response(status=status.HTTP_202_ACCEPTED)

    def upload_finished(self, request):
        """
        Allows to process uploaded files.
        """

        raise NotImplementedError('Must be implemented in the derived class')

class PartialUpdateModelMixin:
    """
    Update fields of a model instance.

    Almost the same as UpdateModelMixin, but has no public PUT / update() method.
    """

    def _update(self, request, *args, **kwargs):
        # This method must not be named "update" not to be matched with the PUT method
        return mixins.UpdateModelMixin.update(self, request, *args, **kwargs)

    def perform_update(self, serializer):
        mixins.UpdateModelMixin.perform_update(self, serializer=serializer)

    def partial_update(self, request, *args, **kwargs):
        with mock.patch.object(self, 'update', new=self._update, create=True):
            return mixins.UpdateModelMixin.partial_update(self, request=request, *args, **kwargs)


class DatasetMixin:
    def export_dataset_v1(
        self,
        request,
        save_images: bool,
        *,
        get_data: Optional[Callable[[int], dict[str, Any]]] = None,
    ) -> Response:
        if request.query_params.get("format"):
            callback = self.get_export_callback(save_images)

            dataset_export_manager = DatasetExportManager(self._object, request, callback, save_images=save_images, version=1)
            return dataset_export_manager.export()

        if not get_data:
            return Response("Format is not specified", status=status.HTTP_400_BAD_REQUEST)

        data = get_data(self._object.pk)
        return Response(data)

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
            '409': OpenApiResponse(description='Exporting is already in progress'),
        },
    )
    @action(detail=True, methods=['POST'], serializer_class=None, url_path='dataset/export')
    def export_dataset_v2(self, request: HttpRequest, pk: int):
        self._object = self.get_object() # force call of check_object_permissions()

        save_images = is_dataset_export(request)
        callback = self.get_export_callback(save_images)

        dataset_export_manager = DatasetExportManager(self._object, request, callback, save_images=save_images, version=2)
        return dataset_export_manager.export()

    # FUTURE-TODO: migrate to new API
    def import_annotations(self, request, db_obj, import_func, rq_func, rq_id_factory):
        is_tus_request = request.headers.get('Upload-Length', None) is not None or \
            request.method == 'OPTIONS'
        if is_tus_request:
            return self.init_tus_upload(request)

        conv_mask_to_poly = to_bool(request.query_params.get('conv_mask_to_poly', True))
        location_conf = get_location_configuration(
            db_instance=db_obj,
            query_params=request.query_params,
            field_name=StorageType.SOURCE,
        )

        if location_conf['location'] == Location.CLOUD_STORAGE:
            format_name = request.query_params.get('format')
            file_name = request.query_params.get('filename')

            return import_func(
                request=request,
                rq_id_factory=rq_id_factory,
                rq_func=rq_func,
                db_obj=self._object,
                format_name=format_name,
                location_conf=location_conf,
                filename=file_name,
                conv_mask_to_poly=conv_mask_to_poly,
            )

        return self.upload_data(request)


class BackupMixin:
    def export_backup_v1(self, request: HttpRequest) -> Response:
        db_object = self.get_object() # force to call check_object_permissions

        export_backup_manager = BackupExportManager(db_object, request, version=1)
        response = export_backup_manager.export()

        if request.query_params.get('action') != 'download':
            response.headers['Deprecated'] = True

        return response

    # FUTURE-TODO: migrate to new API
    def import_backup_v1(self, request: HttpRequest, import_func: Callable) -> Response:
        location = request.query_params.get("location", Location.LOCAL)
        if location == Location.CLOUD_STORAGE:
            file_name = request.query_params.get("filename", "")
            return import_func(
                request,
                queue_name=settings.CVAT_QUEUES.IMPORT_DATA.value,
                filename=file_name,
            )
        return self.upload_data(request)

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
            '409': OpenApiResponse(description='The backup process has already been initiated and is not yet finished'),
        },
    )
    @action(detail=True, methods=['POST'], serializer_class=None, url_path='backup/export')
    def export_backup_v2(self, request: HttpRequest, pk: int):
        db_object = self.get_object() # force to call check_object_permissions

        export_backup_manager = BackupExportManager(db_object, request, version=2)
        return export_backup_manager.export()


class CsrfWorkaroundMixin(APIView):
    """
    Disables session authentication for GET/HEAD requests
    for which csrf_workaround_is_needed returns True.

    csrf_workaround_is_needed is supposed to be overridden by each view.

    This only exists to mitigate CSRF attacks on several known endpoints that
    perform side effects in response to GET requests. Do not use this in
    new code: instead, make sure that all endpoints with side effects use
    a method other than GET/HEAD. Then Django's built-in CSRF protection
    will cover them.
    """

    @staticmethod
    def csrf_workaround_is_needed(query_params: Mapping[str, str]) -> bool:
        return False

    def get_authenticators(self):
        authenticators = super().get_authenticators()

        if (
            self.request and
            # Don't apply the workaround for requests from unit tests, since
            # they can only use session authentication.
            not getattr(self.request, "_dont_enforce_csrf_checks", False) and
            self.request.method in ("GET", "HEAD") and
            self.csrf_workaround_is_needed(self.request.GET)
        ):
            authenticators = [a for a in authenticators if not isinstance(a, SessionAuthentication)]

        return authenticators
