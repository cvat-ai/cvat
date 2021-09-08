# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.conf import settings
from rest_framework.permissions import BasePermission
import requests

class OpenPolicyAgentPermission(BasePermission):
    # pylint: disable=no-self-use
    def check_permission(self, payload):
        r = requests.post(self.url, json=payload)
        return r.json()["result"]

    def check_object_permission(self, payload):
        r = requests.post(self.url, json=payload)
        return r.json()["result"]

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

        return self.check_permission(payload)

    def has_object_permission(self, request, view, obj):
        payload = {
            "input": {
                "path": request.path.split('/')[3:],
                "method": request.method,
                "user": {
                    "id": request.user.id,
                    "roles": [group.name for group in request.user.groups.all()]
                },
                "resource": {
                    "owner": {
                        "id": getattr(obj, "owner_id")
                    }
                }
            }
        }

        return self.check_object_permission(payload)

class AuthenticationPermission(OpenPolicyAgentPermission):
    url = settings.OPA_DATA_URL + '/auth/allow'

class ServerPermission(OpenPolicyAgentPermission):
    url = settings.OPA_DATA_URL + '/server/allow'

class CommentsPermission(OpenPolicyAgentPermission):
    url = settings.OPA_DATA_URL + '/comments/allow'

class IssuesPermission(OpenPolicyAgentPermission):
    url = settings.OPA_DATA_URL + '/issues/allow'

class LambdaPermission(OpenPolicyAgentPermission):
    url = settings.OPA_DATA_URL + '/lambda/allow'

class OrganizationsPermission(OpenPolicyAgentPermission):
    url = settings.OPA_DATA_URL + '/organizations/allow'

class StoragesPermission(OpenPolicyAgentPermission):
    url = settings.OPA_DATA_URL + '/storages/allow'

class UsersPermission(OpenPolicyAgentPermission):
    url = settings.OPA_DATA_URL + '/users/allow'

class ProjectsPermission(OpenPolicyAgentPermission):
    url = settings.OPA_DATA_URL + '/projects/allow'

class TasksPermission(OpenPolicyAgentPermission):
    url = settings.OPA_DATA_URL + '/tasks/allow'

class JobsPermission(OpenPolicyAgentPermission):
    url = settings.OPA_DATA_URL + '/jobs/allow'
