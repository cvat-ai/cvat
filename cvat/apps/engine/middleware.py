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
        response = self.get_response(request)

        if request.user.is_authenticated:
            profile = getattr(request.user, "profile", None)
            if not profile:
                return

            last_activity_date = profile.last_activity_date
            if (
                not last_activity_date
                or (now() - last_activity_date) > settings.USER_LAST_ACTIVITY_UPDATE_MIN_INTERVAL
            ):
                profile.last_activity_date = now()
                profile.save()

        return response
