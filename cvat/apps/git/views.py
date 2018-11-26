# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.http import HttpResponse, HttpResponseBadRequest, JsonResponse
from django.db import transaction

from cvat.apps.authentication.decorators import login_required
from cvat.apps.engine.log import slogger

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
def create_repository(request):
    try:
        data = json.loads(request.body.decode('utf-8'))
        url = data['url']

        if not len(url):
            raise Exception("Repository URL isn't specified")

        random_id = str(random.randint(0, sys.maxsize))
        random_path = os.path.join("/", "tmp", random_id)
        while os.path.exists(random_path):
            random_id = str(random.randint(0, sys.maxsize))
            random_path = os.path.join("/", "tmp", random_id)

        os.makedirs(random_path)
        random_path = os.path.join(random_path, 'repos')

        rq_id = "git.create.{}".format(random_id)
        slogger.glob.info("create repository request with url {}. Cloning it to path {}".format(url, random_path))

        queue = django_rq.get_queue('default')
        queue.enqueue_call(func = CVATGit.create, args = (url, random_path, request.user), job_id=rq_id)

        return JsonResponse({ "rq_id": rq_id, "repos_path": random_path })
    except Exception as ex:
        slogger.glob.error("error occured during create repository request", exc_info=True)
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
        try:
            slogger.task[tid].error("error has been occured during pushing repository request", exc_info=True)
        except:
            pass
        return HttpResponseBadRequest(str(ex))


@login_required
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
