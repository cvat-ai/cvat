# Copyright (C) 2018-2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

import contextlib
import django_rq
import cvat.apps.dataset_repo.dataset_repo as CVATGit

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import HttpResponseBadRequest, JsonResponse
from drf_spectacular.utils import OpenApiResponse, extend_schema, extend_schema_view
from cvat.apps.engine.log import slogger
from cvat.apps.iam.permissions import DatasetRepoPermission
from cvat.apps.dataset_repo.models import GitData
from cvat.apps.dataset_repo.serializers import DatasetRepoSerializer, RqStatusSerializer

@extend_schema_view(tags=['datasetrepo'])
@extend_schema_view(
    retrieve=extend_schema(
        summary='Method returns details of an dataset repository',
        responses={
            '200': OpenApiResponse(description=''),
        }),
    list=extend_schema(
        summary='Methods returns details about all dataset repositories',
        responses={
            '200': DatasetRepoSerializer(many=True),
        }),
    partial_update=extend_schema(
        summary='Methods does a partial update of chosen fields in a dataset repository'),
    create=extend_schema(
        summary='Method create a dataset repository, attach it to specified task and clone',
        responses={
            '201': OpenApiResponse(description=''),
        }),
)
class DatasetRepoViewSet(viewsets.ModelViewSet):
    http_method_names = ['get', 'post', 'patch']
    queryset = GitData.objects.all().order_by('-task__id')
    serializer_class = DatasetRepoSerializer
    search_fields = ('path', 'format', 'status',)
    filter_fields = list(search_fields) + ['tid']
    ordering_fields = filter_fields
    ordering = "-tid"
    iam_organization_field = 'task__organization'
    lookup_field = 'task_id'
    lookup_fields = {
        'tid': 'task__id',
    }

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == 'list':
            perm = DatasetRepoPermission.create_scope_list(self.request)
            queryset = perm.filter(queryset)

        return queryset

    @extend_schema(summary='Method returns a status of rq_job',
        responses={
            '200': RqStatusSerializer,
    })
    @action(detail=False, methods=['GET'], url_path=r'(?P<rq_id>[a-z0-9.]+)/status')
    def status(self, request, rq_id):
        try:
            queue = django_rq.get_queue('default')
            rq_job = queue.fetch_job(rq_id)

            if rq_job is not None:
                data = {'status': rq_job.get_status()}
                if not any((rq_job.is_queued, rq_job.is_started, rq_job.is_finished)):
                    data['stderr'] = rq_job.exc_info
            else:
                data = {'status': 'unknown'}
            serializer = RqStatusSerializer(data=data)
            if serializer.is_valid(raise_exception=True):
                return Response(serializer.data)
        except Exception as ex:
            slogger.glob.error("error occurred during checking repository request with rq id {}".format(rq_id), exc_info=True)
            return HttpResponseBadRequest(str(ex))

    def create(self, request, *args, **kwargs):
        rq_id = None
        try:
            serializer = self.get_serializer(data=request.data, context={'request': request})
            serializer.is_valid(raise_exception=True)
            tid = int(serializer.validated_data.pop('task_id'))
            slogger.task[tid].info("create repository request")
            rq_id = "git.create.{}".format(tid)
            queue = django_rq.get_queue("default")

            queue.enqueue_call(func = CVATGit.initial_create, args = (
                tid,
                serializer.validated_data['path'],
                serializer.validated_data['format'],
                serializer.validated_data['lfs'], request.user), job_id = rq_id)
            return JsonResponse({ "rq_id": rq_id })
        except Exception as ex:
            slogger.glob.error(
                f'error occurred during initial cloning repository request with rq id {rq_id}', exc_info=True)
            return HttpResponseBadRequest(str(ex))


    @extend_schema(summary='Method push commit to origin repository',
        responses={
            '200': OpenApiResponse(description=''),
    })
    @action(detail=True, methods=['GET'], url_path='push')
    def push(self, request, task_id):
        try:
            slogger.task[task_id].info("push repository request")
            rq_id = "git.push.{}".format(task_id)
            queue = django_rq.get_queue('default')
            queue.enqueue_call(func = CVATGit.push, args = (task_id, request.user, request.scheme, request.get_host()), job_id = rq_id)

            return JsonResponse({ "rq_id": rq_id })
        except Exception as ex:
            with contextlib.suppress(Exception):
                slogger.task[task_id].error("error occurred during pushing repository request",
                    exc_info=True)

            return HttpResponseBadRequest(str(ex))

    def retrieve(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            tid = instance.task_id
            slogger.task[tid].info("get repository request")
            return JsonResponse(CVATGit.get(tid, request.user))
        except Exception as ex:
            with contextlib.suppress(Exception):
                slogger.task[kwargs[self.lookup_field]].error("error occurred during getting repository info request",
                    exc_info=True)

            return HttpResponseBadRequest(str(ex))

    def update(self, request, *args, **kwargs):
        try:
            return super().update(request, *args, **kwargs)
        except Exception as ex:
            with contextlib.suppress(Exception):
                slogger.task[kwargs[self.lookup_field]].error("error occurred during changing repository request", exc_info=True)

            return HttpResponseBadRequest(str(ex))

    # TODO:
    @extend_schema(summary='Method provides a meta information about all created repositories',
    responses={
        '200': OpenApiResponse(description=''),
    })
    @action(detail=False, methods=['GET'], url_path='metadata')
    def metadata(self, request):
        try:
            db_git_records = GitData.objects.all()
            response = {}
            for db_git in db_git_records:
                response[db_git.task_id] = db_git.status

            return JsonResponse(response, safe = False)
        except Exception as ex:
            slogger.glob.exception("error occurred during get meta request", exc_info = True)
            return HttpResponseBadRequest(str(ex))
