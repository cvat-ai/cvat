# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.conf import settings
from rest_framework.permissions import BasePermission
import requests

class ServerPermission(BasePermission):
    # pylint: disable=no-self-use
    def has_permission(self, request, view):
        payload = {
            "input": {
                "path": request.path.split('/')[3:],
                "method": request.method,
                "user": {
                    "roles": [group.name for group in request.user.groups.all()]
                }
            }
        }
        r = requests.post('http://localhost:8181/v1/data/server/allow',
            json=payload)
        return r.json()["result"]

class LambdaPermission(BaseException):
    # pylint: disable=no-self-use
    def has_permission(self, request, view):
        payload = {
            "input": {
                "path": request.path.split('/')[3:],
                "method": request.method,
                "user": {
                    "roles": [group.name for group in request.user.groups.all()]
                }
            }
        }
        r = requests.post('http://localhost:8181/v1/data/lambda/allow',
            json=payload)
        return r.json()["result"]
