# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.http import HttpRequest
from rest_framework.request import Request as RestFrameworkRequest

from cvat.apps.engine.middleware import WithUUID
from cvat.apps.iam.middleware import WithIAMContext


class Request(HttpRequest, RestFrameworkRequest, WithUUID, WithIAMContext):
    pass
