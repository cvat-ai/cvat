# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

import operator

import requests
from django.conf import settings
from django.db.models import Q
from rest_framework.permissions import BasePermission

from cvat.apps.organizations.models import Membership, Organization


class OpenPolicyAgentPermission(BasePermission):
    # pylint: disable=no-self-use
    def check_permission(self, payload):
        r = requests.post(self.url, json=payload)
        return r.json()["result"]

    def check_object_permission(self, payload):
        r = requests.post(self.url, json=payload)
        return r.json()["result"]

    def _get_context(self, request):
        context = request.auth_context

        org_slug = None
        is_owner = False
        org_role = None
        if context["organization"]:
            org_slug = context["organization"].slug
            is_owner = context["organization"].owner.id == request.user.id
        if context["membership"]:
            org_role = context["membership"].role

        context = {
            "org": {
                "slug": org_slug,
                "is_owner": is_owner,
                "role": org_role,
            },
            "privilege": context["privilege"],
        }

        return context


    def get_payload(self, request, view, obj):
        payload = {
            "input": {
                "path": request.path.split('/')[3:],
                "method": request.method,
                "user": {
                    "id": request.user.id,
                },
                "context": self._get_context(request)
            }
        }

        return payload


    def has_permission(self, request, view):
        payload = self.get_payload(request, view, None)
        return self.check_permission(payload)

    def has_object_permission(self, request, view, obj):
        payload = self.get_payload(request, view, obj)
        return self.check_object_permission(payload)

    def filter(self, request):
        url = self.url.replace('/allow', '/filter')
        payload = self.get_payload(request, None, None)
        r = requests.post(url, json=payload)
        qobjects = []
        ops_dict = {
            '|': operator.or_,
            '&': operator.and_,
            '~': operator.not_,
        }
        for token in r.json()["result"]:
            if token in ops_dict:
                val1 = qobjects.pop()
                if token == '~':
                    qobjects.append(ops_dict[token](val1))
                else:
                    val2 = qobjects.pop()
                    qobjects.append(ops_dict[token](val1, val2))
            else:
                qobjects.append(Q(**token))

        if qobjects:
            assert len(qobjects) == 1
        else:
            qobjects.append(Q())

        return self.model.objects.filter(qobjects[0])

class ServerPermission(OpenPolicyAgentPermission):
    url = settings.OPA_DATA_URL + '/server/allow'

class CommentPermission(OpenPolicyAgentPermission):
    url = settings.OPA_DATA_URL + '/comments/allow'

class IssuePermission(OpenPolicyAgentPermission):
    url = settings.OPA_DATA_URL + '/issues/allow'

class LambdaPermission(OpenPolicyAgentPermission):
    url = settings.OPA_DATA_URL + '/lambda/allow'

class OrganizationPermission(OpenPolicyAgentPermission):
    model = Organization
    url = settings.OPA_DATA_URL + '/organizations/allow'

    def get_payload(self, request, view, obj):
        payload = super().get_payload(request, view, obj)

        # add information about obj (e.g. organization)
        user_id = request.user.id
        payload["organization"] = {}
        payload["organization"]["count"] = Organization.objects.filter(
            owner_id=user_id).count()
        if obj:
            org_payload = payload["organization"]
            org_payload["is_owner"] = obj.owner.id == user_id
            membership = Membership.objects.filter(organization=obj, user=request.user).first()
            org_payload["role"] = membership.role if membership else None

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
