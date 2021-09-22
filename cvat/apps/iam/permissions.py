# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

from cvat.apps.organizations.models import Organization
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

    def get_payload(self, request, view, obj):
        payload = {
            "input": {
                "path": request.path.split('/')[3:],
                "method": request.method,
                "user": {
                    "id": request.user.id,
                    "privilege": request.user.privilege,
                }
            }
        }

        return payload


    def has_permission(self, request, view):
        payload = self.get_payload(request, view, None)
        return self.check_permission(payload)

    def has_object_permission(self, request, view, obj):
        payload = self.get_payload(request, view, obj)
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
    def get_payload(self, request, view, obj):
        payload = super().get_payload(request, view, obj)
        user_id = request.user.id
        payload["user"]["own_orgs_count"] = Organization.objects.filter(
            owner_id=user_id).count()
        if obj:
            org_payload = payload["user"]["organization"]
            org_payload["is_owner"] = obj.owner.id == user_id
            member = [member for member in obj.members if member.user_id == user_id]
            assert len(member) <= 1
            org_payload["role"] = member[0].role if member else None

        return payload

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
