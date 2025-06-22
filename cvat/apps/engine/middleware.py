# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from typing import Protocol
from uuid import uuid4

from django.conf import settings
from django.utils.timezone import now


class WithUUID(Protocol):
    uuid: str


class RequestTrackingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    @staticmethod
    def _generate_id():
        return str(uuid4())

    def __call__(self, request):
        request.uuid = self._generate_id()
        response = self.get_response(request)
        response.headers["X-Request-Id"] = request.uuid

        return response


class LastActivityMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated:
            user = request.user
            last_activity = user.profile.last_activity
            if (
                not last_activity
                or (now() - last_activity) > settings.USER_LAST_ACTIVITY_UPDATE_MIN_INTERVAL
            ):
                user.profile.last_activity = now()
                user.profile.save()

        response = self.get_response(request)
        return response
