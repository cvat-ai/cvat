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
                return response

            last_activity_date = profile.last_activity_date
            if (
                not last_activity_date
                or (now() - last_activity_date) > settings.USER_LAST_ACTIVITY_UPDATE_MIN_INTERVAL
            ):
                # such way we avoid failing and any db updates if the Profile was removed during the request
                from cvat.apps.engine.models import Profile

                Profile.objects.filter(user_id=request.user.id).update(last_activity_date=now())

        return response
