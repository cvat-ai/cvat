# Copyright (C) 2018-2022 Intel Corporation
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

from rest_framework import mixins, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import APIException, NotFound, ValidationError
from rest_framework.permissions import SAFE_METHODS
from rest_framework.renderers import JSONRenderer
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django_sendfile import sendfile

import cvat.apps.dataset_manager as dm
import cvat.apps.dataset_manager.views  # pylint: disable=unused-import
from cvat.apps.engine.cloud_provider import get_cloud_storage_instance, Credentials, Status as CloudStorageStatus
from cvat.apps.dataset_manager.bindings import CvatImportError
from cvat.apps.dataset_manager.serializers import DatasetFormatsSerializer
from cvat.apps.engine.frame_provider import FrameProvider
from cvat.apps.engine.media_extractors import ImageListReader
from cvat.apps.engine.mime_types import mimetypes
from cvat.apps.engine.models import (
    Job, Task, Project, Issue, Data,
    Comment, StorageMethodChoice, StorageChoice, Image,
    CloudProviderChoice
)
from cvat.apps.engine.models import CloudStorage as CloudStorageModel
from cvat.apps.engine.serializers import (
    AboutSerializer, AnnotationFileSerializer, BasicUserSerializer,
    DataMetaSerializer, DataSerializer, ExceptionSerializer,
    FileInfoSerializer, JobReadSerializer, JobWriteSerializer, LabeledDataSerializer,
    LogEventSerializer, ProjectSerializer, ProjectSearchSerializer,
    RqStatusSerializer, TaskSerializer, UserSerializer, PluginsSerializer, IssueReadSerializer,
    IssueWriteSerializer, CommentReadSerializer, CommentWriteSerializer, CloudStorageWriteSerializer,
    CloudStorageReadSerializer, DatasetFileSerializer, JobCommitSerializer)

from utils.dataset_manifest import ImageManifestManager
from cvat.apps.engine.utils import av_scan_paths
from cvat.apps.engine import backup
from cvat.apps.engine.mixins import UploadMixin

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
    @action(detail=False, methods=['GET'], serializer_class=AboutSerializer)
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
                if entry.is_file():
                    entry_type = "REG"
                elif entry.is_dir():
                    entry_type = "DIR"

                if entry_type:
                    data.append({"name": entry.name, "type": entry_type})

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
                    ProjectSerializer, ProjectSearchSerializer,
                ], resource_type_field_name='name', many=True),
        }),
    create=extend_schema(
        summary='Method creates a new project',
        responses={
            '201': ProjectSerializer,
        }),
    retrieve=extend_schema(
        summary='Method returns details of a specific project',
        responses={
            '200': ProjectSerializer,
        }),
    destroy=extend_schema(
        summary='Method deletes a specific project',
        responses={
            '204': OpenApiResponse(description='The project has been deleted'),
        }),
    partial_update=extend_schema(
        summary='Methods does a partial update of chosen fields in a project',
        responses={
            '200': ProjectSerializer,
        })
)
class ProjectViewSet(viewsets.ModelViewSet, UploadMixin):
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
    http_method_names = ('get', 'post', 'head', 'patch', 'delete', 'options')
    iam_organization_field = 'organization'

    def get_serializer_class(self):
        if self.request.path.endswith('tasks'):
            return TaskSerializer
        else:
            return ProjectSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == 'list':
            perm = ProjectPermission.create_scope_list(self.request)
            queryset = perm.filter(queryset)
        return queryset

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user,
            organization=self.request.iam_context['organization'])

    @extend_schema(
        summary='Method returns information of the tasks of the project with the selected id',
        responses={
            '200': TaskSerializer(many=True),
        })
    @action(detail=True, methods=['GET'], serializer_class=TaskSerializer)
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
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=True),
            OpenApiParameter('filename', description='Desired output file name',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False),
            OpenApiParameter('action', description='Used to start downloading process after annotation file had been created',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False, enum=['download', 'import_status'])
        ],
        responses={
            '200': OpenApiResponse(description='Download of file started'),
            '201': OpenApiResponse(description='Output file is ready for downloading'),
            '202': OpenApiResponse(description='Exporting has been started'),
            '405': OpenApiResponse(description='Format is not available'),
        })
    @extend_schema(methods=['POST'], summary='Import dataset in specific format as a project',
        parameters=[
            OpenApiParameter('format', description='Desired dataset format name\n'
                'You can get the list of supported formats at:\n/server/annotation/formats',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=True)
        ],
        responses={
            '202': OpenApiResponse(description='Exporting has been started'),
            '400': OpenApiResponse(description='Failed to import dataset'),
            '405': OpenApiResponse(description='Format is not available'),
        })
    @action(detail=True, methods=['GET', 'POST', 'OPTIONS'], serializer_class=None,
        url_path=r'dataset/?$')
    def dataset(self, request, pk):
        self._object = self.get_object() # force to call check_object_permissions

        if request.method == 'POST' or request.method == 'OPTIONS':
            return self.upload_data(request)
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
                    rq_job.delete()
                    return Response(status=status.HTTP_201_CREATED)
                elif rq_job.is_failed:
                    if rq_job.meta['tmp_file_descriptor']: os.close(rq_job.meta['tmp_file_descriptor'])
                    os.remove(rq_job.meta['tmp_file'])
                    rq_job.delete()
                    return Response(
                        data=str(rq_job.exc_info),
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
                else:
                    return Response(
                        data=self._get_rq_response('default', f'/api/project/{pk}/dataset_import'),
                        status=status.HTTP_202_ACCEPTED
                    )
            else:
                format_name = request.query_params.get("format", "")
                return _export_annotations(
                    db_instance=self._object,
                    rq_id="/api/project/{}/dataset/{}".format(pk, format_name),
                    request=request,
                    action=action,
                    callback=dm.views.export_project_as_dataset,
                    format_name=format_name,
                    filename=request.query_params.get("filename", "").lower(),
                )

    def get_upload_dir(self):
        if 'dataset' in self.action:
            return self._object.get_tmp_dirname()
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
        return Response(data='Unknown upload was finished',
                        status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['HEAD', 'PATCH'], url_path='dataset/'+UploadMixin.file_id_regex)
    def append_dataset_chunk(self, request, pk, file_id):
        self._object = self.get_object()
        return self.append_tus_chunk(request, file_id)

    @extend_schema(summary='Method allows to download project annotations',
        parameters=[
            OpenApiParameter('format', description='Desired output format name\n'
                'You can get the list of supported formats at:\n/server/annotation/formats',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=True),
            OpenApiParameter('filename', description='Desired output file name',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False),
            OpenApiParameter('action', description='Used to start downloading process after annotation file had been created',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False, enum=['download'])
        ],
        responses={
            '200': OpenApiResponse(description='Download of file started'),
            '201': OpenApiResponse(description='Annotations file is ready to download'),
            '202': OpenApiResponse(description='Dump of annotations has been started'),
            '401': OpenApiResponse(description='Format is not specified'),
            '405': OpenApiResponse(description='Format is not available'),
        })
    @action(detail=True, methods=['GET'],
        serializer_class=LabeledDataSerializer)
    def annotations(self, request, pk):
        db_project = self.get_object() # force to call check_object_permissions
        format_name = request.query_params.get('format')
        if format_name:
            return _export_annotations(db_instance=db_project,
                rq_id="/api/projects/{}/annotations/{}".format(pk, format_name),
                request=request,
                action=request.query_params.get("action", "").lower(),
                callback=dm.views.export_project_annotations,
                format_name=format_name,
                filename=request.query_params.get("filename", "").lower(),
            )
        else:
            return Response("Format is not specified",status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(summary='Methods creates a backup copy of a project',
        responses={
            '200': OpenApiResponse(description='Download of file started'),
            '201': OpenApiResponse(description='Output backup file is ready for downloading'),
            '202': OpenApiResponse(description='Creating a backup file has been started'),
        })
    @action(methods=['GET'], detail=True, url_path='backup')
    def export_backup(self, request, pk=None):
        db_project = self.get_object() # force to call check_object_permissions
        return backup.export(db_project, request)

    @extend_schema(summary='Methods create a project from a backup',
        responses={
            '201': OpenApiResponse(description='The project has been imported'), # or better specify {id: project_id}
            '202': OpenApiResponse(description='Importing a backup file has been started'),
        })
    @action(detail=False, methods=['POST'], url_path='backup')
    def import_backup(self, request, pk=None):
        return backup.import_project(request)

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


    def __call__(self, request, start, stop, db_data):
        if not db_data:
            raise NotFound(detail='Cannot find requested data')

        frame_provider = FrameProvider(db_data, self.dimension)

        if self.type == 'chunk':
            start_chunk = frame_provider.get_chunk_number(start)
            stop_chunk = frame_provider.get_chunk_number(stop)
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
            return sendfile(request, frame_provider.get_preview())

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
            '200': TaskSerializer(many=True),
        }),
    create=extend_schema(
        summary='Method creates a new task in a database without any attached images and videos',
        responses={
            '201': TaskSerializer,
        }),
    retrieve=extend_schema(
        summary='Method returns details of a specific task',
        responses=TaskSerializer),
    update=extend_schema(
        summary='Method updates a task by id',
        responses={
            '200': TaskSerializer,
        }),
    destroy=extend_schema(
        summary='Method deletes a specific task, all attached jobs, annotations, and data',
        responses={
            '204': OpenApiResponse(description='The task has been deleted'),
        }),
    partial_update=extend_schema(
        summary='Methods does a partial update of chosen fields in a task',
        responses={
            '200': TaskSerializer,
        })
)
class TaskViewSet(UploadMixin, viewsets.ModelViewSet):
    queryset = Task.objects.prefetch_related(
            Prefetch('label_set', queryset=models.Label.objects.order_by('id')),
            "label_set__attributespec_set",
            "segment_set__job_set")
    serializer_class = TaskSerializer
    lookup_fields = {'project_name': 'project__name', 'owner': 'owner__username', 'assignee': 'assignee__username'}
    search_fields = ('project_name', 'name', 'owner', 'status', 'assignee', 'subset', 'mode', 'dimension')
    filter_fields = list(search_fields) + ['id', 'project_id', 'updated_date']
    ordering_fields = filter_fields
    ordering = "-id"
    iam_organization_field = 'organization'

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == 'list':
            perm = TaskPermission.create_scope_list(self.request)
            queryset = perm.filter(queryset)

        return queryset

    @extend_schema(summary='Method recreates a task from an attached task backup file',
        responses={
            '201': OpenApiResponse(description='The task has been imported'), # or better specify {id: task_id}
            '202': OpenApiResponse(description='Importing a backup file has been started'),
        })
    @action(detail=False, methods=['POST'], url_path='backup')
    def import_backup(self, request, pk=None):
        return backup.import_task(request)

    @extend_schema(summary='Method backup a specified task',
        responses={
            '200': OpenApiResponse(description='Download of file started'),
            '201': OpenApiResponse(description='Output backup file is ready for downloading'),
            '202': OpenApiResponse(description='Creating a backup file has been started'),
        })
    @action(methods=['GET'], detail=True, url_path='backup')
    def export_backup(self, request, pk=None):
        db_task = self.get_object() # force to call check_object_permissions
        return backup.export(db_task, request)

    def perform_update(self, serializer):
        instance = serializer.instance
        updated_instance = serializer.save()
        if instance.project:
            instance.project.save()
        if updated_instance.project:
            updated_instance.project.save()

    def perform_create(self, serializer):
        instance = serializer.save(owner=self.request.user,
            organization=self.request.iam_context['organization'])
        if instance.project:
            db_project = instance.project
            db_project.save()
            assert instance.organization == db_project.organization

    def perform_destroy(self, instance):
        task_dirname = instance.get_task_dirname()
        super().perform_destroy(instance)
        shutil.rmtree(task_dirname, ignore_errors=True)
        if instance.data and not instance.data.tasks.all():
            shutil.rmtree(instance.data.get_data_dirname(), ignore_errors=True)
            instance.data.delete()
        if instance.project:
            db_project = instance.project
            db_project.save()

    @extend_schema(summary='Method returns a list of jobs for a specific task',
        responses={
            '200': JobReadSerializer(many=True),
        })
    @action(detail=True, methods=['GET'], serializer_class=JobReadSerializer)
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
            OpenApiParameter('type', location=OpenApiParameter.QUERY, required=True,
                type=OpenApiTypes.STR, enum=['chunk', 'frame', 'preview', 'context_image'],
                description='Specifies the type of the requested data'),
            OpenApiParameter('quality', location=OpenApiParameter.QUERY, required=True,
                type=OpenApiTypes.STR, enum=['compressed', 'original'],
                description="Specifies the quality level of the requested data, doesn't matter for 'preview' type"),
            OpenApiParameter('number', location=OpenApiParameter.QUERY, required=True, type=OpenApiTypes.NUMBER,
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
                self._object.data.stop_frame, self._object.data)

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
                type=OpenApiTypes.STR, required=False, enum=['download'])
        ],
        responses={
            '200': OpenApiResponse(description='Download of file started'),
            '201': OpenApiResponse(description='Annotations file is ready to download'),
            '202': OpenApiResponse(description='Dump of annotations has been started'),
            '405': OpenApiResponse(description='Format is not available'),
        })
    @extend_schema(methods=['PUT'], summary='Method allows to upload task annotations',
        parameters=[
            OpenApiParameter('format', location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False,
                description='Input format name\nYou can get the list of supported formats at:\n/server/annotation/formats'),
        ],
        responses={
            '201': OpenApiResponse(description='Uploading has finished'),
            '202': OpenApiResponse(description='Uploading has been started'),
            '405': OpenApiResponse(description='Format is not available'),
        })
    @extend_schema(methods=['PATCH'], summary='Method performs a partial update of annotations in a specific task',
        parameters=[
            OpenApiParameter('action', location=OpenApiParameter.QUERY, required=True,
                type=OpenApiTypes.STR, enum=['create', 'update', 'delete']),
        ])
    @extend_schema(methods=['DELETE'], summary='Method deletes all annotations for a specific task',
        responses={
            '204': OpenApiResponse(description='The annotation has been deleted'),
        })
    @action(detail=True, methods=['GET', 'DELETE', 'PUT', 'PATCH', 'POST', 'OPTIONS'], url_path=r'annotations/?$',
        serializer_class=LabeledDataSerializer)
    def annotations(self, request, pk):
        self._object = self.get_object() # force to call check_object_permissions
        if request.method == 'GET':
            format_name = request.query_params.get('format')
            if format_name:
                return _export_annotations(db_instance=self._object,
                    rq_id="/api/tasks/{}/annotations/{}".format(pk, format_name),
                    request=request,
                    action=request.query_params.get("action", "").lower(),
                    callback=dm.views.export_task_annotations,
                    format_name=format_name,
                    filename=request.query_params.get("filename", "").lower(),
                )
            else:
                data = dm.task.get_task_data(pk)
                serializer = LabeledDataSerializer(data=data)
                if serializer.is_valid(raise_exception=True):
                    return Response(serializer.data)
        elif request.method == 'POST' or request.method == 'OPTIONS':
            return self.upload_data(request)
        elif request.method == 'PUT':
            format_name = request.query_params.get('format')
            if format_name:
                return _import_annotations(
                    request=request,
                    rq_id="{}@/api/tasks/{}/annotations/upload".format(request.user, pk),
                    rq_func=dm.task.import_task_annotations,
                    pk=pk,
                    format_name=format_name,
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

    @staticmethod
    @extend_schema(summary='Method provides a meta information about media files which are related with the task',
        responses={
            '200': DataMetaSerializer,
        })
    @action(detail=True, methods=['GET'], serializer_class=DataMetaSerializer,
        url_path='data/meta')
    def data_info(request, pk):
        db_task = models.Task.objects.prefetch_related(
            Prefetch('data', queryset=models.Data.objects.select_related('video').prefetch_related(
                Prefetch('images', queryset=models.Image.objects.prefetch_related('related_files').order_by('frame'))
            ))
        ).get(pk=pk)

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

        serializer = DataMetaSerializer(db_data)
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
                type=OpenApiTypes.STR, required=False, enum=['download'])
        ],
        responses={
            '200': OpenApiResponse(description='Download of file started'),
            '201': OpenApiResponse(description='Output file is ready for downloading'),
            '202': OpenApiResponse(description='Exporting has been started'),
            '405': OpenApiResponse(description='Format is not available'),
        })
    @action(detail=True, methods=['GET'], serializer_class=None,
        url_path='dataset')
    def dataset_export(self, request, pk):
        db_task = self.get_object() # force to call check_object_permissions

        format_name = request.query_params.get("format", "")
        return _export_annotations(db_instance=db_task,
            rq_id="/api/tasks/{}/dataset/{}".format(pk, format_name),
            request=request,
            action=request.query_params.get("action", "").lower(),
            callback=dm.views.export_task_as_dataset,
            format_name=format_name,
            filename=request.query_params.get("filename", "").lower(),
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
    update=extend_schema(
        summary='Method updates a job by id',
        responses={
            '200': JobWriteSerializer,
        }),
    partial_update=extend_schema(
        summary='Methods does a partial update of chosen fields in a job',
        responses={
            '200': JobWriteSerializer,
        })
)
class JobViewSet(viewsets.GenericViewSet, mixins.ListModelMixin,
    mixins.RetrieveModelMixin, mixins.UpdateModelMixin, UploadMixin):
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
        'updated_date': 'segment__task__updated_date',
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

    @extend_schema(methods=['GET'], summary='Method returns annotations for a specific job',
        responses={
            '200': LabeledDataSerializer(many=True),
        })
    @extend_schema(methods=['PUT'], summary='Method performs an update of all annotations in a specific job',
        request=AnnotationFileSerializer, responses={
            '201': OpenApiResponse(description='Uploading has finished'),
            '202': OpenApiResponse(description='Uploading has been started'),
            '405': OpenApiResponse(description='Format is not available'),
        })
    @extend_schema(methods=['PATCH'], summary='Method performs a partial update of annotations in a specific job',
        parameters=[
            OpenApiParameter('action', location=OpenApiParameter.QUERY, type=OpenApiTypes.STR,
                required=True, enum=['create', 'update', 'delete'])
        ],
        responses={
            #TODO
            '200': OpenApiResponse(description=''),
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
            data = dm.task.get_job_data(pk)
            return Response(data)
        elif request.method == 'POST' or request.method == 'OPTIONS':
            return self.upload_data(request)
        elif request.method == 'PUT':
            format_name = request.query_params.get('format', '')
            if format_name:
                return _import_annotations(
                    request=request,
                    rq_id="{}@/api/jobs/{}/annotations/upload".format(request.user, pk),
                    rq_func=dm.task.import_job_annotations,
                    pk=pk,
                    format_name=format_name
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

    @action(detail=True, methods=['HEAD', 'PATCH'], url_path='annotations/'+UploadMixin.file_id_regex)
    def append_annotations_chunk(self, request, pk, file_id):
        self._object = self.get_object()
        return self.append_tus_chunk(request, file_id)

    @extend_schema(
        summary='Method returns list of issues for the job',
        responses={
            '200': IssueReadSerializer(many=True)
        })
    @action(detail=True, methods=['GET'], serializer_class=IssueReadSerializer)
    def issues(self, request, pk):
        db_job = self.get_object()
        queryset = db_job.issues
        serializer = IssueReadSerializer(queryset,
            context={'request': request}, many=True)

        return Response(serializer.data)

    @extend_schema(summary='Method returns data for a specific job',
        parameters=[
            OpenApiParameter('type', description='Specifies the type of the requested data',
                location=OpenApiParameter.QUERY, required=True, type=OpenApiTypes.STR,
                enum=['chunk', 'frame', 'preview', 'context_image']),
            OpenApiParameter('quality', location=OpenApiParameter.QUERY, required=True,
                type=OpenApiTypes.STR, enum=['compressed', 'original'],
                description="Specifies the quality level of the requested data, doesn't matter for 'preview' type"),
            OpenApiParameter('number', location=OpenApiParameter.QUERY, required=True, type=OpenApiTypes.NUMBER,
                description="A unique number value identifying chunk or frame, doesn't matter for 'preview' type"),
            ],
        responses={
            '200': OpenApiResponse(description='Data of a specific type'),
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

    @extend_schema(summary='The action returns the list of tracked '
        'changes for the job', responses={
            '200': JobCommitSerializer(many=True),
        })
    @action(detail=True, methods=['GET'], serializer_class=JobCommitSerializer)
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
    update=extend_schema(
        summary='Method updates an issue by id',
        responses={
            '200': IssueWriteSerializer,
        }),
    partial_update=extend_schema(
        summary='Methods does a partial update of chosen fields in an issue',
        responses={
            '200': IssueWriteSerializer,
        }),
    create=extend_schema(
        summary='Method creates an issue',
        responses={
            '201': IssueWriteSerializer,
        }),
    destroy=extend_schema(
        summary='Method deletes an issue',
        responses={
            '204': OpenApiResponse(description='The issue has been deleted'),
        })
)
class IssueViewSet(viewsets.ModelViewSet):
    queryset = Issue.objects.all().order_by('-id')
    http_method_names = ['get', 'post', 'patch', 'delete', 'options']
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

    @extend_schema(summary='The action returns all comments of a specific issue',
        responses={
            '200': CommentReadSerializer(many=True),
        })
    @action(detail=True, methods=['GET'], serializer_class=CommentReadSerializer)
    def comments(self, request, pk):
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
    update=extend_schema(
        summary='Method updates a comment by id',
        responses={
            '200': CommentWriteSerializer,
        }),
    partial_update=extend_schema(
        summary='Methods does a partial update of chosen fields in a comment',
        responses={
            '200': CommentWriteSerializer,
        }),
    create=extend_schema(
        summary='Method creates a comment',
        responses={
            '201': CommentWriteSerializer,
        }),
    destroy=extend_schema(
        summary='Method deletes a comment',
        responses={
            '204': OpenApiResponse(description='The comment has been deleted'),
        })
)
class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.all().order_by('-id')
    http_method_names = ['get', 'post', 'patch', 'delete', 'options']
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

@extend_schema(tags=['users'])
@extend_schema_view(
    list=extend_schema(
        summary='Method provides a paginated list of users registered on the server',
        responses={
            '200': PolymorphicProxySerializer(component_name='MetaUser',
                serializers=[
                    UserSerializer, BasicUserSerializer,
                ], resource_type_field_name='username'),
        }),
    retrieve=extend_schema(
        summary='Method provides information of a specific user',
        responses={
            '200': PolymorphicProxySerializer(component_name='MetaUser',
                serializers=[
                    UserSerializer, BasicUserSerializer,
                ], resource_type_field_name='username'),
        }),
    partial_update=extend_schema(
        summary='Method updates chosen fields of a user',
        responses={
            '200': PolymorphicProxySerializer(component_name='MetaUser',
                serializers=[
                    UserSerializer, BasicUserSerializer,
                ], resource_type_field_name='username'),
        }),
    destroy=extend_schema(
        summary='Method deletes a specific user from the server',
        responses={
            '204': OpenApiResponse(description='The user has been deleted'),
        })
)
class UserViewSet(viewsets.GenericViewSet, mixins.ListModelMixin,
    mixins.RetrieveModelMixin, mixins.UpdateModelMixin, mixins.DestroyModelMixin):
    queryset = User.objects.prefetch_related('groups').all()
    http_method_names = ['get', 'post', 'head', 'patch', 'delete', 'options']
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
                ], resource_type_field_name='username'),
        })
    @action(detail=False, methods=['GET'])
    def self(self, request):
        """
        Method returns an instance of a user who is currently authorized
        """
        serializer_class = self.get_serializer_class()
        serializer = serializer_class(request.user, context={ "request": request })
        return Response(serializer.data)

@extend_schema(tags=['cloud storages'])
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
        responses={
            '200': CloudStorageWriteSerializer,
        }),
    create=extend_schema(
        summary='Method creates a cloud storage with a specified characteristics',
        responses={
            '201': CloudStorageWriteSerializer,
        })
)
class CloudStorageViewSet(viewsets.ModelViewSet):
    http_method_names = ['get', 'post', 'patch', 'delete', 'options']
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
            '200': OpenApiResponse(response=OpenApiTypes.OBJECT, description='A manifest content'),
        })
    @action(detail=True, methods=['GET'], url_path='content')
    def content(self, request, pk):
        storage = None
        try:
            db_storage = self.get_object()
            credentials = Credentials()
            credentials.convert_from_db({
                'type': db_storage.credentials_type,
                'value': db_storage.credentials,
            })
            details = {
                'resource': db_storage.resource,
                'credentials': credentials,
                'specific_attributes': db_storage.get_specific_attributes()
            }
            storage = get_cloud_storage_instance(cloud_provider=db_storage.provider_type, **details)
            if not db_storage.manifests.count():
                raise Exception('There is no manifest file')
            manifest_path = request.query_params.get('manifest_path', db_storage.manifests.first().filename)
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
            manifest_files = manifest.data
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
                credentials = Credentials()
                credentials.convert_from_db({
                    'type': db_storage.credentials_type,
                    'value': db_storage.credentials,
                })
                details = {
                    'resource': db_storage.resource,
                    'credentials': credentials,
                    'specific_attributes': db_storage.get_specific_attributes()
                }
                storage = get_cloud_storage_instance(cloud_provider=db_storage.provider_type, **details)
                if not db_storage.manifests.count():
                    raise Exception('Cannot get the cloud storage preview. There is no manifest file')
                preview_path = None
                for manifest_model in db_storage.manifests.all():
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
                    preview_path = ''.join([preview_info['name'], preview_info['extension']])
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
                    preview = reader.get_preview()
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
            credentials = Credentials()
            credentials.convert_from_db({
                'type': db_storage.credentials_type,
                'value': db_storage.credentials,
            })
            details = {
                'resource': db_storage.resource,
                'credentials': credentials,
                'specific_attributes': db_storage.get_specific_attributes()
            }
            storage = get_cloud_storage_instance(cloud_provider=db_storage.provider_type, **details)
            storage_status = storage.get_status()
            return HttpResponse(storage_status)
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

def _import_annotations(request, rq_id, rq_func, pk, format_name, filename=None):
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
        fd = None
        if not filename:
            serializer = AnnotationFileSerializer(data=request.data)
            if serializer.is_valid(raise_exception=True):
                anno_file = serializer.validated_data['annotation_file']
                fd, filename = mkstemp(prefix='cvat_{}'.format(pk))
                with open(filename, 'wb+') as f:
                    for chunk in anno_file.chunks():
                        f.write(chunk)

        av_scan_paths(filename)
        rq_job = queue.enqueue_call(
            func=rq_func,
            args=(pk, filename, format_name),
            job_id=rq_id
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
        elif rq_job.is_failed:
            if rq_job.meta['tmp_file_descriptor']: os.close(rq_job.meta['tmp_file_descriptor'])
            os.remove(rq_job.meta['tmp_file'])
            exc_info = str(rq_job.exc_info)
            rq_job.delete()

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

def _export_annotations(db_instance, rq_id, request, format_name, action, callback, filename):
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
                            "project" if isinstance(db_instance, models.Project) else "task",
                            db_instance.name, timestamp,
                            format_name, osp.splitext(file_path)[1]
                        )
                    return sendfile(request, file_path, attachment=True,
                        attachment_filename=filename.lower())
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

    ttl = (dm.views.PROJECT_CACHE_TTL if isinstance(db_instance, Project) else dm.views.TASK_CACHE_TTL).total_seconds()
    queue.enqueue_call(func=callback,
        args=(db_instance.id, format_name, server_address), job_id=rq_id,
        meta={ 'request_time': timezone.localtime() },
        result_ttl=ttl, failure_ttl=ttl)
    return Response(status=status.HTTP_202_ACCEPTED)

def _import_project_dataset(request, rq_id, rq_func, pk, format_name, filename=None):
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
        if not filename:
            serializer = DatasetFileSerializer(data=request.data)
            if serializer.is_valid(raise_exception=True):
                dataset_file = serializer.validated_data['dataset_file']
                fd, filename = mkstemp(prefix='cvat_{}'.format(pk))
                with open(filename, 'wb+') as f:
                    for chunk in dataset_file.chunks():
                        f.write(chunk)

        rq_job = queue.enqueue_call(
            func=rq_func,
            args=(pk, filename, format_name),
            job_id=rq_id,
            meta={
                    'tmp_file': filename,
                    'tmp_file_descriptor': fd,
                },
            )
    else:
        return Response(status=status.HTTP_409_CONFLICT, data='Import job already exists')

    return Response(status=status.HTTP_202_ACCEPTED)
