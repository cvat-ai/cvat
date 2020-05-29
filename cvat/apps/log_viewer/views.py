# Copyright (C) 2018-2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os

from revproxy.views import ProxyView
from django.utils.decorators import method_decorator
from django.conf import settings
from rules.contrib.views import PermissionRequiredMixin

from cvat.apps.authentication.decorators import login_required

@method_decorator(login_required, name='dispatch')
class LogViewerProxy(PermissionRequiredMixin, ProxyView):
    permission_required = settings.RESTRICTIONS['analytics_access']

    upstream = 'http://{}:{}'.format(os.getenv('DJANGO_LOG_VIEWER_HOST'),
        os.getenv('DJANGO_LOG_VIEWER_PORT'))
    add_remote_user = True

    def get_request_headers(self):
        headers = super().get_request_headers()
        headers['X-Forwarded-User'] = headers['REMOTE_USER']

        return headers

    # Returns True if the user has any of the specified permissions
    def has_permission(self):
        perms = self.get_permission_required()
        return any(self.request.user.has_perm(perm) for perm in perms)
