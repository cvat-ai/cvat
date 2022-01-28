# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

from collections import namedtuple
import operator
from rest_framework.exceptions import ValidationError

import requests
from django.conf import settings
from django.db.models import Q
from rest_framework.permissions import BasePermission

from cvat.apps.organizations.models import Membership, Organization
from cvat.apps.engine.models import Project, Task, Job, Issue

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
                            'id': getattr(organization.owner, 'id', None),
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
        url = self.url.replace('/allow', '/filter')
        r = requests.post(url, json=self.payload)
        qobjects = []
        ops_dict = {
            '|': operator.or_,
            '&': operator.and_,
            '~': operator.not_,
        }
        for item in r.json()['result']:
            if isinstance(item, str):
                val1 = qobjects.pop()
                if item == '~':
                    qobjects.append(ops_dict[item](val1))
                else:
                    val2 = qobjects.pop()
                    qobjects.append(ops_dict[item](val1, val2))
            else:
                qobjects.append(Q(**item))

        if qobjects:
            assert len(qobjects) == 1
        else:
            qobjects.append(Q())

        # By default, a QuerySet will not eliminate duplicate rows. If your
        # query spans multiple tables (e.g. members__user_id, owner_id), it’s
        # possible to get duplicate results when a QuerySet is evaluated.
        # That’s when you’d use distinct().
        return queryset.filter(qobjects[0]).distinct()

class OrganizationPermission(OpenPolicyAgentPermission):
    @classmethod
    def create(cls, request, view, obj):
        permissions = []
        if view.basename == 'organization':
            self = cls(request, view, obj)
            permissions.append(self)

        return permissions

    def __init__(self, request, view, obj=None):
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
                    'id': getattr(self.obj.owner, 'id', None)
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

    def __init__(self, request, view, obj=None):
        super().__init__(request, view, obj)
        self.url = settings.IAM_OPA_DATA_URL + '/invitations/allow'
        self.payload['input']['scope'] = self.scope
        self.payload['input']['resource'] = self.resource

    @property
    def scope(self):
        return {
            'list': 'list',
            'create': 'create',
            'destroy': 'delete',
            'partial_update': 'accept' if 'accepted' in
                self.request.query_params else 'resend',
            'retrieve': 'view'
        }.get(self.view.action)

    @property
    def resource(self):
        data = None
        if self.obj:
            data = {
                'owner': { 'id': getattr(self.obj.owner, 'id', None) },
                'invitee': { 'id': getattr(self.obj.membership.user, 'id', None) },
                'role': self.obj.membership.role,
                'organization': {
                    'id': self.obj.membership.organization.id
                }
            }
        elif self.view.action == 'create':
            organization = self.request.iam_context['organization']
            data = {
                'owner': { 'id': self.request.user.id },
                'invitee': {
                    'id': None # unknown yet
                },
                'role': self.request.data.get('role'),
                'organization': {
                    'id': organization.id
                } if organization else None
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

    def __init__(self, request, view, obj=None):
        super().__init__(request, view, obj)
        self.url = settings.IAM_OPA_DATA_URL + '/memberships/allow'
        self.payload['input']['scope'] = self.scope
        self.payload['input']['resource'] = self.resource

    @property
    def scope(self):
        return {
            'list': 'list',
            'partial_update': 'change:role',
            'retrieve': 'view',
            'destroy': 'delete'
        }.get(self.view.action)

    @property
    def resource(self):
        if self.obj:
            return {
                'role': self.obj.role,
                'is_active': self.obj.is_active,
                'user': { 'id': self.obj.user.id },
                'organization': { 'id': self.obj.organization.id }
            }
        else:
            return None

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

class LogViewerPermission(OpenPolicyAgentPermission):
    @classmethod
    def create(cls, request, view, obj):
        permissions = []
        if view.basename == 'analytics':
            self = cls(request, view, obj)
            permissions.append(self)

        return permissions

    def __init__(self, request, view, obj):
        super().__init__(request, view, obj)
        self.url = settings.IAM_OPA_DATA_URL + '/analytics/allow'
        self.payload['input']['scope'] = self.scope
        self.payload['input']['resource'] = self.resource

    @property
    def scope(self):
        return {
            'list': 'view',
        }.get(self.view.action, None)

    @property
    def resource(self):
        return {
            'visibility': 'public' if settings.RESTRICTIONS['analytics_visibility'] else 'private',
        }

class UserPermission(OpenPolicyAgentPermission):
    @classmethod
    def create(cls, request, view, obj):
        permissions = []
        if view.basename == 'user':
            self = cls(request, view, obj)
            permissions.append(self)

        return permissions

    @classmethod
    def create_view(cls, user_id, request):
        obj = namedtuple('User', ['id'])(id=int(user_id))
        view = namedtuple('View', ['action'])(action='retrieve')
        return cls(request, view, obj)

    def __init__(self, request, view, obj=None):
        super().__init__(request, view, obj)
        self.url = settings.IAM_OPA_DATA_URL + '/users/allow'
        self.payload['input']['scope'] = self.scope
        self.payload['input']['resource'] = self.resource

    @property
    def scope(self):
        return {
            'list': 'list',
            'self': 'view',
            'retrieve': 'view',
            'partial_update': 'update',
            'destroy': 'delete'
        }.get(self.view.action)

    @property
    def resource(self):
        data = None
        organization = self.payload['input']['auth']['organization']
        if self.obj:
            data = {
                'id': self.obj.id
            }
        elif self.view.action == 'self':
            data = {
                'id': self.request.user.id
            }

        if data:
            data.update({
                'membership': {
                    'role': organization['user']['role']
                        if organization else None
                }
            })

        return data

class LambdaPermission(OpenPolicyAgentPermission):
    @classmethod
    def create(cls, request, view, obj):
        permissions = []
        if view.basename == 'function' or view.basename == 'request':
            self = cls(request, view, obj)
            permissions.append(self)

            task_id = request.data.get('task')
            if task_id:
                perm = TaskPermission.create_view_data(request, task_id)
                permissions.append(perm)

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

    def __init__(self, request, view, obj=None):
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
            'content': 'list:content',
            'preview': 'view',
            'status': 'view'
        }.get(self.view.action)

    @property
    def resource(self):
        data = None
        if self.view.action == 'create':
            user_id = self.request.user.id
            organization = self.request.iam_context['organization']
            data = {
                'owner': { 'id': user_id },
                'organization': {
                    'id': organization.id
                } if organization else None,
                'user': {
                    'num_resources': Organization.objects.filter(
                        owner=user_id).count()
                }
            }
        elif self.obj:
            data = {
                'id': self.obj.id,
                'owner': { 'id': getattr(self.obj.owner, 'id', None) },
                'organization': {
                    'id': self.obj.organization.id
                } if self.obj.organization else None
            }

        return data

class ProjectPermission(OpenPolicyAgentPermission):
    @classmethod
    def create(cls, request, view, obj):
        permissions = []
        if view.basename == 'project':
            for scope in cls.get_scopes(request, view, obj):
                self = cls(scope, request, view, obj)
                permissions.append(self)

            if view.action == 'tasks':
                perm = TaskPermission.create_list(request)
                permissions.append(perm)

            owner = request.data.get('owner_id') or request.data.get('owner')
            if owner:
                perm = UserPermission.create_view(owner, request)
                permissions.append(perm)

            assignee = request.data.get('assignee_id') or request.data.get('assignee')
            if assignee:
                perm = UserPermission.create_view(assignee, request)
                permissions.append(perm)

        return permissions

    @classmethod
    def create_view(cls, request, project_id):
        try:
            obj = Project.objects.get(id=project_id)
        except Project.DoesNotExist as ex:
            raise ValidationError(str(ex))
        view = namedtuple('View', ['action'])(action='retrieve')
        return cls('view', request, view, obj)


    def __init__(self, scope, request, view, obj=None):
        super().__init__(request, view, obj)
        self.url = settings.IAM_OPA_DATA_URL + '/projects/allow'
        self.payload['input']['scope'] = scope
        self.payload['input']['resource'] = self.resource

    @staticmethod
    def get_scopes(request, view, obj):
        scope = {
            ('list', 'GET'): 'list',
            ('create', 'POST'): 'create',
            ('destroy', 'DELETE'): 'delete',
            ('partial_update', 'PATCH'): 'update',
            ('retrieve', 'GET'): 'view',
            ('tasks', 'GET'): 'view',
            ('dataset', 'POST'): 'import:dataset',
            ('annotations', 'GET'): 'export:annotations',
            ('dataset', 'GET'): 'export:dataset',
            ('export_backup', 'GET'): 'export:backup',
            ('import_backup', 'POST'): 'import:backup',
        }.get((view.action, request.method))

        scopes = []
        if scope == 'update':
            if any(k in request.data for k in ('owner_id', 'owner')):
                owner_id = request.data.get('owner_id') or request.data.get('owner')
                if owner_id != getattr(obj.owner, 'id', None):
                    scopes.append(scope + ':owner')
            if any(k in request.data for k in ('assignee_id', 'assignee')):
                assignee_id = request.data.get('assignee_id') or request.data.get('assignee')
                if assignee_id != getattr(obj.assignee, 'id', None):
                    scopes.append(scope + ':assignee')
            for field in ('name', 'labels', 'bug_tracker'):
                if field in request.data:
                    scopes.append(scope + ':desc')
                    break
        else:
            scopes.append(scope)

        return scopes

    @property
    def resource(self):
        data = None
        if self.obj:
            data = {
                "id": self.obj.id,
                "owner": { "id": getattr(self.obj.owner, 'id', None) },
                "assignee": { "id": getattr(self.obj.assignee, 'id', None) },
                'organization': {
                    "id": getattr(self.obj.organization, 'id', None)
                }
            }
        elif self.view.action in ['create', 'import_backup']:
            organization = self.request.iam_context['organization']
            data = {
                "id": None,
                "owner": { "id": self.request.user.id },
                "assignee": {
                    "id": self.request.data.get('assignee_id')
                },
                'organization': {
                    "id": organization.id if organization else None
                },
                "user": {
                    "num_resources": Project.objects.filter(
                        owner_id=self.request.user.id).count()
                }
            }

        return data

class TaskPermission(OpenPolicyAgentPermission):
    @classmethod
    def create(cls, request, view, obj):
        permissions = []
        if view.basename == 'task':
            for scope in cls.get_scopes(request, view, obj):
                self = cls(scope, request, view, obj)
                permissions.append(self)

            if view.action == 'jobs':
                perm = JobPermission.create_list(request)
                permissions.append(perm)

            owner = request.data.get('owner_id') or request.data.get('owner')
            if owner:
                perm = UserPermission.create_view(owner, request)
                permissions.append(perm)

            assignee = request.data.get('assignee_id') or request.data.get('assignee')
            if assignee:
                perm = UserPermission.create_view(assignee, request)
                permissions.append(perm)

            project_id = request.data.get('project_id') or request.data.get('project')
            if project_id:
                perm = ProjectPermission.create_view(request, project_id)
                permissions.append(perm)

        return permissions


    @classmethod
    def create_list(cls, request):
        view = namedtuple('View', ['action'])(action='list')
        return cls('list', request, view)

    @classmethod
    def create_view_data(cls, request, task_id):
        try:
            obj = Task.objects.get(id=task_id)
        except Task.DoesNotExist as ex:
            raise ValidationError(str(ex))
        view = namedtuple('View', ['action'])(action='data')
        return cls('view:data', request, view, obj)

    def __init__(self, scope, request, view, obj=None):
        super().__init__(request, view, obj)
        self.url = settings.IAM_OPA_DATA_URL + '/tasks/allow'
        self.payload['input']['scope'] = scope
        self.payload['input']['resource'] = self.resource

    @property
    def resource(self):
        data = None
        if self.obj:
            data = {
                "id": self.obj.id,
                "owner": { "id": getattr(self.obj.owner, 'id', None) },
                "assignee": { "id": getattr(self.obj.assignee, 'id', None) },
                'organization': {
                    "id": getattr(self.obj.organization, 'id', None)
                },
                "project": {
                    "owner": { "id": getattr(self.obj.project.owner, 'id', None) },
                    "assignee": { "id": getattr(self.obj.project.assignee, 'id', None) },
                    'organization': {
                        "id": getattr(self.obj.project.organization, 'id', None)
                    },
                } if self.obj.project else None
            }
        elif self.view.action in ['create', 'import_backup']:
            organization = self.request.iam_context['organization']
            project_id = self.request.data.get('project_id') or self.request.data.get('project')
            project = None
            if project_id:
                try:
                    project = Project.objects.get(id=project_id)
                except Project.DoesNotExist as ex:
                    raise ValidationError(str(ex))

            data = {
                "id": None,
                "owner": { "id": self.request.user.id },
                "assignee": {
                    "id": self.request.data.get('assignee_id') or
                        self.request.data.get('assignee')
                },
                'organization': {
                    "id": organization.id if organization else None
                },
                "project": {
                    "owner": { "id": getattr(project.owner, 'id', None) },
                    "assignee": { "id": getattr(project.assignee, 'id', None) },
                    'organization': {
                        "id": getattr(project.organization, 'id', None)
                    },
                } if project else None,
                "user": {
                    "num_resources": Project.objects.filter(
                        owner_id=self.request.user.id).count()
                }
            }

        return data

    @classmethod
    def get_scopes(cls, request, view, obj):
        scope = {
            ('list', 'GET'): 'list',
            ('create', 'POST'): 'create',
            ('retrieve', 'GET'): 'view',
            ('status', 'GET'): 'view',
            ('partial_update', 'PATCH'): 'update',
            ('update', 'PUT'): 'update',
            ('destroy', 'DELETE'): 'delete',
            ('annotations', 'GET'): 'view:annotations',
            ('annotations', 'PATCH'): 'update:annotations',
            ('annotations', 'DELETE'): 'delete:annotations',
            ('annotations', 'PUT'): 'update:annotations',
            ('dataset_export', 'GET'): 'export:dataset',
            ('data', 'GET'): 'view:data',
            ('data_info', 'GET'): 'view:data',
            ('data', 'POST'): 'upload:data',
            ('append_tus_chunk', 'PATCH'): 'upload:data',
            ('append_tus_chunk', 'HEAD'): 'upload:data',
            ('jobs', 'GET'): 'view',
            ('import_backup', 'POST'): 'import:backup',
            ('export_backup', 'GET'): 'export:backup',
        }.get((view.action, request.method))

        scopes = []
        if scope == 'create':
            project_id = request.data.get('project_id') or request.data.get('project')
            if project_id:
                scope = scope + '@project'

            scopes.append(scope)
        elif scope == 'update':
            if any(k in request.data for k in ('owner_id', 'owner')):
                owner_id = request.data.get('owner_id') or request.data.get('owner')
                if owner_id != getattr(obj.owner, 'id', None):
                    scopes.append(scope + ':owner')
            if any(k in request.data for k in ('assignee_id', 'assignee')):
                assignee_id = request.data.get('assignee_id') or request.data.get('assignee')
                if assignee_id != getattr(obj.assignee, 'id', None):
                    scopes.append(scope + ':assignee')
            if any(k in request.data for k in ('project_id', 'project')):
                project_id = request.data.get('project_id') or request.data.get('project')
                if project_id != getattr(obj.project, 'id', None):
                    scopes.append(scope + ':project')

            if any(k in request.data for k in ('name', 'labels', 'bug_tracker', 'subset')):
                scopes.append(scope + ':desc')
        elif scope == 'view:annotations':
            if 'format' in request.query_params:
                scope = 'export:annotations'

            scopes.append(scope)
        elif scope == 'update:annotations':
            if 'format' in request.query_params and request.method == 'PUT':
                scope = 'import:annotations'

            scopes.append(scope)
        else:
            scopes.append(scope)

        return scopes

class JobPermission(OpenPolicyAgentPermission):
    @classmethod
    def create(cls, request, view, obj):
        permissions = []
        if view.basename == 'job':
            for scope in cls.get_scopes(request, view, obj):
                self = cls(scope, request, view, obj)
                permissions.append(self)

            if view.action == 'issues':
                perm = IssuePermission.create_list(request)
                permissions.append(perm)

            assignee = request.data.get('assignee')
            if assignee:
                perm = UserPermission.create_view(assignee, request)
                permissions.append(perm)

        return permissions

    @classmethod
    def create_list(cls, request):
        view = namedtuple('View', ['action'])(action='list')
        return cls('list', request, view)


    def __init__(self, scope, request, view, obj=None):
        super().__init__(request, view, obj)
        self.url = settings.IAM_OPA_DATA_URL + '/jobs/allow'
        self.payload['input']['scope'] = scope
        self.payload['input']['resource'] = self.resource


    @property
    def resource(self):
        data = None
        if self.obj:
            if self.obj.segment.task.project:
                organization = self.obj.segment.task.project.organization
            else:
                organization = self.obj.segment.task.organization

            data = {
                "id": self.obj.id,
                "assignee": { "id": getattr(self.obj.assignee, 'id', None) },
                'organization': {
                    "id": getattr(organization, 'id', None)
                },
                "task": {
                    "owner": { "id": getattr(self.obj.segment.task.owner, 'id', None) },
                    "assignee": { "id": getattr(self.obj.segment.task.assignee, 'id', None) }
                },
                "project": {
                    "owner": { "id": getattr(self.obj.segment.task.project.owner, 'id', None) },
                    "assignee": { "id": getattr(self.obj.segment.task.project.assignee, 'id', None) }
                } if self.obj.segment.task.project else None
            }

        return data

    @classmethod
    def get_scopes(cls, request, view, obj):
        scope = {
            ('list', 'GET'): 'list', # TODO: need to add the method
            ('retrieve', 'GET'): 'view',
            ('partial_update', 'PATCH'): 'update',
            ('update', 'PUT'): 'update', # TODO: do we need the method?
            ('destroy', 'DELETE'): 'delete',
            ('annotations', 'GET'): 'view:annotations',
            ('annotations', 'PATCH'): 'update:annotations',
            ('annotations', 'DELETE'): 'delete:annotations',
            ('annotations', 'PUT'): 'update:annotations',
            ('data', 'GET'): 'view:data',
            ('issues', 'GET'): 'view',
        }.get((view.action, request.method))

        scopes = []
        if scope == 'update':
            if any(k in request.data for k in ('owner_id', 'owner')):
                owner_id = request.data.get('owner_id') or request.data.get('owner')
                if owner_id != getattr(obj.owner, 'id', None):
                    scopes.append(scope + ':owner')
            if any(k in request.data for k in ('assignee_id', 'assignee')):
                assignee_id = request.data.get('assignee_id') or request.data.get('assignee')
                if assignee_id != getattr(obj.assignee, 'id', None):
                    scopes.append(scope + ':assignee')
            if any(k in request.data for k in ('project_id', 'project')):
                project_id = request.data.get('project_id') or request.data.get('project')
                if project_id != getattr(obj.project, 'id', None):
                    scopes.append(scope + ':project')

            if any(k in request.data for k in ('name', 'labels', 'bug_tracker', 'subset')):
                scopes.append(scope + ':desc')
        elif scope == 'view:annotations':
            if 'format' in request.query_params:
                scope = 'export:annotations'

            scopes.append(scope)
        elif scope == 'update:annotations':
            if 'format' in request.query_params and request.method == 'PUT':
                scope = 'import:annotations'

            scopes.append(scope)
        else:
            scopes.append(scope)

        return scopes


class CommentPermission(OpenPolicyAgentPermission):
    @classmethod
    def create(cls, request, view, obj):
        permissions = []
        if view.basename == 'comment':
            self = cls(request, view, obj)
            permissions.append(self)

        return permissions

    @classmethod
    def create_list(cls, request):
        view = namedtuple('View', ['action'])(action='list')
        return cls(request, view)

    def __init__(self, request, view, obj=None):
        super().__init__(request, view, obj)
        self.url = settings.IAM_OPA_DATA_URL + '/comments/allow'
        self.payload['input']['scope'] = self.scope
        self.payload['input']['resource'] = self.resource

    @property
    def scope(self):
        return {
            'list': 'list',
            'create': 'create@issue',
            'destroy': 'delete',
            'partial_update': 'update',
            'retrieve': 'view'
        }.get(self.view.action, None)

    @property
    def resource(self):
        data = None
        def get_common_data(db_issue):
            if db_issue.job.segment.task.project:
                organization = db_issue.job.segment.task.project.organization
            else:
                organization = db_issue.job.segment.task.organization

            data = {
                "project": {
                    "owner": { "id": getattr(db_issue.job.segment.task.project.owner, 'id', None) },
                    "assignee": { "id": getattr(db_issue.job.segment.task.project.assignee, 'id', None) }
                } if db_issue.job.segment.task.project else None,
                "task": {
                    "owner": { "id": getattr(db_issue.job.segment.task.owner, 'id', None) },
                    "assignee": { "id": getattr(db_issue.job.segment.task.assignee, 'id', None) }
                },
                "job": {
                    "assignee": { "id": getattr(db_issue.job.assignee, 'id', None) }
                },
                "issue": {
                    "owner": { "id": getattr(db_issue.owner, 'id', None) },
                    "assignee": { "id": getattr(db_issue.assignee, 'id', None) }
                },
                'organization': {
                    "id": getattr(organization, 'id', None)
                }
            }

            return data

        if self.obj:
            db_issue = self.obj.issue
            data = get_common_data(db_issue)
            data.update({
                "id": self.obj.id,
                "owner": { "id": getattr(self.obj.owner, 'id', None) }
            })
        elif self.view.action == 'create':
            issue_id = self.request.data.get('issue')
            try:
                db_issue = Issue.objects.get(id=issue_id)
            except Issue.DoesNotExist as ex:
                raise ValidationError(str(ex))
            data = get_common_data(db_issue)
            data.update({
                "owner": { "id": self.request.user.id }
            })

        return data

class IssuePermission(OpenPolicyAgentPermission):
    @classmethod
    def create(cls, request, view, obj):
        permissions = []
        if view.basename == 'issue':
            self = cls(request, view, obj)
            permissions.append(self)

            assignee = request.data.get('assignee')
            if assignee:
                perm = UserPermission.create_view(assignee, request)
                permissions.append(perm)

        return permissions

    @classmethod
    def create_list(cls, request):
        view = namedtuple('View', ['action'])(action='list')
        return cls(request, view)

    def __init__(self, request, view, obj=None):
        super().__init__(request, view, obj)
        self.url = settings.IAM_OPA_DATA_URL + '/issues/allow'
        self.payload['input']['scope'] = self.scope
        self.payload['input']['resource'] = self.resource

    @property
    def scope(self):
        return {
            'list': 'list',
            'create': 'create@job',
            'destroy': 'delete',
            'partial_update': 'update',
            'retrieve': 'view'
        }.get(self.view.action, None)

    @property
    def resource(self):
        data = None
        def get_common_data(db_job):
            if db_job.segment.task.project:
                organization = db_job.segment.task.project.organization
            else:
                organization = db_job.segment.task.organization

            data = {
                "project": {
                    "owner": { "id": getattr(db_job.segment.task.project.owner, 'id', None) },
                    "assignee": { "id": getattr(db_job.segment.task.project.assignee, 'id', None) }
                } if db_job.segment.task.project else None,
                "task": {
                    "owner": { "id": getattr(db_job.segment.task.owner, 'id', None) },
                    "assignee": { "id": getattr(db_job.segment.task.assignee, 'id', None) }
                },
                "job": {
                    "assignee": { "id": getattr(db_job.assignee, 'id', None) }
                },
                'organization': {
                    "id": getattr(organization, 'id', None)
                }
            }

            return data


        if self.obj:
            db_job = self.obj.job
            data = get_common_data(db_job)
            data.update({
                "id": self.obj.id,
                "owner": { "id": getattr(self.obj.owner, 'id', None) },
                "assignee": { "id": getattr(self.obj.assignee, 'id', None) }
            })
        elif self.view.action == 'create':
            job_id = self.request.data.get('job')
            try:
                db_job = Job.objects.get(id=job_id)
            except Job.DoesNotExist as ex:
                raise ValidationError(str(ex))
            data = get_common_data(db_job)
            data.update({
                "owner": { "id": self.request.user.id },
                "assignee": { "id": self.request.data.get('assignee') },
            })

        return data

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

class IsMemberInOrganization(BasePermission):
    message = 'You should be an active member in the organization.'

    # pylint: disable=no-self-use
    def has_permission(self, request, view):
        user = request.user
        organization = request.iam_context['organization']
        membership = request.iam_context['membership']

        if organization and not user.is_superuser:
            return membership is not None

        return True
