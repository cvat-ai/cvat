# Copyright (C) 2018-2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
import os.path as osp
import re
import traceback
from ast import literal_eval
import shutil
from datetime import datetime
from tempfile import mkstemp

from django.views.generic import RedirectView
from django.http import HttpResponseBadRequest, HttpResponseNotFound
from django.shortcuts import render
from django.conf import settings
from sendfile import sendfile
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.renderers import JSONRenderer
from rest_framework import status
from rest_framework import viewsets
from rest_framework import serializers
from rest_framework.decorators import action
from rest_framework import mixins
from django_filters import rest_framework as filters
import django_rq
from django.db import IntegrityError
from django.utils import timezone


from . import annotation, task, models
from cvat.settings.base import JS_3RDPARTY, CSS_3RDPARTY
from cvat.apps.authentication.decorators import login_required
from .log import slogger, clogger
from cvat.apps.engine.models import StatusChoice, Task, Job, Plugin
from cvat.apps.engine.serializers import (TaskSerializer, UserSerializer,
   ExceptionSerializer, AboutSerializer, JobSerializer, ImageMetaSerializer,
   RqStatusSerializer, TaskDataSerializer, LabeledDataSerializer,
   PluginSerializer, FileInfoSerializer, LogEventSerializer,
   ProjectSerializer, BasicUserSerializer)
from cvat.apps.annotation.serializers import AnnotationFileSerializer, AnnotationFormatSerializer
from django.contrib.auth.models import User
from django.core.exceptions import ObjectDoesNotExist
from cvat.apps.authentication import auth
from rest_framework.permissions import SAFE_METHODS
from cvat.apps.annotation.models import AnnotationDumper, AnnotationLoader
from cvat.apps.annotation.format import get_annotation_formats
import cvat.apps.dataset_manager.task as DatumaroTask

from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from django.utils.decorators import method_decorator
from drf_yasg.inspectors import NotHandled, CoreAPICompatInspector
from django_filters.rest_framework import DjangoFilterBackend

# drf-yasg component doesn't handle correctly URL_FORMAT_OVERRIDE and
# send requests with ?format=openapi suffix instead of ?scheme=openapi.
# We map the required paramater explicitly and add it into query arguments
# on the server side.
def wrap_swagger(view):
    @login_required
    def _map_format_to_schema(request, scheme=None):
        if 'format' in request.GET:
            request.GET = request.GET.copy()
            format_alias = settings.REST_FRAMEWORK['URL_FORMAT_OVERRIDE']
            request.GET[format_alias] = request.GET['format']

        return view(request, format=scheme)

    return _map_format_to_schema

# Server REST API
@login_required
def dispatch_request(request):
    """An entry point to dispatch legacy requests"""
    if 'dashboard' in request.path or (request.path == '/' and 'id' not in request.GET):
        return RedirectView.as_view(
            url=settings.UI_URL,
            permanent=True,
            query_string=True
        )(request)
    elif request.method == 'GET' and 'id' in request.GET and request.path == '/':
        return render(request, 'engine/annotation.html', {
            'css_3rdparty': CSS_3RDPARTY.get('engine', []),
            'js_3rdparty': JS_3RDPARTY.get('engine', []),
            'status_list': [str(i) for i in StatusChoice],
            'ui_url': settings.UI_URL
        })
    else:
        return HttpResponseNotFound()


class ServerViewSet(viewsets.ViewSet):
    serializer_class = None

    # To get nice documentation about ServerViewSet actions it is necessary
    # to implement the method. By default, ViewSet doesn't provide it.
    def get_serializer(self, *args, **kwargs):
        pass

    @staticmethod
    @swagger_auto_schema(method='get', operation_summary='Method provides basic CVAT information',
        responses={'200': AboutSerializer})
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
    @swagger_auto_schema(method='post', request_body=ExceptionSerializer)
    @action(detail=False, methods=['POST'], serializer_class=ExceptionSerializer)
    def exception(request):
        """
        Saves an exception from a client on the server

        Sends logs to the ELK if it is connected
        """
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
    @swagger_auto_schema(method='post', request_body=LogEventSerializer(many=True))
    @action(detail=False, methods=['POST'], serializer_class=LogEventSerializer)
    def logs(request):
        """
        Saves logs from a client on the server

        Sends logs to the ELK if it is connected
        """
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
    @swagger_auto_schema(
        method='get', operation_summary='Returns all files and folders that are on the server along specified path',
        manual_parameters=[openapi.Parameter('directory', openapi.IN_QUERY, type=openapi.TYPE_STRING, description='Directory to browse')],
        responses={'200' : FileInfoSerializer(many=True)}
    )
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
    @swagger_auto_schema(method='get', operation_summary='Method provides the list of available annotations formats supported by the server',
        responses={'200': AnnotationFormatSerializer(many=True)})
    @action(detail=False, methods=['GET'], url_path='annotation/formats')
    def annotation_formats(request):
        data = get_annotation_formats()
        return Response(data)

    @staticmethod
    @action(detail=False, methods=['GET'], url_path='dataset/formats')
    def dataset_formats(request):
        data = DatumaroTask.get_export_formats()
        data = JSONRenderer().render(data)
        return Response(data)

class ProjectFilter(filters.FilterSet):
    name = filters.CharFilter(field_name="name", lookup_expr="icontains")
    owner = filters.CharFilter(field_name="owner__username", lookup_expr="icontains")
    status = filters.CharFilter(field_name="status", lookup_expr="icontains")
    assignee = filters.CharFilter(field_name="assignee__username", lookup_expr="icontains")

    class Meta:
        model = models.Project
        fields = ("id", "name", "owner", "status", "assignee")

@method_decorator(name='list', decorator=swagger_auto_schema(
    operation_summary='Returns a paginated list of projects according to query parameters (10 projects per page)',
    manual_parameters=[
        openapi.Parameter('id', openapi.IN_QUERY, description="A unique number value identifying this project",
            type=openapi.TYPE_NUMBER),
        openapi.Parameter('name', openapi.IN_QUERY, description="Find all projects where name contains a parameter value",
            type=openapi.TYPE_STRING),
        openapi.Parameter('owner', openapi.IN_QUERY, description="Find all project where owner name contains a parameter value",
            type=openapi.TYPE_STRING),
        openapi.Parameter('status', openapi.IN_QUERY, description="Find all projects with a specific status",
            type=openapi.TYPE_STRING, enum=[str(i) for i in StatusChoice]),
        openapi.Parameter('assignee', openapi.IN_QUERY, description="Find all projects where assignee name contains a parameter value",
            type=openapi.TYPE_STRING)]))
@method_decorator(name='create', decorator=swagger_auto_schema(operation_summary='Method creates a new project'))
@method_decorator(name='retrieve', decorator=swagger_auto_schema(operation_summary='Method returns details of a specific project'))
@method_decorator(name='destroy', decorator=swagger_auto_schema(operation_summary='Method deletes a specific project'))
@method_decorator(name='partial_update', decorator=swagger_auto_schema(operation_summary='Methods does a partial update of chosen fields in a project'))
class ProjectViewSet(auth.ProjectGetQuerySetMixin, viewsets.ModelViewSet):
    queryset = models.Project.objects.all().order_by('-id')
    serializer_class = ProjectSerializer
    search_fields = ("name", "owner__username", "assignee__username", "status")
    filterset_class = ProjectFilter
    ordering_fields = ("id", "name", "owner", "status", "assignee")
    http_method_names = ['get', 'post', 'head', 'patch', 'delete']

    def get_permissions(self):
        http_method = self.request.method
        permissions = [IsAuthenticated]

        if http_method in SAFE_METHODS:
            permissions.append(auth.ProjectAccessPermission)
        elif http_method in ["POST"]:
            permissions.append(auth.ProjectCreatePermission)
        elif http_method in ["PATCH"]:
            permissions.append(auth.ProjectChangePermission)
        elif http_method in ["DELETE"]:
            permissions.append(auth.ProjectDeletePermission)
        else:
            permissions.append(auth.AdminRolePermission)

        return [perm() for perm in permissions]

    def perform_create(self, serializer):
        if self.request.data.get('owner', None):
            serializer.save()
        else:
            serializer.save(owner=self.request.user)

    @swagger_auto_schema(method='get', operation_summary='Returns information of the tasks of the project with the selected id',
        responses={'200': TaskSerializer(many=True)})
    @action(detail=True, methods=['GET'], serializer_class=TaskSerializer)
    def tasks(self, request, pk):
        self.get_object() # force to call check_object_permissions
        queryset = Task.objects.filter(project_id=pk).order_by('-id')
        queryset = auth.filter_task_queryset(queryset, request.user)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True,
                context={"request": request})
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True,
            context={"request": request})
        return Response(serializer.data)

class TaskFilter(filters.FilterSet):
    project = filters.CharFilter(field_name="project__name", lookup_expr="icontains")
    name = filters.CharFilter(field_name="name", lookup_expr="icontains")
    owner = filters.CharFilter(field_name="owner__username", lookup_expr="icontains")
    mode = filters.CharFilter(field_name="mode", lookup_expr="icontains")
    status = filters.CharFilter(field_name="status", lookup_expr="icontains")
    assignee = filters.CharFilter(field_name="assignee__username", lookup_expr="icontains")

    class Meta:
        model = Task
        fields = ("id", "project_id", "project", "name", "owner", "mode", "status",
            "assignee")

class DjangoFilterInspector(CoreAPICompatInspector):
    def get_filter_parameters(self, filter_backend):
        if isinstance(filter_backend, DjangoFilterBackend):
            result = super(DjangoFilterInspector, self).get_filter_parameters(filter_backend)
            res = result.copy()

            for param in result:
                if param.get('name') == 'project_id' or param.get('name') == 'project':
                    res.remove(param)
            return res

        return NotHandled

@method_decorator(name='list', decorator=swagger_auto_schema(
    operation_summary='Returns a paginated list of tasks according to query parameters (10 tasks per page)',
    manual_parameters=[
            openapi.Parameter('id',openapi.IN_QUERY,description="A unique number value identifying this task",type=openapi.TYPE_NUMBER),
            openapi.Parameter('name', openapi.IN_QUERY, description="Find all tasks where name contains a parameter value", type=openapi.TYPE_STRING),
            openapi.Parameter('owner', openapi.IN_QUERY, description="Find all tasks where owner name contains a parameter value", type=openapi.TYPE_STRING),
            openapi.Parameter('mode', openapi.IN_QUERY, description="Find all tasks with a specific mode", type=openapi.TYPE_STRING, enum=['annotation', 'interpolation']),
            openapi.Parameter('status', openapi.IN_QUERY, description="Find all tasks with a specific status", type=openapi.TYPE_STRING,enum=['annotation','validation','completed']),
            openapi.Parameter('assignee', openapi.IN_QUERY, description="Find all tasks where assignee name contains a parameter value", type=openapi.TYPE_STRING)
        ],
    filter_inspectors=[DjangoFilterInspector]))
@method_decorator(name='create', decorator=swagger_auto_schema(operation_summary='Method creates a new task in a database without any attached images and videos'))
@method_decorator(name='retrieve', decorator=swagger_auto_schema(operation_summary='Method returns details of a specific task'))
@method_decorator(name='update', decorator=swagger_auto_schema(operation_summary='Method updates a task by id'))
@method_decorator(name='destroy', decorator=swagger_auto_schema(operation_summary='Method deletes a specific task, all attached jobs, annotations, and data'))
@method_decorator(name='partial_update', decorator=swagger_auto_schema(operation_summary='Methods does a partial update of chosen fields in a task'))
class TaskViewSet(auth.TaskGetQuerySetMixin, viewsets.ModelViewSet):
    queryset = Task.objects.all().prefetch_related(
            "label_set__attributespec_set",
            "segment_set__job_set",
        ).order_by('-id')
    serializer_class = TaskSerializer
    search_fields = ("name", "owner__username", "mode", "status")
    filterset_class = TaskFilter
    ordering_fields = ("id", "name", "owner", "status", "assignee")

    def get_permissions(self):
        http_method = self.request.method
        permissions = [IsAuthenticated]

        if http_method in SAFE_METHODS:
            permissions.append(auth.TaskAccessPermission)
        elif http_method in ["POST"]:
            permissions.append(auth.TaskCreatePermission)
        elif self.action == 'annotations' or http_method in ["PATCH", "PUT"]:
            permissions.append(auth.TaskChangePermission)
        elif http_method in ["DELETE"]:
            permissions.append(auth.TaskDeletePermission)
        else:
            permissions.append(auth.AdminRolePermission)

        return [perm() for perm in permissions]

    def perform_create(self, serializer):
        if self.request.data.get('owner', None):
            serializer.save()
        else:
            serializer.save(owner=self.request.user)

    def perform_destroy(self, instance):
        task_dirname = instance.get_task_dirname()
        super().perform_destroy(instance)
        shutil.rmtree(task_dirname, ignore_errors=True)

    @swagger_auto_schema(method='get', operation_summary='Returns a list of jobs for a specific task',
        responses={'200': JobSerializer(many=True)})
    @action(detail=True, methods=['GET'], serializer_class=JobSerializer)
    def jobs(self, request, pk):
        self.get_object() # force to call check_object_permissions
        queryset = Job.objects.filter(segment__task_id=pk)
        serializer = JobSerializer(queryset, many=True,
            context={"request": request})

        return Response(serializer.data)

    @swagger_auto_schema(method='post', operation_summary='Method permanently attaches images or video to a task')
    @action(detail=True, methods=['POST'], serializer_class=TaskDataSerializer)
    def data(self, request, pk):
        """
        These data cannot be changed later
        """
        db_task = self.get_object() # call check_object_permissions as well
        serializer = TaskDataSerializer(db_task, data=request.data)
        if serializer.is_valid(raise_exception=True):
            serializer.save()
            task.create(db_task.id, serializer.data)
            return Response(serializer.data, status=status.HTTP_202_ACCEPTED)

    @swagger_auto_schema(method='get', operation_summary='Method returns annotations for a specific task')
    @swagger_auto_schema(method='put', operation_summary='Method performs an update of all annotations in a specific task')
    @swagger_auto_schema(method='patch', operation_summary='Method performs a partial update of annotations in a specific task',
        manual_parameters=[openapi.Parameter('action', in_=openapi.IN_QUERY, required=True, type=openapi.TYPE_STRING,
            enum=['create', 'update', 'delete'])])
    @swagger_auto_schema(method='delete', operation_summary='Method deletes all annotations for a specific task')
    @action(detail=True, methods=['GET', 'DELETE', 'PUT', 'PATCH'],
        serializer_class=LabeledDataSerializer)
    def annotations(self, request, pk):
        self.get_object() # force to call check_object_permissions
        if request.method == 'GET':
            data = annotation.get_task_data(pk, request.user)
            serializer = LabeledDataSerializer(data=data)
            if serializer.is_valid(raise_exception=True):
                return Response(serializer.data)
        elif request.method == 'PUT':
            if request.query_params.get("format", ""):
                return load_data_proxy(
                    request=request,
                    rq_id="{}@/api/v1/tasks/{}/annotations/upload".format(request.user, pk),
                    rq_func=annotation.load_task_data,
                    pk=pk,
                )
            else:
                serializer = LabeledDataSerializer(data=request.data)
                if serializer.is_valid(raise_exception=True):
                    data = annotation.put_task_data(pk, request.user, serializer.data)
                    return Response(data)
        elif request.method == 'DELETE':
            annotation.delete_task_data(pk, request.user)
            return Response(status=status.HTTP_204_NO_CONTENT)
        elif request.method == 'PATCH':
            action = self.request.query_params.get("action", None)
            if action not in annotation.PatchAction.values():
                raise serializers.ValidationError(
                    "Please specify a correct 'action' for the request")
            serializer = LabeledDataSerializer(data=request.data)
            if serializer.is_valid(raise_exception=True):
                try:
                    data = annotation.patch_task_data(pk, request.user, serializer.data, action)
                except (AttributeError, IntegrityError) as e:
                    return Response(data=str(e), status=status.HTTP_400_BAD_REQUEST)
                return Response(data)

    @swagger_auto_schema(method='get', operation_summary='Method allows to download annotations as a file',
        manual_parameters=[openapi.Parameter('filename', openapi.IN_PATH, description="A name of a file with annotations",
                type=openapi.TYPE_STRING, required=True),
            openapi.Parameter('format', openapi.IN_QUERY, description="A name of a dumper\nYou can get annotation dumpers from this API:\n/server/annotation/formats",
                type=openapi.TYPE_STRING, required=True),
            openapi.Parameter('action', in_=openapi.IN_QUERY, description='Used to start downloading process after annotation file had been created',
                required=False, enum=['download'], type=openapi.TYPE_STRING)],
        responses={'202': openapi.Response(description='Dump of annotations has been started'),
            '201': openapi.Response(description='Annotations file is ready to download'),
            '200': openapi.Response(description='Download of file started')})
    @action(detail=True, methods=['GET'], serializer_class=None,
        url_path='annotations/(?P<filename>[^/]+)')
    def dump(self, request, pk, filename):
        """
        Dump of annotations in common case is a long process which cannot be performed within one request.
        First request starts dumping process. When the file is ready (code 201) you can get it with query parameter action=download.
        """
        filename = re.sub(r'[\\/*?:"<>|]', '_', filename)
        username = request.user.username
        db_task = self.get_object() # call check_object_permissions as well
        timestamp = datetime.now().strftime("%Y_%m_%d_%H_%M_%S")
        action = request.query_params.get("action")
        if action not in [None, "download"]:
            raise serializers.ValidationError(
                "Please specify a correct 'action' for the request")

        dump_format = request.query_params.get("format", "")
        try:
            db_dumper = AnnotationDumper.objects.get(display_name=dump_format)
        except ObjectDoesNotExist:
            raise serializers.ValidationError(
                "Please specify a correct 'format' parameter for the request")

        file_path = os.path.join(db_task.get_task_dirname(),
            "{}.{}.{}.{}".format(filename, username, timestamp, db_dumper.format.lower()))

        queue = django_rq.get_queue("default")
        rq_id = "{}@/api/v1/tasks/{}/annotations/{}/{}".format(username, pk, dump_format, filename)
        rq_job = queue.fetch_job(rq_id)

        if rq_job:
            if rq_job.is_finished:
                if not rq_job.meta.get("download"):
                    if action == "download":
                        rq_job.meta[action] = True
                        rq_job.save_meta()
                        return sendfile(request, rq_job.meta["file_path"], attachment=True,
                            attachment_filename="{}.{}".format(filename, db_dumper.format.lower()))
                    else:
                        return Response(status=status.HTTP_201_CREATED)
                else: # Remove the old dump file
                    try:
                        os.remove(rq_job.meta["file_path"])
                    except OSError:
                        pass
                    finally:
                        rq_job.delete()
            elif rq_job.is_failed:
                exc_info = str(rq_job.exc_info)
                rq_job.delete()
                return Response(data=exc_info, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            else:
                return Response(status=status.HTTP_202_ACCEPTED)

        rq_job = queue.enqueue_call(
            func=annotation.dump_task_data,
            args=(pk, request.user, file_path, db_dumper,
                  request.scheme, request.get_host()),
            job_id=rq_id,
        )
        rq_job.meta["file_path"] = file_path
        rq_job.save_meta()

        return Response(status=status.HTTP_202_ACCEPTED)

    @swagger_auto_schema(method='get', operation_summary='When task is being created the method returns information about a status of the creation process')
    @action(detail=True, methods=['GET'], serializer_class=RqStatusSerializer)
    def status(self, request, pk):
        self.get_object() # force to call check_object_permissions
        response = self._get_rq_response(queue="default",
            job_id="/api/{}/tasks/{}".format(request.version, pk))
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

        return response

    @swagger_auto_schema(method='get', operation_summary='Method provides a list of sizes (width, height) of media files which are related with the task',
        responses={'200': ImageMetaSerializer(many=True)})
    @action(detail=True, methods=['GET'], serializer_class=ImageMetaSerializer,
        url_path='frames/meta')
    def data_info(self, request, pk):
        try:
            db_task = self.get_object() # call check_object_permissions as well
            meta_cache_file = open(db_task.get_image_meta_cache_path())
        except OSError:
            task.make_image_meta_cache(db_task)
            meta_cache_file = open(db_task.get_image_meta_cache_path())

        data = literal_eval(meta_cache_file.read())
        serializer = ImageMetaSerializer(many=True, data=data['original_size'])
        if serializer.is_valid(raise_exception=True):
            return Response(serializer.data)

    @swagger_auto_schema(method='get', manual_parameters=[openapi.Parameter('frame', openapi.IN_PATH, required=True,
            description="A unique integer value identifying this frame", type=openapi.TYPE_INTEGER)],
        operation_summary='Method returns a specific frame for a specific task',
        responses={'200': openapi.Response(description='frame')})
    @action(detail=True, methods=['GET'], serializer_class=None,
        url_path='frames/(?P<frame>\d+)')
    def frame(self, request, pk, frame):
        try:
            # Follow symbol links if the frame is a link on a real image otherwise
            # mimetype detection inside sendfile will work incorrectly.
            db_task = self.get_object()
            path = os.path.realpath(db_task.get_frame_path(frame))
            return sendfile(request, path)
        except Exception as e:
            slogger.task[pk].error(
                "cannot get frame #{}".format(frame), exc_info=True)
            return HttpResponseBadRequest(str(e))

    @swagger_auto_schema(method='get', operation_summary='Export task as a dataset in a specific format',
        manual_parameters=[openapi.Parameter('action', in_=openapi.IN_QUERY,
                required=False, type=openapi.TYPE_STRING, enum=['download']),
            openapi.Parameter('format', in_=openapi.IN_QUERY, required=False, type=openapi.TYPE_STRING)],
        responses={'202': openapi.Response(description='Dump of annotations has been started'),
            '201': openapi.Response(description='Annotations file is ready to download'),
            '200': openapi.Response(description='Download of file started')})
    @action(detail=True, methods=['GET'], serializer_class=None,
        url_path='dataset')
    def dataset_export(self, request, pk):
        db_task = self.get_object()

        action = request.query_params.get("action", "")
        action = action.lower()
        if action not in ["", "download"]:
            raise serializers.ValidationError(
                "Unexpected parameter 'action' specified for the request")

        dst_format = request.query_params.get("format", "")
        if not dst_format:
            dst_format = DatumaroTask.DEFAULT_FORMAT
        dst_format = dst_format.lower()
        if dst_format not in [f['tag']
                for f in DatumaroTask.get_export_formats()]:
            raise serializers.ValidationError(
                "Unexpected parameter 'format' specified for the request")

        rq_id = "/api/v1/tasks/{}/dataset/{}".format(pk, dst_format)
        queue = django_rq.get_queue("default")

        rq_job = queue.fetch_job(rq_id)
        if rq_job:
            last_task_update_time = timezone.localtime(db_task.updated_date)
            request_time = rq_job.meta.get('request_time', None)
            if request_time is None or request_time < last_task_update_time:
                rq_job.cancel()
                rq_job.delete()
            else:
                if rq_job.is_finished:
                    file_path = rq_job.return_value
                    if action == "download" and osp.exists(file_path):
                        rq_job.delete()

                        timestamp = datetime.now().strftime("%Y_%m_%d_%H_%M_%S")
                        filename = "task_{}-{}-{}.zip".format(
                            db_task.name, timestamp, dst_format)
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
            server_address = request.get_host()
        except Exception:
            server_address = None

        ttl = DatumaroTask.CACHE_TTL.total_seconds()
        queue.enqueue_call(func=DatumaroTask.export_project,
            args=(pk, request.user, dst_format, server_address), job_id=rq_id,
            meta={ 'request_time': timezone.localtime() },
            result_ttl=ttl, failure_ttl=ttl)
        return Response(status=status.HTTP_202_ACCEPTED)

@method_decorator(name='retrieve', decorator=swagger_auto_schema(operation_summary='Method returns details of a job'))
@method_decorator(name='update', decorator=swagger_auto_schema(operation_summary='Method updates a job by id'))
@method_decorator(name='partial_update', decorator=swagger_auto_schema(
    operation_summary='Methods does a partial update of chosen fields in a job'))
class JobViewSet(viewsets.GenericViewSet,
    mixins.RetrieveModelMixin, mixins.UpdateModelMixin):
    queryset = Job.objects.all().order_by('id')
    serializer_class = JobSerializer

    def get_permissions(self):
        http_method = self.request.method
        permissions = [IsAuthenticated]

        if http_method in SAFE_METHODS:
            permissions.append(auth.JobAccessPermission)
        elif http_method in ["PATCH", "PUT", "DELETE"]:
            permissions.append(auth.JobChangePermission)
        else:
            permissions.append(auth.AdminRolePermission)

        return [perm() for perm in permissions]

    @swagger_auto_schema(method='get', operation_summary='Method returns annotations for a specific job')
    @swagger_auto_schema(method='put', operation_summary='Method performs an update of all annotations in a specific job')
    @swagger_auto_schema(method='patch', manual_parameters=[
        openapi.Parameter('action', in_=openapi.IN_QUERY, type=openapi.TYPE_STRING, required=True,
            enum=['create', 'update', 'delete'])],
            operation_summary='Method performs a partial update of annotations in a specific job')
    @swagger_auto_schema(method='delete', operation_summary='Method deletes all annotations for a specific job')
    @action(detail=True, methods=['GET', 'DELETE', 'PUT', 'PATCH'],
        serializer_class=LabeledDataSerializer)
    def annotations(self, request, pk):
        self.get_object() # force to call check_object_permissions
        if request.method == 'GET':
            data = annotation.get_job_data(pk, request.user)
            return Response(data)
        elif request.method == 'PUT':
            if request.query_params.get("format", ""):
                return load_data_proxy(
                    request=request,
                    rq_id="{}@/api/v1/jobs/{}/annotations/upload".format(request.user, pk),
                    rq_func=annotation.load_job_data,
                    pk=pk,
                )
            else:
                serializer = LabeledDataSerializer(data=request.data)
                if serializer.is_valid(raise_exception=True):
                    try:
                        data = annotation.put_job_data(pk, request.user, serializer.data)
                    except (AttributeError, IntegrityError) as e:
                        return Response(data=str(e), status=status.HTTP_400_BAD_REQUEST)
                    return Response(data)
        elif request.method == 'DELETE':
            annotation.delete_job_data(pk, request.user)
            return Response(status=status.HTTP_204_NO_CONTENT)
        elif request.method == 'PATCH':
            action = self.request.query_params.get("action", None)
            if action not in annotation.PatchAction.values():
                raise serializers.ValidationError(
                    "Please specify a correct 'action' for the request")
            serializer = LabeledDataSerializer(data=request.data)
            if serializer.is_valid(raise_exception=True):
                try:
                    data = annotation.patch_job_data(pk, request.user,
                        serializer.data, action)
                except (AttributeError, IntegrityError) as e:
                    return Response(data=str(e), status=status.HTTP_400_BAD_REQUEST)
                return Response(data)

@method_decorator(name='list', decorator=swagger_auto_schema(
    operation_summary='Method provides a paginated list of users registered on the server'))
@method_decorator(name='retrieve', decorator=swagger_auto_schema(
    operation_summary='Method provides information of a specific user'))
@method_decorator(name='partial_update', decorator=swagger_auto_schema(
    operation_summary='Method updates chosen fields of a user'))
@method_decorator(name='destroy', decorator=swagger_auto_schema(
    operation_summary='Method deletes a specific user from the server'))
class UserViewSet(viewsets.GenericViewSet, mixins.ListModelMixin,
    mixins.RetrieveModelMixin, mixins.UpdateModelMixin, mixins.DestroyModelMixin):
    queryset = User.objects.all().order_by('id')
    http_method_names = ['get', 'post', 'head', 'patch', 'delete']

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

    def get_permissions(self):
        permissions = [IsAuthenticated]
        user = self.request.user

        if not self.request.method in SAFE_METHODS:
            is_self = int(self.kwargs.get("pk", 0)) == user.id
            if not is_self:
                permissions.append(auth.AdminRolePermission)

        return [perm() for perm in permissions]

    @swagger_auto_schema(method='get', operation_summary='Method returns an instance of a user who is currently authorized')
    @action(detail=False, methods=['GET'])
    def self(self, request):
        """
        Method returns an instance of a user who is currently authorized
        """
        serializer_class = self.get_serializer_class()
        serializer = serializer_class(request.user, context={ "request": request })
        return Response(serializer.data)

class PluginViewSet(viewsets.ModelViewSet):
    queryset = Plugin.objects.all()
    serializer_class = PluginSerializer

    # @action(detail=True, methods=['GET', 'PATCH', 'PUT'], serializer_class=None)
    # def config(self, request, name):
    #     pass

    # @action(detail=True, methods=['GET', 'POST'], serializer_class=None)
    # def data(self, request, name):
    #     pass

    # @action(detail=True, methods=['GET', 'DELETE', 'PATCH', 'PUT'],
    #     serializer_class=None, url_path='data/(?P<id>\d+)')
    # def data_detail(self, request, name, id):
    #     pass


    @action(detail=True, methods=['GET', 'POST'], serializer_class=RqStatusSerializer)
    def requests(self, request, name):
        pass

    @action(detail=True, methods=['GET', 'DELETE'],
        serializer_class=RqStatusSerializer, url_path='requests/(?P<id>\d+)')
    def request_detail(self, request, name, rq_id):
        pass

def rq_handler(job, exc_type, exc_value, tb):
    job.exc_info = "".join(
        traceback.format_exception_only(exc_type, exc_value))
    job.save()
    if "tasks" in job.id.split("/"):
        return task.rq_handler(job, exc_type, exc_value, tb)

    return True

# TODO: Method should be reimplemented as a separated view
# @swagger_auto_schema(method='put', manual_parameters=[openapi.Parameter('format', in_=openapi.IN_QUERY,
#         description='A name of a loader\nYou can get annotation loaders from this API:\n/server/annotation/formats',
#         required=True, type=openapi.TYPE_STRING)],
#     operation_summary='Method allows to upload annotations',
#     responses={'202': openapi.Response(description='Load of annotations has been started'),
#         '201': openapi.Response(description='Annotations have been uploaded')},
#     tags=['tasks'])
# @api_view(['PUT'])
def load_data_proxy(request, rq_id, rq_func, pk):
    queue = django_rq.get_queue("default")
    rq_job = queue.fetch_job(rq_id)
    upload_format = request.query_params.get("format", "")

    if not rq_job:
        serializer = AnnotationFileSerializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            try:
                db_parser = AnnotationLoader.objects.get(pk=upload_format)
            except ObjectDoesNotExist:
                raise serializers.ValidationError(
                    "Please specify a correct 'format' parameter for the upload request")

            anno_file = serializer.validated_data['annotation_file']
            fd, filename = mkstemp(prefix='cvat_{}'.format(pk))
            with open(filename, 'wb+') as f:
                for chunk in anno_file.chunks():
                    f.write(chunk)
            rq_job = queue.enqueue_call(
                func=rq_func,
                args=(pk, request.user, filename, db_parser),
                job_id=rq_id
            )
            rq_job.meta['tmp_file'] = filename
            rq_job.meta['tmp_file_descriptor'] = fd
            rq_job.save_meta()
    else:
        if rq_job.is_finished:
            os.close(rq_job.meta['tmp_file_descriptor'])
            os.remove(rq_job.meta['tmp_file'])
            rq_job.delete()
            return Response(status=status.HTTP_201_CREATED)
        elif rq_job.is_failed:
            os.close(rq_job.meta['tmp_file_descriptor'])
            os.remove(rq_job.meta['tmp_file'])
            exc_info = str(rq_job.exc_info)
            rq_job.delete()
            return Response(data=exc_info, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response(status=status.HTTP_202_ACCEPTED)
