# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.http import HttpRequest
from rest_framework.request import Request

from cvat.apps.engine.middleware import WithUUID
from cvat.apps.iam.middleware import WithIAMContext


class ExtendedRequest(HttpRequest, Request, WithUUID, WithIAMContext):
    pass
