# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.http import HttpResponse, HttpResponseBadRequest, JsonResponse
from cvat.apps.authentication.decorators import login_required
from rules.contrib.views import permission_required, objectgetter

from cvat.apps.engine.models import Job
from cvat.apps.reid.reid import ReID

import django_rq
import json
import rq


def _create_thread(jid, data):
    job = rq.get_current_job()
    reid_obj = ReID(jid, data)
    job.meta["result"] = json.dumps(reid_obj.run())
    job.save_meta()


@login_required
@permission_required(perm=["engine.job.change"],
    fn=objectgetter(Job, 'jid'), raise_exception=True)
def start(request, jid):
    try:
        data = json.loads(request.body.decode('utf-8'))
        queue = django_rq.get_queue("low")
        job_id = "reid.create.{}".format(jid)
        job = queue.fetch_job(job_id)
        if job is not None and (job.is_started or job.is_queued):
            raise Exception('ReID process has been already started')
        queue.enqueue_call(func=_create_thread, args=(jid, data), job_id=job_id, timeout=7200)
        job = queue.fetch_job(job_id)
        job.meta = {}
        job.save_meta()
    except Exception as e:
        return HttpResponseBadRequest(str(e))

    return HttpResponse()


@login_required
@permission_required(perm=["engine.job.change"],
    fn=objectgetter(Job, 'jid'), raise_exception=True)
def check(request, jid):
    try:
        queue = django_rq.get_queue("low")
        rq_id = "reid.create.{}".format(jid)
        job = queue.fetch_job(rq_id)
        if job is not None and "cancel" in job.meta:
            return JsonResponse({"status": "finished"})
        data = {}
        if job is None:
            data["status"] = "unknown"
        elif job.is_queued:
            data["status"] = "queued"
        elif job.is_started:
            data["status"] = "started"
            if "progress" in job.meta:
                data["progress"] = job.meta["progress"]
        elif job.is_finished:
            data["status"] = "finished"
            data["result"] = job.meta["result"]
            job.delete()
        else:
            data["status"] = "failed"
            data["stderr"] = job.exc_info
            job.delete()

    except Exception as ex:
        data["stderr"] = str(ex)
        data["status"] = "unknown"

    return JsonResponse(data)


@login_required
@permission_required(perm=["engine.job.change"],
    fn=objectgetter(Job, 'jid'), raise_exception=True)
def cancel(request, jid):
    try:
        queue = django_rq.get_queue("low")
        rq_id = "reid.create.{}".format(jid)
        job = queue.fetch_job(rq_id)
        if job is None or job.is_finished or job.is_failed:
            raise Exception("Task is not being annotated currently")
        elif "cancel" not in job.meta:
            job.meta["cancel"] = True
            job.save_meta()
    except Exception as e:
        return HttpResponseBadRequest(str(e))

    return HttpResponse()

def enabled(request):
    return HttpResponse()
