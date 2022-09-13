# Copyright (C) 2018-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT
import http.client

from django.http import HttpResponseBadRequest, JsonResponse, HttpResponse
from rules.contrib.views import permission_required, objectgetter

from cvat.apps.iam.decorators import login_required
from cvat.apps.engine.log import slogger
from cvat.apps.engine import models
from cvat.apps.dataset_repo.models import GitData
import contextlib

import cvat.apps.dataset_repo.dataset_repo as CVATGit
import django_rq
import json

@login_required
def check_process(request, rq_id):
    try:
        queue = django_rq.get_queue('default')
        rq_job = queue.fetch_job(rq_id)

        if rq_job is not None:
            if rq_job.is_queued or rq_job.is_started:
                return JsonResponse({"status": rq_job.get_status()})
            elif rq_job.is_finished:
                return JsonResponse({"status": rq_job.get_status()})
            else:
                return JsonResponse({"status": rq_job.get_status(), "stderr": rq_job.exc_info})
        else:
            return JsonResponse({"status": "unknown"})
    except Exception as ex:
        slogger.glob.error("error occurred during checking repository request with rq id {}".format(rq_id), exc_info=True)
        return HttpResponseBadRequest(str(ex))


@login_required
@permission_required(perm=['engine.task.create'],
    fn=objectgetter(models.Task, 'tid'), raise_exception=True)
def create(request, tid):
    try:
        slogger.task[tid].info("create repository request")
        body = json.loads(request.body.decode('utf-8'))
        path = body["path"]
        export_format = body["format"]
        lfs = body["lfs"]
        rq_id = "git.create.{}".format(tid)
        queue = django_rq.get_queue("default")

        queue.enqueue_call(func = CVATGit.initial_create, args = (tid, path, export_format, lfs, request.user), job_id = rq_id)
        return JsonResponse({ "rq_id": rq_id })
    except Exception as ex:
        slogger.glob.error("error occurred during initial cloning repository request with rq id {}".format(rq_id), exc_info=True)
        return HttpResponseBadRequest(str(ex))


@login_required
def push_repository(request, tid):
    try:
        slogger.task[tid].info("push repository request")

        rq_id = "git.push.{}".format(tid)
        queue = django_rq.get_queue('default')
        queue.enqueue_call(func = CVATGit.push, args = (tid, request.user, request.scheme, request.get_host()), job_id = rq_id)

        return JsonResponse({ "rq_id": rq_id })
    except Exception as ex:
        with contextlib.suppress(Exception):
            slogger.task[tid].error("error occurred during pushing repository request",
                exc_info=True)

        return HttpResponseBadRequest(str(ex))


@login_required
def get_repository(request, tid):
    try:
        slogger.task[tid].info("get repository request")
        return JsonResponse(CVATGit.get(tid, request.user))
    except Exception as ex:
        with contextlib.suppress(Exception):
            slogger.task[tid].error("error occurred during getting repository info request",
                exc_info=True)

        return HttpResponseBadRequest(str(ex))

@login_required
@permission_required(perm=['engine.task.access'],
                     fn=objectgetter(models.Task, 'tid'), raise_exception=True)
def update_git_repo(request, tid):
    try:
        body = json.loads(request.body.decode('utf-8'))
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


@login_required
def get_meta_info(request):
    try:
        db_git_records = GitData.objects.all()
        response = {}
        for db_git in db_git_records:
            response[db_git.task_id] = db_git.status

        return JsonResponse(response, safe = False)
    except Exception as ex:
        slogger.glob.exception("error occurred during get meta request", exc_info = True)
        return HttpResponseBadRequest(str(ex))
