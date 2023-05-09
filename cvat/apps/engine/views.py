# Copyright (C) 2018-2022 Intel Corporation
# Copyright (C) 2022-2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
import os
import os.path as osp
import pytz
import traceback
from datetime import datetime
from distutils.util import strtobool
from tempfile import mkstemp

from django.db.models.query import Prefetch
import django_rq
from django.apps import apps
from django.conf import settings
from django.contrib.auth.models import User
from django.db import IntegrityError
from django.http import HttpResponse, HttpResponseNotFound, HttpResponseBadRequest
from django.utils import timezone
from django.db.models import Count, Q

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import (
    OpenApiParameter, OpenApiResponse, PolymorphicProxySerializer,
    extend_schema_view, extend_schema
)
from drf_spectacular.plumbing import build_array_type, build_basic_type

from rest_framework import mixins, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import APIException, NotFound, ValidationError, PermissionDenied
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import SAFE_METHODS
from rest_framework.response import Response
from rest_framework.settings import api_settings
from django_sendfile import sendfile

import cvat.apps.dataset_manager as dm
import cvat.apps.dataset_manager.views  # pylint: disable=unused-import
from cvat.apps.engine.cloud_provider import db_storage_to_storage_instance
from cvat.apps.dataset_manager.bindings import CvatImportError
from cvat.apps.dataset_manager.serializers import DatasetFormatsSerializer
from cvat.apps.engine.frame_provider import FrameProvider
from cvat.apps.engine.media_extractors import get_mime
from cvat.apps.engine.models import (
    Job, Label, Task, Project, Issue, Data,
    Comment, StorageMethodChoice, StorageChoice,
    CloudProviderChoice, Location
)
from cvat.apps.engine.models import CloudStorage as CloudStorageModel
from cvat.apps.engine.serializers import (
    AboutSerializer, AnnotationFileSerializer, BasicUserSerializer,
    DataMetaReadSerializer, DataMetaWriteSerializer, DataSerializer,
    FileInfoSerializer, JobReadSerializer, JobWriteSerializer, LabelSerializer,
    LabeledDataSerializer,
    ProjectReadSerializer, ProjectWriteSerializer,
    RqStatusSerializer, TaskReadSerializer, TaskWriteSerializer,
    UserSerializer, PluginsSerializer, IssueReadSerializer,
    IssueWriteSerializer, CommentReadSerializer, CommentWriteSerializer, CloudStorageWriteSerializer,
    CloudStorageReadSerializer, DatasetFileSerializer,
    ProjectFileSerializer, TaskFileSerializer)
from cvat.apps.engine.view_utils import get_cloud_storage_for_import_or_export

from utils.dataset_manifest import ImageManifestManager
from cvat.apps.engine.utils import (
    av_scan_paths, process_failed_job, configure_dependent_job, parse_exception_message, get_rq_job_meta
)
from cvat.apps.engine import backup
from cvat.apps.engine.mixins import PartialUpdateModelMixin, UploadMixin, AnnotationMixin, SerializeMixin
from cvat.apps.engine.location import get_location_configuration, StorageType

from . import models, task
from .log import slogger
from cvat.apps.iam.permissions import (CloudStoragePermission,
    CommentPermission, IssuePermission, JobPermission, LabelPermission, ProjectPermission,
    TaskPermission, UserPermission)
from cvat.apps.engine.cache import MediaCache
from cvat.apps.events.handlers import handle_annotations_patch
from cvat.apps.engine.view_utils import tus_chunk_action


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
            'PREDICT': False, # FIXME: it is unused anymore (for UI only)
        }
        return Response(response)

@extend_schema(tags=['projects'])
@extend_schema_view(
    list=extend_schema(
        summary='Returns a paginated list of projects',
        responses={
            '200': ProjectReadSerializer(many=True),
        }),
    create=extend_schema(
        summary='Method creates a new project',
        request=ProjectWriteSerializer,
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
        'assignee', 'owner', 'target_storage', 'source_storage'
    ).prefetch_related(
        'tasks', 'label_set__sublabels__attributespec_set',
        'label_set__attributespec_set'
    ).annotate(
        proj_labels_count=Count('label',
            filter=Q(label__parent__isnull=True), distinct=True)
    ).all()

    # NOTE: The search_fields attribute should be a list of names of text
    # type fields on the model,such as CharField or TextField
    search_fields = ('name', 'owner', 'assignee', 'status')
    filter_fields = list(search_fields) + ['id', 'updated_date']
    simple_filters = list(search_fields)
    ordering_fields = list(filter_fields)
    ordering = "-id"
    lookup_fields = {'owner': 'owner__username', 'assignee': 'assignee__username'}
    iam_organization_field = 'organization'

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

    def perform_create(self, serializer, **kwargs):
        serializer.save(
            owner=self.request.user,
            organization=self.request.iam_context['organization']
        )

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
            '202': OpenApiResponse(description='Importing has been started'),
            '400': OpenApiResponse(description='Failed to import dataset'),
            '405': OpenApiResponse(description='Format is not available'),
        })
    @action(detail=True, methods=['GET', 'POST', 'OPTIONS'], serializer_class=None,
        url_path=r'dataset/?$', parser_classes=_UPLOAD_PARSER_CLASSES)
    def dataset(self, request, pk):
        self._object = self.get_object() # force call of check_object_permissions()
        rq_id = f"import:dataset-for-project.id{pk}-by-{request.user}"

        if request.method in {'POST', 'OPTIONS'}:
            return self.import_annotations(
                request=request,
                db_obj=self._object,
                import_func=_import_project_dataset,
                rq_func=dm.project.import_dataset_as_project,
                rq_id=rq_id,
            )
        else:
            action = request.query_params.get("action", "").lower()
            if action in ("import_status",):
                queue = django_rq.get_queue(settings.CVAT_QUEUES.IMPORT_DATA.value)
                rq_job = queue.fetch_job(rq_id)
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
            conv_mask_to_poly = strtobool(request.query_params.get('conv_mask_to_poly', 'True'))
            tmp_dir = self._object.get_tmp_dirname()
            uploaded_file = None
            if os.path.isfile(os.path.join(tmp_dir, filename)):
                uploaded_file = os.path.join(tmp_dir, filename)
            return _import_project_dataset(
                request=request,
                filename=uploaded_file,
                rq_id=f"import:dataset-for-project.id{self._object.pk}-by-{request.user}",
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
        self._object = self.get_object() # force call of check_object_permissions()
        return self.export_annotations(
            request=request,
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
        serializer_class=ProjectFileSerializer(required=False),
        parser_classes=_UPLOAD_PARSER_CLASSES)
    def import_backup(self, request, pk=None):
        return self.deserialize(request, backup.import_project)

    @tus_chunk_action(detail=False, suffix_base="backup")
    def append_backup_chunk(self, request, file_id):
        return self.append_tus_chunk(request, file_id)

    @extend_schema(summary='Method returns a preview image for the project',
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

    def __call__(self, request, start, stop, db_data):
        if not db_data:
            raise NotFound(detail='Cannot find requested data')

        frame_provider = FrameProvider(db_data, self.dimension)

        try:
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

            elif self.type == 'frame' or self.type == 'preview':
                if not (start <= self.number <= stop):
                    raise ValidationError('The frame number should be in ' +
                        f'[{start}, {stop}] range')

                if self.type == 'preview':
                    cache = MediaCache(self.dimension)
                    buf, mime = cache.get_local_preview_with_mime(self.number, db_data)
                else:
                    buf, mime = frame_provider.get_frame(self.number, self.quality)

                return HttpResponse(buf.getvalue(), content_type=mime)

            elif self.type == 'context_image':
                if start <= self.number <= stop:
                    cache = MediaCache(self.dimension)
                    buff, mime = cache.get_frame_context_images(db_data, self.number)
                    if not buff:
                        return HttpResponseNotFound()
                    return HttpResponse(io.BytesIO(buff), content_type=mime)
                raise ValidationError('The frame number should be in ' +
                    f'[{start}, {stop}] range')
            else:
                return Response(data='unknown data type {}.'.format(self.type),
                    status=status.HTTP_400_BAD_REQUEST)
        except (ValidationError, PermissionDenied, NotFound) as ex:
            msg = str(ex) if not isinstance(ex, ValidationError) else \
                '\n'.join([str(d) for d in ex.detail])
            return Response(data=msg, status=ex.status_code)

@extend_schema(tags=['tasks'])
@extend_schema_view(
    list=extend_schema(
        summary='Returns a paginated list of tasks',
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
    mixins.RetrieveModelMixin, mixins.CreateModelMixin, mixins.DestroyModelMixin,
    PartialUpdateModelMixin, UploadMixin, AnnotationMixin, SerializeMixin
):
    queryset = Task.objects.select_related(
        'data', 'assignee', 'owner',
        'target_storage', 'source_storage'
    ).prefetch_related(
        'segment_set__job_set',
        'segment_set__job_set__assignee', 'label_set__attributespec_set',
        'project__label_set__attributespec_set',
        'label_set__sublabels__attributespec_set',
        'project__label_set__sublabels__attributespec_set'
    ).annotate(
        completed_jobs_count=Count(
            'segment__job',
            filter=Q(segment__job__state=models.StateChoice.COMPLETED.value),
            distinct=True
        ),
        task_labels_count=Count('label',
            filter=Q(label__parent__isnull=True), distinct=True),
        proj_labels_count=Count('project__label',
            filter=Q(project__label__parent__isnull=True), distinct=True)
    ).all()

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
    simple_filters = list(search_fields) + ['project_id']
    ordering_fields = list(filter_fields)
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
    @action(detail=False, methods=['OPTIONS', 'POST'], url_path=r'backup/?$',
        serializer_class=TaskFileSerializer(required=False),
        parser_classes=_UPLOAD_PARSER_CLASSES)
    def import_backup(self, request, pk=None):
        return self.deserialize(request, backup.import_task)

    @tus_chunk_action(detail=False, suffix_base="backup")
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

        super().perform_update(serializer)

        updated_instance = serializer.instance

        if instance.project:
            instance.project.save()
        if updated_instance.project:
            updated_instance.project.save()

    def perform_create(self, serializer, **kwargs):
        serializer.save(
            owner=self.request.user,
            organization=self.request.iam_context['organization']
        )
        if serializer.instance.project:
            db_project = serializer.instance.project
            db_project.save()
            assert serializer.instance.organization == db_project.organization

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
            conv_mask_to_poly = strtobool(request.query_params.get('conv_mask_to_poly', 'True'))
            tmp_dir = self._object.get_tmp_dirname()
            if os.path.isfile(os.path.join(tmp_dir, filename)):
                annotation_file = os.path.join(tmp_dir, filename)
                return _import_annotations(
                        request=request,
                        filename=annotation_file,
                        rq_id=(f"import:annotations-for-task.id{self._object.pk}-"
                            f"in-{format_name.replace(' ', '_')}-by-{request.user}"),
                        rq_func=dm.task.import_task_annotations,
                        db_obj=self._object,
                        format_name=format_name,
                        conv_mask_to_poly=conv_mask_to_poly,
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

            if 'job_file_mapping' in serializer.validated_data:
                data['job_file_mapping'] = serializer.validated_data['job_file_mapping']

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
            task.create(self._object, data, request)
            return Response(serializer.data, status=status.HTTP_202_ACCEPTED)
        elif self.action == 'import_backup':
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
                self._object.data.stop_frame, self._object.data)

    @tus_chunk_action(detail=True, suffix_base="data")
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
            '400': OpenApiResponse(description='Exporting without data is not allowed'),
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
            format_name = request.query_params.get('format', '')
            return self.import_annotations(
                request=request,
                db_obj=self._object,
                import_func=_import_annotations,
                rq_func=dm.task.import_task_annotations,
                rq_id = f"import:annotations-for-task.id{pk}-in-{format_name.replace(' ', '_')}-by-{request.user}"
            )
        elif request.method == 'PUT':
            format_name = request.query_params.get('format', '')
            if format_name:
                use_settings = strtobool(str(request.query_params.get('use_default_location', True)))
                conv_mask_to_poly = strtobool(request.query_params.get('conv_mask_to_poly', 'True'))
                obj = self._object if use_settings else request.query_params
                location_conf = get_location_configuration(
                    obj=obj, use_settings=use_settings, field_name=StorageType.SOURCE
                )
                return _import_annotations(
                    request=request,
                    rq_id = f"import:annotations-for-task.id{pk}-in-{format_name.replace(' ', '_')}-by-{request.user}",
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
        summary='When task is being created the method returns information about a status of the creation process',
        responses={
            '200': RqStatusSerializer,
        })
    @action(detail=True, methods=['GET'], serializer_class=RqStatusSerializer)
    def status(self, request, pk):
        self.get_object() # force call of check_object_permissions()
        response = self._get_rq_response(
            queue=settings.CVAT_QUEUES.IMPORT_DATA.value,
            job_id=f"create:task.id{pk}-by-{request.user}"
        )
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
            # FIXME: It seems that in some cases exc_info can be None.
            # It's not really clear how it is possible, but it can
            # lead to an error in serializing the response
            # https://github.com/opencv/cvat/issues/5215
            response = { "state": "Failed", "message": parse_exception_message(job.exc_info or "Unknown error") }
        else:
            response = { "state": "Started" }
            if job.meta.get('status'):
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

    @extend_schema(summary='Method returns a preview image for the task',
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
    retrieve=extend_schema(
        summary='Method returns details of a job',
        responses={
            '200': JobReadSerializer,
        }),
    list=extend_schema(
        summary='Method returns a paginated list of jobs',
        responses={
            '200': JobReadSerializer(many=True),
        }),
    partial_update=extend_schema(
        summary='Methods does a partial update of chosen fields in a job',
        request=JobWriteSerializer(partial=True),
        responses={
            '200': JobReadSerializer, # check JobWriteSerializer.to_representation
        })
)
class JobViewSet(viewsets.GenericViewSet, mixins.ListModelMixin,
    mixins.RetrieveModelMixin, PartialUpdateModelMixin, UploadMixin, AnnotationMixin
):
    queryset = Job.objects.select_related('assignee', 'segment__task__data',
        'segment__task__project'
    ).annotate(
        Count('issues', distinct=True),
        task_labels_count=Count('segment__task__label',
            filter=Q(segment__task__label__parent__isnull=True), distinct=True),
        proj_labels_count=Count('segment__task__project__label',
            filter=Q(segment__task__project__label__parent__isnull=True), distinct=True)
    ).all()

    iam_organization_field = 'segment__task__organization'
    search_fields = ('task_name', 'project_name', 'assignee', 'state', 'stage')
    filter_fields = list(search_fields) + ['id', 'task_id', 'project_id', 'updated_date', 'dimension']
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
            conv_mask_to_poly = strtobool(request.query_params.get('conv_mask_to_poly', 'True'))
            tmp_dir = task.get_tmp_dirname()
            if os.path.isfile(os.path.join(tmp_dir, filename)):
                annotation_file = os.path.join(tmp_dir, filename)
                return _import_annotations(
                        request=request,
                        filename=annotation_file,
                        rq_id=(f"import:annotations-for-job.id{self._object.pk}-"
                            f"in-{format_name.replace(' ', '_')}-by-{request.user}"),
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
                db_obj=self._object.segment.task,
                import_func=_import_annotations,
                rq_func=dm.task.import_job_annotations,
                rq_id=(f"import:annotations-for-job.id{self._object.pk}-"
                            f"in-{format_name.replace(' ', '_')}-by-{request.user}"),
            )

        elif request.method == 'PUT':
            format_name = request.query_params.get('format', '')
            if format_name:
                use_settings = strtobool(str(request.query_params.get('use_default_location', True)))
                conv_mask_to_poly = strtobool(request.query_params.get('conv_mask_to_poly', 'True'))
                obj = self._object.segment.task if use_settings else request.query_params
                location_conf = get_location_configuration(
                    obj=obj, use_settings=use_settings, field_name=StorageType.SOURCE
                )
                return _import_annotations(
                    request=request,
                    rq_id=(f"import:annotations-for-job.id{pk}-"
                            f"in-{format_name.replace(' ', '_')}-by-{request.user}"),
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
                handle_annotations_patch(instance=self._object, annotations=data, action=action)
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
        self._object = self.get_object() # force call of check_object_permissions()

        return self.export_annotations(
            request=request,
            db_obj=self._object.segment.task,
            export_func=_export_annotations,
            callback=dm.views.export_job_as_dataset
        )

    @extend_schema(summary='Method returns data for a specific job',
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
    @action(detail=True, methods=['GET'])
    def data(self, request, pk):
        db_job = self.get_object() # call check_object_permissions as well
        data_type = request.query_params.get('type', None)
        data_num = request.query_params.get('number', None)
        data_quality = request.query_params.get('quality', 'compressed')

        data_getter = DataChunkGetter(data_type, data_num, data_quality,
            db_job.segment.task.dimension)

        return data_getter(request, db_job.segment.start_frame,
            db_job.segment.stop_frame, db_job.segment.task.data)


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
        data_start_frame = db_data.start_frame + start_frame * db_data.get_frame_step()
        data_stop_frame = db_data.start_frame + stop_frame * db_data.get_frame_step()

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
            'related_files': item.related_files.count() if hasattr(item, 'related_files') else 0
        } for item in media]

        db_data.frames = frame_meta

        serializer = DataMetaReadSerializer(db_data)
        return Response(serializer.data)

    @extend_schema(summary='Method returns a preview image for the job',
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
        summary='Method returns details of an issue',
        responses={
            '200': IssueReadSerializer,
        }),
    list=extend_schema(
        summary='Method returns a paginated list of issues',
        responses={
            '200': IssueReadSerializer(many=True),
        }),
    partial_update=extend_schema(
        summary='Methods does a partial update of chosen fields in an issue',
        request=IssueWriteSerializer(partial=True),
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
        summary='Method returns details of a comment',
        responses={
            '200': CommentReadSerializer,
        }),
    list=extend_schema(
        summary='Method returns a paginated list of comments',
        responses={
            '200': CommentReadSerializer(many=True),
        }),
    partial_update=extend_schema(
        summary='Methods does a partial update of chosen fields in a comment',
        request=CommentWriteSerializer(partial=True),
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
        summary='Method returns details of a label',
        responses={
            '200': LabelSerializer,
        }),
    list=extend_schema(
        summary='Method returns a paginated list of labels',
        parameters=[
            # These filters are implemented differently from others
            OpenApiParameter('job_id', type=OpenApiTypes.INT,
                description='A simple equality filter for job id'),
            OpenApiParameter('task_id', type=OpenApiTypes.INT,
                description='A simple equality filter for task id'),
            OpenApiParameter('project_id', type=OpenApiTypes.INT,
                description='A simple equality filter for project id'),
        ],
        responses={
            '200': LabelSerializer(many=True),
        }),
    partial_update=extend_schema(
        summary='Methods does a partial update of chosen fields in a label'
        'To modify a sublabel, please use the PATCH method of the parent label',
        request=LabelSerializer(partial=True),
        responses={
            '200': LabelSerializer,
        }),
    destroy=extend_schema(
        summary='Method deletes a label. '
        'To delete a sublabel, please use the PATCH method of the parent label',
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

    # NOTE: This filter works incorrectly for this view
    # it requires task__organization OR project__organization check.
    # Thus, we rely on permission-based filtering
    iam_organization_field = None

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

    def perform_destroy(self, instance):
        if instance.parent is not None:
            # NOTE: this can be relaxed when skeleton updates are implemented properly
            raise ValidationError(
                "Sublabels cannot be deleted this way. "
                "Please send a PATCH request with updated parent label data instead.",
                code=status.HTTP_400_BAD_REQUEST)

        return super().perform_destroy(instance)


@extend_schema(tags=['users'])
@extend_schema_view(
    list=extend_schema(
        summary='Method returns a paginated list of users',
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
                    UserSerializer(partial=True), BasicUserSerializer(partial=True),
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
        summary='Returns a paginated list of storages',
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
        request=CloudStorageWriteSerializer(partial=True),
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
                raise ValidationError('There is no manifest file')
            manifest_path = request.query_params.get('manifest_path', db_storage.manifests.first().filename)
            manifest_prefix = os.path.dirname(manifest_path)

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
        except (ValidationError, PermissionDenied, NotFound) as ex:
            msg = str(ex) if not isinstance(ex, ValidationError) else \
                '\n'.join([str(d) for d in ex.detail])
            slogger.cloud_storage[pk].info(msg)
            return Response(data=msg, status=ex.status_code)
        except Exception as ex:
            slogger.glob.error(str(ex))
            return Response("An internal error has occurred",
                status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @extend_schema(summary='Method returns a preview image from a cloud storage',
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
            preview, mime = cache.get_cloud_preview_with_mime(db_storage)
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
            return Response(storage_status)
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

def rq_exception_handler(rq_job, exc_type, exc_value, tb):
    rq_job.exc_info = "".join(
        traceback.format_exception_only(exc_type, exc_value))
    rq_job.save()

    return True

def _download_file_from_bucket(db_storage, filename, key):
    storage = db_storage_to_storage_instance(db_storage)

    data = storage.download_fileobj(key)
    with open(filename, 'wb+') as f:
        f.write(data.getbuffer())

def _import_annotations(request, rq_id, rq_func, db_obj, format_name,
                        filename=None, location_conf=None, conv_mask_to_poly=True):
    format_desc = {f.DISPLAY_NAME: f
        for f in dm.views.get_import_formats()}.get(format_name)
    if format_desc is None:
        raise serializers.ValidationError(
            "Unknown input format '{}'".format(format_name))
    elif not format_desc.ENABLED:
        return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)

    queue = django_rq.get_queue(settings.CVAT_QUEUES.IMPORT_DATA.value)
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
                    fd, filename = mkstemp(prefix='cvat_{}'.format(db_obj.pk), dir=settings.TMP_FILES_ROOT)
                    with open(filename, 'wb+') as f:
                        for chunk in anno_file.chunks():
                            f.write(chunk)
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
                fd, filename = mkstemp(prefix='cvat_{}'.format(db_obj.pk), dir=settings.TMP_FILES_ROOT)
                dependent_job = configure_dependent_job(
                    queue=queue,
                    rq_id=rq_id,
                    rq_func=_download_file_from_bucket,
                    db_storage=db_storage,
                    filename=filename,
                    key=key,
                    request=request,
                )

        av_scan_paths(filename)
        meta = {
            'tmp_file': filename,
            'tmp_file_descriptor': fd,
        }
        rq_job = queue.enqueue_call(
            func=rq_func,
            args=(db_obj.pk, filename, format_name, conv_mask_to_poly),
            job_id=rq_id,
            depends_on=dependent_job,
            meta={**meta, **get_rq_job_meta(request=request, db_obj=db_obj)}
        )
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

    queue = django_rq.get_queue(settings.CVAT_QUEUES.EXPORT_DATA.value)
    rq_job = queue.fetch_job(rq_id)

    if rq_job:
        last_instance_update_time = timezone.localtime(db_instance.updated_date)
        if isinstance(db_instance, Project):
            tasks_update = list(map(lambda db_task: timezone.localtime(db_task.updated_date), db_instance.tasks.all()))
            last_instance_update_time = max(tasks_update + [last_instance_update_time])
        rq_request = rq_job.meta.get('request', None)
        request_time = rq_request.get('timestamp', None) if rq_request else None
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
                                'Cloud storage location was selected as the destination,'
                                ' but cloud storage id was not specified')
                        db_storage = get_cloud_storage_for_import_or_export(
                            storage_id=storage_id, request=request,
                            is_default=location_conf['is_default'])
                        storage = db_storage_to_storage_instance(db_storage)

                        try:
                            storage.upload_file(file_path, filename)
                        except (ValidationError, PermissionDenied, NotFound) as ex:
                            msg = str(ex) if not isinstance(ex, ValidationError) else \
                                '\n'.join([str(d) for d in ex.detail])
                            return Response(data=msg, status=ex.status_code)
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
    queue.enqueue_call(
        func=callback,
        args=(db_instance.id, format_name, server_address),
        job_id=rq_id,
        meta=get_rq_job_meta(request=request, db_obj=db_instance),
        result_ttl=ttl, failure_ttl=ttl)
    return Response(status=status.HTTP_202_ACCEPTED)

def _import_project_dataset(request, rq_id, rq_func, db_obj, format_name, filename=None, conv_mask_to_poly=True, location_conf=None):
    format_desc = {f.DISPLAY_NAME: f
        for f in dm.views.get_import_formats()}.get(format_name)
    if format_desc is None:
        raise serializers.ValidationError(
            "Unknown input format '{}'".format(format_name))
    elif not format_desc.ENABLED:
        return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)

    queue = django_rq.get_queue(settings.CVAT_QUEUES.IMPORT_DATA.value)
    rq_job = queue.fetch_job(rq_id)

    if not rq_job:
        fd = None
        dependent_job = None
        location = location_conf.get('location') if location_conf else None
        if not filename and location != Location.CLOUD_STORAGE:
            serializer = DatasetFileSerializer(data=request.data)
            if serializer.is_valid(raise_exception=True):
                dataset_file = serializer.validated_data['dataset_file']
                fd, filename = mkstemp(prefix='cvat_{}'.format(db_obj.pk), dir=settings.TMP_FILES_ROOT)
                with open(filename, 'wb+') as f:
                    for chunk in dataset_file.chunks():
                        f.write(chunk)
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
            fd, filename = mkstemp(prefix='cvat_{}'.format(db_obj.pk), dir=settings.TMP_FILES_ROOT)
            dependent_job = configure_dependent_job(
                queue=queue,
                rq_id=rq_id,
                rq_func=_download_file_from_bucket,
                db_storage=db_storage,
                filename=filename,
                key=key,
                request=request,
            )

        rq_job = queue.enqueue_call(
            func=rq_func,
            args=(db_obj.pk, filename, format_name, conv_mask_to_poly),
            job_id=rq_id,
            meta={
                'tmp_file': filename,
                'tmp_file_descriptor': fd,
                **get_rq_job_meta(request=request, db_obj=db_obj),
            },
            depends_on=dependent_job,
        )
    else:
        return Response(status=status.HTTP_409_CONFLICT, data='Import job already exists')

    return Response(status=status.HTTP_202_ACCEPTED)
