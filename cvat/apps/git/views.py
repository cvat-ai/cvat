# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.http import HttpResponse, HttpResponseBadRequest, JsonResponse
from django.contrib.auth.decorators import permission_required
from django.db import transaction

from cvat.apps.authentication.decorators import login_required
from cvat.apps.engine.log import slogger

import cvat.apps.git.git as CVATGit

import django_rq
import json
import git


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
@permission_required('engine.add_task', raise_exception=True)
def create_repository(request):
    try:
        tid = None
        data = json.loads(request.body.decode('utf-8'))
        tid = data['tid']
        url = data['url']

        slogger.glob.info("create repository request for task #{}".format(tid))

        rq_id = "git.create.{}".format(tid)
        queue = django_rq.get_queue('default')
        queue.enqueue_call(func = CVATGit.create, args = (url, tid, request.user), job_id=  rq_id)

        return JsonResponse({ "rq_id": rq_id })
    except Exception as ex:
        slogger.glob.error("error has been occured during creating repository request for the task #{}".format(tid), exc_info=True)
        return HttpResponseBadRequest(str(ex))


@login_required
@permission_required(perm=['engine.view_task', 'engine.change_task'], raise_exception=True)
def update_repository(request):
    try:
        tid = None
        data = json.loads(request.body.decode('utf-8'))
        tid = data['tid']
        url = data['url']

        slogger.task[tid].info("update repository request")

        rq_id = "git.update.{}".format(tid)
        queue = django_rq.get_queue('default')
        queue.enqueue_call(func = CVATGit.update, args = (url, tid, request.user), job_id = rq_id)

        return JsonResponse({ "rq_id": rq_id })
    except Exception as ex:
        try:
            slogger.task[tid].error("error has been occured during updating repository request", exc_info=True)
        except:
            pass
        return HttpResponseBadRequest(str(ex))


@login_required
@permission_required(perm=['engine.view_task'], raise_exception=True)
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
@permission_required(perm=['engine.view_task'], raise_exception=True)
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


@login_required
@permission_required(perm=['engine.view_task', 'engine.change_task'], raise_exception=True)
def delete_repository(request, tid):
    try:
        slogger.task[tid].info("delete repository request")
        CVATGit.delete(tid, request.user)
        return HttpResponse()
    except Exception as ex:
        try:
            slogger.task[tid].error("error has been occured during deleting repository request", exc_info=True)
        except:
            pass
        return HttpResponseBadRequest(str(ex))
