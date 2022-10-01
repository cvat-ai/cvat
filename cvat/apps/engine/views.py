# Copyright (C) 2018-2022 Intel Corporation
# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import errno
import io
import os
import os.path as osp
import pytz
import shutil
import traceback
from datetime import datetime
from distutils.util import strtobool
from tempfile import mkstemp, NamedTemporaryFile

import cv2
from django.db.models.query import Prefetch
from django.shortcuts import get_object_or_404
import django_rq
from django.apps import apps
from django.conf import settings
from django.contrib.auth.models import User
from django.db import IntegrityError
from django.http import HttpResponse, HttpResponseNotFound, HttpResponseBadRequest
from django.utils import timezone

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import (
    OpenApiParameter, OpenApiResponse, PolymorphicProxySerializer,
    extend_schema_view, extend_schema
)
from drf_spectacular.plumbing import build_array_type, build_basic_type

from rest_framework import mixins, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import APIException, NotFound, ValidationError
from rest_framework.permissions import SAFE_METHODS
from rest_framework.renderers import JSONRenderer
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django_sendfile import sendfile

from cvat.apps.webhooks.signals import signal_create, signal_update
import cvat.apps.dataset_manager as dm
import cvat.apps.dataset_manager.views  # pylint: disable=unused-import
from cvat.apps.engine.cloud_provider import (
    db_storage_to_storage_instance, import_from_cloud_storage, export_to_cloud_storage,
    Status as CloudStorageStatus
)
from cvat.apps.dataset_manager.bindings import CvatImportError
from cvat.apps.dataset_manager.serializers import DatasetFormatsSerializer
from cvat.apps.engine.frame_provider import FrameProvider
from cvat.apps.engine.media_extractors import ImageListReader
from cvat.apps.engine.mime_types import mimetypes
from cvat.apps.engine.media_extractors import get_mime
from cvat.apps.engine.models import (
    Job, Task, Project, Issue, Data,
    Comment, StorageMethodChoice, StorageChoice, Image,
    CloudProviderChoice, Location
)
from cvat.apps.engine.models import CloudStorage as CloudStorageModel
from cvat.apps.engine.serializers import (
    AboutSerializer, AnnotationFileSerializer, BasicUserSerializer,
    DataMetaReadSerializer, DataMetaWriteSerializer, DataSerializer, ExceptionSerializer,
    FileInfoSerializer, JobReadSerializer, JobWriteSerializer, LabeledDataSerializer,
    LogEventSerializer, ProjectReadSerializer, ProjectWriteSerializer, ProjectSearchSerializer,
    RqStatusSerializer, TaskReadSerializer, TaskWriteSerializer, UserSerializer, PluginsSerializer, IssueReadSerializer,
    IssueWriteSerializer, CommentReadSerializer, CommentWriteSerializer, CloudStorageWriteSerializer,
    CloudStorageReadSerializer, DatasetFileSerializer, JobCommitSerializer,
    ProjectFileSerializer, TaskFileSerializer)

from utils.dataset_manifest import ImageManifestManager
from cvat.apps.engine.utils import av_scan_paths, process_failed_job, configure_dependent_job
from cvat.apps.engine import backup
from cvat.apps.engine.mixins import PartialUpdateModelMixin, UploadMixin, AnnotationMixin, SerializeMixin, DestroyModelMixin
from cvat.apps.engine.location import get_location_configuration, StorageType

from . import models, task
from .log import clogger, slogger
from cvat.apps.iam.permissions import (CloudStoragePermission,
    CommentPermission, IssuePermission, JobPermission, ProjectPermission,
    TaskPermission, UserPermission)


@extend_schema(tags=['server'])
class ServerViewSet(viewsets.ViewSet):
    serializer_class = None
    iam_organization_field = None

    # To get nice documentation about ServerViewSet actions it is necessary
    # to implement the method. By default, ViewSet doesn't provide it.
    def get_serializer(self, *args, **kwargs):
        pass

    @staticmethod
    @extend_schema(summary='Method provides basic CVAT information',
        responses={
            '200': AboutSerializer,
        })
    @action(detail=False, methods=['GET'], serializer_class=AboutSerializer,
        permission_classes=[] # This endpoint is available for everyone
    )
    def about(request):
        from cvat import __version__ as cvat_version
        about = {
            "name": "Computer Vision Annotation Tool",
            "version": cvat_version,
            "description": "CVAT is completely re-designed and re-implemented " +
                "version of Video Annotation Tool from Irvine, California " +
                "tool. It is free, online, interactive video and image annotation " +
                "tool for computer vision. It is being used by our team to " +
                "annotate million of objects with different properties. Many UI " +
                "and UX decisions are based on feedbacks from professional data " +
                "annotation team."
        }
        serializer = AboutSerializer(data=about)
        if serializer.is_valid(raise_exception=True):
            return Response(data=serializer.data)

    @staticmethod
    @extend_schema(summary='Method saves an exception from a client on the server',
        description='Sends logs to the ELK if it is connected',
        request=ExceptionSerializer, responses={
            '201': ExceptionSerializer,
        })
    @action(detail=False, methods=['POST'], serializer_class=ExceptionSerializer)
    def exception(request):
        serializer = ExceptionSerializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            additional_info = {
                "username": request.user.username,
                "name": "Send exception",
            }
            message = JSONRenderer().render({**serializer.data, **additional_info}).decode('UTF-8')
            jid = serializer.data.get("job_id")
            tid = serializer.data.get("task_id")
            if jid:
                clogger.job[jid].error(message)
            elif tid:
                clogger.task[tid].error(message)
            else:
                clogger.glob.error(message)

            return Response(serializer.data, status=status.HTTP_201_CREATED)

    @staticmethod
    @extend_schema(summary='Method saves logs from a client on the server',
        description='Sends logs to the ELK if it is connected',
        request=LogEventSerializer(many=True),
        responses={
            '201': LogEventSerializer(many=True),
        })
    @action(detail=False, methods=['POST'], serializer_class=LogEventSerializer)
    def logs(request):
        serializer = LogEventSerializer(many=True, data=request.data)
        if serializer.is_valid(raise_exception=True):
            user = { "username": request.user.username }
            for event in serializer.data:
                message = JSONRenderer().render({**event, **user}).decode('UTF-8')
                jid = event.get("job_id")
                tid = event.get("task_id")
                if jid:
                    clogger.job[jid].info(message)
                elif tid:
                    clogger.task[tid].info(message)
                else:
                    clogger.glob.info(message)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

    @staticmethod
    @extend_schema(
        summary='Returns all files and folders that are on the server along specified path',
        parameters=[
            OpenApiParameter('directory', description='Directory to browse',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR)
        ],
        responses={
            '200' : FileInfoSerializer(many=True)
        })
    @action(detail=False, methods=['GET'], serializer_class=FileInfoSerializer)
    def share(request):
        param = request.query_params.get('directory', '/')
        if param.startswith("/"):
            param = param[1:]
        directory = os.path.abspath(os.path.join(settings.SHARE_ROOT, param))

        if directory.startswith(settings.SHARE_ROOT) and os.path.isdir(directory):
            data = []
            content = os.scandir(directory)
            for entry in content:
                entry_type = None
                entry_mime_type = None
                if entry.is_file():
                    entry_type = "REG"
                    entry_mime_type = get_mime(os.path.join(settings.SHARE_ROOT, entry))
                elif entry.is_dir():
                    entry_type = "DIR"
                    entry_mime_type = "DIR"

                if entry_type:
                    data.append({
                        "name": entry.name,
                        "type": entry_type,
                        "mime_type": entry_mime_type,
                    })

            serializer = FileInfoSerializer(many=True, data=data)
            if serializer.is_valid(raise_exception=True):
                return Response(serializer.data)
        else:
            return Response("{} is an invalid directory".format(param),
                status=status.HTTP_400_BAD_REQUEST)

    @staticmethod
    @extend_schema(
        summary='Method provides the list of supported annotations formats',
        responses={
            '200': DatasetFormatsSerializer,
        })
    @action(detail=False, methods=['GET'], url_path='annotation/formats')
    def annotation_formats(request):
        data = dm.views.get_all_formats()
        return Response(DatasetFormatsSerializer(data).data)

    @staticmethod
    @extend_schema(
        summary='Method provides allowed plugins',
        responses={
            '200': PluginsSerializer,
        })
    @action(detail=False, methods=['GET'], url_path='plugins', serializer_class=PluginsSerializer)
    def plugins(request):
        response = {
            'GIT_INTEGRATION': apps.is_installed('cvat.apps.dataset_repo'),
            'ANALYTICS': strtobool(os.environ.get("CVAT_ANALYTICS", '0')),
            'MODELS': strtobool(os.environ.get("CVAT_SERVERLESS", '0')),
            'PREDICT':False # FIXME: it is unused anymore (for UI only)
        }
        return Response(response)

@extend_schema(tags=['projects'])
@extend_schema_view(
    list=extend_schema(
        summary='Returns a paginated list of projects according to query parameters (12 projects per page)',
        responses={
            '200': PolymorphicProxySerializer(component_name='PolymorphicProject',
                serializers=[
                    ProjectReadSerializer, ProjectSearchSerializer,
                ], resource_type_field_name=None, many=True),
        }),
    create=extend_schema(
        summary='Method creates a new project',
        # request=ProjectWriteSerializer,
        responses={
            '201': ProjectReadSerializer, # check ProjectWriteSerializer.to_representation
        }),
    retrieve=extend_schema(
        summary='Method returns details of a specific project',
        responses={
            '200': ProjectReadSerializer,
        }),
    destroy=extend_schema(
        summary='Method deletes a specific project',
        responses={
            '204': OpenApiResponse(description='The project has been deleted'),
        }),
    partial_update=extend_schema(
        summary='Methods does a partial update of chosen fields in a project',
        # request=ProjectWriteSerializer,
        responses={
            '200': ProjectReadSerializer, # check ProjectWriteSerializer.to_representation
        })
)
class ProjectViewSet(viewsets.GenericViewSet, mixins.ListModelMixin,
    mixins.RetrieveModelMixin, mixins.CreateModelMixin, DestroyModelMixin,
    PartialUpdateModelMixin, UploadMixin, AnnotationMixin, SerializeMixin
):
    queryset = models.Project.objects.prefetch_related(Prefetch('label_set',
        queryset=models.Label.objects.order_by('id')
    ))

    # NOTE: The search_fields attribute should be a list of names of text
    # type fields on the model,such as CharField or TextField
    search_fields = ('name', 'owner', 'assignee', 'status')
    filter_fields = list(search_fields) + ['id', 'updated_date']
    ordering_fields = filter_fields
    ordering = "-id"
    lookup_fields = {'owner': 'owner__username', 'assignee': 'assignee__username'}
    iam_organization_field = 'organization'

    def get_serializer_class(self):
        # TODO: fix separation into read and write serializers for requests and responses
        # probably with drf-rw-serializers
        if self.request.path.endswith('tasks'):
            return TaskReadSerializer
        else:
            if self.request.method in SAFE_METHODS:
                return ProjectReadSerializer
            else:
                return ProjectWriteSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == 'list':
            perm = ProjectPermission.create_scope_list(self.request)
            queryset = perm.filter(queryset)
        return queryset

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user,
            organization=self.request.iam_context['organization'])
        signal_create.send(self, instance=serializer.instance)

    @extend_schema(
        summary='Method returns information of the tasks of the project with the selected id',
        responses={
            '200': TaskReadSerializer(many=True),
        })
    @action(detail=True, methods=['GET'], serializer_class=TaskReadSerializer)
    def tasks(self, request, pk):
        self.get_object() # force to call check_object_permissions
        queryset = Task.objects.filter(project_id=pk).order_by('-id')

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True,
                context={"request": request})
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True,
            context={"request": request})
        return Response(serializer.data)


    @extend_schema(methods=['GET'], summary='Export project as a dataset in a specific format',
        parameters=[
            OpenApiParameter('format', description='Desired output format name\n'
                'You can get the list of supported formats at:\n/server/annotation/formats',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False),
            OpenApiParameter('filename', description='Desired output file name',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False),
            OpenApiParameter('action', description='Used to start downloading process after annotation file had been created',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False, enum=['download', 'import_status']),
            OpenApiParameter('location', description='Where need to save downloaded dataset',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False,
                enum=Location.list()),
            OpenApiParameter('cloud_storage_id', description='Storage id',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.NUMBER, required=False),
            OpenApiParameter('use_default_location', description='Use the location that was configured in project to import dataset',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.BOOL, required=False,
                default=True),
        ],
        responses={
            '200': OpenApiResponse(OpenApiTypes.BINARY, description='Download of file started'),
            '201': OpenApiResponse(description='Output file is ready for downloading'),
            '202': OpenApiResponse(description='Exporting has been started'),
            '405': OpenApiResponse(description='Format is not available'),
        })
    @extend_schema(methods=['POST'], summary='Import dataset in specific format as a project',
        parameters=[
            OpenApiParameter('format', description='Desired dataset format name\n'
                'You can get the list of supported formats at:\n/server/annotation/formats',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False),
            OpenApiParameter('location', description='Where to import the dataset from',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False,
                enum=Location.list()),
            OpenApiParameter('cloud_storage_id', description='Storage id',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.NUMBER, required=False),
            OpenApiParameter('use_default_location', description='Use the location that was configured in the project to import annotations',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.BOOL, required=False,
                default=True),
            OpenApiParameter('filename', description='Dataset file name',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False),
        ],
        request=PolymorphicProxySerializer('DatasetWrite',
            serializers=[DatasetFileSerializer, OpenApiTypes.NONE],
            resource_type_field_name=None
        ),
        responses={
            '202': OpenApiResponse(description='Exporting has been started'),
            '400': OpenApiResponse(description='Failed to import dataset'),
            '405': OpenApiResponse(description='Format is not available'),
        })
    @action(detail=True, methods=['GET', 'POST', 'OPTIONS'], serializer_class=None,
        url_path=r'dataset/?$')
    def dataset(self, request, pk):
        self._object = self.get_object() # force to call check_object_permissions

        if request.method in {'POST', 'OPTIONS'}:

            return self.import_annotations(
                request=request,
                pk=pk,
                db_obj=self._object,
                import_func=_import_project_dataset,
                rq_func=dm.project.import_dataset_as_project,
                rq_id=f"/api/project/{pk}/dataset_import",
            )
        else:
            action = request.query_params.get("action", "").lower()
            if action in ("import_status",):
                queue = django_rq.get_queue("default")
                rq_job = queue.fetch_job(f"/api/project/{pk}/dataset_import")
                if rq_job is None:
                    return Response(status=status.HTTP_404_NOT_FOUND)
                elif rq_job.is_finished:
                    if rq_job.meta['tmp_file_descriptor']: os.close(rq_job.meta['tmp_file_descriptor'])
                    os.remove(rq_job.meta['tmp_file'])
                    if rq_job.dependency:
                        rq_job.dependency.delete()
                    rq_job.delete()
                    return Response(status=status.HTTP_201_CREATED)
                elif rq_job.is_failed or \
                        rq_job.is_deferred and rq_job.dependency and rq_job.dependency.is_failed:
                    exc_info = process_failed_job(rq_job)

                    return Response(
                        data=str(exc_info),
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
                else:
                    return Response(
                        data=self._get_rq_response('default', f'/api/project/{pk}/dataset_import'),
                        status=status.HTTP_202_ACCEPTED
                    )
            else:
                return self.export_annotations(
                    request=request,
                    pk=pk,
                    db_obj=self._object,
                    export_func=_export_annotations,
                    callback=dm.views.export_project_as_dataset
                )

    @extend_schema(methods=['PATCH'],
        operation_id='projects_partial_update_dataset_file',
        summary="Allows to upload a file chunk. "
            "Implements TUS file uploading protocol.",
        request=OpenApiTypes.BINARY,
        responses={}
    )
    @extend_schema(methods=['HEAD'],
        summary="Implements TUS file uploading protocol."
    )
    @action(detail=True, methods=['HEAD', 'PATCH'], url_path='dataset/'+UploadMixin.file_id_regex)
    def append_dataset_chunk(self, request, pk, file_id):
        self._object = self.get_object()
        return self.append_tus_chunk(request, file_id)

    def get_upload_dir(self):
        if 'dataset' in self.action:
            return self._object.get_tmp_dirname()
        elif 'backup' in self.action:
            return backup.get_backup_dirname()
        return ""

    def upload_finished(self, request):
        if self.action == 'dataset':
            format_name = request.query_params.get("format", "")
            filename = request.query_params.get("filename", "")
            tmp_dir = self._object.get_tmp_dirname()
            uploaded_file = None
            if os.path.isfile(os.path.join(tmp_dir, filename)):
                uploaded_file = os.path.join(tmp_dir, filename)
            return _import_project_dataset(
                request=request,
                filename=uploaded_file,
                rq_id=f"/api/project/{self._object.pk}/dataset_import",
                rq_func=dm.project.import_dataset_as_project,
                pk=self._object.pk,
                format_name=format_name,
            )
        elif self.action == 'import_backup':
            filename = request.query_params.get("filename", "")
            if filename:
                tmp_dir = backup.get_backup_dirname()
                backup_file = os.path.join(tmp_dir, filename)
                if os.path.isfile(backup_file):
                    return backup.import_project(request, filename=backup_file)
                return Response(data='No such file were uploaded',
                        status=status.HTTP_400_BAD_REQUEST)
            return backup.import_project(request)
        return Response(data='Unknown upload was finished',
                        status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(summary='Method allows to download project annotations',
        parameters=[
            OpenApiParameter('format', description='Desired output format name\n'
                'You can get the list of supported formats at:\n/server/annotation/formats',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=True),
            OpenApiParameter('filename', description='Desired output file name',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False),
            OpenApiParameter('action', description='Used to start downloading process after annotation file had been created',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False, enum=['download']),
            OpenApiParameter('location', description='Where need to save downloaded dataset',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False,
                enum=Location.list()),
            OpenApiParameter('cloud_storage_id', description='Storage id',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.NUMBER, required=False),
            OpenApiParameter('use_default_location', description='Use the location that was configured in project to export annotation',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.BOOL, required=False,
                default=True),
        ],
        responses={
            '200': OpenApiResponse(PolymorphicProxySerializer(
                component_name='AnnotationsRead',
                serializers=[LabeledDataSerializer, OpenApiTypes.BINARY],
                resource_type_field_name=None
            ), description='Download of file started'),
            '201': OpenApiResponse(description='Annotations file is ready to download'),
            '202': OpenApiResponse(description='Dump of annotations has been started'),
            '401': OpenApiResponse(description='Format is not specified'),
            '405': OpenApiResponse(description='Format is not available'),
        })
    @action(detail=True, methods=['GET'],
        serializer_class=LabeledDataSerializer)
    def annotations(self, request, pk):
        self._object = self.get_object() # force to call check_object_permissions
        return self.export_annotations(
            request=request,
            pk=pk,
            db_obj=self._object,
            export_func=_export_annotations,
            callback=dm.views.export_project_annotations,
            get_data=dm.task.get_job_data,
        )

    @extend_schema(summary='Methods creates a backup copy of a project',
        parameters=[
            OpenApiParameter('action', location=OpenApiParameter.QUERY,
                description='Used to start downloading process after backup file had been created',
                type=OpenApiTypes.STR, required=False, enum=['download']),
            OpenApiParameter('filename', description='Backup file name',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False),
            OpenApiParameter('location', description='Where need to save downloaded backup',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False,
                enum=Location.list()),
            OpenApiParameter('cloud_storage_id', description='Storage id',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.NUMBER, required=False),
            OpenApiParameter('use_default_location', description='Use the location that was configured in project to export backup',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.BOOL, required=False,
                default=True),
        ],
        responses={
            '200': OpenApiResponse(description='Download of file started'),
            '201': OpenApiResponse(description='Output backup file is ready for downloading'),
            '202': OpenApiResponse(description='Creating a backup file has been started'),
        })
    @action(methods=['GET'], detail=True, url_path='backup')
    def export_backup(self, request, pk=None):
        return self.serialize(request, backup.export)

    @extend_schema(summary='Methods create a project from a backup',
        parameters=[
            OpenApiParameter('location', description='Where to import the backup file from',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False,
                enum=Location.list(), default=Location.LOCAL),
            OpenApiParameter('cloud_storage_id', description='Storage id',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.NUMBER, required=False),
            OpenApiParameter('filename', description='Backup file name',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False),
        ],
        request=PolymorphicProxySerializer('BackupWrite',
            serializers=[ProjectFileSerializer, OpenApiTypes.NONE],
            resource_type_field_name=None
        ),
        responses={
            '201': OpenApiResponse(description='The project has been imported'), # or better specify {id: project_id}
            '202': OpenApiResponse(description='Importing a backup file has been started'),
        })
    @action(detail=False, methods=['OPTIONS', 'POST'], url_path=r'backup/?$',
        serializer_class=ProjectFileSerializer(required=False))
    def import_backup(self, request, pk=None):
        return self.deserialize(request, backup.import_project)

    @extend_schema(methods=['PATCH'],
        operation_id='projects_partial_update_backup_file',
        summary="Allows to upload a file chunk. "
            "Implements TUS file uploading protocol.",
        request=OpenApiTypes.BINARY,
        responses={}
    )
    @extend_schema(methods=['HEAD'],
        summary="Implements TUS file uploading protocol."
    )
    @action(detail=False, methods=['HEAD', 'PATCH'], url_path='backup/'+UploadMixin.file_id_regex,
        serializer_class=None)
    def append_backup_chunk(self, request, file_id):
        return self.append_tus_chunk(request, file_id)

    @staticmethod
    def _get_rq_response(queue, job_id):
        queue = django_rq.get_queue(queue)
        job = queue.fetch_job(job_id)
        response = {}
        if job is None or job.is_finished:
            response = { "state": "Finished" }
        elif job.is_queued:
            response = { "state": "Queued" }
        elif job.is_failed:
            response = { "state": "Failed", "message": job.exc_info }
        else:
            response = { "state": "Started" }
            response['message'] = job.meta.get('status', '')
            response['progress'] = job.meta.get('progress', 0.)

        return response


class DataChunkGetter:
    def __init__(self, data_type, data_num, data_quality, task_dim):
        possible_data_type_values = ('chunk', 'frame', 'preview', 'context_image')
        possible_quality_values = ('compressed', 'original')

        if not data_type or data_type not in possible_data_type_values:
            raise ValidationError('Data type not specified or has wrong value')
        elif data_type == 'chunk' or data_type == 'frame':
            if not data_num:
                raise ValidationError('Number is not specified')
            elif data_quality not in possible_quality_values:
                raise ValidationError('Wrong quality value')

        self.type = data_type
        self.number = int(data_num) if data_num else None
        self.quality = FrameProvider.Quality.COMPRESSED \
            if data_quality == 'compressed' else FrameProvider.Quality.ORIGINAL

        self.dimension = task_dim


    def __call__(self, request, start, stop, db_data, db_object):
        if not db_data:
            raise NotFound(detail='Cannot find requested data')

        frame_provider = FrameProvider(db_data, self.dimension)

        if self.type == 'chunk':
            start_chunk = frame_provider.get_chunk_number(start)
            stop_chunk = frame_provider.get_chunk_number(stop)
            # pylint: disable=superfluous-parens
            if not (start_chunk <= self.number <= stop_chunk):
                raise ValidationError('The chunk number should be in ' +
                    f'[{start_chunk}, {stop_chunk}] range')

            # TODO: av.FFmpegError processing
            if settings.USE_CACHE and db_data.storage_method == StorageMethodChoice.CACHE:
                buff, mime_type = frame_provider.get_chunk(self.number, self.quality)
                return HttpResponse(buff.getvalue(), content_type=mime_type)

            # Follow symbol links if the chunk is a link on a real image otherwise
            # mimetype detection inside sendfile will work incorrectly.
            path = os.path.realpath(frame_provider.get_chunk(self.number, self.quality))
            return sendfile(request, path)

        elif self.type == 'frame':
            if not (start <= self.number <= stop):
                raise ValidationError('The frame number should be in ' +
                    f'[{start}, {stop}] range')

            buf, mime = frame_provider.get_frame(self.number, self.quality)
            return HttpResponse(buf.getvalue(), content_type=mime)

        elif self.type == 'preview':
            return sendfile(request, db_object.get_preview_path())

        elif self.type == 'context_image':
            if not (start <= self.number <= stop):
                raise ValidationError('The frame number should be in ' +
                    f'[{start}, {stop}] range')

            image = Image.objects.get(data_id=db_data.id, frame=self.number)
            for i in image.related_files.all():
                path = os.path.realpath(str(i.path))
                image = cv2.imread(path)
                success, result = cv2.imencode('.JPEG', image)
                if not success:
                    raise Exception('Failed to encode image to ".jpeg" format')
                return HttpResponse(io.BytesIO(result.tobytes()), content_type='image/jpeg')
            return Response(data='No context image related to the frame',
                status=status.HTTP_404_NOT_FOUND)
        else:
            return Response(data='unknown data type {}.'.format(self.type),
                status=status.HTTP_400_BAD_REQUEST)

@extend_schema(tags=['tasks'])
@extend_schema_view(
    list=extend_schema(
        summary='Returns a paginated list of tasks according to query parameters (10 tasks per page)',
        responses={
            '200': TaskReadSerializer(many=True),
        }),
    create=extend_schema(
        summary='Method creates a new task in a database without any attached images and videos',
        request=TaskWriteSerializer,
        responses={
            '201': TaskReadSerializer, # check TaskWriteSerializer.to_representation
        }),
    retrieve=extend_schema(
        summary='Method returns details of a specific task',
        responses={
            '200': TaskReadSerializer
        }),
    destroy=extend_schema(
        summary='Method deletes a specific task, all attached jobs, annotations, and data',
        responses={
            '204': OpenApiResponse(description='The task has been deleted'),
        }),
    partial_update=extend_schema(
        summary='Methods does a partial update of chosen fields in a task',
        request=TaskWriteSerializer(partial=True),
        responses={
            '200': TaskReadSerializer, # check TaskWriteSerializer.to_representation
        })
)
class TaskViewSet(viewsets.GenericViewSet, mixins.ListModelMixin,
    mixins.RetrieveModelMixin, mixins.CreateModelMixin, DestroyModelMixin,
    PartialUpdateModelMixin, UploadMixin, AnnotationMixin, SerializeMixin
):
    queryset = Task.objects.prefetch_related(
            Prefetch('label_set', queryset=models.Label.objects.order_by('id')),
            "label_set__attributespec_set",
            "segment_set__job_set")
    lookup_fields = {'project_name': 'project__name', 'owner': 'owner__username', 'assignee': 'assignee__username'}
    search_fields = ('project_name', 'name', 'owner', 'status', 'assignee', 'subset', 'mode', 'dimension')
    filter_fields = list(search_fields) + ['id', 'project_id', 'updated_date']
    ordering_fields = filter_fields
    ordering = "-id"
    iam_organization_field = 'organization'

    def get_serializer_class(self):
        if self.request.method in SAFE_METHODS:
            return TaskReadSerializer
        else:
            return TaskWriteSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == 'list':
            perm = TaskPermission.create_scope_list(self.request)
            queryset = perm.filter(queryset)

        return queryset

    @extend_schema(summary='Method recreates a task from an attached task backup file',
        parameters=[
            OpenApiParameter('location', description='Where to import the backup file from',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False,
                enum=Location.list(), default=Location.LOCAL),
            OpenApiParameter('cloud_storage_id', description='Storage id',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.NUMBER, required=False),
            OpenApiParameter('filename', description='Backup file name',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False),
        ],
        request=TaskFileSerializer(required=False),
        responses={
            '201': OpenApiResponse(description='The task has been imported'), # or better specify {id: task_id}
            '202': OpenApiResponse(description='Importing a backup file has been started'),
        })
    @action(detail=False, methods=['OPTIONS', 'POST'], url_path=r'backup/?$', serializer_class=TaskFileSerializer(required=False))
    def import_backup(self, request, pk=None):
        return self.deserialize(request, backup.import_task)

    @extend_schema(methods=['PATCH'],
        operation_id='tasks_partial_update_backup_file',
        summary="Allows to upload a file chunk. "
            "Implements TUS file uploading protocol.",
        request=OpenApiTypes.BINARY,
        responses={}
    )
    @extend_schema(methods=['HEAD'],
        summary="Implements TUS file uploading protocol."
    )
    @action(detail=False, methods=['HEAD', 'PATCH'], url_path='backup/'+UploadMixin.file_id_regex)
    def append_backup_chunk(self, request, file_id):
        return self.append_tus_chunk(request, file_id)

    @extend_schema(summary='Method backup a specified task',
        parameters=[
            OpenApiParameter('action', location=OpenApiParameter.QUERY,
                description='Used to start downloading process after backup file had been created',
                type=OpenApiTypes.STR, required=False, enum=['download']),
            OpenApiParameter('filename', description='Backup file name',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False),
            OpenApiParameter('location', description='Where need to save downloaded backup',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False,
                enum=Location.list()),
            OpenApiParameter('cloud_storage_id', description='Storage id',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.NUMBER, required=False),
            OpenApiParameter('use_default_location', description='Use the location that was configured in the task to export backup',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.BOOL, required=False,
                default=True),
        ],
        responses={
            '200': OpenApiResponse(description='Download of file started'),
            '201': OpenApiResponse(description='Output backup file is ready for downloading'),
            '202': OpenApiResponse(description='Creating a backup file has been started'),
        })
    @action(methods=['GET'], detail=True, url_path='backup')
    def export_backup(self, request, pk=None):
        return self.serialize(request, backup.export)

    def perform_update(self, serializer):
        instance = serializer.instance

        old_values = {}
        old_repr = serializer.to_representation(instance)
        for attr in self.request.data.keys():
            old_values[attr] = old_repr[attr] if attr in old_repr \
                else getattr(instance, attr, None)

        updated_instance = serializer.save()

        if instance.project:
            instance.project.save()
        if updated_instance.project:
            updated_instance.project.save()

        if getattr(instance, '_prefetched_objects_cache', None):
            instance._prefetched_objects_cache = {}

        signal_update.send(self, instance=serializer.instance, old_values=old_values)

    def perform_create(self, serializer):
        instance = serializer.save(owner=self.request.user,
            organization=self.request.iam_context['organization'])
        if instance.project:
            db_project = instance.project
            db_project.save()
            assert instance.organization == db_project.organization
        signal_create.send(self, instance=serializer.instance)

    def perform_destroy(self, instance):
        task_dirname = instance.get_dirname()
        super().perform_destroy(instance)
        shutil.rmtree(task_dirname, ignore_errors=True)
        if instance.data and not instance.data.tasks.all():
            shutil.rmtree(instance.data.get_data_dirname(), ignore_errors=True)
            instance.data.delete()
        if instance.project:
            db_project = instance.project
            db_project.save()


    @extend_schema(summary='Method returns a list of jobs for a specific task',
        responses=JobReadSerializer(many=True)) # Duplicate to still get 'list' op. name
    @action(detail=True, methods=['GET'], serializer_class=JobReadSerializer(many=True),
        # Remove regular list() parameters from swagger schema
        # https://drf-spectacular.readthedocs.io/en/latest/faq.html#my-action-is-erroneously-paginated-or-has-filter-parameters-that-i-do-not-want
        pagination_class=None, filter_fields=None, search_fields=None, ordering_fields=None)
    def jobs(self, request, pk):
        self.get_object() # force to call check_object_permissions
        queryset = Job.objects.filter(segment__task_id=pk)
        serializer = JobReadSerializer(queryset, many=True,
            context={"request": request})

        return Response(serializer.data)

    # UploadMixin method
    def get_upload_dir(self):
        if 'annotations' in self.action:
            return self._object.get_tmp_dirname()
        elif 'data' in self.action:
            return self._object.data.get_upload_dirname()
        elif 'backup' in self.action:
            return backup.get_backup_dirname()
        return ""

    # UploadMixin method
    def upload_finished(self, request):
        if self.action == 'annotations':
            format_name = request.query_params.get("format", "")
            filename = request.query_params.get("filename", "")
            tmp_dir = self._object.get_tmp_dirname()
            if os.path.isfile(os.path.join(tmp_dir, filename)):
                annotation_file = os.path.join(tmp_dir, filename)
                return _import_annotations(
                        request=request,
                        filename=annotation_file,
                        rq_id="{}@/api/tasks/{}/annotations/upload".format(request.user, self._object.pk),
                        rq_func=dm.task.import_task_annotations,
                        pk=self._object.pk,
                        format_name=format_name,
                    )
            else:
                return Response(data='No such file were uploaded',
                        status=status.HTTP_400_BAD_REQUEST)
        elif self.action == 'data':
            task_data = self._object.data
            serializer = DataSerializer(task_data, data=request.data)
            serializer.is_valid(raise_exception=True)
            data = dict(serializer.validated_data.items())
            uploaded_files = task_data.get_uploaded_files()
            uploaded_files.extend(data.get('client_files'))
            serializer.validated_data.update({'client_files': uploaded_files})

            db_data = serializer.save()
            self._object.data = db_data
            self._object.save()
            data = {k: v for k, v in serializer.data.items()}

            data['use_zip_chunks'] = serializer.validated_data['use_zip_chunks']
            data['use_cache'] = serializer.validated_data['use_cache']
            data['copy_data'] = serializer.validated_data['copy_data']
            if data['use_cache']:
                self._object.data.storage_method = StorageMethodChoice.CACHE
                self._object.data.save(update_fields=['storage_method'])
            if data['server_files'] and not data.get('copy_data'):
                self._object.data.storage = StorageChoice.SHARE
                self._object.data.save(update_fields=['storage'])
            if db_data.cloud_storage:
                self._object.data.storage = StorageChoice.CLOUD_STORAGE
                self._object.data.save(update_fields=['storage'])
                # if the value of stop_frame is 0, then inside the function we cannot know
                # the value specified by the user or it's default value from the database
            if 'stop_frame' not in serializer.validated_data:
                data['stop_frame'] = None
            task.create(self._object.id, data)
            return Response(serializer.data, status=status.HTTP_202_ACCEPTED)
        elif self.action == 'import_backup':
            filename = request.query_params.get("filename", "")
            if filename:
                tmp_dir = backup.get_backup_dirname()
                backup_file = os.path.join(tmp_dir, filename)
                if os.path.isfile(backup_file):
                    return backup.import_task(request, filename=backup_file)
                return Response(data='No such file were uploaded',
                        status=status.HTTP_400_BAD_REQUEST)
            return backup.import_task(request)
        return Response(data='Unknown upload was finished',
                        status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(methods=['POST'],
        summary='Method permanently attaches images or video to a task. Supports tus uploads, see more https://tus.io/',
        request=DataSerializer,
        parameters=[
            OpenApiParameter('Upload-Start', location=OpenApiParameter.HEADER, type=OpenApiTypes.BOOL,
                description='Initializes data upload. No data should be sent with this header'),
            OpenApiParameter('Upload-Multiple', location=OpenApiParameter.HEADER, type=OpenApiTypes.BOOL,
                description='Indicates that data with this request are single or multiple files that should be attached to a task'),
            OpenApiParameter('Upload-Finish', location=OpenApiParameter.HEADER, type=OpenApiTypes.BOOL,
                description='Finishes data upload. Can be combined with Upload-Start header to create task data with one request'),
        ],
        responses={
            '202': OpenApiResponse(description=''),
        })
    @extend_schema(methods=['GET'], summary='Method returns data for a specific task',
        parameters=[
            OpenApiParameter('type', location=OpenApiParameter.QUERY, required=False,
                type=OpenApiTypes.STR, enum=['chunk', 'frame', 'preview', 'context_image'],
                description='Specifies the type of the requested data'),
            OpenApiParameter('quality', location=OpenApiParameter.QUERY, required=False,
                type=OpenApiTypes.STR, enum=['compressed', 'original'],
                description="Specifies the quality level of the requested data, doesn't matter for 'preview' type"),
            OpenApiParameter('number', location=OpenApiParameter.QUERY, required=False, type=OpenApiTypes.INT,
                description="A unique number value identifying chunk or frame, doesn't matter for 'preview' type"),
        ],
        responses={
            '200': OpenApiResponse(description='Data of a specific type'),
        })
    @action(detail=True, methods=['OPTIONS', 'POST', 'GET'], url_path=r'data/?$')
    def data(self, request, pk):
        self._object = self.get_object() # call check_object_permissions as well
        if request.method == 'POST' or request.method == 'OPTIONS':
            task_data = self._object.data
            if not task_data:
                task_data = Data.objects.create()
                task_data.make_dirs()
                self._object.data = task_data
                self._object.save()
            elif task_data.size != 0:
                return Response(data='Adding more data is not supported',
                    status=status.HTTP_400_BAD_REQUEST)
            return self.upload_data(request)

        else:
            data_type = request.query_params.get('type', None)
            data_num = request.query_params.get('number', None)
            data_quality = request.query_params.get('quality', 'compressed')

            data_getter = DataChunkGetter(data_type, data_num, data_quality,
                self._object.dimension)

            return data_getter(request, self._object.data.start_frame,
                self._object.data.stop_frame, self._object.data, self._object.data)

    @extend_schema(methods=['PATCH'],
        operation_id='tasks_partial_update_data_file',
        summary="Allows to upload a file chunk. "
            "Implements TUS file uploading protocol.",
        request=OpenApiTypes.BINARY,
        responses={}
    )
    @extend_schema(methods=['HEAD'],
        summary="Implements TUS file uploading protocol."
    )
    @action(detail=True, methods=['HEAD', 'PATCH'], url_path='data/'+UploadMixin.file_id_regex)
    def append_data_chunk(self, request, pk, file_id):
        self._object = self.get_object()
        return self.append_tus_chunk(request, file_id)

    @extend_schema(methods=['GET'], summary='Method allows to download task annotations',
        parameters=[
            OpenApiParameter('format', location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False,
                description="Desired output format name\nYou can get the list of supported formats at:\n/server/annotation/formats"),
            OpenApiParameter('filename', description='Desired output file name',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False),
            OpenApiParameter('action', location=OpenApiParameter.QUERY,
                description='Used to start downloading process after annotation file had been created',
                type=OpenApiTypes.STR, required=False, enum=['download']),
            OpenApiParameter('location', description='Where need to save downloaded dataset',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False,
                enum=Location.list()),
            OpenApiParameter('cloud_storage_id', description='Storage id',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.NUMBER, required=False),
            OpenApiParameter('use_default_location', description='Use the location that was configured in the task to export annotation',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.BOOL, required=False,
                default=True),
        ],
        responses={
            '200': OpenApiResponse(PolymorphicProxySerializer(
                component_name='AnnotationsRead',
                serializers=[LabeledDataSerializer, OpenApiTypes.BINARY],
                resource_type_field_name=None
            ), description='Download of file started'),
            '201': OpenApiResponse(description='Annotations file is ready to download'),
            '202': OpenApiResponse(description='Dump of annotations has been started'),
            '405': OpenApiResponse(description='Format is not available'),
        })
    @extend_schema(methods=['PUT'], summary='Method allows to upload task annotations',
        parameters=[
            OpenApiParameter('format', location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False,
                description='Input format name\nYou can get the list of supported formats at:\n/server/annotation/formats'),
        ],
        request=PolymorphicProxySerializer('TaskAnnotationsUpdate',
            serializers=[LabeledDataSerializer, AnnotationFileSerializer, OpenApiTypes.NONE],
            resource_type_field_name=None
        ),
        responses={
            '201': OpenApiResponse(description='Uploading has finished'),
            '202': OpenApiResponse(description='Uploading has been started'),
            '405': OpenApiResponse(description='Format is not available'),
        })
    @extend_schema(methods=['POST'],
        summary="Method allows to upload task annotations from a local file or a cloud storage",
        parameters=[
            OpenApiParameter('format', location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False,
                description='Input format name\nYou can get the list of supported formats at:\n/server/annotation/formats'),
            OpenApiParameter('location', description='where to import the annotation from',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False,
                enum=Location.list()),
            OpenApiParameter('cloud_storage_id', description='Storage id',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.NUMBER, required=False),
            OpenApiParameter('use_default_location', description='Use the location that was configured in task to import annotations',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.BOOL, required=False,
                default=True),
            OpenApiParameter('filename', description='Annotation file name',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False),
        ],
        request=PolymorphicProxySerializer('TaskAnnotationsWrite',
            serializers=[AnnotationFileSerializer, OpenApiTypes.NONE],
            resource_type_field_name=None
        ),
        responses={
            '201': OpenApiResponse(description='Uploading has finished'),
            '202': OpenApiResponse(description='Uploading has been started'),
            '405': OpenApiResponse(description='Format is not available'),
        })
    @extend_schema(methods=['PATCH'], summary='Method performs a partial update of annotations in a specific task',
        parameters=[
            OpenApiParameter('action', location=OpenApiParameter.QUERY, required=True,
                type=OpenApiTypes.STR, enum=['create', 'update', 'delete']),
        ],
        request=LabeledDataSerializer,
        responses={
            '200': LabeledDataSerializer,
        })
    @extend_schema(methods=['DELETE'], summary='Method deletes all annotations for a specific task',
        responses={
            '204': OpenApiResponse(description='The annotation has been deleted'),
        })
    @action(detail=True, methods=['GET', 'DELETE', 'PUT', 'PATCH', 'POST', 'OPTIONS'], url_path=r'annotations/?$',
        serializer_class=None)
    def annotations(self, request, pk):
        self._object = self.get_object() # force to call check_object_permissions
        if request.method == 'GET':
            return self.export_annotations(
                request=request,
                pk=pk,
                db_obj=self._object,
                export_func=_export_annotations,
                callback=dm.views.export_task_annotations,
                get_data=dm.task.get_task_data,
            )
        elif request.method == 'POST' or request.method == 'OPTIONS':
            return self.import_annotations(
                request=request,
                pk=pk,
                db_obj=self._object,
                import_func=_import_annotations,
                rq_func=dm.task.import_task_annotations,
                rq_id = "{}@/api/tasks/{}/annotations/upload".format(request.user, pk)
            )
        elif request.method == 'PUT':
            format_name = request.query_params.get('format')
            if format_name:
                use_settings = strtobool(str(request.query_params.get('use_default_location', True)))
                obj = self._object if use_settings else request.query_params
                location_conf = get_location_configuration(
                    obj=obj, use_settings=use_settings, field_name=StorageType.SOURCE
                )
                return _import_annotations(
                    request=request,
                    rq_id="{}@/api/tasks/{}/annotations/upload".format(request.user, pk),
                    rq_func=dm.task.import_task_annotations,
                    pk=pk,
                    format_name=format_name,
                    location_conf=location_conf
                )
            else:
                serializer = LabeledDataSerializer(data=request.data)
                if serializer.is_valid(raise_exception=True):
                    data = dm.task.put_task_data(pk, serializer.data)
                    return Response(data)
        elif request.method == 'DELETE':
            dm.task.delete_task_data(pk)
            return Response(status=status.HTTP_204_NO_CONTENT)
        elif request.method == 'PATCH':
            action = self.request.query_params.get("action", None)
            if action not in dm.task.PatchAction.values():
                raise serializers.ValidationError(
                    "Please specify a correct 'action' for the request")
            serializer = LabeledDataSerializer(data=request.data)
            if serializer.is_valid(raise_exception=True):
                try:
                    data = dm.task.patch_task_data(pk, serializer.data, action)
                except (AttributeError, IntegrityError) as e:
                    return Response(data=str(e), status=status.HTTP_400_BAD_REQUEST)
                return Response(data)

    @extend_schema(methods=['PATCH'],
        operation_id='tasks_partial_update_annotations_file',
        summary="Allows to upload an annotation file chunk. "
            "Implements TUS file uploading protocol.",
        request=OpenApiTypes.BINARY,
        responses={}
    )
    @extend_schema(methods=['HEAD'],
        operation_id='tasks_annotations_file_retrieve_status',
        summary="Implements TUS file uploading protocol."
    )
    @action(detail=True, methods=['HEAD', 'PATCH'], url_path='annotations/'+UploadMixin.file_id_regex)
    def append_annotations_chunk(self, request, pk, file_id):
        self._object = self.get_object()
        return self.append_tus_chunk(request, file_id)

    @extend_schema(
        summary='When task is being created the method returns information about a status of the creation process',
        responses={
            '200': RqStatusSerializer,
        })
    @action(detail=True, methods=['GET'], serializer_class=RqStatusSerializer)
    def status(self, request, pk):
        self.get_object() # force to call check_object_permissions
        response = self._get_rq_response(queue="default", job_id=f"/api/tasks/{pk}")
        serializer = RqStatusSerializer(data=response)

        if serializer.is_valid(raise_exception=True):
            return Response(serializer.data)

    @staticmethod
    def _get_rq_response(queue, job_id):
        queue = django_rq.get_queue(queue)
        job = queue.fetch_job(job_id)
        response = {}
        if job is None or job.is_finished:
            response = { "state": "Finished" }
        elif job.is_queued:
            response = { "state": "Queued" }
        elif job.is_failed:
            response = { "state": "Failed", "message": job.exc_info }
        else:
            response = { "state": "Started" }
            if 'status' in job.meta:
                response['message'] = job.meta['status']
            response['progress'] = job.meta.get('task_progress', 0.)

        return response

    @extend_schema(summary='Method provides a meta information about media files which are related with the task',
        responses={
            '200': DataMetaReadSerializer,
        })
    @extend_schema(methods=['PATCH'], summary='Method performs an update of data meta fields (deleted frames)',
        request=DataMetaWriteSerializer,
        responses={
            '200': DataMetaReadSerializer,
        })
    @action(detail=True, methods=['GET', 'PATCH'], serializer_class=DataMetaReadSerializer,
        url_path='data/meta')
    def metadata(self, request, pk):
        self.get_object() #force to call check_object_permissions
        db_task = models.Task.objects.prefetch_related(
            Prefetch('data', queryset=models.Data.objects.select_related('video').prefetch_related(
                Prefetch('images', queryset=models.Image.objects.prefetch_related('related_files').order_by('frame'))
            ))
        ).get(pk=pk)

        if request.method == 'PATCH':
            serializer = DataMetaWriteSerializer(instance=db_task.data, data=request.data)
            if serializer.is_valid(raise_exception=True):
                db_task.data = serializer.save()

        if hasattr(db_task.data, 'video'):
            media = [db_task.data.video]
        else:
            media = list(db_task.data.images.all())

        frame_meta = [{
            'width': item.width,
            'height': item.height,
            'name': item.path,
            'has_related_context': hasattr(item, 'related_files') and item.related_files.exists()
        } for item in media]

        db_data = db_task.data
        db_data.frames = frame_meta

        serializer = DataMetaReadSerializer(db_data)
        return Response(serializer.data)

    @extend_schema(summary='Export task as a dataset in a specific format',
        parameters=[
            OpenApiParameter('format', location=OpenApiParameter.QUERY,
                description='Desired output format name\nYou can get the list of supported formats at:\n/server/annotation/formats',
                type=OpenApiTypes.STR, required=True),
            OpenApiParameter('filename', description='Desired output file name',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False),
            OpenApiParameter('action', location=OpenApiParameter.QUERY,
                description='Used to start downloading process after annotation file had been created',
                type=OpenApiTypes.STR, required=False, enum=['download']),
            OpenApiParameter('use_default_location', description='Use the location that was configured in task to export annotations',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.BOOL, required=False,
                default=True),
            OpenApiParameter('location', description='Where need to save downloaded dataset',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False,
                enum=Location.list()),
            OpenApiParameter('cloud_storage_id', description='Storage id',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.NUMBER, required=False),
        ],
        responses={
            '200': OpenApiResponse(OpenApiTypes.BINARY, description='Download of file started'),
            '201': OpenApiResponse(description='Output file is ready for downloading'),
            '202': OpenApiResponse(description='Exporting has been started'),
            '405': OpenApiResponse(description='Format is not available'),
        })
    @action(detail=True, methods=['GET'], serializer_class=None,
        url_path='dataset')
    def dataset_export(self, request, pk):
        self._object = self.get_object() # force to call check_object_permissions

        return self.export_annotations(
            request=request,
            pk=pk,
            db_obj=self._object,
            export_func=_export_annotations,
            callback=dm.views.export_task_as_dataset
        )

@extend_schema(tags=['jobs'])
@extend_schema_view(
    retrieve=extend_schema(
        summary='Method returns details of a job',
        responses={
            '200': JobReadSerializer,
        }),
    list=extend_schema(
        summary='Method returns a paginated list of jobs according to query parameters',
        responses={
            '200': JobReadSerializer(many=True),
        }),
    partial_update=extend_schema(
        summary='Methods does a partial update of chosen fields in a job',
        request=JobWriteSerializer,
        responses={
            '200': JobReadSerializer, # check JobWriteSerializer.to_representation
        })
)
class JobViewSet(viewsets.GenericViewSet, mixins.ListModelMixin,
    mixins.RetrieveModelMixin, PartialUpdateModelMixin, UploadMixin, AnnotationMixin
):
    queryset = Job.objects.all()
    iam_organization_field = 'segment__task__organization'
    search_fields = ('task_name', 'project_name', 'assignee', 'state', 'stage')
    filter_fields = list(search_fields) + ['id', 'task_id', 'project_id', 'updated_date']
    ordering_fields = filter_fields
    ordering = "-id"
    lookup_fields = {
        'dimension': 'segment__task__dimension',
        'task_id': 'segment__task_id',
        'project_id': 'segment__task__project_id',
        'task_name': 'segment__task__name',
        'project_name': 'segment__task__project__name',
        'assignee': 'assignee__username'
    }

    def get_queryset(self):
        queryset = super().get_queryset()

        if self.action == 'list':
            perm = JobPermission.create_scope_list(self.request)
            queryset = perm.filter(queryset)

        return queryset

    def get_serializer_class(self):
        if self.request.method in SAFE_METHODS:
            return JobReadSerializer
        else:
            return JobWriteSerializer

    # UploadMixin method
    def get_upload_dir(self):
        task = self._object.segment.task
        return task.get_tmp_dirname()

    # UploadMixin method
    def upload_finished(self, request):
        task = self._object.segment.task
        if self.action == 'annotations':
            format_name = request.query_params.get("format", "")
            filename = request.query_params.get("filename", "")
            tmp_dir = task.get_tmp_dirname()
            if os.path.isfile(os.path.join(tmp_dir, filename)):
                annotation_file = os.path.join(tmp_dir, filename)
                return _import_annotations(
                        request=request,
                        filename=annotation_file,
                        rq_id="{}@/api/jobs/{}/annotations/upload".format(request.user, self._object.pk),
                        rq_func=dm.task.import_job_annotations,
                        pk=self._object.pk,
                        format_name=format_name,
                    )
            else:
                return Response(data='No such file were uploaded',
                        status=status.HTTP_400_BAD_REQUEST)
        return Response(data='Unknown upload was finished',
                        status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(methods=['GET'],
        summary="Method returns annotations for a specific job as a JSON document. "
            "If format is specified, a zip archive is returned.",
        parameters=[
            OpenApiParameter('format', location=OpenApiParameter.QUERY,
                description='Desired output format name\nYou can get the list of supported formats at:\n/server/annotation/formats',
                type=OpenApiTypes.STR, required=False),
            OpenApiParameter('filename', description='Desired output file name',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False),
            OpenApiParameter('action', location=OpenApiParameter.QUERY,
                description='Used to start downloading process after annotation file had been created',
                type=OpenApiTypes.STR, required=False, enum=['download']),
            OpenApiParameter('location', description='Where need to save downloaded annotation',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False,
                enum=Location.list()),
            OpenApiParameter('cloud_storage_id', description='Storage id',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.NUMBER, required=False),
            OpenApiParameter('use_default_location', description='Use the location that was configured in the task to export annotation',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.BOOL, required=False,
                default=True),
        ],
        responses={
            '200': OpenApiResponse(PolymorphicProxySerializer(
                component_name='AnnotationsRead',
                serializers=[LabeledDataSerializer, OpenApiTypes.BINARY],
                resource_type_field_name=None
            ), description='Download of file started'),
            '201': OpenApiResponse(description='Output file is ready for downloading'),
            '202': OpenApiResponse(description='Exporting has been started'),
            '405': OpenApiResponse(description='Format is not available'),
        })
    @extend_schema(methods=['POST'], summary='Method allows to upload job annotations',
        parameters=[
            OpenApiParameter('format', location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False,
                description='Input format name\nYou can get the list of supported formats at:\n/server/annotation/formats'),
            OpenApiParameter('location', description='where to import the annotation from',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False,
                enum=Location.list()),
            OpenApiParameter('cloud_storage_id', description='Storage id',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.NUMBER, required=False),
            OpenApiParameter('use_default_location', description='Use the location that was configured in the task to import annotation',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.BOOL, required=False,
                default=True),
            OpenApiParameter('filename', description='Annotation file name',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False),
        ],
        request=AnnotationFileSerializer,
        responses={
            '201': OpenApiResponse(description='Uploading has finished'),
            '202': OpenApiResponse(description='Uploading has been started'),
            '405': OpenApiResponse(description='Format is not available'),
        })
    @extend_schema(methods=['PUT'], summary='Method performs an update of all annotations in a specific job',
        parameters=[
            OpenApiParameter('format', location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False,
                description='Input format name\nYou can get the list of supported formats at:\n/server/annotation/formats'),
        ],
        request=PolymorphicProxySerializer(
            component_name='JobAnnotationsUpdate',
            serializers=[LabeledDataSerializer, AnnotationFileSerializer],
            resource_type_field_name=None
        ),
        responses={
            '201': OpenApiResponse(description='Uploading has finished'),
            '202': OpenApiResponse(description='Uploading has been started'),
            '405': OpenApiResponse(description='Format is not available'),
        })
    @extend_schema(methods=['PATCH'], summary='Method performs a partial update of annotations in a specific job',
        parameters=[
            OpenApiParameter('action', location=OpenApiParameter.QUERY, type=OpenApiTypes.STR,
                required=True, enum=['create', 'update', 'delete'])
        ],
        request=LabeledDataSerializer,
        responses={
            '200': OpenApiResponse(description='Annotations successfully uploaded'),
        })
    @extend_schema(methods=['DELETE'], summary='Method deletes all annotations for a specific job',
        responses={
            '204': OpenApiResponse(description='The annotation has been deleted'),
        })
    @action(detail=True, methods=['GET', 'DELETE', 'PUT', 'PATCH', 'POST', 'OPTIONS'], url_path=r'annotations/?$',
        serializer_class=LabeledDataSerializer)
    def annotations(self, request, pk):
        self._object = self.get_object() # force to call check_object_permissions
        if request.method == 'GET':
            return self.export_annotations(
                request=request,
                pk=pk,
                db_obj=self._object.segment.task,
                export_func=_export_annotations,
                callback=dm.views.export_job_annotations,
                get_data=dm.task.get_job_data,
            )

        elif request.method == 'POST' or request.method == 'OPTIONS':
            return self.import_annotations(
                request=request,
                pk=pk,
                db_obj=self._object.segment.task,
                import_func=_import_annotations,
                rq_func=dm.task.import_job_annotations,
                rq_id = "{}@/api/jobs/{}/annotations/upload".format(request.user, pk)
            )

        elif request.method == 'PUT':
            format_name = request.query_params.get('format', '')
            if format_name:
                use_settings = strtobool(str(request.query_params.get('use_default_location', True)))
                obj = self._object.segment.task if use_settings else request.query_params
                location_conf = get_location_configuration(
                    obj=obj, use_settings=use_settings, field_name=StorageType.SOURCE
                )
                return _import_annotations(
                    request=request,
                    rq_id="{}@/api/jobs/{}/annotations/upload".format(request.user, pk),
                    rq_func=dm.task.import_job_annotations,
                    pk=pk,
                    format_name=format_name,
                    location_conf=location_conf
                )
            else:
                serializer = LabeledDataSerializer(data=request.data)
                if serializer.is_valid(raise_exception=True):
                    try:
                        data = dm.task.put_job_data(pk, serializer.data)
                    except (AttributeError, IntegrityError) as e:
                        return Response(data=str(e), status=status.HTTP_400_BAD_REQUEST)
                    return Response(data)
        elif request.method == 'DELETE':
            dm.task.delete_job_data(pk)
            return Response(status=status.HTTP_204_NO_CONTENT)
        elif request.method == 'PATCH':
            action = self.request.query_params.get("action", None)
            if action not in dm.task.PatchAction.values():
                raise serializers.ValidationError(
                    "Please specify a correct 'action' for the request")
            serializer = LabeledDataSerializer(data=request.data)
            if serializer.is_valid(raise_exception=True):
                try:
                    data = dm.task.patch_job_data(pk, serializer.data, action)
                except (AttributeError, IntegrityError) as e:
                    return Response(data=str(e), status=status.HTTP_400_BAD_REQUEST)
                return Response(data)


    @extend_schema(methods=['PATCH'],
        operation_id='jobs_partial_update_annotations_file',
        summary="Allows to upload an annotation file chunk. "
            "Implements TUS file uploading protocol.",
        request=OpenApiTypes.BINARY,
        responses={}
    )
    @extend_schema(methods=['HEAD'],
        summary="Implements TUS file uploading protocol."
    )
    @action(detail=True, methods=['HEAD', 'PATCH'], url_path='annotations/'+UploadMixin.file_id_regex)
    def append_annotations_chunk(self, request, pk, file_id):
        self._object = self.get_object()
        return self.append_tus_chunk(request, file_id)


    @extend_schema(summary='Export job as a dataset in a specific format',
        parameters=[
            OpenApiParameter('format', location=OpenApiParameter.QUERY,
                description='Desired output format name\nYou can get the list of supported formats at:\n/server/annotation/formats',
                type=OpenApiTypes.STR, required=True),
            OpenApiParameter('filename', description='Desired output file name',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False),
            OpenApiParameter('action', location=OpenApiParameter.QUERY,
                description='Used to start downloading process after annotation file had been created',
                type=OpenApiTypes.STR, required=False, enum=['download']),
            OpenApiParameter('use_default_location', description='Use the location that was configured in the task to export dataset',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.BOOL, required=False,
                default=True),
            OpenApiParameter('location', description='Where need to save downloaded dataset',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False,
                enum=Location.list()),
            OpenApiParameter('cloud_storage_id', description='Storage id',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.NUMBER, required=False),
        ],
        responses={
            '200': OpenApiResponse(OpenApiTypes.BINARY, description='Download of file started'),
            '201': OpenApiResponse(description='Output file is ready for downloading'),
            '202': OpenApiResponse(description='Exporting has been started'),
            '405': OpenApiResponse(description='Format is not available'),
        })
    @action(detail=True, methods=['GET'], serializer_class=None,
        url_path='dataset')
    def dataset_export(self, request, pk):
        self._object = self.get_object() # force to call check_object_permissions

        return self.export_annotations(
            request=request,
            pk=pk,
            db_obj=self._object.segment.task,
            export_func=_export_annotations,
            callback=dm.views.export_job_as_dataset
        )

    @extend_schema(summary='Method returns list of issues for the job',
        responses=IssueReadSerializer(many=True)) # Duplicate to still get 'list' op. name
    @action(detail=True, methods=['GET'], serializer_class=IssueReadSerializer(many=True),
        # Remove regular list() parameters from swagger schema
        # https://drf-spectacular.readthedocs.io/en/latest/faq.html#my-action-is-erroneously-paginated-or-has-filter-parameters-that-i-do-not-want
        pagination_class=None, filter_fields=None, search_fields=None, ordering_fields=None)
    def issues(self, request, pk):
        db_job = self.get_object()
        queryset = db_job.issues
        serializer = IssueReadSerializer(queryset,
            context={'request': request}, many=True)

        return Response(serializer.data)


    @extend_schema(summary='Method returns data for a specific job',
        parameters=[
            OpenApiParameter('type', description='Specifies the type of the requested data',
                location=OpenApiParameter.QUERY, required=False, type=OpenApiTypes.STR,
                enum=['chunk', 'frame', 'preview', 'context_image']),
            OpenApiParameter('quality', location=OpenApiParameter.QUERY, required=False,
                type=OpenApiTypes.STR, enum=['compressed', 'original'],
                description="Specifies the quality level of the requested data, doesn't matter for 'preview' type"),
            OpenApiParameter('number', location=OpenApiParameter.QUERY, required=False, type=OpenApiTypes.INT,
                description="A unique number value identifying chunk or frame, doesn't matter for 'preview' type"),
            ],
        responses={
            '200': OpenApiResponse(OpenApiTypes.BINARY, description='Data of a specific type'),
        })
    @action(detail=True, methods=['GET'])
    def data(self, request, pk):
        db_job = self.get_object() # call check_object_permissions as well
        data_type = request.query_params.get('type', None)
        data_num = request.query_params.get('number', None)
        data_quality = request.query_params.get('quality', 'compressed')

        data_getter = DataChunkGetter(data_type, data_num, data_quality,
            db_job.segment.task.dimension)

        return data_getter(request, db_job.segment.start_frame,
            db_job.segment.stop_frame, db_job.segment.task.data, db_job)


    @extend_schema(summary='Method provides a meta information about media files which are related with the job',
        responses={
            '200': DataMetaReadSerializer,
        })
    @extend_schema(methods=['PATCH'], summary='Method performs an update of data meta fields (deleted frames)',
        request=DataMetaWriteSerializer,
        responses={
            '200': DataMetaReadSerializer,
        }, tags=['tasks'], versions=['2.0'])
    @action(detail=True, methods=['GET', 'PATCH'], serializer_class=DataMetaReadSerializer,
        url_path='data/meta')
    def metadata(self, request, pk):
        self.get_object() #force to call check_object_permissions
        db_job = models.Job.objects.prefetch_related(
            'segment',
            'segment__task',
            Prefetch('segment__task__data', queryset=models.Data.objects.select_related('video').prefetch_related(
                Prefetch('images', queryset=models.Image.objects.prefetch_related('related_files').order_by('frame'))
            ))
        ).get(pk=pk)

        db_data = db_job.segment.task.data
        start_frame = db_job.segment.start_frame
        stop_frame = db_job.segment.stop_frame
        data_start_frame = db_data.start_frame + start_frame * db_data.get_frame_step()
        data_stop_frame = db_data.start_frame + stop_frame * db_data.get_frame_step()

        if request.method == 'PATCH':
            serializer = DataMetaWriteSerializer(instance=db_data, data=request.data)
            if serializer.is_valid(raise_exception=True):
                serializer.validated_data['deleted_frames'] = list(filter(
                    lambda frame: frame >= start_frame and frame <= stop_frame,
                    serializer.validated_data['deleted_frames']
                )) + list(filter(
                    lambda frame: frame < start_frame and frame > stop_frame,
                    db_data.deleted_frames,
                ))
                db_data = serializer.save()
                db_job.segment.task.save()
                if db_job.segment.task.project:
                    db_job.segment.task.project.save()

        if hasattr(db_data, 'video'):
            media = [db_data.video]
        else:
            media = list(db_data.images.filter(
                frame__gte=data_start_frame,
                frame__lte=data_stop_frame,
            ).all())

        # Filter data with segment size
        # Should data.size also be cropped by segment size?
        db_data.deleted_frames = filter(
            lambda frame: frame >= start_frame and frame <= stop_frame,
            db_data.deleted_frames,
        )
        db_data.start_frame = data_start_frame
        db_data.stop_frame = data_stop_frame

        frame_meta = [{
            'width': item.width,
            'height': item.height,
            'name': item.path,
            'has_related_context': hasattr(item, 'related_files') and item.related_files.exists()
        } for item in media]

        db_data.frames = frame_meta

        serializer = DataMetaReadSerializer(db_data)
        return Response(serializer.data)

    @extend_schema(summary='The action returns the list of tracked changes for the job',
        responses={
            '200': JobCommitSerializer(many=True),
        })
    @action(detail=True, methods=['GET'], serializer_class=None)
    def commits(self, request, pk):
        db_job = self.get_object()
        queryset = db_job.commits.order_by('-id')

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = JobCommitSerializer(page, context={'request': request}, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = JobCommitSerializer(queryset, context={'request': request}, many=True)
        return Response(serializer.data)

@extend_schema(tags=['issues'])
@extend_schema_view(
    retrieve=extend_schema(
        summary='Method returns details of an issue',
        responses={
            '200': IssueReadSerializer,
        }),
    list=extend_schema(
        summary='Method returns a paginated list of issues according to query parameters',
        responses={
            '200': IssueReadSerializer(many=True),
        }),
    partial_update=extend_schema(
        summary='Methods does a partial update of chosen fields in an issue',
        request=IssueWriteSerializer,
        responses={
            '200': IssueReadSerializer, # check IssueWriteSerializer.to_representation
        }),
    create=extend_schema(
        summary='Method creates an issue',
        request=IssueWriteSerializer,
        responses={
            '201': IssueReadSerializer, # check IssueWriteSerializer.to_representation
        }),
    destroy=extend_schema(
        summary='Method deletes an issue',
        responses={
            '204': OpenApiResponse(description='The issue has been deleted'),
        })
)
class IssueViewSet(viewsets.GenericViewSet, mixins.ListModelMixin,
    mixins.RetrieveModelMixin, mixins.CreateModelMixin, DestroyModelMixin,
    PartialUpdateModelMixin
):
    queryset = Issue.objects.all().order_by('-id')
    iam_organization_field = 'job__segment__task__organization'
    search_fields = ('owner', 'assignee')
    filter_fields = list(search_fields) + ['id', 'job_id', 'task_id', 'resolved']
    lookup_fields = {
        'owner': 'owner__username',
        'assignee': 'assignee__username',
        'job_id': 'job__id',
        'task_id': 'job__segment__task__id',
    }
    ordering_fields = filter_fields
    ordering = '-id'

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == 'list':
            perm = IssuePermission.create_scope_list(self.request)
            queryset = perm.filter(queryset)

        return queryset

    def get_serializer_class(self):
        if self.request.method in SAFE_METHODS:
            return IssueReadSerializer
        else:
            return IssueWriteSerializer

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
        signal_create.send(self, instance=serializer.instance)

    @extend_schema(summary='The action returns all comments of a specific issue',
        responses=CommentReadSerializer(many=True)) # Duplicate to still get 'list' op. name
    @action(detail=True, methods=['GET'], serializer_class=CommentReadSerializer(many=True),
        # Remove regular list() parameters from swagger schema
        # https://drf-spectacular.readthedocs.io/en/latest/faq.html#my-action-is-erroneously-paginated-or-has-filter-parameters-that-i-do-not-want
        pagination_class=None, filter_fields=None, search_fields=None, ordering_fields=None)
    def comments(self, request, pk):
        # TODO: remove this endpoint? It is totally covered by issue body.

        db_issue = self.get_object()
        queryset = db_issue.comments
        serializer = CommentReadSerializer(queryset,
            context={'request': request}, many=True)

        return Response(serializer.data)

@extend_schema(tags=['comments'])
@extend_schema_view(
    retrieve=extend_schema(
        summary='Method returns details of a comment',
        responses={
            '200': CommentReadSerializer,
        }),
    list=extend_schema(
        summary='Method returns a paginated list of comments according to query parameters',
        responses={
            '200':CommentReadSerializer(many=True),
        }),
    partial_update=extend_schema(
        summary='Methods does a partial update of chosen fields in a comment',
        request=CommentWriteSerializer,
        responses={
            '200': CommentReadSerializer, # check CommentWriteSerializer.to_representation
        }),
    create=extend_schema(
        summary='Method creates a comment',
        request=CommentWriteSerializer,
        responses={
            '201': CommentReadSerializer, # check CommentWriteSerializer.to_representation
        }),
    destroy=extend_schema(
        summary='Method deletes a comment',
        responses={
            '204': OpenApiResponse(description='The comment has been deleted'),
        })
)
class CommentViewSet(viewsets.GenericViewSet, mixins.ListModelMixin,
    mixins.RetrieveModelMixin, mixins.CreateModelMixin, DestroyModelMixin,
    PartialUpdateModelMixin
):
    queryset = Comment.objects.all().order_by('-id')
    iam_organization_field = 'issue__job__segment__task__organization'
    search_fields = ('owner',)
    filter_fields = list(search_fields) + ['id', 'issue_id']
    ordering_fields = filter_fields
    ordering = '-id'
    lookup_fields = {'owner': 'owner__username', 'issue_id': 'issue__id'}

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == 'list':
            perm = CommentPermission.create_scope_list(self.request)
            queryset = perm.filter(queryset)

        return queryset

    def get_serializer_class(self):
        if self.request.method in SAFE_METHODS:
            return CommentReadSerializer
        else:
            return CommentWriteSerializer

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
        signal_create.send(self, instance=serializer.instance)

@extend_schema(tags=['users'])
@extend_schema_view(
    list=extend_schema(
        summary='Method provides a paginated list of users registered on the server',
        responses={
            '200': PolymorphicProxySerializer(component_name='MetaUser',
                serializers=[
                    UserSerializer, BasicUserSerializer,
                ], resource_type_field_name=None),
        }),
    retrieve=extend_schema(
        summary='Method provides information of a specific user',
        responses={
            '200': PolymorphicProxySerializer(component_name='MetaUser',
                serializers=[
                    UserSerializer, BasicUserSerializer,
                ], resource_type_field_name=None),
        }),
    partial_update=extend_schema(
        summary='Method updates chosen fields of a user',
        responses={
            '200': PolymorphicProxySerializer(component_name='MetaUser',
                serializers=[
                    UserSerializer, BasicUserSerializer,
                ], resource_type_field_name=None),
        }),
    destroy=extend_schema(
        summary='Method deletes a specific user from the server',
        responses={
            '204': OpenApiResponse(description='The user has been deleted'),
        })
)
class UserViewSet(viewsets.GenericViewSet, mixins.ListModelMixin,
    mixins.RetrieveModelMixin, PartialUpdateModelMixin, mixins.DestroyModelMixin):
    queryset = User.objects.prefetch_related('groups').all()
    search_fields = ('username', 'first_name', 'last_name')
    iam_organization_field = 'memberships__organization'

    filter_fields = ('id', 'is_active', 'username')
    ordering_fields = filter_fields
    ordering = "-id"

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == 'list':
            perm = UserPermission.create_scope_list(self.request)
            queryset = perm.filter(queryset)

        return queryset

    def get_serializer_class(self):
        # Early exit for drf-spectacular compatibility
        if getattr(self, 'swagger_fake_view', False):
            return UserSerializer

        user = self.request.user
        if user.is_staff:
            return UserSerializer
        else:
            is_self = int(self.kwargs.get("pk", 0)) == user.id or \
                self.action == "self"
            if is_self and self.request.method in SAFE_METHODS:
                return UserSerializer
            else:
                return BasicUserSerializer

    @extend_schema(summary='Method returns an instance of a user who is currently authorized',
        responses={
            '200': PolymorphicProxySerializer(component_name='MetaUser',
                serializers=[
                    UserSerializer, BasicUserSerializer,
                ], resource_type_field_name=None),
        })
    @action(detail=False, methods=['GET'])
    def self(self, request):
        """
        Method returns an instance of a user who is currently authorized
        """
        serializer_class = self.get_serializer_class()
        serializer = serializer_class(request.user, context={ "request": request })
        return Response(serializer.data)

@extend_schema(tags=['cloudstorages'])
@extend_schema_view(
    retrieve=extend_schema(
        summary='Method returns details of a specific cloud storage',
        responses={
            '200': CloudStorageReadSerializer,
        }),
    list=extend_schema(
        summary='Returns a paginated list of storages according to query parameters',
        responses={
            '200': CloudStorageReadSerializer(many=True),
        }),
    destroy=extend_schema(
        summary='Method deletes a specific cloud storage',
        responses={
            '204': OpenApiResponse(description='The cloud storage has been removed'),
        }),
    partial_update=extend_schema(
        summary='Methods does a partial update of chosen fields in a cloud storage instance',
        request=CloudStorageWriteSerializer,
        responses={
            '200': CloudStorageReadSerializer, # check CloudStorageWriteSerializer.to_representation
        }),
    create=extend_schema(
        summary='Method creates a cloud storage with a specified characteristics',
        request=CloudStorageWriteSerializer,
        responses={
            '201': CloudStorageReadSerializer, # check CloudStorageWriteSerializer.to_representation
        })
)
class CloudStorageViewSet(viewsets.GenericViewSet, mixins.ListModelMixin,
    mixins.RetrieveModelMixin, mixins.CreateModelMixin, mixins.DestroyModelMixin,
    PartialUpdateModelMixin
):
    queryset = CloudStorageModel.objects.all().prefetch_related('data')

    search_fields = ('provider_type', 'display_name', 'resource',
                    'credentials_type', 'owner', 'description')
    filter_fields = list(search_fields) + ['id']
    ordering_fields = filter_fields
    ordering = "-id"
    lookup_fields = {'owner': 'owner__username'}
    iam_organization_field = 'organization'

    def get_serializer_class(self):
        if self.request.method in ('POST', 'PATCH'):
            return CloudStorageWriteSerializer
        else:
            return CloudStorageReadSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == 'list':
            perm = CloudStoragePermission.create_scope_list(self.request)
            queryset = perm.filter(queryset)

        provider_type = self.request.query_params.get('provider_type', None)
        if provider_type:
            if provider_type in CloudProviderChoice.list():
                return queryset.filter(provider_type=provider_type)
            raise ValidationError('Unsupported type of cloud provider')
        return queryset

    def perform_create(self, serializer):
        serializer.save(
            owner=self.request.user,
            organization=self.request.iam_context['organization'])

    def perform_destroy(self, instance):
        cloud_storage_dirname = instance.get_storage_dirname()
        super().perform_destroy(instance)
        shutil.rmtree(cloud_storage_dirname, ignore_errors=True)

    def create(self, request, *args, **kwargs):
        try:
            response = super().create(request, *args, **kwargs)
        except IntegrityError:
            response = HttpResponseBadRequest('Same storage already exists')
        except ValidationError as exceptions:
            msg_body = ""
            for ex in exceptions.args:
                for field, ex_msg in ex.items():
                    msg_body += ': '.join([field, ex_msg if isinstance(ex_msg, str) else str(ex_msg[0])])
                    msg_body += '\n'
            return HttpResponseBadRequest(msg_body)
        except APIException as ex:
            return Response(data=ex.get_full_details(), status=ex.status_code)
        except Exception as ex:
            response = HttpResponseBadRequest(str(ex))
        return response

    @extend_schema(summary='Method returns a manifest content',
        parameters=[
            OpenApiParameter('manifest_path', description='Path to the manifest file in a cloud storage',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR),
        ],
        responses={
            '200': OpenApiResponse(response=build_array_type(build_basic_type(OpenApiTypes.STR)), description='A manifest content'),
        })
    @action(detail=True, methods=['GET'], url_path='content')
    def content(self, request, pk):
        storage = None
        try:
            db_storage = self.get_object()
            storage = db_storage_to_storage_instance(db_storage)
            if not db_storage.manifests.count():
                raise Exception('There is no manifest file')
            manifest_path = request.query_params.get('manifest_path', db_storage.manifests.first().filename)
            manifest_prefix = os.path.dirname(manifest_path)
            file_status = storage.get_file_status(manifest_path)
            if file_status == CloudStorageStatus.NOT_FOUND:
                raise FileNotFoundError(errno.ENOENT,
                    "Not found on the cloud storage {}".format(db_storage.display_name), manifest_path)
            elif file_status == CloudStorageStatus.FORBIDDEN:
                raise PermissionError(errno.EACCES,
                    "Access to the file on the '{}' cloud storage is denied".format(db_storage.display_name), manifest_path)

            full_manifest_path = os.path.join(db_storage.get_storage_dirname(), manifest_path)
            if not os.path.exists(full_manifest_path) or \
                    datetime.utcfromtimestamp(os.path.getmtime(full_manifest_path)).replace(tzinfo=pytz.UTC) < storage.get_file_last_modified(manifest_path):
                storage.download_file(manifest_path, full_manifest_path)
            manifest = ImageManifestManager(full_manifest_path, db_storage.get_storage_dirname())
            # need to update index
            manifest.set_index()
            manifest_files = [os.path.join(manifest_prefix, f) for f in manifest.data]
            return Response(data=manifest_files, content_type="text/plain")

        except CloudStorageModel.DoesNotExist:
            message = f"Storage {pk} does not exist"
            slogger.glob.error(message)
            return HttpResponseNotFound(message)
        except FileNotFoundError as ex:
            msg = f"{ex.strerror} {ex.filename}"
            slogger.cloud_storage[pk].info(msg)
            return Response(data=msg, status=status.HTTP_404_NOT_FOUND)
        except Exception as ex:
            # check that cloud storage was not deleted
            storage_status = storage.get_status() if storage else None
            if storage_status == CloudStorageStatus.FORBIDDEN:
                msg = 'The resource {} is no longer available. Access forbidden.'.format(storage.name)
            elif storage_status == CloudStorageStatus.NOT_FOUND:
                msg = 'The resource {} not found. It may have been deleted.'.format(storage.name)
            else:
                msg = str(ex)
            return HttpResponseBadRequest(msg)

    @extend_schema(summary='Method returns a preview image from a cloud storage',
        responses={
            '200': OpenApiResponse(description='Cloud Storage preview'),
        })
    @action(detail=True, methods=['GET'], url_path='preview')
    def preview(self, request, pk):
        storage = None
        try:
            db_storage = self.get_object()
            if not os.path.exists(db_storage.get_preview_path()):
                storage = db_storage_to_storage_instance(db_storage)
                if not db_storage.manifests.count():
                    raise Exception('Cannot get the cloud storage preview. There is no manifest file')
                preview_path = None
                for manifest_model in db_storage.manifests.all():
                    manifest_prefix = os.path.dirname(manifest_model.filename)
                    full_manifest_path = os.path.join(db_storage.get_storage_dirname(), manifest_model.filename)
                    if not os.path.exists(full_manifest_path) or \
                            datetime.utcfromtimestamp(os.path.getmtime(full_manifest_path)).replace(tzinfo=pytz.UTC) < storage.get_file_last_modified(manifest_model.filename):
                        storage.download_file(manifest_model.filename, full_manifest_path)
                    manifest = ImageManifestManager(
                        os.path.join(db_storage.get_storage_dirname(), manifest_model.filename),
                        db_storage.get_storage_dirname()
                    )
                    # need to update index
                    manifest.set_index()
                    if not len(manifest):
                        continue
                    preview_info = manifest[0]
                    preview_filename = ''.join([preview_info['name'], preview_info['extension']])
                    preview_path = os.path.join(manifest_prefix, preview_filename)
                    break
                if not preview_path:
                    msg = 'Cloud storage {} does not contain any images'.format(pk)
                    slogger.cloud_storage[pk].info(msg)
                    return HttpResponseBadRequest(msg)

                file_status = storage.get_file_status(preview_path)
                if file_status == CloudStorageStatus.NOT_FOUND:
                    raise FileNotFoundError(errno.ENOENT,
                        "Not found on the cloud storage {}".format(db_storage.display_name), preview_path)
                elif file_status == CloudStorageStatus.FORBIDDEN:
                    raise PermissionError(errno.EACCES,
                        "Access to the file on the '{}' cloud storage is denied".format(db_storage.display_name), preview_path)
                with NamedTemporaryFile() as temp_image:
                    storage.download_file(preview_path, temp_image.name)
                    reader = ImageListReader([temp_image.name])
                    preview = reader.get_preview(frame=0)
                    preview.save(db_storage.get_preview_path())
            content_type = mimetypes.guess_type(db_storage.get_preview_path())[0]
            return HttpResponse(open(db_storage.get_preview_path(), 'rb').read(), content_type)
        except CloudStorageModel.DoesNotExist:
            message = f"Storage {pk} does not exist"
            slogger.glob.error(message)
            return HttpResponseNotFound(message)
        except PermissionDenied:
            raise
        except Exception as ex:
            # check that cloud storage was not deleted
            storage_status = storage.get_status() if storage else None
            if storage_status == CloudStorageStatus.FORBIDDEN:
                msg = 'The resource {} is no longer available. Access forbidden.'.format(storage.name)
            elif storage_status == CloudStorageStatus.NOT_FOUND:
                msg = 'The resource {} not found. It may have been deleted.'.format(storage.name)
            else:
                msg = str(ex)
            return HttpResponseBadRequest(msg)

    @extend_schema(summary='Method returns a cloud storage status',
        responses={
            '200': OpenApiResponse(response=OpenApiTypes.STR, description='Cloud Storage status (AVAILABLE | NOT_FOUND | FORBIDDEN)'),
        })
    @action(detail=True, methods=['GET'], url_path='status')
    def status(self, request, pk):
        try:
            db_storage = self.get_object()
            storage = db_storage_to_storage_instance(db_storage)
            storage_status = storage.get_status()
            return HttpResponse(storage_status)
        except CloudStorageModel.DoesNotExist:
            message = f"Storage {pk} does not exist"
            slogger.glob.error(message)
            return HttpResponseNotFound(message)
        except Exception as ex:
            msg = str(ex)
            return HttpResponseBadRequest(msg)

    @extend_schema(summary='Method returns allowed actions for the cloud storage',
        responses={
            '200': OpenApiResponse(response=OpenApiTypes.STR, description='Cloud Storage actions (GET | PUT | DELETE)'),
        })
    @action(detail=True, methods=['GET'], url_path='actions')
    def actions(self, request, pk):
        '''
        Method return allowed actions for cloud storage. It's required for reading/writing
        '''
        try:
            db_storage = self.get_object()
            storage = db_storage_to_storage_instance(db_storage)
            actions = storage.supported_actions
            return Response(actions, content_type="text/plain")
        except CloudStorageModel.DoesNotExist:
            message = f"Storage {pk} does not exist"
            slogger.glob.error(message)
            return HttpResponseNotFound(message)
        except Exception as ex:
            msg = str(ex)
            return HttpResponseBadRequest(msg)

def rq_handler(job, exc_type, exc_value, tb):
    job.exc_info = "".join(
        traceback.format_exception_only(exc_type, exc_value))
    job.save()
    if "tasks" in job.id.split("/"):
        return task.rq_handler(job, exc_type, exc_value, tb)

    return True

def _download_file_from_bucket(db_storage, filename, key):
    storage = db_storage_to_storage_instance(db_storage)

    data = import_from_cloud_storage(storage, key)
    with open(filename, 'wb+') as f:
        f.write(data.getbuffer())

def _import_annotations(request, rq_id, rq_func, pk, format_name,
                        filename=None, location_conf=None):
    format_desc = {f.DISPLAY_NAME: f
        for f in dm.views.get_import_formats()}.get(format_name)
    if format_desc is None:
        raise serializers.ValidationError(
            "Unknown input format '{}'".format(format_name))
    elif not format_desc.ENABLED:
        return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)

    queue = django_rq.get_queue("default")
    rq_job = queue.fetch_job(rq_id)

    if not rq_job:
        # If filename is specified we consider that file was uploaded via TUS, so it exists in filesystem
        # Then we dont need to create temporary file
        # Or filename specify key in cloud storage so we need to download file
        fd = None
        dependent_job = None
        location = location_conf.get('location') if location_conf else Location.LOCAL

        if not filename or location == Location.CLOUD_STORAGE:
            if location != Location.CLOUD_STORAGE:
                serializer = AnnotationFileSerializer(data=request.data)
                if serializer.is_valid(raise_exception=True):
                    anno_file = serializer.validated_data['annotation_file']
                    fd, filename = mkstemp(prefix='cvat_{}'.format(pk), dir=settings.TMP_FILES_ROOT)
                    with open(filename, 'wb+') as f:
                        for chunk in anno_file.chunks():
                            f.write(chunk)
            else:
                assert filename, 'The filename was not spesified'
                try:
                    storage_id = location_conf['storage_id']
                except KeyError:
                    raise serializers.ValidationError(
                        'Cloud storage location was selected for destination'
                        ' but cloud storage id was not specified')
                db_storage = get_object_or_404(CloudStorageModel, pk=storage_id)
                key = filename
                fd, filename = mkstemp(prefix='cvat_{}'.format(pk), dir=settings.TMP_FILES_ROOT)
                dependent_job = configure_dependent_job(
                    queue, rq_id, _download_file_from_bucket,
                    db_storage, filename, key)

        av_scan_paths(filename)
        rq_job = queue.enqueue_call(
            func=rq_func,
            args=(pk, filename, format_name),
            job_id=rq_id,
            depends_on=dependent_job
        )
        rq_job.meta['tmp_file'] = filename
        rq_job.meta['tmp_file_descriptor'] = fd
        rq_job.save_meta()
    else:
        if rq_job.is_finished:
            if rq_job.meta['tmp_file_descriptor']: os.close(rq_job.meta['tmp_file_descriptor'])
            os.remove(rq_job.meta['tmp_file'])
            rq_job.delete()
            return Response(status=status.HTTP_201_CREATED)
        elif rq_job.is_failed or \
                rq_job.is_deferred and rq_job.dependency and rq_job.dependency.is_failed:
            exc_info = process_failed_job(rq_job)
            # RQ adds a prefix with exception class name
            import_error_prefix = '{}.{}'.format(
                CvatImportError.__module__, CvatImportError.__name__)
            if exc_info.startswith(import_error_prefix):
                exc_info = exc_info.replace(import_error_prefix + ': ', '')
                return Response(data=exc_info,
                    status=status.HTTP_400_BAD_REQUEST)
            else:
                return Response(data=exc_info,
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response(status=status.HTTP_202_ACCEPTED)

def _export_annotations(db_instance, rq_id, request, format_name, action, callback,
                        filename, location_conf):
    if action not in {"", "download"}:
        raise serializers.ValidationError(
            "Unexpected action specified for the request")

    format_desc = {f.DISPLAY_NAME: f
        for f in dm.views.get_export_formats()}.get(format_name)
    if format_desc is None:
        raise serializers.ValidationError(
            "Unknown format specified for the request")
    elif not format_desc.ENABLED:
        return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)

    queue = django_rq.get_queue("default")
    rq_job = queue.fetch_job(rq_id)

    if rq_job:
        last_instance_update_time = timezone.localtime(db_instance.updated_date)
        if isinstance(db_instance, Project):
            tasks_update = list(map(lambda db_task: timezone.localtime(db_task.updated_date), db_instance.tasks.all()))
            last_instance_update_time = max(tasks_update + [last_instance_update_time])
        request_time = rq_job.meta.get('request_time', None)
        if request_time is None or request_time < last_instance_update_time:
            rq_job.cancel()
            rq_job.delete()
        else:
            if rq_job.is_finished:
                file_path = rq_job.return_value
                if action == "download" and osp.exists(file_path):
                    rq_job.delete()

                    timestamp = datetime.strftime(last_instance_update_time,
                        "%Y_%m_%d_%H_%M_%S")
                    filename = filename or \
                        "{}_{}-{}-{}{}".format(
                            db_instance.__class__.__name__.lower(),
                            db_instance.name if isinstance(db_instance, (Task, Project)) else db_instance.id,
                            timestamp, format_name, osp.splitext(file_path)[1]
                        ).lower()

                    # save annotation to specified location
                    location = location_conf.get('location')
                    if location == Location.LOCAL:
                        return sendfile(request, file_path, attachment=True,
                            attachment_filename=filename)
                    elif location == Location.CLOUD_STORAGE:
                        try:
                            storage_id = location_conf['storage_id']
                        except KeyError:
                            return HttpResponseBadRequest(
                                'Cloud storage location was selected for destination'
                                ' but cloud storage id was not specified')

                        db_storage = get_object_or_404(CloudStorageModel, pk=storage_id)
                        storage = db_storage_to_storage_instance(db_storage)

                        export_to_cloud_storage(storage, file_path, filename)
                        return Response(status=status.HTTP_200_OK)
                    else:
                        raise NotImplementedError()
                else:
                    if osp.exists(file_path):
                        return Response(status=status.HTTP_201_CREATED)
            elif rq_job.is_failed:
                exc_info = str(rq_job.exc_info)
                rq_job.delete()
                return Response(exc_info,
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            else:
                return Response(status=status.HTTP_202_ACCEPTED)

    try:
        if request.scheme:
            server_address = request.scheme + '://'
        server_address += request.get_host()
    except Exception:
        server_address = None

    TTL_CONSTS = {
        'project': dm.views.PROJECT_CACHE_TTL,
        'task': dm.views.TASK_CACHE_TTL,
        'job': dm.views.JOB_CACHE_TTL,
    }
    ttl = TTL_CONSTS[db_instance.__class__.__name__.lower()].total_seconds()
    queue.enqueue_call(func=callback,
        args=(db_instance.id, format_name, server_address), job_id=rq_id,
        meta={ 'request_time': timezone.localtime() },
        result_ttl=ttl, failure_ttl=ttl)
    return Response(status=status.HTTP_202_ACCEPTED)

def _import_project_dataset(request, rq_id, rq_func, pk, format_name, filename=None, location_conf=None):
    format_desc = {f.DISPLAY_NAME: f
        for f in dm.views.get_import_formats()}.get(format_name)
    if format_desc is None:
        raise serializers.ValidationError(
            "Unknown input format '{}'".format(format_name))
    elif not format_desc.ENABLED:
        return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)

    queue = django_rq.get_queue("default")
    rq_job = queue.fetch_job(rq_id)

    if not rq_job:
        fd = None
        dependent_job = None
        location = location_conf.get('location') if location_conf else None
        if not filename and location != Location.CLOUD_STORAGE:
            serializer = DatasetFileSerializer(data=request.data)
            if serializer.is_valid(raise_exception=True):
                dataset_file = serializer.validated_data['dataset_file']
                fd, filename = mkstemp(prefix='cvat_{}'.format(pk), dir=settings.TMP_FILES_ROOT)
                with open(filename, 'wb+') as f:
                    for chunk in dataset_file.chunks():
                        f.write(chunk)
        elif location == Location.CLOUD_STORAGE:
            assert filename, 'The filename was not spesified'
            try:
                storage_id = location_conf['storage_id']
            except KeyError:
                raise serializers.ValidationError(
                    'Cloud storage location was selected for destination'
                    ' but cloud storage id was not specified')
            db_storage = get_object_or_404(CloudStorageModel, pk=storage_id)
            key = filename
            fd, filename = mkstemp(prefix='cvat_{}'.format(pk), dir=settings.TMP_FILES_ROOT)
            dependent_job = configure_dependent_job(
                queue, rq_id, _download_file_from_bucket,
                db_storage, filename, key)

        rq_job = queue.enqueue_call(
            func=rq_func,
            args=(pk, filename, format_name),
            job_id=rq_id,
            meta={
                'tmp_file': filename,
                'tmp_file_descriptor': fd,
            },
            depends_on=dependent_job
        )
    else:
        return Response(status=status.HTTP_409_CONFLICT, data='Import job already exists')

    return Response(status=status.HTTP_202_ACCEPTED)
