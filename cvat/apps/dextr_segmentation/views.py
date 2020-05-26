# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.http import HttpResponse, HttpResponseBadRequest, JsonResponse
from cvat.apps.authentication.decorators import login_required
from rules.contrib.views import permission_required, objectgetter

from cvat.apps.engine.models import Job
from cvat.apps.engine.log import slogger
from cvat.apps.dextr_segmentation.dextr import DEXTR_HANDLER

import django_rq
import json
import rq

__RQ_QUEUE_NAME = "default"
__DEXTR_HANDLER = DEXTR_HANDLER()

def _dextr_thread(db_data, frame, points):
    job = rq.get_current_job()
    job.meta["result"] = __DEXTR_HANDLER.handle(db_data, frame, points)
    job.save_meta()


@login_required
@permission_required(perm=["engine.job.change"],
    fn=objectgetter(Job, "jid"), raise_exception=True)
def create(request, jid):
    try:
        data = json.loads(request.body.decode("utf-8"))

        points = data["points"]
        frame = int(data["frame"])
        username = request.user.username

        slogger.job[jid].info("create dextr request for the JOB: {} ".format(jid)
            + "by the USER: {} on the FRAME: {}".format(username, frame))

        db_data = Job.objects.select_related("segment__task__data").get(id=jid).segment.task.data

        queue = django_rq.get_queue(__RQ_QUEUE_NAME)
        rq_id = "dextr.create/{}/{}".format(jid, username)
        job = queue.fetch_job(rq_id)

        if job is not None and (job.is_started or job.is_queued):
            if "cancel" not in job.meta:
                raise Exception("Segmentation process has been already run for the " +
                    "JOB: {} and the USER: {}".format(jid, username))
            else:
                job.delete()

        queue.enqueue_call(func=_dextr_thread,
            args=(db_data, frame, points),
            job_id=rq_id,
            timeout=15,
            ttl=30)

        return HttpResponse()
    except Exception as ex:
        slogger.job[jid].error("can't create a dextr request for the job {}".format(jid), exc_info=True)
        return HttpResponseBadRequest(str(ex))


@login_required
@permission_required(perm=["engine.job.change"],
    fn=objectgetter(Job, "jid"), raise_exception=True)
def cancel(request, jid):
    try:
        username = request.user.username
        slogger.job[jid].info("cancel dextr request for the JOB: {} ".format(jid)
            + "by the USER: {}".format(username))

        queue = django_rq.get_queue(__RQ_QUEUE_NAME)
        rq_id = "dextr.create/{}/{}".format(jid, username)
        job = queue.fetch_job(rq_id)

        if job is None or job.is_finished or job.is_failed:
            raise Exception("Segmentation isn't running now")
        elif "cancel" not in job.meta:
            job.meta["cancel"] = True
            job.save_meta()

        return HttpResponse()
    except Exception as ex:
        slogger.job[jid].error("can't cancel a dextr request for the job {}".format(jid), exc_info=True)
        return HttpResponseBadRequest(str(ex))


@login_required
@permission_required(perm=["engine.job.change"],
    fn=objectgetter(Job, "jid"), raise_exception=True)
def check(request, jid):
    try:
        username = request.user.username
        slogger.job[jid].info("check dextr request for the JOB: {} ".format(jid)
            + "by the USER: {}".format(username))

        queue = django_rq.get_queue(__RQ_QUEUE_NAME)
        rq_id = "dextr.create/{}/{}".format(jid, username)
        job = queue.fetch_job(rq_id)
        data = {}

        if job is None:
            data["status"] = "unknown"
        else:
            if "cancel" in job.meta:
                data["status"] = "finished"
            elif job.is_queued:
                data["status"] = "queued"
            elif job.is_started:
                data["status"] = "started"
            elif job.is_finished:
                data["status"] = "finished"
                data["result"] = job.meta["result"]
                job.delete()
            else:
                data["status"] = "failed"
                data["stderr"] = job.exc_info
                job.delete()

        return JsonResponse(data)
    except Exception as ex:
        slogger.job[jid].error("can't check a dextr request for the job {}".format(jid), exc_info=True)
        return HttpResponseBadRequest(str(ex))

def enabled(request):
    return HttpResponse()
