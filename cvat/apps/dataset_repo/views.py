# Copyright (C) 2018-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT
import http.client

from django.http import HttpResponseBadRequest, HttpResponse
from rules.contrib.views import permission_required, objectgetter
from django.conf import settings

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework.decorators import api_view, permission_classes

from drf_spectacular.utils import extend_schema

from cvat.apps.engine.log import slogger
from cvat.apps.engine import models
from cvat.apps.dataset_repo.models import GitData
import contextlib

import cvat.apps.dataset_repo.dataset_repo as CVATGit
import django_rq

def _legacy_api_view(allowed_method_names=None):
    # Currently, the views in this file use the legacy permission-checking
    # approach, so this decorator disables the default DRF permission classes.
    # TODO: migrate to DRF permissions, make the views compatible with drf-spectacular,
    # and remove this decorator.
    def decorator(view):
        view = permission_classes([IsAuthenticated])(view)
        view = api_view(allowed_method_names)(view)
        view = extend_schema(exclude=True)(view)
        return view

    return decorator

@_legacy_api_view()
def check_process(request, rq_id):
    try:
        queue = django_rq.get_queue(settings.CVAT_QUEUES.EXPORT_DATA.value)
        rq_job = queue.fetch_job(rq_id)

        if rq_job is not None:
            if rq_job.is_queued or rq_job.is_started:
                return Response({"status": rq_job.get_status()})
            elif rq_job.is_finished:
                return Response({"status": rq_job.get_status()})
            else:
                return Response({"status": rq_job.get_status(), "stderr": rq_job.exc_info})
        else:
            return Response({"status": "unknown"})
    except Exception as ex:
        slogger.glob.error("error occurred during checking repository request with rq id {}".format(rq_id), exc_info=True)
        return HttpResponseBadRequest(str(ex))


@_legacy_api_view(['POST'])
@permission_required(perm=['engine.task.create'],
    fn=objectgetter(models.Task, 'tid'), raise_exception=True)
def create(request: Request, tid):
    try:
        slogger.task[tid].info("create repository request")
        body = request.data
        path = body["path"]
        export_format = body.get("format")
        lfs = body["lfs"]
        rq_id = "git.create.{}".format(tid)
        queue = django_rq.get_queue(settings.CVAT_QUEUES.EXPORT_DATA.value)

        queue.enqueue_call(func = CVATGit.initial_create, args = (tid, path, export_format, lfs, request.user), job_id = rq_id)
        return Response({ "rq_id": rq_id })
    except Exception as ex:
        slogger.glob.error("error occurred during initial cloning repository request with rq id {}".format(rq_id), exc_info=True)
        return HttpResponseBadRequest(str(ex))


@_legacy_api_view()
def push_repository(request: Request, tid):
    try:
        slogger.task[tid].info("push repository request")

        rq_id = "git.push.{}".format(tid)
        queue = django_rq.get_queue(settings.CVAT_QUEUES.EXPORT_DATA.value)
        queue.enqueue_call(func = CVATGit.push, args = (tid, request.user, request.scheme, request.get_host()), job_id = rq_id)

        return Response({ "rq_id": rq_id })
    except Exception as ex:
        with contextlib.suppress(Exception):
            slogger.task[tid].error("error occurred during pushing repository request",
                exc_info=True)

        return HttpResponseBadRequest(str(ex))


@_legacy_api_view()
def get_repository(request: Request, tid):
    try:
        slogger.task[tid].info("get repository request")
        return Response(CVATGit.get(tid, request.user))
    except Exception as ex:
        with contextlib.suppress(Exception):
            slogger.task[tid].error("error occurred during getting repository info request",
                exc_info=True)

        return HttpResponseBadRequest(str(ex))

@_legacy_api_view(['PATCH'])
@permission_required(perm=['engine.task.access'],
                     fn=objectgetter(models.Task, 'tid'), raise_exception=True)
def update_git_repo(request: Request, tid):
    try:
        body = request.data
        req_type = body["type"]
        value = body["value"]
        git_data_obj = GitData.objects.filter(task_id=tid)[0]
        if req_type == "url":
            git_data_obj.url = value
            git_data_obj.save(update_fields=["url"])
        elif req_type == "lfs":
            git_data_obj.lfs = bool(value)
            git_data_obj.save(update_fields=["lfs"])
        elif req_type == "format":
            git_data_obj.format = value
            git_data_obj.save(update_fields=["format"])
            slogger.task[tid].info("get repository request")
        return HttpResponse(
            status=http.HTTPStatus.OK,
        )
    except Exception as ex:
        with contextlib.suppress(Exception):
            slogger.task[tid].error("error occurred during changing repository request", exc_info=True)
        return HttpResponseBadRequest(str(ex))


@_legacy_api_view()
def get_meta_info(request):
    try:
        db_git_records = GitData.objects.all()
        response = {}
        for db_git in db_git_records:
            response[db_git.task_id] = db_git.status

        return Response(response)
    except Exception as ex:
        slogger.glob.exception("error occurred during get meta request", exc_info = True)
        return HttpResponseBadRequest(str(ex))
