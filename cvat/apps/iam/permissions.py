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
        return r.json()['result']

    def get_scope(self, request, view, obj):
        raise NotImplementedError

    def get_payload(self, request, view, obj):
        privilege = request.iam_context['privilege']
        organization = request.iam_context['organization']
        membership = request.iam_context['membership']

        payload = {
            'input': {
                'scope': self.get_scope(request, view, obj),
                'user': {
                    'id': request.user.id,
                    'privilege': privilege.name,
                    'stats': {},
                },
                'organization': {
                    'id': organization.id,
                    'is_owner': organization.owner.id == request.user.id,
                    'role': getattr(membership, 'role', None),
                } if organization else None,
                'resources': {},
            }
        }

        return payload


    def has_permission(self, request, view):
        payload = self.get_payload(request, view, None)
        return view.detail or self.check_permission(payload)

    def has_object_permission(self, request, view, obj):
        payload = self.get_payload(request, view, obj)
        return self.check_permission(payload)

    def filter(self, request, queryset):
        url = self.url.replace('/allow', '/filter')
        payload = self.get_payload(request, None, None)
        r = requests.post(url, json=payload)
        qobjects = []
        ops_dict = {
            '|': operator.or_,
            '&': operator.and_,
            '~': operator.not_,
        }
        for token in r.json()['result']:
            if isinstance(token, str):
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

        return queryset.filter(qobjects[0])

class ServerPermission(OpenPolicyAgentPermission):
    def get_scope(self, request, view, obj):
        return {
            'annotation_formats': 'VIEW',
            'about': 'VIEW',
            'plugins': 'VIEW',
            'exception': 'SEND_EXCEPTION',
            'logs': 'SEND_LOGS',
            'share': 'LIST_CONTENT'
        }[view.action]

    url = settings.IAM_OPA_DATA_URL + '/server/allow'

class CommentPermission(OpenPolicyAgentPermission):
    def get_scope(self, request, view, obj):
        return super().get_scope(request, view, obj)

    url = settings.IAM_OPA_DATA_URL + '/comments/allow'

class IssuePermission(OpenPolicyAgentPermission):
    def get_scope(self, request, view, obj):
        return super().get_scope(request, view, obj)

    url = settings.IAM_OPA_DATA_URL + '/issues/allow'

class LambdaPermission(OpenPolicyAgentPermission):
    def get_scope(self, request, view, obj):
        return {
            ('function', 'list'): 'LIST',
            ('function', 'retrive'): 'VIEW',
            ('function', 'call'): 'CALL_ONLINE',
            ('request', 'create'): 'CALL_OFFLINE',
            ('request', 'list'): 'CALL_OFFLINE',
            ('request', 'retrive'): 'CALL_OFFLINE',
            ('request', 'destroy'): 'CALL_OFFLINE',
        }[(view.basename, view.action)]

    url = settings.IAM_OPA_DATA_URL + '/lambda/allow'

class OrganizationPermission(OpenPolicyAgentPermission):
    def get_scope(self, request, view, obj):
        if getattr(view, 'action', None):
            return {
                'list': 'LIST',
                'create': 'CREATE',
                'destroy': 'DELETE',
                'partial_update': 'UPDATE',
                'retrieve': 'VIEW'
            }[view.action]
        else:
            return None # filter, OPTIONS

    url = settings.IAM_OPA_DATA_URL + '/organizations/allow'

    def get_payload(self, request, view, obj):
        payload = super().get_payload(request, view, obj)

        user_id = request.user.id
        payload['input']['user']['stats'] = {
            'orgs_count': Organization.objects.filter(owner_id=user_id).count()
        }

        if obj:
            # add information about obj (e.g. organization)
            membership = Membership.objects.filter(organization=obj, user=request.user).first()
            payload['input']['resources'] = {
                'organization': {
                    'id': obj.id,
                    'is_owner': obj.owner.id == user_id,
                    'role': membership.role if membership else None,
                }
            }

        return payload


class MembershipPermission(OpenPolicyAgentPermission):
    def get_scope(self, request, view, obj):
        return super().get_scope(request, view, obj)

    url = settings.IAM_OPA_DATA_URL + '/memberships/allow'

class InvitationPermission(OpenPolicyAgentPermission):
    def get_scope(self, request, view, obj):
        return super().get_scope(request, view, obj)

    url = settings.IAM_OPA_DATA_URL + '/invitations/allow'
class CloudStoragePermission(OpenPolicyAgentPermission):
    def get_scope(self, request, view, obj):
        return super().get_scope(request, view, obj)

    url = settings.IAM_OPA_DATA_URL + '/cloudstorages/allow'

class UserPermission(OpenPolicyAgentPermission):
    def get_scope(self, request, view, obj):
        if view.action == 'self':
            return 'VIEW_SELF'

        return super().get_scope(request, view, obj)

    url = settings.IAM_OPA_DATA_URL + '/users/allow'

class ProjectPermission(OpenPolicyAgentPermission):
    def get_scope(self, request, view, obj):
        return super().get_scope(request, view, obj)

    url = settings.IAM_OPA_DATA_URL + '/projects/allow'

class TaskPermission(OpenPolicyAgentPermission):
    def get_scope(self, request, view, obj):
        return {
            'list': 'LIST',
            'destroy': 'DELETE',
        }[view.action]

    url = settings.IAM_OPA_DATA_URL + '/tasks/allow'

class JobPermission(OpenPolicyAgentPermission):
    def get_scope(self, request, view, obj):
        return super().get_scope(request, view, obj)

    url = settings.IAM_OPA_DATA_URL + '/jobs/allow'
