# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from uuid import uuid4

class RequestTrackingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    @staticmethod
    def _generate_id():
        return str(uuid4())

    def __call__(self, request):
        request.uuid = self._generate_id()
        response = self.get_response(request)
        response.headers['X-Request-Id'] = request.uuid

        return response
