
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.http import HttpResponse, HttpResponseBadRequest
from django.contrib.auth.decorators import permission_required
from .proxy_logger import client_log_proxy
from cvat.apps.authentication.decorators import login_required


import json

# Create your views here.
@login_required()
@permission_required('engine.view_task', raise_exception=True)
def exception_receiver(request, jid):
    data = json.loads(request.body.decode('utf-8'))
    try:
        if 'exceptions' in data:
            client_log_proxy.push_logs(jid, data['exceptions'])
    except Exception as e:
        return HttpResponseBadRequest(str(e))

    return HttpResponse()
