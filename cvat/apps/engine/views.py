
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
import json
import traceback

from django.http import HttpResponse, HttpResponseBadRequest, JsonResponse
from django.shortcuts import redirect, render
from django.conf import settings
from rules.contrib.views import permission_required, objectgetter
from django.views.decorators.gzip import gzip_page
from sendfile import sendfile

from . import annotation, task, models
from cvat.settings.base import JS_3RDPARTY
from cvat.apps.authentication.decorators import login_required
from requests.exceptions import RequestException
import logging
from .log import slogger, clogger
from cvat.apps.engine.models import StatusChoice

############################# High Level server API
@login_required
@permission_required(perm=['engine.job.access'],
    fn=objectgetter(models.Job, 'jid'), raise_exception=True)
def catch_client_exception(request, jid):
    data = json.loads(request.body.decode('utf-8'))
    for event in data['exceptions']:
        clogger.job[jid].error(json.dumps(event))

    return HttpResponse()

@login_required
def dispatch_request(request):
    """An entry point to dispatch legacy requests"""
    if request.method == 'GET' and 'id' in request.GET:
        return render(request, 'engine/annotation.html', {
            'js_3rdparty': JS_3RDPARTY.get('engine', []),
            'status_list': [str(i) for i in StatusChoice]
        })
    else:
        return redirect('/dashboard/')

@login_required
@permission_required(perm=['engine.task.create'], raise_exception=True)
def create_task(request):
    """Create a new annotation task"""

    db_task = None
    params = request.POST.dict()
    params['owner'] = request.user
    slogger.glob.info("create task with params = {}".format(params))
    try:
        db_task = task.create_empty(params)
        target_paths = []
        source_paths = []
        upload_dir = db_task.get_upload_dirname()
        share_root = settings.SHARE_ROOT
        if params['storage'] == 'share':
            data_list = request.POST.getlist('data')
            data_list.sort(key=len)
            for share_path in data_list:
                relpath = os.path.normpath(share_path).lstrip('/')
                if '..' in relpath.split(os.path.sep):
                    raise Exception('Permission denied')
                abspath = os.path.abspath(os.path.join(share_root, relpath))
                if os.path.commonprefix([share_root, abspath]) != share_root:
                    raise Exception('Bad file path on share: ' + abspath)
                source_paths.append(abspath)
                target_paths.append(os.path.join(upload_dir, relpath))
        else:
            data_list = request.FILES.getlist('data')

            if len(data_list) > settings.LOCAL_LOAD_MAX_FILES_COUNT:
                raise Exception('Too many files. Please use download via share')
            common_size = 0
            for f in data_list:
                common_size += f.size
            if common_size > settings.LOCAL_LOAD_MAX_FILES_SIZE:
                raise Exception('Too many size. Please use download via share')

            for data_file in data_list:
                source_paths.append(data_file.name)
                path = os.path.join(upload_dir, data_file.name)
                target_paths.append(path)
                with open(path, 'wb') as upload_file:
                    for chunk in data_file.chunks():
                        upload_file.write(chunk)

        params['SOURCE_PATHS'] = source_paths
        params['TARGET_PATHS'] = target_paths

        task.create(db_task.id, params)

        return JsonResponse({'tid': db_task.id})
    except Exception as exc:
        slogger.glob.error("cannot create task {}".format(params['task_name']), exc_info=True)
        db_task.delete()
        return HttpResponseBadRequest(str(exc))

    return JsonResponse({'tid': db_task.id})

@login_required
#@permission_required(perm=['engine.task.access'],
#    fn=objectgetter(models.Task, 'tid'), raise_exception=True)
# We have commented lines above because the objectgetter() will raise 404 error in
# cases when a task creating ends with an error. So an user don't get an actual reason of an error.
def check_task(request, tid):
    """Check the status of a task"""
    try:
        slogger.glob.info("check task #{}".format(tid))
        response = task.check(tid)
    except Exception as e:
        slogger.glob.error("cannot check task #{}".format(tid), exc_info=True)
        return HttpResponseBadRequest(str(e))

    return JsonResponse(response)

@login_required
@permission_required(perm=['engine.task.access'],
    fn=objectgetter(models.Task, 'tid'), raise_exception=True)
def get_frame(request, tid, frame):
    """Stream corresponding from for the task"""

    try:
        # Follow symbol links if the frame is a link on a real image otherwise
        # mimetype detection inside sendfile will work incorrectly.
        path = os.path.realpath(task.get_frame_path(tid, frame))
        return sendfile(request, path)
    except Exception as e:
        slogger.task[tid].error("cannot get frame #{}".format(frame), exc_info=True)
        return HttpResponseBadRequest(str(e))

@login_required
@permission_required(perm=['engine.task.delete'],
    fn=objectgetter(models.Task, 'tid'), raise_exception=True)
def delete_task(request, tid):
    """Delete the task"""
    try:
        slogger.glob.info("delete task #{}".format(tid))
        task.delete(tid)
    except Exception as e:
        slogger.glob.error("cannot delete task #{}".format(tid), exc_info=True)
        return HttpResponseBadRequest(str(e))

    return HttpResponse()

@login_required
@permission_required(perm=['engine.task.change'],
    fn=objectgetter(models.Task, 'tid'), raise_exception=True)
def update_task(request, tid):
    """Update labels for the task"""
    try:
        slogger.task[tid].info("update task request")
        labels = request.POST['labels']
        task.update(tid, labels)
    except Exception as e:
        slogger.task[tid].error("cannot update task", exc_info=True)
        return HttpResponseBadRequest(str(e))

    return HttpResponse()

@login_required
@permission_required(perm=['engine.task.access'],
    fn=objectgetter(models.Task, 'tid'), raise_exception=True)
def get_task(request, tid):
    try:
        slogger.task[tid].info("get task request")
        response = task.get(tid)
    except Exception as e:
        slogger.task[tid].error("cannot get task", exc_info=True)
        return HttpResponseBadRequest(str(e))

    return JsonResponse(response, safe=False)

@login_required
@permission_required(perm=['engine.job.access'],
    fn=objectgetter(models.Job, 'jid'), raise_exception=True)
def get_job(request, jid):
    try:
        slogger.job[jid].info("get job #{} request".format(jid))
        response = task.get_job(jid)
    except Exception as e:
        slogger.job[jid].error("cannot get job #{}".format(jid), exc_info=True)
        return HttpResponseBadRequest(str(e))

    return JsonResponse(response, safe=False)

@login_required
@permission_required(perm=['engine.task.access'],
    fn=objectgetter(models.Task, 'tid'), raise_exception=True)
def dump_annotation(request, tid):
    try:
        slogger.task[tid].info("dump annotation request")
        annotation.dump(tid, annotation.FORMAT_XML, request.scheme, request.get_host())
    except Exception as e:
        slogger.task[tid].error("cannot dump annotation", exc_info=True)
        return HttpResponseBadRequest(str(e))

    return HttpResponse()

@login_required
@gzip_page
@permission_required(perm=['engine.task.access'],
    fn=objectgetter(models.Task, 'tid'), raise_exception=True)
def check_annotation(request, tid):
    try:
        slogger.task[tid].info("check annotation")
        response = annotation.check(tid)
    except Exception as e:
        slogger.task[tid].error("cannot check annotation", exc_info=True)
        return HttpResponseBadRequest(str(e))

    return JsonResponse(response)


@login_required
@gzip_page
@permission_required(perm=['engine.task.access'],
    fn=objectgetter(models.Task, 'tid'), raise_exception=True)
def download_annotation(request, tid):
    try:
        slogger.task[tid].info("get dumped annotation")
        db_task = models.Task.objects.get(pk=tid)
        response = sendfile(request, db_task.get_dump_path(), attachment=True,
            attachment_filename='{}_{}.xml'.format(db_task.id, db_task.name))
    except Exception as e:
        slogger.task[tid].error("cannot get dumped annotation", exc_info=True)
        return HttpResponseBadRequest(str(e))

    return response


@login_required
@gzip_page
@permission_required(perm=['engine.job.access'],
    fn=objectgetter(models.Job, 'jid'), raise_exception=True)
def get_annotation(request, jid):
    try:
        slogger.job[jid].info("get annotation for {} job".format(jid))
        response = annotation.get(jid)
    except Exception as e:
        slogger.job[jid].error("cannot get annotation for job {}".format(jid), exc_info=True)
        return HttpResponseBadRequest(str(e))

    return JsonResponse(response, safe=False)

@login_required
@permission_required(perm=['engine.job.change'],
    fn=objectgetter(models.Job, 'jid'), raise_exception=True)
def save_annotation_for_job(request, jid):
    try:
        slogger.job[jid].info("save annotation for {} job".format(jid))
        data = json.loads(request.body.decode('utf-8'))
        if 'annotation' in data:
            annotation.save_job(jid, json.loads(data['annotation']))
        if 'logs' in data:
            for event in json.loads(data['logs']):
                clogger.job[jid].info(json.dumps(event))
    except RequestException as e:
        slogger.job[jid].error("cannot send annotation logs for job {}".format(jid), exc_info=True)
        return HttpResponseBadRequest(str(e))
    except Exception as e:
        slogger.job[jid].error("cannot save annotation for job {}".format(jid), exc_info=True)
        return HttpResponseBadRequest(str(e))

    return HttpResponse()

@login_required
@permission_required(perm=['engine.task.change'],
    fn=objectgetter(models.Task, 'tid'), raise_exception=True)
def save_annotation_for_task(request, tid):
    try:
        slogger.task[tid].info("save annotation request")
        data = json.loads(request.body.decode('utf-8'))
        annotation.save_task(tid, data)
    except Exception as e:
        slogger.task[tid].error("cannot save annotation", exc_info=True)
        return HttpResponseBadRequest(str(e))

    return HttpResponse()

@login_required
@permission_required(perm=['engine.task.change'],
    fn=objectgetter(models.Task, 'tid'), raise_exception=True)
def delete_annotation_for_task(request, tid):
    try:
        slogger.task[tid].info("delete annotation request")
        annotation.clear_task(tid)
    except Exception as e:
        slogger.task[tid].error("cannot delete annotation", exc_info=True)
        return HttpResponseBadRequest(str(e))

    return HttpResponse()


@login_required
@permission_required(perm=['engine.job.change'],
    fn=objectgetter(models.Job, 'jid'), raise_exception=True)
def save_job_status(request, jid):
    try:
        data = json.loads(request.body.decode('utf-8'))
        status = data['status']
        slogger.job[jid].info("changing job status request")
        task.save_job_status(jid, status, request.user.username)
    except Exception as e:
        if jid:
            slogger.job[jid].error("cannot change status", exc_info=True)
        else:
            slogger.glob.error("cannot change status", exc_info=True)
        return HttpResponseBadRequest(str(e))
    return HttpResponse()

@login_required
def get_username(request):
    response = {'username': request.user.username}
    return JsonResponse(response, safe=False)

def rq_handler(job, exc_type, exc_value, tb):
    job.exc_info = "".join(traceback.format_exception_only(exc_type, exc_value))
    job.save()
    module = job.id.split('.')[0]
    if module == 'task':
        return task.rq_handler(job, exc_type, exc_value, tb)
    elif module == 'annotation':
        return annotation.rq_handler(job, exc_type, exc_value, tb)

    return True
