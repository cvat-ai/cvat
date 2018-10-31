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
        slogger.glob.error("error has been occured during deleting repository for the task #{}".format(tid), exc_info=True)
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

        slogger.glob.info("update repository request for task #{}".format(tid))
        CVATGit.update(url, tid, request.user)
    except Exception as e:
        try:
            slogger.task[tid].error("error has been occured during updating a git repository", exc_info=True)
        except:
            pass
        return HttpResponseBadRequest(str(e))
    return HttpResponse()


@login_required
@permission_required(perm=['engine.view_task'], raise_exception=True)
def get_repository(request, tid):
    try:
        slogger.glob.info("get repository request for task #{}".format(tid))
        return JsonResponse(CVATGit.get(tid, request.user))
    except Exception as e:
        try:
            slogger.task[tid].error("error has been occured during getting repository info", exc_info=True)
        except:
            pass
        return HttpResponseBadRequest(str(e))


@login_required
@permission_required(perm=['engine.view_task', 'engine.change_task'], raise_exception=True)
def delete_repository(request, tid):
    try:
        slogger.glob.info("delete repository request for task #{}".format(tid))
        CVATGit.delete(tid, request.user)
    except Exception as e:
        try:
            slogger.task[tid].error("error has been occured during deleting a repository", exc_info=True)
        except:
            pass
        return HttpResponseBadRequest(str(e))

    return HttpResponse()
