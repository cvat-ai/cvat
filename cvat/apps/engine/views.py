# Copyright (C) 2018-2022 Intel Corporation
# Copyright (C) 2022-2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os
import os.path as osp
from PIL import Image
from types import SimpleNamespace
from typing import Optional, Any, Dict, List, cast, Callable
import traceback
import textwrap
from copy import copy
from datetime import datetime
from tempfile import NamedTemporaryFile
from textwrap import dedent

import django_rq
from attr.converters import to_bool
from django.conf import settings
from django.contrib.auth.models import User
from django.db import IntegrityError, transaction
from django.db.models import Count
from django.db.models.query import Prefetch
from django.http import HttpResponse, HttpRequest, HttpResponseNotFound, HttpResponseBadRequest
from django.utils import timezone

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import (
    OpenApiParameter, OpenApiResponse, PolymorphicProxySerializer,
    extend_schema_view, extend_schema
)

from pathlib import Path
from rest_framework import mixins, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import APIException, NotFound, ValidationError, PermissionDenied
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import SAFE_METHODS
from rest_framework.response import Response
from rest_framework.settings import api_settings

import cvat.apps.dataset_manager as dm
import cvat.apps.dataset_manager.views  # pylint: disable=unused-import
from cvat.apps.engine.cloud_provider import db_storage_to_storage_instance, import_resource_from_cloud_storage, export_resource_to_cloud_storage
from cvat.apps.events.handlers import handle_dataset_export, handle_dataset_import
from cvat.apps.dataset_manager.bindings import CvatImportError
from cvat.apps.dataset_manager.serializers import DatasetFormatsSerializer
from cvat.apps.engine.frame_provider import FrameProvider
from cvat.apps.engine.media_extractors import get_mime
from cvat.apps.engine.models import (
    ClientFile, Job, JobType, Label, SegmentType, Task, Project, Issue, Data,
    Comment, StorageMethodChoice, StorageChoice,
    CloudProviderChoice, Location, CloudStorage as CloudStorageModel,
    Asset, AnnotationGuide)
from cvat.apps.engine.serializers import (
    AboutSerializer, AnnotationFileSerializer, BasicUserSerializer,
    DataMetaReadSerializer, DataMetaWriteSerializer, DataSerializer,
    FileInfoSerializer, JobReadSerializer, JobWriteSerializer, LabelSerializer,
    LabeledDataSerializer,
    ProjectReadSerializer, ProjectWriteSerializer,
    RqStatusSerializer, TaskReadSerializer, TaskWriteSerializer,
    UserSerializer, PluginsSerializer, IssueReadSerializer,
    AnnotationGuideReadSerializer, AnnotationGuideWriteSerializer,
    AssetReadSerializer, AssetWriteSerializer,
    IssueWriteSerializer, CommentReadSerializer, CommentWriteSerializer, CloudStorageWriteSerializer,
    CloudStorageReadSerializer, DatasetFileSerializer,
    ProjectFileSerializer, TaskFileSerializer, RqIdSerializer, CloudStorageContentSerializer)
from cvat.apps.engine.view_utils import get_cloud_storage_for_import_or_export

from utils.dataset_manifest import ImageManifestManager
from cvat.apps.engine.utils import (
    av_scan_paths, process_failed_job,
    parse_exception_message, get_rq_job_meta, get_import_rq_id,
    import_resource_with_clean_up_after, sendfile, define_dependent_job, get_rq_lock_by_user,
    build_annotations_file_name,
)
from cvat.apps.engine import backup
from cvat.apps.engine.mixins import PartialUpdateModelMixin, UploadMixin, AnnotationMixin, SerializeMixin
from cvat.apps.engine.location import get_location_configuration, StorageType

from . import models, task
from .log import ServerLogManager
from cvat.apps.iam.filters import ORGANIZATION_OPEN_API_PARAMETERS
from cvat.apps.iam.permissions import PolicyEnforcer, IsAuthenticatedOrReadPublicResource
from cvat.apps.engine.cache import MediaCache
from cvat.apps.engine.permissions import (CloudStoragePermission,
    CommentPermission, IssuePermission, JobPermission, LabelPermission, ProjectPermission,
    TaskPermission, UserPermission)
from cvat.apps.engine.view_utils import tus_chunk_action

slogger = ServerLogManager(__name__)

_UPLOAD_PARSER_CLASSES = api_settings.DEFAULT_PARSER_CLASSES + [MultiPartParser]

@extend_schema(tags=['server'])
class ServerViewSet(viewsets.ViewSet):
    serializer_class = None
    iam_organization_field = None

    # To get nice documentation about ServerViewSet actions it is necessary
    # to implement the method. By default, ViewSet doesn't provide it.
    def get_serializer(self, *args, **kwargs):
        pass

    @staticmethod
    @extend_schema(summary='Get basic CVAT information',
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
    @extend_schema(
        summary='List files/directories in the mounted share',
        parameters=[
            OpenApiParameter('directory', description='Directory to browse',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR),
            OpenApiParameter('search', description='Search for specific files',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR)
        ],
        responses={
            '200' : FileInfoSerializer(many=True)
        })
    @action(detail=False, methods=['GET'], serializer_class=FileInfoSerializer)
    def share(request):
        directory_param = request.query_params.get('directory', '/')
        search_param = request.query_params.get('search', '')

        if directory_param.startswith("/"):
            directory_param = directory_param[1:]

        directory = (Path(settings.SHARE_ROOT) / directory_param).absolute()

        if str(directory).startswith(settings.SHARE_ROOT) and directory.is_dir():
            data = []
            generator = directory.iterdir() if not search_param else (f for f in directory.iterdir() if f.name.startswith(search_param))

            for entry in generator:
                entry_type, entry_mime_type = None, None
                if entry.is_file():
                    entry_type = "REG"
                    entry_mime_type = get_mime(entry)
                    if entry_mime_type == 'zip':
                        entry_mime_type = 'archive'
                elif entry.is_dir():
                    entry_type = entry_mime_type = "DIR"

                if entry_type:
                    data.append({
                        "name": entry.name,
                        "type": entry_type,
                        "mime_type": entry_mime_type,
                    })

            # return directories at the top of the list
            serializer = FileInfoSerializer(many=True, data=sorted(data, key=lambda x: (x['type'], x['name'])))
            if serializer.is_valid(raise_exception=True):
                return Response(serializer.data)
        else:
            return Response("{} is an invalid directory".format(directory_param),
                status=status.HTTP_400_BAD_REQUEST)

    @staticmethod
    @extend_schema(
        summary='Get supported annotation formats',
        responses={
            '200': DatasetFormatsSerializer,
        })
    @action(detail=False, methods=['GET'], url_path='annotation/formats')
    def annotation_formats(request):
        data = dm.views.get_all_formats()
        return Response(DatasetFormatsSerializer(data).data)

    @staticmethod
    @extend_schema(
        summary='Get enabled plugins',
        responses={
            '200': PluginsSerializer,
        })
    @action(detail=False, methods=['GET'], url_path='plugins', serializer_class=PluginsSerializer)
    def plugins(request):
        data = {
            'GIT_INTEGRATION': False, # kept for backwards compatibility
            'ANALYTICS': to_bool(os.environ.get("CVAT_ANALYTICS", False)),
            'MODELS': to_bool(os.environ.get("CVAT_SERVERLESS", False)),
            'PREDICT': False, # FIXME: it is unused anymore (for UI only)
        }
        return Response(PluginsSerializer(data).data)

@extend_schema(tags=['projects'])
@extend_schema_view(
    list=extend_schema(
        summary='List projects',
        responses={
            '200': ProjectReadSerializer(many=True),
        }),
    create=extend_schema(
        summary='Create a project',
        request=ProjectWriteSerializer,
        parameters=ORGANIZATION_OPEN_API_PARAMETERS,
        responses={
            '201': ProjectReadSerializer, # check ProjectWriteSerializer.to_representation
        }),
    retrieve=extend_schema(
        summary='Get project details',
        responses={
            '200': ProjectReadSerializer,
        }),
    destroy=extend_schema(
        summary='Delete a project',
        responses={
            '204': OpenApiResponse(description='The project has been deleted'),
        }),
    partial_update=extend_schema(
        summary='Update a project',
        request=ProjectWriteSerializer(partial=True),
        responses={
            '200': ProjectReadSerializer, # check ProjectWriteSerializer.to_representation
        })
)
class ProjectViewSet(viewsets.GenericViewSet, mixins.ListModelMixin,
    mixins.RetrieveModelMixin, mixins.CreateModelMixin, mixins.DestroyModelMixin,
    PartialUpdateModelMixin, UploadMixin, AnnotationMixin, SerializeMixin
):
    queryset = models.Project.objects.select_related(
        'assignee', 'owner', 'target_storage', 'source_storage', 'annotation_guide',
    ).prefetch_related('tasks').all()

    # NOTE: The search_fields attribute should be a list of names of text
    # type fields on the model,such as CharField or TextField
    search_fields = ('name', 'owner', 'assignee', 'status')
    filter_fields = list(search_fields) + ['id', 'updated_date']
    simple_filters = list(search_fields)
    ordering_fields = list(filter_fields)
    ordering = "-id"
    lookup_fields = {'owner': 'owner__username', 'assignee': 'assignee__username'}
    iam_organization_field = 'organization'
    IMPORT_RQ_ID_TEMPLATE = get_import_rq_id('project', {}, 'dataset', {})

    def get_serializer_class(self):
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

    @transaction.atomic
    def perform_create(self, serializer, **kwargs):
        serializer.save(
            owner=self.request.user,
            organization=self.request.iam_context['organization']
        )

        # Required for the extra summary information added in the queryset
        serializer.instance = self.get_queryset().get(pk=serializer.instance.pk)

    @extend_schema(methods=['GET'], summary='Export a project as a dataset / Check dataset import status',
        description=textwrap.dedent("""
            To check the status of the process of importing a project dataset from a file:

            After initiating the dataset upload, you will receive an rq_id parameter.
            Make sure to include this parameter as a query parameter in your subsequent
            GET /api/projects/id/dataset requests to track the status of the dataset import.
            Also you should specify action parameter: action=import_status.
        """),
        parameters=[
            OpenApiParameter('format', description='Desired output format name\n'
                'You can get the list of supported formats at:\n/server/annotation/formats',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False),
            OpenApiParameter('filename', description='Desired output file name',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False),
            OpenApiParameter('action', description='Used to start downloading process locally after annotation file has been created',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False, enum=['download', 'import_status']),
            OpenApiParameter('location', description='Where need to save downloaded dataset',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False,
                enum=Location.list()),
            OpenApiParameter('cloud_storage_id', description='Storage id',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.INT, required=False),
            OpenApiParameter('use_default_location', description='Use the location that was configured in project to import dataset',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.BOOL, required=False,
                default=True),
            OpenApiParameter('rq_id', description='rq id',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False),
        ],
        responses={
            '200': OpenApiResponse(OpenApiTypes.BINARY, description='Download of file started'),
            '201': OpenApiResponse(description='Output file is ready for downloading'),
            '202': OpenApiResponse(description='Exporting has been started'),
            '405': OpenApiResponse(description='Format is not available'),
        })
    @extend_schema(methods=['POST'],
        summary='Import a dataset into a project',
        description=textwrap.dedent("""
            The request POST /api/projects/id/dataset will initiate file upload and will create
            the rq job on the server in which the process of dataset import from a file
            will be carried out. Please, use the GET /api/projects/id/dataset endpoint for checking status of the process.
        """),
        parameters=[
            OpenApiParameter('format', description='Desired dataset format name\n'
                'You can get the list of supported formats at:\n/server/annotation/formats',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False),
            OpenApiParameter('location', description='Where to import the dataset from',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False,
                enum=Location.list()),
            OpenApiParameter('cloud_storage_id', description='Storage id',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.INT, required=False),
            OpenApiParameter('use_default_location', description='Use the location that was configured in the project to import annotations',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.BOOL, required=False,
                default=True),
            OpenApiParameter('filename', description='Dataset file name',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False),
        ],
        request=PolymorphicProxySerializer('DatasetWrite',
            # TODO: refactor to use required=False when possible
            serializers=[DatasetFileSerializer, OpenApiTypes.NONE],
            resource_type_field_name=None
        ),
        responses={
            '202': OpenApiResponse(RqIdSerializer, description='Importing has been started'),
            '400': OpenApiResponse(description='Failed to import dataset'),
            '405': OpenApiResponse(description='Format is not available'),
        })
    @action(detail=True, methods=['GET', 'POST', 'OPTIONS'], serializer_class=None,
        url_path=r'dataset/?$', parser_classes=_UPLOAD_PARSER_CLASSES)
    def dataset(self, request, pk):
        self._object = self.get_object() # force call of check_object_permissions()

        if request.method in {'POST', 'OPTIONS'}:
            return self.import_annotations(
                request=request,
                db_obj=self._object,
                import_func=_import_project_dataset,
                rq_func=dm.project.import_dataset_as_project,
                rq_id_template=self.IMPORT_RQ_ID_TEMPLATE
            )
        else:
            action = request.query_params.get("action", "").lower()
            if action in ("import_status",):
                queue = django_rq.get_queue(settings.CVAT_QUEUES.IMPORT_DATA.value)
                rq_id = request.query_params.get('rq_id')
                if not rq_id:
                    return Response('The rq_id param should be specified in the query parameters', status=status.HTTP_400_BAD_REQUEST)

                # check that the user has access to the current rq_job
                # We should not return any status of job including "404 not found" for user that has no access for this rq_job

                if self.IMPORT_RQ_ID_TEMPLATE.format(pk, request.user) != rq_id:
                    return Response(status=status.HTTP_403_FORBIDDEN)

                rq_job = queue.fetch_job(rq_id)
                if rq_job is None:
                    return Response(status=status.HTTP_404_NOT_FOUND)
                elif rq_job.is_finished:
                    rq_job.delete()
                    return Response(status=status.HTTP_201_CREATED)
                elif rq_job.is_failed:
                    exc_info = process_failed_job(rq_job)

                    return Response(
                        data=str(exc_info),
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
                else:
                    return Response(
                        data=self._get_rq_response(
                            settings.CVAT_QUEUES.IMPORT_DATA.value,
                            rq_id,
                        ),
                        status=status.HTTP_202_ACCEPTED
                    )
            else:
                return self.export_annotations(
                    request=request,
                    db_obj=self._object,
                    export_func=_export_annotations,
                    callback=dm.views.export_project_as_dataset
                )

    @tus_chunk_action(detail=True, suffix_base="dataset")
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
            conv_mask_to_poly = to_bool(request.query_params.get('conv_mask_to_poly', True))
            tmp_dir = self._object.get_tmp_dirname()
            uploaded_file = None
            if os.path.isfile(os.path.join(tmp_dir, filename)):
                uploaded_file = os.path.join(tmp_dir, filename)
            return _import_project_dataset(
                request=request,
                filename=uploaded_file,
                rq_id_template=self.IMPORT_RQ_ID_TEMPLATE,
                rq_func=dm.project.import_dataset_as_project,
                db_obj=self._object,
                format_name=format_name,
                conv_mask_to_poly=conv_mask_to_poly
            )
        elif self.action == 'import_backup':
            filename = request.query_params.get("filename", "")
            if filename:
                tmp_dir = backup.get_backup_dirname()
                backup_file = os.path.join(tmp_dir, filename)
                if os.path.isfile(backup_file):
                    return backup.import_project(
                        request,
                        settings.CVAT_QUEUES.IMPORT_DATA.value,
                        filename=backup_file,
                    )
                return Response(data='No such file were uploaded',
                        status=status.HTTP_400_BAD_REQUEST)
            return backup.import_project(request, settings.CVAT_QUEUES.IMPORT_DATA.value)
        return Response(data='Unknown upload was finished',
                        status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(summary='Get project annotations',
        parameters=[
            OpenApiParameter('format', description='Desired output format name\n'
                'You can get the list of supported formats at:\n/server/annotation/formats',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=True),
            OpenApiParameter('filename', description='Desired output file name',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False),
            OpenApiParameter('action', description='Used to start downloading process locally after annotation file has been created',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False, enum=['download']),
            OpenApiParameter('location', description='Where need to save downloaded dataset',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False,
                enum=Location.list()),
            OpenApiParameter('cloud_storage_id', description='Storage id',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.INT, required=False),
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
        self._object = self.get_object() # force call of check_object_permissions()
        return self.export_annotations(
            request=request,
            db_obj=self._object,
            export_func=_export_annotations,
            callback=dm.views.export_project_annotations,
            get_data=dm.task.get_job_data,
        )

    @extend_schema(summary='Back up a project',
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
                location=OpenApiParameter.QUERY, type=OpenApiTypes.INT, required=False),
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

    @extend_schema(methods=['POST'], summary='Recreate a project from a backup',
        description=textwrap.dedent("""
            The backup import process is as follows:

            The first request POST /api/projects/backup will initiate file upload and will create
            the rq job on the server in which the process of a project creating from an uploaded backup
            will be carried out.

            After initiating the backup upload, you will receive an rq_id parameter.
            Make sure to include this parameter as a query parameter in your subsequent requests
            to track the status of the project creation.
            Once the project has been successfully created, the server will return the id of the newly created project.
        """),
        parameters=[
            *ORGANIZATION_OPEN_API_PARAMETERS,
            OpenApiParameter('location', description='Where to import the backup file from',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False,
                enum=Location.list(), default=Location.LOCAL),
            OpenApiParameter('cloud_storage_id', description='Storage id',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.INT, required=False),
            OpenApiParameter('filename', description='Backup file name',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False),
            OpenApiParameter('rq_id', description='rq id',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False),
        ],
        request=PolymorphicProxySerializer('BackupWrite',
            # TODO: refactor to use required=False when possible
            serializers=[ProjectFileSerializer, OpenApiTypes.NONE],
            resource_type_field_name=None
        ),
        # TODO: for some reason the code generated by the openapi generator from schema with different serializers
        # contains only one serializer, need to fix that.
        # https://github.com/OpenAPITools/openapi-generator/issues/6126
        responses={
            # 201: OpenApiResponse(inline_serializer("ImportedProjectIdSerializer", fields={"id": serializers.IntegerField(required=True)})
            '201': OpenApiResponse(description='The project has been imported'),
            '202': OpenApiResponse(RqIdSerializer, description='Importing a backup file has been started'),
        })
    @action(detail=False, methods=['OPTIONS', 'POST'], url_path=r'backup/?$',
        serializer_class=None,
        parser_classes=_UPLOAD_PARSER_CLASSES)
    def import_backup(self, request, pk=None):
        return self.deserialize(request, backup.import_project)

    @tus_chunk_action(detail=False, suffix_base="backup")
    def append_backup_chunk(self, request, file_id):
        return self.append_tus_chunk(request, file_id)

    @extend_schema(summary='Get a preview image for a project',
        responses={
            '200': OpenApiResponse(description='Project image preview'),
            '404': OpenApiResponse(description='Project image preview not found'),

        })
    @action(detail=True, methods=['GET'], url_path='preview')
    def preview(self, request, pk):
        self._object = self.get_object() # call check_object_permissions as well

        first_task = self._object.tasks.order_by('-id').first()
        if not first_task:
            return HttpResponseNotFound('Project image preview not found')

        data_getter = DataChunkGetter(
            data_type='preview',
            data_quality='compressed',
            data_num=first_task.data.start_frame,
            task_dim=first_task.dimension
        )

        return data_getter(request, first_task.data.start_frame,
           first_task.data.stop_frame, first_task.data)

    @staticmethod
    def _get_rq_response(queue, job_id):
        queue = django_rq.get_queue(queue)
        job = queue.fetch_job(job_id)
        response = {}
        if job is None or job.is_finished:
            response = { "state": "Finished" }
        elif job.is_queued or job.is_deferred:
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
        elif data_type == 'chunk' or data_type == 'frame' or data_type == 'preview':
            if data_num is None:
                raise ValidationError('Number is not specified')
            elif data_quality not in possible_quality_values:
                raise ValidationError('Wrong quality value')

        self.type = data_type
        self.number = int(data_num) if data_num is not None else None
        self.quality = FrameProvider.Quality.COMPRESSED \
            if data_quality == 'compressed' else FrameProvider.Quality.ORIGINAL

        self.dimension = task_dim

    def _check_frame_range(self, frame: int):
        frame_range = range(self._start, self._stop + 1, self._db_data.get_frame_step())
        if frame not in frame_range:
            raise ValidationError(
                f'The frame number should be in the [{self._start}, {self._stop}] range'
            )

    def __call__(self, request, start: int, stop: int, db_data: Optional[Data]):
        if not db_data:
            raise NotFound(detail='Cannot find requested data')

        self._start = start
        self._stop = stop
        self._db_data = db_data

        frame_provider = FrameProvider(db_data, self.dimension)

        try:
            if self.type == 'chunk':
                start_chunk = frame_provider.get_chunk_number(start)
                stop_chunk = frame_provider.get_chunk_number(stop)
                # pylint: disable=superfluous-parens
                if not (start_chunk <= self.number <= stop_chunk):
                    raise ValidationError('The chunk number should be in  the ' +
                        f'[{start_chunk}, {stop_chunk}] range')

                # TODO: av.FFmpegError processing
                if settings.USE_CACHE and db_data.storage_method == StorageMethodChoice.CACHE:
                    buff, mime_type = frame_provider.get_chunk(self.number, self.quality)
                    return HttpResponse(buff.getvalue(), content_type=mime_type)

                # Follow symbol links if the chunk is a link on a real image otherwise
                # mimetype detection inside sendfile will work incorrectly.
                path = os.path.realpath(frame_provider.get_chunk(self.number, self.quality))
                return sendfile(request, path)
            elif self.type == 'frame' or self.type == 'preview':
                self._check_frame_range(self.number)

                if self.type == 'preview':
                    cache = MediaCache(self.dimension)
                    buf, mime = cache.get_local_preview_with_mime(self.number, db_data)
                else:
                    buf, mime = frame_provider.get_frame(self.number, self.quality)

                return HttpResponse(buf.getvalue(), content_type=mime)

            elif self.type == 'context_image':
                self._check_frame_range(self.number)

                cache = MediaCache(self.dimension)
                buff, mime = cache.get_frame_context_images(db_data, self.number)
                if not buff:
                    return HttpResponseNotFound()
                return HttpResponse(buff, content_type=mime)
            else:
                return Response(data='unknown data type {}.'.format(self.type),
                    status=status.HTTP_400_BAD_REQUEST)
        except (ValidationError, PermissionDenied, NotFound) as ex:
            msg = str(ex) if not isinstance(ex, ValidationError) else \
                '\n'.join([str(d) for d in ex.detail])
            return Response(data=msg, status=ex.status_code)


class JobDataGetter(DataChunkGetter):
    def __init__(self, job: Job, data_type, data_num, data_quality):
        super().__init__(data_type, data_num, data_quality, task_dim=job.segment.task.dimension)
        self.job = job

    def _check_frame_range(self, frame: int):
        frame_range = self.job.segment.frame_set
        if frame not in frame_range:
            raise ValidationError("The frame number doesn't belong to the job")

    def __call__(self, request, start, stop, db_data):
        if self.type == 'chunk' and self.job.segment.type == SegmentType.SPECIFIC_FRAMES:
            frame_provider = FrameProvider(db_data, self.dimension)

            start_chunk = frame_provider.get_chunk_number(start)
            stop_chunk = frame_provider.get_chunk_number(stop)
            # pylint: disable=superfluous-parens
            if not (start_chunk <= self.number <= stop_chunk):
                raise ValidationError('The chunk number should be in the ' +
                    f'[{start_chunk}, {stop_chunk}] range')

            cache = MediaCache()

            if settings.USE_CACHE and db_data.storage_method == StorageMethodChoice.CACHE:
                buf, mime = cache.get_selective_job_chunk_data_with_mime(
                    chunk_number=self.number, quality=self.quality, job=self.job
                )
            else:
                buf, mime = cache.prepare_selective_job_chunk(
                    chunk_number=self.number, quality=self.quality, db_job=self.job
                )

            return HttpResponse(buf.getvalue(), content_type=mime)

        else:
            return super().__call__(request, start, stop, db_data)


@extend_schema(tags=['tasks'])
@extend_schema_view(
    list=extend_schema(
        summary='List tasks',
        responses={
            '200': TaskReadSerializer(many=True),
        }),
    create=extend_schema(
        summary='Create a task',
        description=textwrap.dedent("""\
            The new task will not have any attached images or videos.
            To attach them, use the /api/tasks/<id>/data endpoint.
        """),
        request=TaskWriteSerializer,
        parameters=ORGANIZATION_OPEN_API_PARAMETERS,
        responses={
            '201': TaskReadSerializer, # check TaskWriteSerializer.to_representation
        }),
    retrieve=extend_schema(
        summary='Get task details',
        responses={
            '200': TaskReadSerializer
        }),
    destroy=extend_schema(
        summary='Delete a task',
        description='All attached jobs, annotations and data will be deleted as well.',
        responses={
            '204': OpenApiResponse(description='The task has been deleted'),
        }),
    partial_update=extend_schema(
        summary='Update a task',
        request=TaskWriteSerializer(partial=True),
        responses={
            '200': TaskReadSerializer, # check TaskWriteSerializer.to_representation
        })
)

class TaskViewSet(viewsets.GenericViewSet, mixins.ListModelMixin,
    mixins.RetrieveModelMixin, mixins.CreateModelMixin, mixins.DestroyModelMixin,
    PartialUpdateModelMixin, UploadMixin, AnnotationMixin, SerializeMixin
):
    queryset = Task.objects.select_related(
        'data', 'assignee', 'owner',
        'target_storage', 'source_storage', 'annotation_guide',
    ).prefetch_related(
        'segment_set__job_set',
        'segment_set__job_set__assignee',
    ).with_job_summary().all()

    lookup_fields = {
        'project_name': 'project__name',
        'owner': 'owner__username',
        'assignee': 'assignee__username',
        'tracker_link': 'bug_tracker',
    }
    search_fields = (
        'project_name', 'name', 'owner', 'status', 'assignee',
        'subset', 'mode', 'dimension', 'tracker_link'
    )
    filter_fields = list(search_fields) + ['id', 'project_id', 'updated_date']
    filter_description = dedent("""

        There are few examples for complex filtering tasks:\n
            - Get all tasks from 1,2,3 projects - { "and" : [{ "in" : [{ "var" : "project_id" }, [1, 2, 3]]}]}\n
            - Get all completed tasks from 1 project - { "and": [{ "==": [{ "var" : "status" }, "completed"]}, { "==" : [{ "var" : "project_id"}, 1]}]}\n
    """)
    simple_filters = list(search_fields) + ['project_id']
    ordering_fields = list(filter_fields)
    ordering = "-id"
    iam_organization_field = 'organization'
    IMPORT_RQ_ID_TEMPLATE = get_import_rq_id('task', {}, 'annotations', {})

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

    @extend_schema(summary='Recreate a task from a backup',
        description=textwrap.dedent("""
            The backup import process is as follows:

            The first request POST /api/tasks/backup will initiate file upload and will create
            the rq job on the server in which the process of a task creating from an uploaded backup
            will be carried out.

            After initiating the backup upload, you will receive an rq_id parameter.
            Make sure to include this parameter as a query parameter in your subsequent requests
            to track the status of the task creation.
            Once the task has been successfully created, the server will return the id of the newly created task.
        """),
        parameters=[
            *ORGANIZATION_OPEN_API_PARAMETERS,
            OpenApiParameter('location', description='Where to import the backup file from',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False,
                enum=Location.list(), default=Location.LOCAL),
            OpenApiParameter('cloud_storage_id', description='Storage id',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.INT, required=False),
            OpenApiParameter('filename', description='Backup file name',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False),
            OpenApiParameter('rq_id', description='rq id',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False),
        ],
        request=TaskFileSerializer(required=False),
        # TODO: for some reason the code generated by the openapi generator from schema with different serializers
        # contains only one serializer, need to fix that.
        # https://github.com/OpenAPITools/openapi-generator/issues/6126
        responses={
            # 201: OpenApiResponse(inline_serializer("ImportedTaskIdSerializer", fields={"id": serializers.IntegerField(required=True)})
            '201': OpenApiResponse(description='The task has been imported'),
            '202': OpenApiResponse(RqIdSerializer, description='Importing a backup file has been started'),
        })

    @action(detail=False, methods=['OPTIONS', 'POST'], url_path=r'backup/?$',
        serializer_class=None,
        parser_classes=_UPLOAD_PARSER_CLASSES)
    def import_backup(self, request, pk=None):
        return self.deserialize(request, backup.import_task)

    @tus_chunk_action(detail=False, suffix_base="backup")
    def append_backup_chunk(self, request, file_id):
        return self.append_tus_chunk(request, file_id)

    @extend_schema(summary='Back up a task',
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
                location=OpenApiParameter.QUERY, type=OpenApiTypes.INT, required=False),
            OpenApiParameter('use_default_location', description='Use the location that was configured in the task to export backup',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.BOOL, required=False,
                default=True),
        ],
        responses={
            '200': OpenApiResponse(description='Download of file started'),
            '201': OpenApiResponse(description='Output backup file is ready for downloading'),
            '202': OpenApiResponse(description='Creating a backup file has been started'),
            '400': OpenApiResponse(description='Backup of a task without data is not allowed'),
        })
    @action(methods=['GET'], detail=True, url_path='backup')
    def export_backup(self, request, pk=None):
        if self.get_object().data is None:
            return Response(
                data='Backup of a task without data is not allowed',
                status=status.HTTP_400_BAD_REQUEST
            )
        return self.serialize(request, backup.export)

    @transaction.atomic
    def perform_update(self, serializer):
        instance = serializer.instance

        super().perform_update(serializer)

        updated_instance = serializer.instance

        if instance.project:
            instance.project.touch()
        if updated_instance.project and updated_instance.project != instance.project:
            updated_instance.project.touch()

    @transaction.atomic
    def perform_create(self, serializer, **kwargs):
        serializer.save(
            owner=self.request.user,
            organization=self.request.iam_context['organization']
        )

        if db_project := serializer.instance.project:
            db_project.touch()
            assert serializer.instance.organization == db_project.organization

        # Required for the extra summary information added in the queryset
        serializer.instance = self.get_queryset().get(pk=serializer.instance.pk)

    def _is_data_uploading(self) -> bool:
        return 'data' in self.action

    # UploadMixin method
    def get_upload_dir(self):
        if 'annotations' in self.action:
            return self._object.get_tmp_dirname()
        elif self._is_data_uploading():
            return self._object.data.get_upload_dirname()
        elif 'backup' in self.action:
            return backup.get_backup_dirname()
        return ""

    def _prepare_upload_info_entry(self, filename: str) -> str:
        filename = osp.normpath(filename)
        upload_dir = self.get_upload_dir()
        return osp.join(upload_dir, filename)

    def _maybe_append_upload_info_entry(self, filename: str):
        task_data = cast(Data, self._object.data)

        filename = self._prepare_upload_info_entry(filename)
        task_data.client_files.get_or_create(file=filename)

    def _append_upload_info_entries(self, client_files: List[Dict[str, Any]]):
        # batch version of _maybe_append_upload_info_entry() without optional insertion
        task_data = cast(Data, self._object.data)
        task_data.client_files.bulk_create([
            ClientFile(file=self._prepare_upload_info_entry(cf['file'].name), data=task_data)
            for cf in client_files
        ])

    def _sort_uploaded_files(self, uploaded_files: List[str], ordering: List[str]) -> List[str]:
        """
        Applies file ordering for the "predefined" file sorting method of the task creation.

        Read more: https://github.com/cvat-ai/cvat/issues/5061
        """

        expected_files = ordering

        uploaded_file_names = set(uploaded_files)
        mismatching_files = list(uploaded_file_names.symmetric_difference(expected_files))
        if mismatching_files:
            DISPLAY_ENTRIES_COUNT = 5
            mismatching_display = [
                fn + (" (extra)" if fn in uploaded_file_names else " (missing)")
                for fn in mismatching_files[:DISPLAY_ENTRIES_COUNT]
            ]
            remaining_count = len(mismatching_files) - DISPLAY_ENTRIES_COUNT
            raise ValidationError(
                "Uploaded files do not match the '{}' field contents. "
                "Please check the uploaded data and the list of uploaded files. "
                "Mismatching files: {}{}"
                .format(
                    self._UPLOAD_FILE_ORDER_FIELD,
                    ", ".join(mismatching_display),
                    f" (and {remaining_count} more). " if 0 < remaining_count else ""
                )
            )

        return list(expected_files)

    # UploadMixin method
    def init_tus_upload(self, request):
        response = super().init_tus_upload(request)

        if self._is_data_uploading() and response.status_code == status.HTTP_201_CREATED:
            self._maybe_append_upload_info_entry(self._get_metadata(request)['filename'])

        return response

    # UploadMixin method
    @transaction.atomic
    def append_files(self, request):
        client_files = self._get_request_client_files(request)
        if self._is_data_uploading() and client_files:
            self._append_upload_info_entries(client_files)

        return super().append_files(request)

    # UploadMixin method
    def upload_finished(self, request):
        @transaction.atomic
        def _handle_upload_annotations(request):
            format_name = request.query_params.get("format", "")
            filename = request.query_params.get("filename", "")
            conv_mask_to_poly = to_bool(request.query_params.get('conv_mask_to_poly', True))
            tmp_dir = self._object.get_tmp_dirname()
            if os.path.isfile(os.path.join(tmp_dir, filename)):
                annotation_file = os.path.join(tmp_dir, filename)
                return _import_annotations(
                        request=request,
                        filename=annotation_file,
                        rq_id_template=self.IMPORT_RQ_ID_TEMPLATE,
                        rq_func=dm.task.import_task_annotations,
                        db_obj=self._object,
                        format_name=format_name,
                        conv_mask_to_poly=conv_mask_to_poly,
                    )
            return Response(data='No such file were uploaded',
                    status=status.HTTP_400_BAD_REQUEST)

        def _handle_upload_data(request):
            with transaction.atomic():
                task_data = self._object.data
                serializer = DataSerializer(task_data, data=request.data)
                serializer.is_valid(raise_exception=True)

                # Append new files to the previous ones
                if uploaded_files := serializer.validated_data.get('client_files', None):
                    self.append_files(request)
                    serializer.validated_data['client_files'] = [] # avoid file info duplication

                # Refresh the db value with the updated file list and other request parameters
                db_data = serializer.save()
                self._object.data = db_data
                self._object.save()

                # Create a temporary copy of the parameters we will try to create the task with
                data = copy(serializer.data)

                for optional_field in ['job_file_mapping', 'server_files_exclude']:
                    if optional_field in serializer.validated_data:
                        data[optional_field] = serializer.validated_data[optional_field]

                if (
                    data['sorting_method'] == models.SortingMethod.PREDEFINED
                    and (uploaded_files := data['client_files'])
                    and (
                        uploaded_file_order := serializer.validated_data[self._UPLOAD_FILE_ORDER_FIELD]
                    )
                ):
                    # In the case of predefined sorting and custom file ordering,
                    # the requested order must be applied
                    data['client_files'] = self._sort_uploaded_files(
                        uploaded_files, uploaded_file_order
                    )

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
                if 'stop_frame' not in serializer.validated_data:
                    # if the value of stop_frame is 0, then inside the function we cannot know
                    # the value specified by the user or it's default value from the database
                    data['stop_frame'] = None

            # Need to process task data when the transaction is committed
            task.create(self._object, data, request)

            return Response(serializer.data, status=status.HTTP_202_ACCEPTED)

        @transaction.atomic
        def _handle_upload_backup(request):
            filename = request.query_params.get("filename", "")
            if filename:
                tmp_dir = backup.get_backup_dirname()
                backup_file = os.path.join(tmp_dir, filename)
                if os.path.isfile(backup_file):
                    return backup.import_task(
                        request,
                        settings.CVAT_QUEUES.IMPORT_DATA.value,
                        filename=backup_file,
                    )
                return Response(data='No such file were uploaded',
                        status=status.HTTP_400_BAD_REQUEST)
            return backup.import_task(request, settings.CVAT_QUEUES.IMPORT_DATA.value)

        if self.action == 'annotations':
            return _handle_upload_annotations(request)
        elif self.action == 'data':
            return _handle_upload_data(request)
        elif self.action == 'import_backup':
            return _handle_upload_backup(request)

        return Response(data='Unknown upload was finished',
                        status=status.HTTP_400_BAD_REQUEST)

    _UPLOAD_FILE_ORDER_FIELD = 'upload_file_order'
    assert _UPLOAD_FILE_ORDER_FIELD in DataSerializer().fields

    @extend_schema(methods=['POST'],
        summary="Attach data to a task",
        description=textwrap.dedent("""\
            Allows to upload data (images, video, etc.) to a task.
            Supports the TUS open file uploading protocol (https://tus.io/).

            Supports the following protocols:

            1. A single Data request

            and

            2.1. An Upload-Start request
            2.2.a. Regular TUS protocol requests (Upload-Length + Chunks)
            2.2.b. Upload-Multiple requests
            2.3. An Upload-Finish request

            Requests:
            - Data - POST, no extra headers or 'Upload-Start' + 'Upload-Finish' headers.
              Contains data in the body.
            - Upload-Start - POST, has an 'Upload-Start' header. No body is expected.
            - Upload-Length - POST, has an 'Upload-Length' header (see the TUS specification)
            - Chunk - HEAD/PATCH (see the TUS specification). Sent to /data/<file id> endpoints.
            - Upload-Finish - POST, has an 'Upload-Finish' header. Can contain data in the body.
            - Upload-Multiple - POST, has an 'Upload-Multiple' header. Contains data in the body.

            The 'Upload-Finish' request allows to specify the uploaded files should be ordered.
            This may be needed if the files can be sent unordered. To state that the input files
            are sent ordered, pass an empty list of files in the '{upload_file_order_field}' field.
            If the files are sent unordered, the ordered file list is expected
            in the '{upload_file_order_field}' field. It must be a list of string file paths,
            relative to the dataset root.

            Example:
            files = [
                "cats/cat_1.jpg",
                "dogs/dog2.jpg",
                "image_3.png",
                ...
            ]

            Independently of the file declaration field used
            ('client_files', 'server_files', etc.), when the 'predefined'
            sorting method is selected, the uploaded files will be ordered according
            to the '.jsonl' manifest file, if it is found in the list of files.
            For archives (e.g. '.zip'), a manifest file ('*.jsonl') is required when using
            the 'predefined' file ordering. Such file must be provided next to the archive
            in the list of files. Read more about manifest files here:
            https://docs.cvat.ai/docs/manual/advanced/dataset_manifest/

            After all data is sent, the operation status can be retrieved via
            the /status endpoint.

            Once data is attached to a task, it cannot be detached or replaced.
        """.format_map(
            {'upload_file_order_field': _UPLOAD_FILE_ORDER_FIELD}
        )),
        # TODO: add a tutorial on this endpoint in the REST API docs
        request=DataSerializer(required=False),
        parameters=[
            OpenApiParameter('Upload-Start', location=OpenApiParameter.HEADER, type=OpenApiTypes.BOOL,
                description='Initializes data upload. Optionally, can include upload metadata in the request body.'),
            OpenApiParameter('Upload-Multiple', location=OpenApiParameter.HEADER, type=OpenApiTypes.BOOL,
                description='Indicates that data with this request are single or multiple files that should be attached to a task'),
            OpenApiParameter('Upload-Finish', location=OpenApiParameter.HEADER, type=OpenApiTypes.BOOL,
                description='Finishes data upload. Can be combined with Upload-Start header to create task data with one request'),
        ],
        responses={
            '202': OpenApiResponse(description=''),
        })
    @extend_schema(methods=['GET'],
        summary='Get data of a task',
        parameters=[
            OpenApiParameter('type', location=OpenApiParameter.QUERY, required=False,
                type=OpenApiTypes.STR, enum=['chunk', 'frame', 'context_image'],
                description='Specifies the type of the requested data'),
            OpenApiParameter('quality', location=OpenApiParameter.QUERY, required=False,
                type=OpenApiTypes.STR, enum=['compressed', 'original'],
                description="Specifies the quality level of the requested data"),
            OpenApiParameter('number', location=OpenApiParameter.QUERY, required=False, type=OpenApiTypes.INT,
                description="A unique number value identifying chunk or frame"),
        ],
        responses={
            '200': OpenApiResponse(description='Data of a specific type'),
        })
    @action(detail=True, methods=['OPTIONS', 'POST', 'GET'], url_path=r'data/?$',
        parser_classes=_UPLOAD_PARSER_CLASSES)
    def data(self, request, pk):
        self._object = self.get_object() # call check_object_permissions as well
        if request.method == 'POST' or request.method == 'OPTIONS':
            with transaction.atomic():
                # Need to make sure that only one Data object can be attached to the task,
                # otherwise this can lead to many problems such as Data objects without a task,
                # multiple RQ data processing jobs at least.
                # It is not possible to use select_for_update with GROUP BY statement and
                # other aggregations that are defined by the viewset queryset,
                # we just need to lock 1 row with the target Task entity.
                locked_instance = Task.objects.select_for_update().get(pk=pk)
                task_data = locked_instance.data
                if not task_data:
                    task_data = Data.objects.create()
                    task_data.make_dirs()
                    locked_instance.data = task_data
                    self._object.data = task_data
                    locked_instance.save()
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
                self._object.data.stop_frame, self._object.data)

    @tus_chunk_action(detail=True, suffix_base="data")
    def append_data_chunk(self, request, pk, file_id):
        self._object = self.get_object()
        return self.append_tus_chunk(request, file_id)

    @extend_schema(methods=['GET'], summary='Get task annotations',
        parameters=[
            OpenApiParameter('format', location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False,
                description="Desired output format name\nYou can get the list of supported formats at:\n/server/annotation/formats"),
            OpenApiParameter('filename', description='Desired output file name',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False),
            OpenApiParameter('action', location=OpenApiParameter.QUERY,
                description='Used to start downloading process locally after annotation file has been created',
                type=OpenApiTypes.STR, required=False, enum=['download']),
            OpenApiParameter('location', description='Where need to save downloaded dataset',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False,
                enum=Location.list()),
            OpenApiParameter('cloud_storage_id', description='Storage id',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.INT, required=False),
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
            '400': OpenApiResponse(description='Exporting without data is not allowed'),
            '405': OpenApiResponse(description='Format is not available'),
        })
    @extend_schema(methods=['PUT'], summary='Replace task annotations / Get annotation import status',
        description=textwrap.dedent("""
            To check the status of an import request:

            After initiating the annotation import, you will receive an rq_id parameter.
            Make sure to include this parameter as a query parameter in your subsequent
            PUT /api/tasks/id/annotations requests to track the status of the import.
        """),
        parameters=[
            OpenApiParameter('format', location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False,
                description='Input format name\nYou can get the list of supported formats at:\n/server/annotation/formats'),
            OpenApiParameter('rq_id', location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False,
                description='rq id'),
        ],
        request=PolymorphicProxySerializer('TaskAnnotationsUpdate',
            # TODO: refactor to use required=False when possible
            serializers=[LabeledDataSerializer, AnnotationFileSerializer, OpenApiTypes.NONE],
            resource_type_field_name=None
        ),
        responses={
            '201': OpenApiResponse(description='Import has finished'),
            '202': OpenApiResponse(description='Import is in progress'),
            '405': OpenApiResponse(description='Format is not available'),
        })
    @extend_schema(methods=['POST'],
        summary="Import annotations into a task",
        description=textwrap.dedent("""
            The request POST /api/tasks/id/annotations will initiate the import and will create
            the rq job on the server in which the import will be carried out.
            Please, use the PUT /api/tasks/id/annotations endpoint for checking status of the process.
        """),
        parameters=[
            OpenApiParameter('format', location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False,
                description='Input format name\nYou can get the list of supported formats at:\n/server/annotation/formats'),
            OpenApiParameter('location', description='where to import the annotation from',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False,
                enum=Location.list()),
            OpenApiParameter('cloud_storage_id', description='Storage id',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.INT, required=False),
            OpenApiParameter('use_default_location', description='Use the location that was configured in task to import annotations',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.BOOL, required=False,
                default=True),
            OpenApiParameter('filename', description='Annotation file name',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False),
        ],
        request=PolymorphicProxySerializer('TaskAnnotationsWrite',
            # TODO: refactor to use required=False when possible
            serializers=[AnnotationFileSerializer, OpenApiTypes.NONE],
            resource_type_field_name=None
        ),
        responses={
            '201': OpenApiResponse(description='Uploading has finished'),
            '202': OpenApiResponse(RqIdSerializer, description='Uploading has been started'),
            '405': OpenApiResponse(description='Format is not available'),
        })
    @extend_schema(methods=['PATCH'], summary='Update task annotations',
        parameters=[
            OpenApiParameter('action', location=OpenApiParameter.QUERY, required=True,
                type=OpenApiTypes.STR, enum=['create', 'update', 'delete']),
        ],
        request=LabeledDataSerializer,
        responses={
            '200': LabeledDataSerializer,
        })
    @extend_schema(methods=['DELETE'], summary='Delete task annotations',
        responses={
            '204': OpenApiResponse(description='The annotation has been deleted'),
        })
    @action(detail=True, methods=['GET', 'DELETE', 'PUT', 'PATCH', 'POST', 'OPTIONS'], url_path=r'annotations/?$',
        serializer_class=None, parser_classes=_UPLOAD_PARSER_CLASSES)
    def annotations(self, request, pk):
        self._object = self.get_object() # force call of check_object_permissions()
        if request.method == 'GET':
            if self._object.data:
                return self.export_annotations(
                    request=request,
                    db_obj=self._object,
                    export_func=_export_annotations,
                    callback=dm.views.export_task_annotations,
                    get_data=dm.task.get_task_data,
                )
            else:
                return Response(data="Exporting annotations from a task without data is not allowed",
                    status=status.HTTP_400_BAD_REQUEST)
        elif request.method == 'POST' or request.method == 'OPTIONS':
            # NOTE: initialization process of annotations import
            format_name = request.query_params.get('format', '')
            return self.import_annotations(
                request=request,
                db_obj=self._object,
                import_func=_import_annotations,
                rq_func=dm.task.import_task_annotations,
                rq_id_template=self.IMPORT_RQ_ID_TEMPLATE
            )
        elif request.method == 'PUT':
            format_name = request.query_params.get('format', '')
            if format_name:
                # NOTE: continue process of import annotations
                use_settings = to_bool(request.query_params.get('use_default_location', True))
                conv_mask_to_poly = to_bool(request.query_params.get('conv_mask_to_poly', True))
                obj = self._object if use_settings else request.query_params
                location_conf = get_location_configuration(
                    obj=obj, use_settings=use_settings, field_name=StorageType.SOURCE
                )
                return _import_annotations(
                    request=request,
                    rq_id_template=self.IMPORT_RQ_ID_TEMPLATE,
                    rq_func=dm.task.import_task_annotations,
                    db_obj=self._object,
                    format_name=format_name,
                    location_conf=location_conf,
                    conv_mask_to_poly=conv_mask_to_poly
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

    @tus_chunk_action(detail=True, suffix_base="annotations")
    def append_annotations_chunk(self, request, pk, file_id):
        self._object = self.get_object()
        return self.append_tus_chunk(request, file_id)

    @extend_schema(
        summary='Get the creation status of a task',
        responses={
            '200': RqStatusSerializer,
        })
    @action(detail=True, methods=['GET'], serializer_class=RqStatusSerializer)
    def status(self, request, pk):
        self.get_object() # force call of check_object_permissions()
        response = self._get_rq_response(
            queue=settings.CVAT_QUEUES.IMPORT_DATA.value,
            job_id=f"create:task.id{pk}"
        )
        serializer = RqStatusSerializer(data=response)

        serializer.is_valid(raise_exception=True)
        return Response(serializer.data)

    @staticmethod
    def _get_rq_response(queue, job_id):
        queue = django_rq.get_queue(queue)
        job = queue.fetch_job(job_id)
        response = {}
        if job is None or job.is_finished:
            response = { "state": "Finished" }
        elif job.is_queued or job.is_deferred:
            response = { "state": "Queued" }
        elif job.is_failed:
            # FIXME: It seems that in some cases exc_info can be None.
            # It's not really clear how it is possible, but it can
            # lead to an error in serializing the response
            # https://github.com/cvat-ai/cvat/issues/5215
            response = { "state": "Failed", "message": parse_exception_message(job.exc_info or "Unknown error") }
        else:
            response = { "state": "Started" }
            if job.meta.get('status'):
                response['message'] = job.meta['status']
            response['progress'] = job.meta.get('task_progress', 0.)

        return response

    @extend_schema(methods=['GET'], summary='Get metainformation for media files in a task',
        responses={
            '200': DataMetaReadSerializer,
        })
    @extend_schema(methods=['PATCH'], summary='Update metainformation for media files in a task',
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
            'related_files': item.related_files.count() if hasattr(item, 'related_files') else 0
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
                description='Used to start downloading process locally after annotation file has been created',
                type=OpenApiTypes.STR, required=False, enum=['download']),
            OpenApiParameter('use_default_location', description='Use the location that was configured in task to export annotations',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.BOOL, required=False,
                default=True),
            OpenApiParameter('location', description='Where need to save downloaded dataset',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False,
                enum=Location.list()),
            OpenApiParameter('cloud_storage_id', description='Storage id',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.INT, required=False),
        ],
        responses={
            '200': OpenApiResponse(OpenApiTypes.BINARY, description='Download of file started'),
            '201': OpenApiResponse(description='Output file is ready for downloading'),
            '202': OpenApiResponse(description='Exporting has been started'),
            '400': OpenApiResponse(description='Exporting without data is not allowed'),
            '405': OpenApiResponse(description='Format is not available'),
        })
    @action(detail=True, methods=['GET'], serializer_class=None,
        url_path='dataset')
    def dataset_export(self, request, pk):
        self._object = self.get_object() # force call of check_object_permissions()

        if self._object.data:
            return self.export_annotations(
                request=request,
                db_obj=self._object,
                export_func=_export_annotations,
                callback=dm.views.export_task_as_dataset)
        else:
            return Response(data="Exporting a dataset from a task without data is not allowed",
                status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(summary='Get a preview image for a task',
        responses={
            '200': OpenApiResponse(description='Task image preview'),
            '404': OpenApiResponse(description='Task image preview not found'),
        })
    @action(detail=True, methods=['GET'], url_path='preview')
    def preview(self, request, pk):
        self._object = self.get_object() # call check_object_permissions as well

        if not self._object.data:
            return HttpResponseNotFound('Task image preview not found')

        data_getter = DataChunkGetter(
            data_type='preview',
            data_quality='compressed',
            data_num=self._object.data.start_frame,
            task_dim=self._object.dimension
        )

        return data_getter(request, self._object.data.start_frame,
            self._object.data.stop_frame, self._object.data)


@extend_schema(tags=['jobs'])
@extend_schema_view(
    create=extend_schema(
        summary='Create a job',
        request=JobWriteSerializer,
        responses={
            '201': JobReadSerializer, # check JobWriteSerializer.to_representation
        }),
    retrieve=extend_schema(
        summary='Get job details',
        responses={
            '200': JobReadSerializer,
        }),
    list=extend_schema(
        summary='List jobs',
        responses={
            '200': JobReadSerializer(many=True),
        }),
    partial_update=extend_schema(
        summary='Update a job',
        request=JobWriteSerializer(partial=True),
        responses={
            '200': JobReadSerializer, # check JobWriteSerializer.to_representation
        }),
    destroy=extend_schema(
        summary='Delete a job',
        description=textwrap.dedent("""\
            Related annotations will be deleted as well.

            Please note, that not every job can be removed. Currently,
            it is only available for Ground Truth jobs.
            """),
        responses={
            '204': OpenApiResponse(description='The job has been deleted'),
        }),
)
class JobViewSet(viewsets.GenericViewSet, mixins.ListModelMixin, mixins.CreateModelMixin,
    mixins.RetrieveModelMixin, PartialUpdateModelMixin, mixins.DestroyModelMixin,
    UploadMixin, AnnotationMixin
):
    queryset = Job.objects.select_related('assignee', 'segment__task__data',
        'segment__task__project', 'segment__task__annotation_guide', 'segment__task__project__annotation_guide',
    ).annotate(
        Count('issues', distinct=True),
    ).all()

    iam_organization_field = 'segment__task__organization'
    search_fields = ('task_name', 'project_name', 'assignee', 'state', 'stage')
    filter_fields = list(search_fields) + [
        'id', 'task_id', 'project_id', 'updated_date', 'dimension', 'type'
    ]
    simple_filters = list(set(filter_fields) - {'id', 'updated_date'})
    ordering_fields = list(filter_fields)
    ordering = "-id"
    lookup_fields = {
        'dimension': 'segment__task__dimension',
        'task_id': 'segment__task_id',
        'project_id': 'segment__task__project_id',
        'task_name': 'segment__task__name',
        'project_name': 'segment__task__project__name',
        'assignee': 'assignee__username'
    }
    IMPORT_RQ_ID_TEMPLATE = get_import_rq_id('job', {}, 'annotations', {})

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

    @transaction.atomic
    def perform_create(self, serializer):
        super().perform_create(serializer)

        # Required for the extra summary information added in the queryset
        serializer.instance = self.get_queryset().get(pk=serializer.instance.pk)

    def perform_destroy(self, instance):
        if instance.type != JobType.GROUND_TRUTH:
            raise ValidationError("Only ground truth jobs can be removed")

        return super().perform_destroy(instance)

    # UploadMixin method
    def get_upload_dir(self):
        return self._object.get_tmp_dirname()

    # UploadMixin method
    def upload_finished(self, request):
        if self.action == 'annotations':
            format_name = request.query_params.get("format", "")
            filename = request.query_params.get("filename", "")
            conv_mask_to_poly = to_bool(request.query_params.get('conv_mask_to_poly', True))
            tmp_dir = self.get_upload_dir()
            if os.path.isfile(os.path.join(tmp_dir, filename)):
                annotation_file = os.path.join(tmp_dir, filename)
                return _import_annotations(
                        request=request,
                        filename=annotation_file,
                        rq_id_template=self.IMPORT_RQ_ID_TEMPLATE,
                        rq_func=dm.task.import_job_annotations,
                        db_obj=self._object,
                        format_name=format_name,
                        conv_mask_to_poly=conv_mask_to_poly,
                    )
            else:
                return Response(data='No such file were uploaded',
                        status=status.HTTP_400_BAD_REQUEST)
        return Response(data='Unknown upload was finished',
                        status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(methods=['GET'],
        summary="Get job annotations",
        description=textwrap.dedent("""\
            If format is specified, a ZIP archive will be returned. Otherwise,
            the annotations will be returned as a JSON document.
        """),
        parameters=[
            OpenApiParameter('format', location=OpenApiParameter.QUERY,
                description='Desired output format name\nYou can get the list of supported formats at:\n/server/annotation/formats',
                type=OpenApiTypes.STR, required=False),
            OpenApiParameter('filename', description='Desired output file name',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False),
            OpenApiParameter('action', location=OpenApiParameter.QUERY,
                description='Used to start downloading process locally after annotation file has been created',
                type=OpenApiTypes.STR, required=False, enum=['download']),
            OpenApiParameter('location', description='Where need to save downloaded annotation',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False,
                enum=Location.list()),
            OpenApiParameter('cloud_storage_id', description='Storage id',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.INT, required=False),
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
    @extend_schema(methods=['POST'],
        summary='Import annotations into a job',
        description=textwrap.dedent("""
            The request POST /api/jobs/id/annotations will initiate the import and will create
            the rq job on the server in which the import will be carried out.
            Please, use the PUT /api/jobs/id/annotations endpoint for checking status of the process.
        """),
        parameters=[
            OpenApiParameter('format', location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False,
                description='Input format name\nYou can get the list of supported formats at:\n/server/annotation/formats'),
            OpenApiParameter('location', description='where to import the annotation from',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False,
                enum=Location.list()),
            OpenApiParameter('cloud_storage_id', description='Storage id',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.INT, required=False),
            OpenApiParameter('use_default_location', description='Use the location that was configured in the task to import annotation',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.BOOL, required=False,
                default=True),
            OpenApiParameter('filename', description='Annotation file name',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False),
        ],
        request=AnnotationFileSerializer(required=False),
        responses={
            '201': OpenApiResponse(description='Uploading has finished'),
            '202': OpenApiResponse(RqIdSerializer, description='Uploading has been started'),
            '405': OpenApiResponse(description='Format is not available'),
        })
    @extend_schema(methods=['PUT'],
                   summary='Replace job annotations / Get annotation import status',
        description=textwrap.dedent("""
            To check the status of an import request:

            After initiating the annotation import, you will receive an rq_id parameter.
            Make sure to include this parameter as a query parameter in your subsequent
            PUT /api/jobs/id/annotations requests to track the status of the import.
        """),
        parameters=[
            OpenApiParameter('format', location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False,
                description='Input format name\nYou can get the list of supported formats at:\n/server/annotation/formats'),
            OpenApiParameter('location', description='where to import the annotation from',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False,
                enum=Location.list()),
            OpenApiParameter('cloud_storage_id', description='Storage id',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.INT, required=False),
            OpenApiParameter('use_default_location', description='Use the location that was configured in the task to import annotation',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.BOOL, required=False,
                default=True),
            OpenApiParameter('filename', description='Annotation file name',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False),
            OpenApiParameter('rq_id', location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False,
                description='rq id'),
        ],
        request=PolymorphicProxySerializer(
            component_name='JobAnnotationsUpdate',
            serializers=[LabeledDataSerializer, AnnotationFileSerializer(required=False)],
            resource_type_field_name=None
        ),
        responses={
            '201': OpenApiResponse(description='Import has finished'),
            '202': OpenApiResponse(description='Import is in progress'),
            '405': OpenApiResponse(description='Format is not available'),
        })
    @extend_schema(methods=['PATCH'], summary='Update job annotations',
        parameters=[
            OpenApiParameter('action', location=OpenApiParameter.QUERY, type=OpenApiTypes.STR,
                required=True, enum=['create', 'update', 'delete'])
        ],
        request=LabeledDataSerializer,
        responses={
            '200': OpenApiResponse(description='Annotations successfully uploaded'),
        })
    @extend_schema(methods=['DELETE'], summary='Delete job annotations',
        responses={
            '204': OpenApiResponse(description='The annotation has been deleted'),
        })
    @action(detail=True, methods=['GET', 'DELETE', 'PUT', 'PATCH', 'POST', 'OPTIONS'], url_path=r'annotations/?$',
        serializer_class=LabeledDataSerializer, parser_classes=_UPLOAD_PARSER_CLASSES)
    def annotations(self, request, pk):
        self._object = self.get_object() # force call of check_object_permissions()
        if request.method == 'GET':
            return self.export_annotations(
                request=request,
                db_obj=self._object.segment.task,
                export_func=_export_annotations,
                callback=dm.views.export_job_annotations,
                get_data=dm.task.get_job_data,
            )

        elif request.method == 'POST' or request.method == 'OPTIONS':
            format_name = request.query_params.get('format', '')
            return self.import_annotations(
                request=request,
                db_obj=self._object,
                import_func=_import_annotations,
                rq_func=dm.task.import_job_annotations,
                rq_id_template=self.IMPORT_RQ_ID_TEMPLATE
            )

        elif request.method == 'PUT':
            format_name = request.query_params.get('format', '')
            if format_name:
                use_settings = to_bool(request.query_params.get('use_default_location', True))
                conv_mask_to_poly = to_bool(request.query_params.get('conv_mask_to_poly', True))
                obj = self._object.segment.task if use_settings else request.query_params
                location_conf = get_location_configuration(
                    obj=obj, use_settings=use_settings, field_name=StorageType.SOURCE
                )
                return _import_annotations(
                    request=request,
                    rq_id_template=self.IMPORT_RQ_ID_TEMPLATE,
                    rq_func=dm.task.import_job_annotations,
                    db_obj=self._object,
                    format_name=format_name,
                    location_conf=location_conf,
                    conv_mask_to_poly=conv_mask_to_poly
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


    @tus_chunk_action(detail=True, suffix_base="annotations")
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
                description='Used to start downloading process locally after annotation file has been created',
                type=OpenApiTypes.STR, required=False, enum=['download']),
            OpenApiParameter('use_default_location', description='Use the location that was configured in the task to export dataset',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.BOOL, required=False,
                default=True),
            OpenApiParameter('location', description='Where need to save downloaded dataset',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False,
                enum=Location.list()),
            OpenApiParameter('cloud_storage_id', description='Storage id',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.INT, required=False),
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
        self._object = self.get_object() # force call of check_object_permissions()

        return self.export_annotations(
            request=request,
            db_obj=self._object.segment.task,
            export_func=_export_annotations,
            callback=dm.views.export_job_as_dataset
        )

    @extend_schema(summary='Get data of a job',
        parameters=[
            OpenApiParameter('type', description='Specifies the type of the requested data',
                location=OpenApiParameter.QUERY, required=False, type=OpenApiTypes.STR,
                enum=['chunk', 'frame', 'context_image']),
            OpenApiParameter('quality', location=OpenApiParameter.QUERY, required=False,
                type=OpenApiTypes.STR, enum=['compressed', 'original'],
                description="Specifies the quality level of the requested data"),
            OpenApiParameter('number', location=OpenApiParameter.QUERY, required=False, type=OpenApiTypes.INT,
                description="A unique number value identifying chunk or frame"),
            ],
        responses={
            '200': OpenApiResponse(OpenApiTypes.BINARY, description='Data of a specific type'),
        })
    @action(detail=True, methods=['GET'],
        simple_filters=[] # type query parameter conflicts with the filter
    )
    def data(self, request, pk):
        db_job = self.get_object() # call check_object_permissions as well
        data_type = request.query_params.get('type', None)
        data_num = request.query_params.get('number', None)
        data_quality = request.query_params.get('quality', 'compressed')

        data_getter = JobDataGetter(db_job, data_type, data_num, data_quality)

        return data_getter(request, db_job.segment.start_frame,
            db_job.segment.stop_frame, db_job.segment.task.data)


    @extend_schema(methods=['GET'], summary='Get metainformation for media files in a job',
        responses={
            '200': DataMetaReadSerializer,
        })
    @extend_schema(methods=['PATCH'], summary='Update metainformation for media files in a job',
        request=DataMetaWriteSerializer,
        responses={
            '200': DataMetaReadSerializer,
        }, tags=['tasks'], versions=['2.0'])
    @action(detail=True, methods=['GET', 'PATCH'], serializer_class=DataMetaReadSerializer,
        url_path='data/meta')
    def metadata(self, request, pk):
        self.get_object() # force call of check_object_permissions()
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
        frame_step = db_data.get_frame_step()
        data_start_frame = db_data.start_frame + start_frame * frame_step
        data_stop_frame = min(db_data.stop_frame, db_data.start_frame + stop_frame * frame_step)
        frame_set = db_job.segment.frame_set

        if request.method == 'PATCH':
            serializer = DataMetaWriteSerializer(instance=db_data, data=request.data)
            if serializer.is_valid(raise_exception=True):
                serializer.validated_data['deleted_frames'] = list(filter(
                    lambda frame: frame >= start_frame and frame <= stop_frame,
                    serializer.validated_data['deleted_frames']
                )) + list(filter(
                    lambda frame: frame < start_frame or frame > stop_frame,
                    db_data.deleted_frames,
                ))
                db_data = serializer.save()
                db_job.segment.task.touch()
                if db_job.segment.task.project:
                    db_job.segment.task.project.touch()

        if hasattr(db_data, 'video'):
            media = [db_data.video]
        else:
            media = [
                # Insert placeholders if frames are skipped
                # We could skip them here too, but UI can't decode chunks then
                f if f.frame in frame_set else SimpleNamespace(
                    path=f'placeholder.jpg', width=f.width, height=f.height
                )
                for f in db_data.images.filter(
                    frame__gte=data_start_frame,
                    frame__lte=data_stop_frame,
                ).all()
            ]

        # Filter data with segment size
        # Should data.size also be cropped by segment size?
        db_data.deleted_frames = filter(
            lambda frame: frame >= start_frame and frame <= stop_frame,
            db_data.deleted_frames,
        )
        db_data.start_frame = data_start_frame
        db_data.stop_frame = data_stop_frame
        db_data.size = len(frame_set)
        db_data.included_frames = db_job.segment.frames or None

        frame_meta = [{
            'width': item.width,
            'height': item.height,
            'name': item.path,
            'related_files': item.related_files.count() if hasattr(item, 'related_files') else 0
        } for item in media]

        db_data.frames = frame_meta

        serializer = DataMetaReadSerializer(db_data)
        return Response(serializer.data)

    @extend_schema(summary='Get a preview image for a job',
        responses={
            '200': OpenApiResponse(description='Job image preview'),
        })
    @action(detail=True, methods=['GET'], url_path='preview')
    def preview(self, request, pk):
        self._object = self.get_object() # call check_object_permissions as well

        data_getter = DataChunkGetter(
            data_type='preview',
            data_quality='compressed',
            data_num=self._object.segment.start_frame,
            task_dim=self._object.segment.task.dimension
        )

        return data_getter(request, self._object.segment.start_frame,
           self._object.segment.stop_frame, self._object.segment.task.data)


@extend_schema(tags=['issues'])
@extend_schema_view(
    retrieve=extend_schema(
        summary='Get issue details',
        responses={
            '200': IssueReadSerializer,
        }),
    list=extend_schema(
        summary='List issues',
        responses={
            '200': IssueReadSerializer(many=True),
        }),
    partial_update=extend_schema(
        summary='Update an issue',
        request=IssueWriteSerializer(partial=True),
        responses={
            '200': IssueReadSerializer, # check IssueWriteSerializer.to_representation
        }),
    create=extend_schema(
        summary='Create an issue',
        request=IssueWriteSerializer,
        parameters=ORGANIZATION_OPEN_API_PARAMETERS,
        responses={
            '201': IssueReadSerializer, # check IssueWriteSerializer.to_representation
        }),
    destroy=extend_schema(
        summary='Delete an issue',
        responses={
            '204': OpenApiResponse(description='The issue has been deleted'),
        })
)
class IssueViewSet(viewsets.GenericViewSet, mixins.ListModelMixin,
    mixins.RetrieveModelMixin, mixins.CreateModelMixin, mixins.DestroyModelMixin,
    PartialUpdateModelMixin
):
    queryset = Issue.objects.prefetch_related(
        'job__segment__task', 'owner', 'assignee', 'job'
    ).all()

    iam_organization_field = 'job__segment__task__organization'
    search_fields = ('owner', 'assignee')
    filter_fields = list(search_fields) + ['id', 'job_id', 'task_id', 'resolved', 'frame_id']
    simple_filters = list(search_fields) + ['job_id', 'task_id', 'resolved', 'frame_id']
    ordering_fields = list(filter_fields)
    lookup_fields = {
        'owner': 'owner__username',
        'assignee': 'assignee__username',
        'job_id': 'job',
        'task_id': 'job__segment__task__id',
        'frame_id': 'frame',
    }
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

    def perform_create(self, serializer, **kwargs):
        serializer.save(owner=self.request.user)

@extend_schema(tags=['comments'])
@extend_schema_view(
    retrieve=extend_schema(
        summary='Get comment details',
        responses={
            '200': CommentReadSerializer,
        }),
    list=extend_schema(
        summary='List comments',
        responses={
            '200': CommentReadSerializer(many=True),
        }),
    partial_update=extend_schema(
        summary='Update a comment',
        request=CommentWriteSerializer(partial=True),
        responses={
            '200': CommentReadSerializer, # check CommentWriteSerializer.to_representation
        }),
    create=extend_schema(
        summary='Create a comment',
        request=CommentWriteSerializer,
        parameters=ORGANIZATION_OPEN_API_PARAMETERS,
        responses={
            '201': CommentReadSerializer, # check CommentWriteSerializer.to_representation
        }),
    destroy=extend_schema(
        summary='Delete a comment',
        responses={
            '204': OpenApiResponse(description='The comment has been deleted'),
        })
)
class CommentViewSet(viewsets.GenericViewSet, mixins.ListModelMixin,
    mixins.RetrieveModelMixin, mixins.CreateModelMixin, mixins.DestroyModelMixin,
    PartialUpdateModelMixin
):
    queryset = Comment.objects.prefetch_related(
        'issue', 'issue__job', 'owner'
    ).all()

    iam_organization_field = 'issue__job__segment__task__organization'
    search_fields = ('owner',)
    filter_fields = list(search_fields) + ['id', 'issue_id', 'frame_id', 'job_id']
    simple_filters = list(search_fields) + ['issue_id', 'frame_id', 'job_id']
    ordering_fields = list(filter_fields)
    ordering = '-id'
    lookup_fields = {
        'owner': 'owner__username',
        'issue_id': 'issue__id',
        'job_id': 'issue__job__id',
        'frame_id': 'issue__frame',
    }

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

    def perform_create(self, serializer, **kwargs):
        serializer.save(owner=self.request.user)


@extend_schema(tags=['labels'])
@extend_schema_view(
    retrieve=extend_schema(
        summary='Get label details',
        responses={
            '200': LabelSerializer,
        }),
    list=extend_schema(
        summary='List labels',
        parameters=[
            # These filters are implemented differently from others
            OpenApiParameter('job_id', type=OpenApiTypes.INT,
                description='A simple equality filter for job id'),
            OpenApiParameter('task_id', type=OpenApiTypes.INT,
                description='A simple equality filter for task id'),
            OpenApiParameter('project_id', type=OpenApiTypes.INT,
                description='A simple equality filter for project id'),
            *ORGANIZATION_OPEN_API_PARAMETERS
        ],
        responses={
            '200': LabelSerializer(many=True),
        }),
    partial_update=extend_schema(
        summary='Update a label',
        description='To modify a sublabel, please use the PATCH method of the parent label.',
        request=LabelSerializer(partial=True),
        responses={
            '200': LabelSerializer,
        }),
    destroy=extend_schema(
        summary='Delete a label',
        description='To delete a sublabel, please use the PATCH method of the parent label.',
        responses={
            '204': OpenApiResponse(description='The label has been deleted'),
        })
)
class LabelViewSet(viewsets.GenericViewSet, mixins.ListModelMixin,
    mixins.RetrieveModelMixin, mixins.DestroyModelMixin, PartialUpdateModelMixin
):
    queryset = Label.objects.prefetch_related(
        'attributespec_set',
        'sublabels__attributespec_set',
        'task',
        'task__owner',
        'task__assignee',
        'task__organization',
        'project',
        'project__owner',
        'project__assignee',
        'project__organization'
    ).all()

    iam_organization_field = ('task__organization', 'project__organization')

    search_fields = ('name', 'parent')
    filter_fields = list(search_fields) + ['id', 'type', 'color', 'parent_id']
    simple_filters = list(set(filter_fields) - {'id'})
    ordering_fields = list(filter_fields)
    lookup_fields = {
        'parent': 'parent__name',
    }
    ordering = 'id'
    serializer_class = LabelSerializer

    def get_queryset(self):
        if self.action == 'list':
            job_id = self.request.GET.get('job_id', None)
            task_id = self.request.GET.get('task_id', None)
            project_id = self.request.GET.get('project_id', None)
            if sum(v is not None for v in [job_id, task_id, project_id]) > 1:
                raise ValidationError(
                    "job_id, task_id and project_id parameters cannot be used together",
                    code=status.HTTP_400_BAD_REQUEST
                )

            if job_id:
                # NOTE: This filter is too complex to be implemented by other means
                # It requires the following filter query:
                # (
                #  project__task__segment__job__id = job_id
                #  OR
                #  task__segment__job__id = job_id
                # )
                job = Job.objects.get(id=job_id)
                self.check_object_permissions(self.request, job)
                queryset = job.get_labels()
            elif task_id:
                # NOTE: This filter is too complex to be implemented by other means
                # It requires the following filter query:
                # (
                #  project__task__id = task_id
                #  OR
                #  task_id = task_id
                # )
                task = Task.objects.get(id=task_id)
                self.check_object_permissions(self.request, task)
                queryset = task.get_labels()
            elif project_id:
                # NOTE: this check is to make behavior consistent with other source filters
                project = Project.objects.get(id=project_id)
                self.check_object_permissions(self.request, project)
                queryset = project.get_labels()
            else:
                # In other cases permissions are checked already
                queryset = super().get_queryset()
                perm = LabelPermission.create_scope_list(self.request)
                queryset = perm.filter(queryset)

            # Include only 1st level labels in list responses
            queryset = queryset.filter(parent__isnull=True)
        else:
            queryset = super().get_queryset()

        return queryset

    def get_serializer(self, *args, **kwargs):
        kwargs['local'] = True
        return super().get_serializer(*args, **kwargs)

    def perform_update(self, serializer):
        if serializer.instance.parent is not None:
            # NOTE: this can be relaxed when skeleton updates are implemented properly
            raise ValidationError(
                "Sublabels cannot be modified this way. "
                "Please send a PATCH request with updated parent label data instead.",
                code=status.HTTP_400_BAD_REQUEST)

        return super().perform_update(serializer)

    def perform_destroy(self, instance: models.Label):
        if instance.parent is not None:
            # NOTE: this can be relaxed when skeleton updates are implemented properly
            raise ValidationError(
                "Sublabels cannot be deleted this way. "
                "Please send a PATCH request with updated parent label data instead.",
                code=status.HTTP_400_BAD_REQUEST)

        if project := instance.project:
            project.touch()
            ProjectWriteSerializer(project).update_child_objects_on_labels_update(project)
        elif task := instance.task:
            task.touch()
            TaskWriteSerializer(task).update_child_objects_on_labels_update(task)

        return super().perform_destroy(instance)


@extend_schema(tags=['users'])
@extend_schema_view(
    list=extend_schema(
        summary='List users',
        responses={
            '200': PolymorphicProxySerializer(
                component_name='MetaUser',
                serializers=[
                    UserSerializer,
                    BasicUserSerializer,
                ],
                resource_type_field_name=None,
                many=True, # https://github.com/tfranzel/drf-spectacular/issues/910
            ),
        }),
    retrieve=extend_schema(
        summary='Get user details',
        responses={
            '200': PolymorphicProxySerializer(
                component_name='MetaUser',
                serializers=[
                    UserSerializer,
                    BasicUserSerializer,
                ],
                resource_type_field_name=None,
            ),
        }),
    partial_update=extend_schema(
        summary='Update a user',
        responses={
            '200': PolymorphicProxySerializer(
                component_name='MetaUser',
                serializers=[
                    UserSerializer(partial=True),
                    BasicUserSerializer(partial=True),
                ],
                resource_type_field_name=None,
            ),
        }),
    destroy=extend_schema(
        summary='Delete a user',
        responses={
            '204': OpenApiResponse(description='The user has been deleted'),
        })
)
class UserViewSet(viewsets.GenericViewSet, mixins.ListModelMixin,
    mixins.RetrieveModelMixin, PartialUpdateModelMixin, mixins.DestroyModelMixin):
    queryset = User.objects.prefetch_related('groups').all()
    iam_organization_field = 'memberships__organization'

    search_fields = ('username', 'first_name', 'last_name')
    filter_fields = list(search_fields) + ['id', 'is_active']
    simple_filters = list(search_fields) + ['is_active']
    ordering_fields = list(filter_fields)
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
        is_self = int(self.kwargs.get("pk", 0)) == user.id or \
            self.action == "self"
        if user.is_staff:
            return UserSerializer if not is_self else UserSerializer
        else:
            if is_self and self.request.method in SAFE_METHODS:
                return UserSerializer
            else:
                return BasicUserSerializer

    @extend_schema(summary='Get details of the current user',
        responses={
            '200': PolymorphicProxySerializer(component_name='MetaUser',
                serializers=[
                    UserSerializer, BasicUserSerializer,
                ], resource_type_field_name=None),
        })
    @action(detail=False, methods=['GET'])
    def self(self, request):
        """
        Method returns an instance of a user who is currently authenticated
        """
        serializer_class = self.get_serializer_class()
        serializer = serializer_class(request.user, context={ "request": request })
        return Response(serializer.data)

@extend_schema(tags=['cloudstorages'])
@extend_schema_view(
    retrieve=extend_schema(
        summary='Get cloud storage details',
        responses={
            '200': CloudStorageReadSerializer,
        }),
    list=extend_schema(
        summary='List cloud storages',
        responses={
            '200': CloudStorageReadSerializer(many=True),
        }),
    destroy=extend_schema(
        summary='Delete a cloud storage',
        responses={
            '204': OpenApiResponse(description='The cloud storage has been removed'),
        }),
    partial_update=extend_schema(
        summary='Update a cloud storage',
        request=CloudStorageWriteSerializer(partial=True),
        responses={
            '200': CloudStorageReadSerializer, # check CloudStorageWriteSerializer.to_representation
        }),
    create=extend_schema(
        summary='Create a cloud storage',
        request=CloudStorageWriteSerializer,
        parameters=ORGANIZATION_OPEN_API_PARAMETERS,
        responses={
            '201': CloudStorageReadSerializer, # check CloudStorageWriteSerializer.to_representation
        })
)
class CloudStorageViewSet(viewsets.GenericViewSet, mixins.ListModelMixin,
    mixins.RetrieveModelMixin, mixins.CreateModelMixin, mixins.DestroyModelMixin,
    PartialUpdateModelMixin
):
    queryset = CloudStorageModel.objects.prefetch_related('data').all()

    search_fields = ('provider_type', 'name', 'resource',
                    'credentials_type', 'owner', 'description')
    filter_fields = list(search_fields) + ['id']
    simple_filters = list(set(search_fields) - {'description'})
    ordering_fields = list(filter_fields)
    ordering = "-id"
    lookup_fields = {'owner': 'owner__username', 'name': 'display_name'}
    iam_organization_field = 'organization'

    # Multipart support is necessary here, as CloudStorageWriteSerializer
    # contains a file field (key_file).
    parser_classes = _UPLOAD_PARSER_CLASSES

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

    def create(self, request, *args, **kwargs):
        try:
            response = super().create(request, *args, **kwargs)
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

    @extend_schema(summary='Get cloud storage content',
        parameters=[
            OpenApiParameter('manifest_path', description='Path to the manifest file in a cloud storage',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR),
            OpenApiParameter('prefix', description='Prefix to filter data',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR),
            OpenApiParameter('next_token', description='Used to continue listing files in the bucket',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR),
            OpenApiParameter('page_size', location=OpenApiParameter.QUERY, type=OpenApiTypes.INT),
        ],
        responses={
            '200': OpenApiResponse(response=CloudStorageContentSerializer, description='A manifest content'),
        },
    )
    @action(detail=True, methods=['GET'], url_path='content-v2')
    def content_v2(self, request, pk):
        storage = None
        try:
            db_storage = self.get_object()
            storage = db_storage_to_storage_instance(db_storage)
            prefix = request.query_params.get('prefix', "")
            page_size = request.query_params.get('page_size', str(settings.BUCKET_CONTENT_MAX_PAGE_SIZE))
            if not page_size.isnumeric():
                return HttpResponseBadRequest('Wrong value for page_size was found')
            page_size = min(int(page_size), settings.BUCKET_CONTENT_MAX_PAGE_SIZE)

            # make api identical to share api
            if prefix and prefix.startswith('/'):
                prefix = prefix[1:]


            next_token = request.query_params.get('next_token')

            if (manifest_path := request.query_params.get('manifest_path')):
                manifest_prefix = os.path.dirname(manifest_path)

                full_manifest_path = os.path.join(db_storage.get_storage_dirname(), manifest_path)
                if not os.path.exists(full_manifest_path) or \
                        datetime.fromtimestamp(os.path.getmtime(full_manifest_path), tz=timezone.utc) < storage.get_file_last_modified(manifest_path):
                    storage.download_file(manifest_path, full_manifest_path)
                manifest = ImageManifestManager(full_manifest_path, db_storage.get_storage_dirname())
                # need to update index
                manifest.set_index()
                try:
                    start_index = int(next_token or '0')
                except ValueError:
                    return HttpResponseBadRequest('Wrong value for the next_token parameter was found.')
                content = manifest.emulate_hierarchical_structure(
                    page_size, manifest_prefix=manifest_prefix, prefix=prefix, default_prefix=storage.prefix, start_index=start_index)
            else:
                content = storage.list_files_on_one_page(prefix, next_token, page_size, _use_sort=True)
            for i in content['content']:
                mime_type = get_mime(i['name']) if i['type'] != 'DIR' else 'DIR' # identical to share point
                if mime_type == 'zip':
                    mime_type = 'archive'
                i['mime_type'] = mime_type
            serializer = CloudStorageContentSerializer(data=content)
            serializer.is_valid(raise_exception=True)
            content = serializer.data
            return Response(data=content)

        except CloudStorageModel.DoesNotExist:
            message = f"Storage {pk} does not exist"
            slogger.glob.error(message)
            return HttpResponseNotFound(message)
        except (ValidationError, PermissionDenied, NotFound) as ex:
            msg = str(ex) if not isinstance(ex, ValidationError) else \
                '\n'.join([str(d) for d in ex.detail])
            slogger.cloud_storage[pk].info(msg)
            return Response(data=msg, status=ex.status_code)
        except Exception as ex:
            slogger.glob.error(str(ex))
            return Response("An internal error has occurred",
                status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @extend_schema(summary='Get a preview image for a cloud storage',
        responses={
            '200': OpenApiResponse(description='Cloud Storage preview'),
            '400': OpenApiResponse(description='Failed to get cloud storage preview'),
            '404': OpenApiResponse(description='Cloud Storage preview not found'),
        })
    @action(detail=True, methods=['GET'], url_path='preview')
    def preview(self, request, pk):
        try:
            db_storage = self.get_object()
            cache = MediaCache()

            # The idea is try to define real manifest preview only for the storages that have related manifests
            # because otherwise it can lead to extra calls to a bucket, that are usually not free.
            if not db_storage.has_at_least_one_manifest:
                result = cache.get_cloud_preview_with_mime(db_storage)
                if not result:
                    return HttpResponseNotFound('Cloud storage preview not found')
                return HttpResponse(result[0], result[1])

            preview, mime = cache.get_or_set_cloud_preview_with_mime(db_storage)
            return HttpResponse(preview, mime)
        except CloudStorageModel.DoesNotExist:
            message = f"Storage {pk} does not exist"
            slogger.glob.error(message)
            return HttpResponseNotFound(message)
        except (ValidationError, PermissionDenied, NotFound) as ex:
            msg = str(ex) if not isinstance(ex, ValidationError) else \
                '\n'.join([str(d) for d in ex.detail])
            slogger.cloud_storage[pk].info(msg)
            return Response(data=msg, status=ex.status_code)
        except Exception as ex:
            slogger.glob.error(str(ex))
            return Response("An internal error has occurred",
                status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @extend_schema(summary='Get the status of a cloud storage',
        responses={
            '200': OpenApiResponse(response=OpenApiTypes.STR, description='Cloud Storage status (AVAILABLE | NOT_FOUND | FORBIDDEN)'),
        })
    @action(detail=True, methods=['GET'], url_path='status')
    def status(self, request, pk):
        try:
            db_storage = self.get_object()
            storage = db_storage_to_storage_instance(db_storage)
            storage_status = storage.get_status()
            return Response(storage_status)
        except CloudStorageModel.DoesNotExist:
            message = f"Storage {pk} does not exist"
            slogger.glob.error(message)
            return HttpResponseNotFound(message)
        except Exception as ex:
            msg = str(ex)
            return HttpResponseBadRequest(msg)

    @extend_schema(summary='Get allowed actions for a cloud storage',
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

@extend_schema(tags=['assets'])
@extend_schema_view(
    create=extend_schema(
        summary='Create an asset',
        request={
            'multipart/form-data': {
                'type': 'object',
                'properties': {
                    'file': {
                        'type': 'string',
                        'format': 'binary'
                    }
                }
            }
        },
        responses={
            '201': AssetReadSerializer,
        }),
    retrieve=extend_schema(
        summary='Get an asset',
        responses={
            '200': OpenApiResponse(description='Asset file')
        }),
    destroy=extend_schema(
        summary='Delete an asset',
        responses={
            '204': OpenApiResponse(description='The asset has been deleted'),
        }),
)
class AssetsViewSet(
    viewsets.GenericViewSet, mixins.RetrieveModelMixin,
    mixins.CreateModelMixin, mixins.DestroyModelMixin
):
    queryset = Asset.objects.select_related(
        'owner', 'guide', 'guide__project', 'guide__task', 'guide__project__organization', 'guide__task__organization',
    ).all()
    parser_classes=_UPLOAD_PARSER_CLASSES
    search_fields = ()
    ordering = "uuid"

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj.guide)

    def get_permissions(self):
        if self.action == 'retrieve':
            return [IsAuthenticatedOrReadPublicResource(), PolicyEnforcer()]
        return super().get_permissions()

    def get_serializer_class(self):
        if self.request.method in SAFE_METHODS:
            return AssetReadSerializer
        else:
            return AssetWriteSerializer

    def create(self, request, *args, **kwargs):
        file = request.data.get('file', None)
        if not file:
            raise ValidationError('Asset file was not provided')

        if file.size / (1024 * 1024) > settings.ASSET_MAX_SIZE_MB:
            raise ValidationError(f'Maximum size of asset is {settings.ASSET_MAX_SIZE_MB} MB')

        if file.content_type not in settings.ASSET_SUPPORTED_TYPES:
            raise ValidationError(f'File is not supported as an asset. Supported are {settings.ASSET_SUPPORTED_TYPES}')

        guide_id = request.data.get('guide_id')
        db_guide = AnnotationGuide.objects.prefetch_related('assets').get(pk=guide_id)
        if db_guide.assets.count() >= settings.ASSET_MAX_COUNT_PER_GUIDE:
            raise ValidationError(f'Maximum number of assets per guide reached')

        serializer = self.get_serializer(data={
            'filename': file.name,
            'guide_id': guide_id,
        })

        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        path = os.path.join(settings.ASSETS_ROOT, str(serializer.instance.uuid))
        os.makedirs(path)
        if file.content_type in ('image/jpeg', 'image/png'):
            image = Image.open(file)
            if any(map(lambda x: x > settings.ASSET_MAX_IMAGE_SIZE, image.size)):
                scale_factor = settings.ASSET_MAX_IMAGE_SIZE / max(image.size)
                image = image.resize((map(lambda x: int(x * scale_factor), image.size)))
            image.save(os.path.join(path, file.name))
        else:
            with open(os.path.join(path, file.name), 'wb+') as destination:
                for chunk in file.chunks():
                    destination.write(chunk)

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        return sendfile(request, os.path.join(settings.ASSETS_ROOT, str(instance.uuid), instance.filename))

    def perform_destroy(self, instance):
        full_path = os.path.join(instance.get_asset_dir(), instance.filename)
        if os.path.exists(full_path):
            os.remove(full_path)
        instance.delete()


@extend_schema(tags=['guides'])
@extend_schema_view(
    create=extend_schema(
        summary='Create an annotation guide',
        description='The new guide will be bound either to a project or a task, depending on parameters.',
        request=AnnotationGuideWriteSerializer,
        responses={
            '201': AnnotationGuideReadSerializer,
        }),
    retrieve=extend_schema(
        summary='Get annotation guide details',
        responses={
            '200': AnnotationGuideReadSerializer,
        }),
    destroy=extend_schema(
        summary='Delete an annotation guide',
        description='This also deletes all assets attached to the guide.',
        responses={
            '204': OpenApiResponse(description='The annotation guide has been deleted'),
        }),
    partial_update=extend_schema(
        summary='Update an annotation guide',
        request=AnnotationGuideWriteSerializer(partial=True),
        responses={
            '200': AnnotationGuideReadSerializer, # check TaskWriteSerializer.to_representation
        })
)
class AnnotationGuidesViewSet(
    viewsets.GenericViewSet, mixins.RetrieveModelMixin,
    mixins.CreateModelMixin, mixins.DestroyModelMixin, PartialUpdateModelMixin
):
    queryset = AnnotationGuide.objects.order_by('-id').select_related(
        'project', 'project__owner', 'project__organization', 'task', 'task__owner', 'task__organization'
    ).prefetch_related('assets').all()
    search_fields = ()
    ordering = "-id"
    iam_organization_field = None

    def get_serializer_class(self):
        if self.request.method in SAFE_METHODS:
            return AnnotationGuideReadSerializer
        else:
            return AnnotationGuideWriteSerializer

    def perform_create(self, serializer):
        super().perform_create(serializer)
        serializer.instance.target.save()

    def perform_update(self, serializer):
        super().perform_update(serializer)
        serializer.instance.target.save()

    def perform_destroy(self, instance):
        (instance.project or instance.task).save()
        instance.delete()

def rq_exception_handler(rq_job, exc_type, exc_value, tb):
    rq_job.meta["formatted_exception"] = "".join(
        traceback.format_exception_only(exc_type, exc_value))
    rq_job.save_meta()

    return True

def _import_annotations(request, rq_id_template, rq_func, db_obj, format_name,
                        filename=None, location_conf=None, conv_mask_to_poly=True):

    format_desc = {f.DISPLAY_NAME: f
        for f in dm.views.get_import_formats()}.get(format_name)
    if format_desc is None:
        raise serializers.ValidationError(
            "Unknown input format '{}'".format(format_name))
    elif not format_desc.ENABLED:
        return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)

    rq_id = request.query_params.get('rq_id')
    rq_id_should_be_checked = bool(rq_id)
    if not rq_id:
        rq_id = rq_id_template.format(db_obj.pk, request.user)

    queue = django_rq.get_queue(settings.CVAT_QUEUES.IMPORT_DATA.value)
    rq_job = queue.fetch_job(rq_id)

    if rq_id_should_be_checked and rq_id_template.format(db_obj.pk, request.user) != rq_id:
        return Response(status=status.HTTP_403_FORBIDDEN)

    if rq_job and request.method == 'POST':
        # If there is a previous job that has not been deleted
        if rq_job.is_finished or rq_job.is_failed:
            rq_job.delete()
            rq_job = queue.fetch_job(rq_id)
        else:
            return Response(status=status.HTTP_409_CONFLICT, data='Import job already exists')

    if not rq_job:
        # If filename is specified we consider that file was uploaded via TUS, so it exists in filesystem
        # Then we dont need to create temporary file
        # Or filename specify key in cloud storage so we need to download file
        location = location_conf.get('location') if location_conf else Location.LOCAL
        db_storage = None

        if not filename or location == Location.CLOUD_STORAGE:
            if location != Location.CLOUD_STORAGE:
                serializer = AnnotationFileSerializer(data=request.data)
                if serializer.is_valid(raise_exception=True):
                    anno_file = serializer.validated_data['annotation_file']
                    with NamedTemporaryFile(
                        prefix='cvat_{}'.format(db_obj.pk),
                        dir=settings.TMP_FILES_ROOT,
                        delete=False) as tf:
                        filename = tf.name
                        for chunk in anno_file.chunks():
                            tf.write(chunk)
            else:
                assert filename, 'The filename was not specified'

                try:
                    storage_id = location_conf['storage_id']
                except KeyError:
                    raise serializers.ValidationError(
                        'Cloud storage location was selected as the source,'
                        ' but cloud storage id was not specified')
                db_storage = get_cloud_storage_for_import_or_export(
                    storage_id=storage_id, request=request,
                    is_default=location_conf['is_default'])

                key = filename
                with NamedTemporaryFile(
                    prefix='cvat_{}'.format(db_obj.pk),
                    dir=settings.TMP_FILES_ROOT,
                    delete=False) as tf:
                    filename = tf.name

        func = import_resource_with_clean_up_after
        func_args = (rq_func, filename, db_obj.pk, format_name, conv_mask_to_poly)

        if location == Location.CLOUD_STORAGE:
            func_args = (db_storage, key, func) + func_args
            func = import_resource_from_cloud_storage

        av_scan_paths(filename)
        user_id = request.user.id

        with get_rq_lock_by_user(queue, user_id):
            rq_job = queue.enqueue_call(
                func=func,
                args=func_args,
                job_id=rq_id,
                depends_on=define_dependent_job(queue, user_id, rq_id=rq_id),
                meta={
                    'tmp_file': filename,
                    **get_rq_job_meta(request=request, db_obj=db_obj),
                },
                result_ttl=settings.IMPORT_CACHE_SUCCESS_TTL.total_seconds(),
                failure_ttl=settings.IMPORT_CACHE_FAILED_TTL.total_seconds()
            )

        handle_dataset_import(db_obj, format_name=format_name, cloud_storage=db_storage)

        serializer = RqIdSerializer(data={'rq_id': rq_id})
        serializer.is_valid(raise_exception=True)

        return Response(serializer.data, status=status.HTTP_202_ACCEPTED)
    else:
        if rq_job.is_finished:
            rq_job.delete()
            return Response(status=status.HTTP_201_CREATED)
        elif rq_job.is_failed:
            exc_info = process_failed_job(rq_job)

            import_error_prefix = f'{CvatImportError.__module__}.{CvatImportError.__name__}:'
            if exc_info.startswith("Traceback") and import_error_prefix in exc_info:
                exc_message = exc_info.split(import_error_prefix)[-1].strip()
                return Response(data=exc_message, status=status.HTTP_400_BAD_REQUEST)
            else:
                return Response(data=exc_info,
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response(status=status.HTTP_202_ACCEPTED)

def _export_annotations(
    db_instance: models.Project | models.Task | models.Job,
    rq_id: str,
    request: HttpRequest,
    format_name: str,
    action: str,
    callback: Callable[[int, Optional[str], Optional[str]], str],
    filename: Optional[str],
    location_conf: Dict[str, Any]
):
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

    queue = django_rq.get_queue(settings.CVAT_QUEUES.EXPORT_DATA.value)
    rq_job = queue.fetch_job(rq_id)

    location = location_conf.get('location')
    if location not in Location.list():
        raise serializers.ValidationError(
            f"Unexpected location {location} specified for the request"
        )

    last_instance_update_time = timezone.localtime(db_instance.updated_date)
    if isinstance(db_instance, Project):
        tasks_update = list(map(lambda db_task: timezone.localtime(db_task.updated_date), db_instance.tasks.all()))
        last_instance_update_time = max(tasks_update + [last_instance_update_time])

    timestamp = datetime.strftime(last_instance_update_time, "%Y_%m_%d_%H_%M_%S")
    is_annotation_file = rq_id.startswith('export:annotations')

    if rq_job:
        rq_request = rq_job.meta.get('request', None)
        request_time = rq_request.get('timestamp', None) if rq_request else None
        if request_time is None or request_time < last_instance_update_time:
            # in case the server is configured with ONE_RUNNING_JOB_IN_QUEUE_PER_USER
            # we have to enqueue dependent jobs after canceling one
            rq_job.cancel(enqueue_dependents=settings.ONE_RUNNING_JOB_IN_QUEUE_PER_USER)
            rq_job.delete()
        else:
            if rq_job.is_finished:
                if location == Location.CLOUD_STORAGE:
                    rq_job.delete()
                    return Response(status=status.HTTP_200_OK)

                elif location == Location.LOCAL:
                    file_path = rq_job.return_value()

                    if not file_path:
                        return Response('A result for exporting job was not found for finished RQ job', status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                    elif not osp.exists(file_path):
                        return Response('The result file does not exist in export cache', status=status.HTTP_500_INTERNAL_SERVER_ERROR)

                    if action == "download":
                        filename = filename or \
                            build_annotations_file_name(
                                class_name=db_instance.__class__.__name__,
                                identifier=db_instance.name if isinstance(db_instance, (Task, Project)) else db_instance.id,
                                timestamp=timestamp,
                                format_name=format_name,
                                is_annotation_file=is_annotation_file,
                                extension=osp.splitext(file_path)[1]
                            )

                        rq_job.delete()
                        return sendfile(request, file_path, attachment=True, attachment_filename=filename)

                    return Response(status=status.HTTP_201_CREATED)
                else:
                    raise NotImplementedError(f"Export to {location} location is not implemented yet")
            elif rq_job.is_failed:
                exc_info = rq_job.meta.get('formatted_exception', str(rq_job.exc_info))
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
    user_id = request.user.id

    func = callback if location == Location.LOCAL else export_resource_to_cloud_storage
    func_args = (db_instance.id, format_name, server_address)

    if location == Location.CLOUD_STORAGE:
        try:
            storage_id = location_conf['storage_id']
        except KeyError:
            raise serializers.ValidationError(
                'Cloud storage location was selected as the destination,'
                ' but cloud storage id was not specified')

        db_storage = get_cloud_storage_for_import_or_export(
            storage_id=storage_id, request=request,
            is_default=location_conf['is_default'])
        filename_pattern = build_annotations_file_name(
            class_name=db_instance.__class__.__name__,
            identifier=db_instance.name if isinstance(db_instance, (Task, Project)) else db_instance.id,
            timestamp=timestamp,
            format_name=format_name,
            is_annotation_file=is_annotation_file,
        )
        func_args = (db_storage, filename, filename_pattern, callback) + func_args
    else:
        db_storage = None

    with get_rq_lock_by_user(queue, user_id):
        queue.enqueue_call(
            func=func,
            args=func_args,
            job_id=rq_id,
            meta=get_rq_job_meta(request=request, db_obj=db_instance),
            depends_on=define_dependent_job(queue, user_id, rq_id=rq_id),
            result_ttl=ttl,
            failure_ttl=ttl,
        )

    handle_dataset_export(db_instance,
        format_name=format_name, cloud_storage=db_storage, save_images=not is_annotation_file)

    return Response(status=status.HTTP_202_ACCEPTED)

def _import_project_dataset(request, rq_id_template, rq_func, db_obj, format_name, filename=None, conv_mask_to_poly=True, location_conf=None):
    format_desc = {f.DISPLAY_NAME: f
        for f in dm.views.get_import_formats()}.get(format_name)
    if format_desc is None:
        raise serializers.ValidationError(
            "Unknown input format '{}'".format(format_name))
    elif not format_desc.ENABLED:
        return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)

    rq_id = rq_id_template.format(db_obj.pk, request.user)

    queue = django_rq.get_queue(settings.CVAT_QUEUES.IMPORT_DATA.value)
    rq_job = queue.fetch_job(rq_id)

    if not rq_job or rq_job.is_finished or rq_job.is_failed:
        if rq_job and (rq_job.is_finished or rq_job.is_failed):
            # for some reason the previous job has not been deleted
            # (e.g the user closed the browser tab when job has been created
            # but no one requests for checking status were not made)
            rq_job.delete()

        location = location_conf.get('location') if location_conf else None
        db_storage = None

        if not filename and location != Location.CLOUD_STORAGE:
            serializer = DatasetFileSerializer(data=request.data)
            if serializer.is_valid(raise_exception=True):
                dataset_file = serializer.validated_data['dataset_file']
                with NamedTemporaryFile(
                    prefix='cvat_{}'.format(db_obj.pk),
                    dir=settings.TMP_FILES_ROOT,
                    delete=False) as tf:
                    filename = tf.name
                    for chunk in dataset_file.chunks():
                        tf.write(chunk)

        elif location == Location.CLOUD_STORAGE:
            assert filename, 'The filename was not specified'
            try:
                storage_id = location_conf['storage_id']
            except KeyError:
                raise serializers.ValidationError(
                    'Cloud storage location was selected as the source,'
                    ' but cloud storage id was not specified')
            db_storage = get_cloud_storage_for_import_or_export(
                storage_id=storage_id, request=request,
                is_default=location_conf['is_default'])

            key = filename
            with NamedTemporaryFile(
                prefix='cvat_{}'.format(db_obj.pk),
                dir=settings.TMP_FILES_ROOT,
                delete=False) as tf:
                filename = tf.name

        func = import_resource_with_clean_up_after
        func_args = (rq_func, filename, db_obj.pk, format_name, conv_mask_to_poly)

        if location == Location.CLOUD_STORAGE:
            func_args = (db_storage, key, func) + func_args
            func = import_resource_from_cloud_storage

        user_id = request.user.id

        with get_rq_lock_by_user(queue, user_id):
            rq_job = queue.enqueue_call(
                func=func,
                args=func_args,
                job_id=rq_id,
                meta={
                    'tmp_file': filename,
                    **get_rq_job_meta(request=request, db_obj=db_obj),
                },
                depends_on=define_dependent_job(queue, user_id, rq_id=rq_id),
                result_ttl=settings.IMPORT_CACHE_SUCCESS_TTL.total_seconds(),
                failure_ttl=settings.IMPORT_CACHE_FAILED_TTL.total_seconds()
            )

        handle_dataset_import(db_obj, format_name=format_name, cloud_storage=db_storage)
    else:
        return Response(status=status.HTTP_409_CONFLICT, data='Import job already exists')

    serializer = RqIdSerializer(data={'rq_id': rq_id})
    serializer.is_valid(raise_exception=True)

    return Response(serializer.data, status=status.HTTP_202_ACCEPTED)
