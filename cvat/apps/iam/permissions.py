# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

import operator

import requests
from django.conf import settings
from django.db.models import Q
from rest_framework.permissions import BasePermission

from cvat.apps.organizations.models import Membership, Organization

class OpenPolicyAgentPermission:
    def __init__(self, request, view, obj):
        self.request = request
        self.view = view
        self.obj = obj

        privilege = self.request.iam_context['privilege']
        organization = self.request.iam_context['organization']
        membership = self.request.iam_context['membership']
        user = self.request.user

        self.payload = {
            'input': {
                'auth': {
                    'user': {
                        'id': user.id,
                        'privilege': getattr(privilege, 'name', None),
                    },
                    'organization': {
                        'id': organization.id,
                        'owner': {
                            'id': organization.owner.id,
                        },
                        'user': {
                            'role': getattr(membership, 'role', None)
                        },
                    } if organization else None
                }
            }
        }

    def __bool__(self):
        r = requests.post(self.url, json=self.payload)
        return r.json()['result']

    def filter(self, queryset):
        if self.view.action == 'list':
            url = self.url.replace('/allow', '/filter')
            r = requests.post(url, json=self.payload)
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
        else:
            return queryset

class OrganizationPermission(OpenPolicyAgentPermission):
    @classmethod
    def create(cls, request, view, obj):
        permissions = []
        if view.basename == 'organization':
            self = cls(request, view, obj)
            permissions.append(self)

        return permissions

    def __init__(self, request, view, obj):
        super().__init__(request, view, obj)
        self.url = settings.IAM_OPA_DATA_URL + '/organizations/allow'
        self.payload['input']['scope'] = self.scope
        self.payload['input']['resource'] = self.resource

    @property
    def scope(self):
        return {
            'list': 'list',
            'create': 'create',
            'destroy': 'delete',
            'partial_update': 'update',
            'retrieve': 'view'
        }.get(self.view.action, None)

    @property
    def resource(self):
        user = self.request.user
        if self.obj:
            membership = Membership.objects.filter(organization=self.obj, user=user).first()
            return {
                'id': self.obj.id,
                'owner': {
                    'id': self.obj.owner.id
                },
                'user': {
                    'role': membership.role if membership else None
                }
            }
        elif self.view.action == 'create':
            return {
                'id': None,
                'owner': {
                    'id': user.id
                },
                'user': {
                    'num_resources': Organization.objects.filter(
                        owner_id=user.id).count(),
                    'role': 'owner'
                }
            }
        else:
            return None

class InvitationPermission(OpenPolicyAgentPermission):
    @classmethod
    def create(cls, request, view, obj):
        permissions = []
        if view.basename == 'invitation':
            self = cls(request, view, obj)
            permissions.append(self)

        return permissions

    def __init__(self, request, view, obj):
        super().__init__(request, view, obj)
        self.url = settings.IAM_OPA_DATA_URL + '/invitations/allow'
        self.payload['input']['scope'] = self.scope
        self.payload['input']['resource'] = self.resource

    @property
    def scope(self):
        return {
            ('list', False): 'list',
            ('create', False): 'create',
            ('destroy', False): 'delete',
            ('partial_update', False): 'resend',
            ('partial_update', True): 'accept',
            ('retrieve', False): 'view'
        }.get((self.view.action, 'accepted' in self.request.data))


    @property
    def resource(self):
        data = None
        if self.obj:
            data = {
                'owner': { 'id': self.obj.owner.id },
                'invitee': { 'id': self.obj.membership.user.id },
                'role': self.obj.membership.role,
                'organization': {
                    'id': self.obj.membership.organization.id
                }
            }
        elif self.view.action == 'create':
            data = {
                'owner': { 'id': self.request.user.id },
                'invitee': {
                    'id': self.request.data.get('user')
                },
                'role': self.request.data.get('role'),
                'organization': {
                    'id': self.request.data.get('organization')
                }
            }

        return data

class MembershipPermission(OpenPolicyAgentPermission):
    @classmethod
    def create(cls, request, view, obj):
        permissions = []
        if view.basename == 'membership':
            self = cls(request, view, obj)
            permissions.append(self)

        return permissions

    def __init__(self, request, view, obj):
        super().__init__(request, view, obj)
        self.url = settings.IAM_OPA_DATA_URL + '/memberships/allow'
        self.payload['input']['scope'] = self.scope
        if obj:
            self.payload['input']['resource'] = self.resource

    @property
    def scope(self):
        return {
            'list': 'list',
            'partial_update': 'change:role',
            'retrieve': 'view',
            'destroy': 'delete'
        }.get(self.view.action, None)

    @property
    def resource(self):
        return {
            'role': self.obj.role,
            'is_active': self.obj.is_active,
            'user': {
                'id': self.obj.user.id
            }
        }

class ServerPermission(OpenPolicyAgentPermission):
    @classmethod
    def create(cls, request, view, obj):
        permissions = []
        if view.basename == 'server':
            self = cls(request, view, obj)
            permissions.append(self)

        return permissions

    def __init__(self, request, view, obj):
        super().__init__(request, view, obj)
        self.url = settings.IAM_OPA_DATA_URL + '/server/allow'
        self.payload['input']['scope'] = self.scope

    @property
    def scope(self):
        return {
            'annotation_formats': 'view',
            'about': 'view',
            'plugins': 'view',
            'exception': 'send:exception',
            'logs': 'send:logs',
            'share': 'list:content'
        }.get(self.view.action, None)

class UserPermission(OpenPolicyAgentPermission):
    @classmethod
    def create(cls, request, view, obj):
        permissions = []
        if view.basename == 'user':
            self = cls(request, view, obj)
            permissions.append(self)

        return permissions

    def __init__(self, request, view, obj):
        super().__init__(request, view, obj)
        self.url = settings.IAM_OPA_DATA_URL + '/users/allow'
        self.payload['input']['scope'] = self.scope
        if obj:
            self.payload['input']['resource'] = {
                'id': obj.id
            }

    @property
    def scope(self):
        return {
            'list': 'list',
            'self': 'view:self',
            'retrieve': 'view',
            'partial_update': 'update',
            'destroy': 'delete'
        }.get(self.view.action, None)

class LambdaPermission(OpenPolicyAgentPermission):
    @classmethod
    def create(cls, request, view, obj):
        permissions = []
        if view.basename == 'function' or view.basename == 'request':
            self = cls(request, view, obj)
            permissions.append(self)

        return permissions

    def __init__(self, request, view, obj):
        super().__init__(request, view, obj)
        self.url = settings.IAM_OPA_DATA_URL + '/lambda/allow'
        self.payload['input']['scope'] = self.scope

    @property
    def scope(self):
        return {
            ('function', 'list'): 'list',
            ('function', 'retrieve'): 'view',
            ('function', 'call'): 'call:online',
            ('request', 'create'): 'call:offline',
            ('request', 'list'): 'call:offline',
            ('request', 'retrieve'): 'call:offline',
            ('request', 'destroy'): 'call:offline',
        }.get((self.view.basename, self.view.action), None)

class CloudStoragePermission(OpenPolicyAgentPermission):
    @classmethod
    def create(cls, request, view, obj):
        permissions = []
        if view.basename == 'cloudstorage':
            self = cls(request, view, obj)
            permissions.append(self)

        return permissions

    def __init__(self, request, view, obj):
        super().__init__(request, view, obj)
        self.url = settings.IAM_OPA_DATA_URL + '/cloudstorages/allow'
        self.payload['input']['scope'] = self.scope
        self.payload['input']['resource'] = self.resource

    @property
    def scope(self):
        return {
            'list': 'list',
            'create': 'create',
            'retrieve': 'view',
            'partial_update': 'update',
            'destroy': 'delete',
            'content': 'list:content'
        }.get(self.view.action, None)

    @property
    def resource(self):
        data = None
        if self.obj:
            data = {
                'owner': { 'id': self.obj.owner.id },
                'organization': {
                    'id': self.obj.organization.id
                } if self.obj.organization else None
            }

        return data



class ProjectPermission(OpenPolicyAgentPermission):
    @classmethod
    def create(cls, request, view, obj):
        return []

    def __init__(self, request, view, obj):
        super().__init__(request, view, obj)

    def get_scope(self, request, view, obj):
        return super().get_scope(request, view, obj)

    url = settings.IAM_OPA_DATA_URL + '/projects/allow'

class TaskPermission(OpenPolicyAgentPermission):
    @classmethod
    def create(cls, request, view, obj):
        return []

    def __init__(self, request, view, obj):
        super().__init__(request, view, obj)

    def get_scope(self, request, view, obj):
        return {
            'list': 'list',
            'destroy': 'delete',
        }[view.action]

    url = settings.IAM_OPA_DATA_URL + '/tasks/allow'

class JobPermission(OpenPolicyAgentPermission):
    @classmethod
    def create(cls, request, view, obj):
        # TODO: check jobs and tasks from lambda calls
        return []

    def __init__(self, request, view, obj):
        super().__init__(request, view, obj)

    def get_scope(self, request, view, obj):
        return super().get_scope(request, view, obj)

    url = settings.IAM_OPA_DATA_URL + '/jobs/allow'


class CommentPermission(OpenPolicyAgentPermission):
    @classmethod
    def create(cls, request, view, obj):
        return []

    def __init__(self, request, view, obj):
        super().__init__(request, view, obj)

    def get_scope(self, request, view, obj):
        return super().get_scope(request, view, obj)

    url = settings.IAM_OPA_DATA_URL + '/comments/allow'

class IssuePermission(OpenPolicyAgentPermission):
    @classmethod
    def create(cls, request, view, obj):
        return []

    def __init__(self, request, view, obj):
        super().__init__(request, view, obj)

    def get_scope(self, request, view, obj):
        return super().get_scope(request, view, obj)

    url = settings.IAM_OPA_DATA_URL + '/issues/allow'


class PolicyEnforcer(BasePermission):
    # pylint: disable=no-self-use
    def check_permission(self, request, view, obj):
        permissions = []
        for perm in OpenPolicyAgentPermission.__subclasses__():
            permissions.extend(perm.create(request, view, obj))

        return all(permissions)

    def has_permission(self, request, view):
        if not view.detail:
            return self.check_permission(request, view, None)
        else:
            return True # has_object_permision will be called later

    def has_object_permission(self, request, view, obj):
        return self.check_permission(request, view, obj)


