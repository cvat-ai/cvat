# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.http import HttpResponse, HttpResponseBadRequest, JsonResponse
from django.contrib.auth.decorators import permission_required
from django.db import transaction

from cvat.apps.authentication.decorators import login_required
from cvat.apps.engine.log import slogger

import cvat.apps.git.git as CVATGit
import json
import git


@login_required
@permission_required('engine.add_task', raise_exception=True)
def create_repository(request):
    try:
        tid = None
        data = json.loads(request.body.decode('utf-8'))
        tid = data['tid']
        url = data['url']

        slogger.glob.info("create repository request for task #{}".format(tid))
        CVATGit.create(url, tid, request.user)
    except Exception as e:
        slogger.glob.error("error has been occured during creating repository request for the task #{}".format(tid), exc_info=True)
        return HttpResponseBadRequest(str(e))
    return HttpResponse()


@login_required
@permission_required(perm=['engine.view_task', 'engine.change_task'], raise_exception=True)
def update_repository(request):
    try:
        tid = None
        data = json.loads(request.body.decode('utf-8'))
        tid = data['tid']
        url = data['url']

        slogger.task[tid].info("update repository request")
        CVATGit.update(url, tid, request.user)
    except Exception as e:
        try:
            slogger.task[tid].error("error has been occured during updating repository request", exc_info=True)
        except:
            pass
        return HttpResponseBadRequest(str(e))
    return HttpResponse()


@login_required
@permission_required(perm=['engine.view_task'], raise_exception=True)
def push_repository(request, tid):
    try:
        slogger.task[tid].info("push repository request")
        CVATGit.push(tid, request.user, request.scheme, request.get_host())
    except Exception as e:
        try:
            slogger.task[tid].error("error has been occured during pushing repository request", exc_info=True)
        except:
            pass
        return HttpResponseBadRequest(str(e))
    return HttpResponse()


@login_required
@permission_required(perm=['engine.view_task'], raise_exception=True)
def get_repository(request, tid):
    try:
        slogger.task[tid].info("get repository request")
        return JsonResponse(CVATGit.get(tid, request.user))
    except Exception as e:
        try:
            slogger.task[tid].error("error has been occured during getting repository info request", exc_info=True)
        except:
            pass
        return HttpResponseBadRequest(str(e))


@login_required
@permission_required(perm=['engine.view_task', 'engine.change_task'], raise_exception=True)
def delete_repository(request, tid):
    try:
        slogger.task[tid].info("delete repository request")
        CVATGit.delete(tid, request.user)
    except Exception as e:
        try:
            slogger.task[tid].error("error has been occured during deleting repository request", exc_info=True)
        except:
            pass
        return HttpResponseBadRequest(str(e))

    return HttpResponse()
