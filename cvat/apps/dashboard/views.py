
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.http import HttpResponse, JsonResponse, HttpResponseBadRequest
from django.shortcuts import redirect
from django.shortcuts import render
from django.conf import settings
from django.contrib.auth.decorators import permission_required
from cvat.apps.authentication.decorators import login_required

from cvat.apps.engine.models import Task as TaskModel, Job as JobModel
from cvat.settings.base import JS_3RDPARTY

import os

def ScanNode(directory):
    if '..' in directory.split(os.path.sep):
        return HttpResponseBadRequest('Permission Denied')

    act_dir = os.path.normpath(settings.SHARE_ROOT + directory)
    result = []

    nodes = os.listdir(act_dir)
    files = filter(os.path.isfile, map(lambda f: os.path.join(act_dir, f), nodes))
    dirs = filter(os.path.isdir, map(lambda d: os.path.join(act_dir, d), nodes))

    for d in dirs:
        name = os.path.basename(d)
        children = len(os.listdir(d)) > 0
        node = {'id': directory + name + '/', 'text': name, 'children': children}
        result.append(node)

    for f in files:
        name = os.path.basename(f)
        node = {'id': directory + name, 'text': name, "icon" : "jstree-file"}
        result.append(node)

    return result

@login_required
@permission_required('engine.add_task', raise_exception=True)
def JsTreeView(request):
    node_id = None
    if 'id' in request.GET:
        node_id = request.GET['id']

    if node_id is None or node_id == '#':
        node_id = '/'
        response = [{"id": node_id, "text": node_id, "children": ScanNode(node_id)}]
    else:
        response = ScanNode(node_id)

    return JsonResponse(response, safe=False,
        json_dumps_params=dict(ensure_ascii=False))


@login_required
@permission_required('engine.view_task', raise_exception=True)
def DashboardView(request):
    query_name = request.GET['search'] if 'search' in request.GET else None
    query_job = int(request.GET['jid']) if 'jid' in request.GET and request.GET['jid'].isdigit() else None
    task_list = None

    if query_job is not None and JobModel.objects.filter(pk = query_job).exists():
        task_list = [JobModel.objects.select_related('segment__task').get(pk = query_job).segment.task]
    else:
        task_list = list(TaskModel.objects.prefetch_related('segment_set__job_set').order_by('-created_date').all())
        if query_name is not None:
            task_list = list(filter(lambda x: query_name.lower() in x.name.lower(), task_list))

    return render(request, 'dashboard/dashboard.html', {
        'data': task_list,
        'max_upload_size': settings.LOCAL_LOAD_MAX_FILES_SIZE,
        'max_upload_count': settings.LOCAL_LOAD_MAX_FILES_COUNT,
        'base_url': "{0}://{1}/".format(request.scheme, request.get_host()),
        'share_path': os.getenv('CVAT_SHARE_URL', default=r'${cvat_root}/share'),
        'js_3rdparty': JS_3RDPARTY.get('dashboard', []),
    })
