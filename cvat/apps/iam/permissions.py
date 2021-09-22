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

    def _get_roles(self, user):
        roles = []
        if user.is_superuser:
            # FIXME: why superuser doesn't have corrent groups?
            roles.append('admin')
        else:
            roles.extend({group.name for group in user.groups.all()})

        return roles

    def has_permission(self, request, view):
        payload = {
            "input": {
                "path": request.path.split('/')[3:],
                "method": request.method,
                "user": {
                    "roles": self._get_roles(request.user)
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
                    "roles": self._get_roles(request.user)
                },
            }
        }

        if hasattr(obj, "owner_id"):
            payload.update({
                "resource": {
                    "owner": {
                        "id": getattr(obj, "owner_id")
                    }
                }
            })

        return self.check_object_permission(payload)

class ServerPermission(OpenPolicyAgentPermission):
    url = settings.OPA_DATA_URL + '/server/allow'

class CommentPermission(OpenPolicyAgentPermission):
    url = settings.OPA_DATA_URL + '/comments/allow'

class IssuePermission(OpenPolicyAgentPermission):
    url = settings.OPA_DATA_URL + '/issues/allow'

class LambdaPermission(OpenPolicyAgentPermission):
    url = settings.OPA_DATA_URL + '/lambda/allow'

class OrganizationPermission(OpenPolicyAgentPermission):
    url = settings.OPA_DATA_URL + '/organizations/allow'

class MembershipPermission(OpenPolicyAgentPermission):
    url = settings.OPA_DATA_URL + '/memberships/allow'

class InvitationPermission(OpenPolicyAgentPermission):
    url = settings.OPA_DATA_URL + '/invitations/allow'
class CloudStoragePermission(OpenPolicyAgentPermission):
    url = settings.OPA_DATA_URL + '/cloudstorages/allow'

class UserPermission(OpenPolicyAgentPermission):
    url = settings.OPA_DATA_URL + '/users/allow'

class ProjectPermission(OpenPolicyAgentPermission):
    url = settings.OPA_DATA_URL + '/projects/allow'

class TaskPermission(OpenPolicyAgentPermission):
    url = settings.OPA_DATA_URL + '/tasks/allow'

class JobPermission(OpenPolicyAgentPermission):
    url = settings.OPA_DATA_URL + '/jobs/allow'
