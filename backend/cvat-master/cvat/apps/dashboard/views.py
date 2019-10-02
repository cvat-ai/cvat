
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.http import HttpResponse, JsonResponse, HttpResponseBadRequest
from django.shortcuts import redirect
from django.shortcuts import render
from django.conf import settings
from cvat.apps.authentication.decorators import login_required

from cvat.settings.base import JS_3RDPARTY, CSS_3RDPARTY

import os

@login_required
def DashboardView(request):
    return render(request, 'dashboard/dashboard.html', {
        'js_3rdparty': JS_3RDPARTY.get('dashboard', []),
        'css_3rdparty': CSS_3RDPARTY.get('dashboard', []),
    })

@login_required
def DashboardMeta(request):
    return JsonResponse({
        'max_upload_size': settings.LOCAL_LOAD_MAX_FILES_SIZE,
        'max_upload_count': settings.LOCAL_LOAD_MAX_FILES_COUNT,
        'base_url': "{0}://{1}/".format(request.scheme, request.get_host()),
        'share_path': os.getenv('CVAT_SHARE_URL', default=r'${cvat_root}/share'),
    })