# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.http import HttpResponse, HttpResponseBadRequest, JsonResponse
from rules.contrib.views import permission_required, objectgetter
from django.db import transaction

from cvat.apps.authentication.decorators import login_required
from cvat.apps.engine.log import slogger
from cvat.apps.engine import models

import cvat.apps.git.git as CVATGit

import django_rq
import random
import json
import git
import sys
import os


@login_required
def check_process(request, rq_id):
    try:
        queue = django_rq.get_queue('default')
        rq_job = queue.fetch_job(rq_id)

        if rq_job is not None:
            if rq_job.is_queued or rq_job.is_started:
                return JsonResponse({"status": "processing"})
            elif rq_job.is_finished:
                return JsonResponse({"status": "finished"})
            else:
                return JsonResponse({"status": "failed"})
        else:
            return JsonResponse({"status": "unknown"})
    except Exception as ex:
        slogger.glob.error("error has been occured during checking repository request with rq id {}".format(rq_id), exc_info=True)
        return HttpResponseBadRequest(str(ex))


@login_required
@permission_required(perm=['engine.task.delete'],
    fn=objectgetter(models.Task, 'tid'), raise_exception=True)
def push_repository(request, tid):
    try:
        slogger.task[tid].info("push repository request")

        rq_id = "git.push.{}".format(tid)
        queue = django_rq.get_queue('default')
        queue.enqueue_call(func = CVATGit.push, args = (tid, request.user, request.scheme, request.get_host()), job_id = rq_id)

        return JsonResponse({ "rq_id": rq_id })
    except Exception as ex:
        try:
            slogger.task[tid].error("error has been occured during pushing repository request", exc_info=True)
        except:
            pass
        return HttpResponseBadRequest(str(ex))


@login_required
@permission_required(perm=['engine.task.access'],
    fn=objectgetter(models.Task, 'tid'), raise_exception=True)
def get_repository(request, tid):
    try:
        slogger.task[tid].info("get repository request")
        return JsonResponse(CVATGit.get(tid, request.user))
    except Exception as ex:
        try:
            slogger.task[tid].error("error has been occured during getting repository info request", exc_info=True)
        except:
            pass
        return HttpResponseBadRequest(str(ex))
