# Copyright (C) 2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

from abc import ABCMeta, abstractmethod
from collections import namedtuple
import operator
from rest_framework.exceptions import ValidationError

import requests
from django.conf import settings
from django.db.models import Q
from rest_framework.permissions import BasePermission

from cvat.apps.organizations.models import Membership, Organization
from cvat.apps.engine.models import Project, Task, Job, Issue

class OpenPolicyAgentPermission(metaclass=ABCMeta):
    @classmethod
    def create_base_perm(cls, request, view, scope, obj=None, **kwargs):
        return cls(
            scope=scope,
            obj=obj,
            **cls.unpack_context(request), **kwargs)

    @classmethod
    def create_scope_list(cls, request):
        return cls(**cls.unpack_context(request), scope='list')

    @staticmethod
    def unpack_context(request):
        privilege = request.iam_context['privilege']
        organization = request.iam_context['organization']
        membership = request.iam_context['membership']

        return {
            'user_id': request.user.id,
            'group_name': getattr(privilege, 'name', None),
            'org_id': getattr(organization, 'id', None),
            'org_owner_id': getattr(organization.owner, 'id', None)
                if organization else None,
            'org_role': getattr(membership, 'role', None),
        }

    def __init__(self, **kwargs):
        self.obj = None
        for name, val in kwargs.items():
            setattr(self, name, val)

        self.payload = {
            'input': {
                'scope': self.scope,
                'auth': {
                    'user': {
                        'id': self.user_id,
                        'privilege': self.group_name
                    },
                    'organization': {
                        'id': self.org_id,
                        'owner': {
                            'id': self.org_owner_id,
                        },
                        'user': {
                            'role': self.org_role,
                        },
                    } if self.org_id != None else None
                }
            }
        }

        self.payload['input']['resource'] = self.get_resource()

    @abstractmethod
    def get_resource(self):
        return None

    def __bool__(self):
        r = requests.post(self.url, json=self.payload)
        return r.json()['result']

    def filter(self, queryset):
        url = self.url.replace('/allow', '/filter')
        r = requests.post(url, json=self.payload)
        q_objects = []
        ops_dict = {
            '|': operator.or_,
            '&': operator.and_,
            '~': operator.not_,
        }
        for item in r.json()['result']:
            if isinstance(item, str):
                val1 = q_objects.pop()
                if item == '~':
                    q_objects.append(ops_dict[item](val1))
                else:
                    val2 = q_objects.pop()
                    q_objects.append(ops_dict[item](val1, val2))
            else:
                q_objects.append(Q(**item))

        if q_objects:
            assert len(q_objects) == 1
        else:
            q_objects.append(Q())

        # By default, a QuerySet will not eliminate duplicate rows. If your
        # query spans multiple tables (e.g. members__user_id, owner_id), it’s
        # possible to get duplicate results when a QuerySet is evaluated.
        # That’s when you’d use distinct().
        return queryset.filter(q_objects[0]).distinct()

class OrganizationPermission(OpenPolicyAgentPermission):
    @classmethod
    def create(cls, request, view, obj):
        permissions = []
        if view.basename == 'organization':
            for scope in cls.get_scopes(request, view, obj):
                self = cls.create_base_perm(request, view, scope, obj)
                permissions.append(self)

        return permissions

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + '/organizations/allow'

    @staticmethod
    def get_scopes(request, view, obj):
        return [{
            'list': 'list',
            'create': 'create',
            'destroy': 'delete',
            'partial_update': 'update',
            'retrieve': 'view'
        }.get(view.action, None)]

    def get_resource(self):
        if self.obj:
            membership = Membership.objects.filter(
                organization=self.obj, user=self.user_id).first()
            return {
                'id': self.obj.id,
                'owner': {
                    'id': getattr(self.obj.owner, 'id', None)
                },
                'user': {
                    'role': membership.role if membership else None
                }
            }
        elif self.scope.startswith('create'):
            return {
                'id': None,
                'owner': {
                    'id': self.user_id
                },
                'user': {
                    'num_resources': Organization.objects.filter(
                        owner_id=self.user_id).count(),
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
            for scope in cls.get_scopes(request, view, obj):
                self = cls.create_base_perm(request, view, scope, obj,
                    role=request.data.get('role'))
                permissions.append(self)

        return permissions

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.role = kwargs.get('role')
        self.url = settings.IAM_OPA_DATA_URL + '/invitations/allow'

    @staticmethod
    def get_scopes(request, view, obj):
        return [{
            'list': 'list',
            'create': 'create',
            'destroy': 'delete',
            'partial_update': 'accept' if 'accepted' in
                request.query_params else 'resend',
            'retrieve': 'view'
        }.get(view.action)]

    def get_resource(self):
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
        elif self.scope.startswith('create'):
            data = {
                'owner': { 'id': self.user_id },
                'invitee': {
                    'id': None # unknown yet
                },
                'role': self.role,
                'organization': {
                    'id': self.org_id
                } if self.org_id != None else None
            }

        return data

class MembershipPermission(OpenPolicyAgentPermission):
    @classmethod
    def create(cls, request, view, obj):
        permissions = []
        if view.basename == 'membership':
            for scope in cls.get_scopes(request, view, obj):
                self = cls.create_base_perm(request, view, scope, obj)
                permissions.append(self)

        return permissions

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + '/memberships/allow'

    @staticmethod
    def get_scopes(request, view, obj):
        return [{
            'list': 'list',
            'partial_update': 'change:role',
            'retrieve': 'view',
            'destroy': 'delete'
        }.get(view.action)]

    def get_resource(self):
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
            for scope in cls.get_scopes(request, view, obj):
                self = cls.create_base_perm(request, view, scope, obj)
                permissions.append(self)

        return permissions

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + '/server/allow'

    @staticmethod
    def get_scopes(request, view, obj):
        return [{
            'annotation_formats': 'view',
            'about': 'view',
            'plugins': 'view',
            'exception': 'send:exception',
            'logs': 'send:logs',
            'share': 'list:content'
        }.get(view.action, None)]

    def get_resource(self):
        return None

class LogViewerPermission(OpenPolicyAgentPermission):
    @classmethod
    def create(cls, request, view, obj):
        permissions = []
        if view.basename == 'analytics':
            for scope in cls.get_scopes(request, view, obj):
                self = cls.create_base_perm(request, view, scope, obj)
                permissions.append(self)

        return permissions

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + '/analytics/allow'

    @staticmethod
    def get_scopes(request, view, obj):
        return [{
            'list': 'view',
        }.get(view.action, None)]

    def get_resource(self):
        return {
            'visibility': 'public' if settings.RESTRICTIONS['analytics_visibility'] else 'private',
        }

class UserPermission(OpenPolicyAgentPermission):
    @classmethod
    def create(cls, request, view, obj):
        permissions = []
        if view.basename == 'user':
            for scope in cls.get_scopes(request, view, obj):
                self = cls.create_base_perm(request, view, scope, obj)
                permissions.append(self)

        return permissions

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + '/users/allow'

    @staticmethod
    def get_scopes(request, view, obj):
        return [{
            'list': 'list',
            'self': 'view',
            'retrieve': 'view',
            'partial_update': 'update',
            'destroy': 'delete'
        }.get(view.action)]

    @classmethod
    def create_scope_view(cls, request, user_id):
        obj = namedtuple('User', ['id'])(id=int(user_id))
        return cls(**cls.unpack_context(request), scope='view', obj=obj)

    def get_resource(self):
        data = None
        organization = self.payload['input']['auth']['organization']
        if self.obj:
            data = {
                'id': self.obj.id
            }
        elif self.scope == 'view': # self
            data = {
                'id': self.user_id
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
            for scope in cls.get_scopes(request, view, obj):
                self = cls.create_base_perm(request, view, scope, obj)
                permissions.append(self)

            task_id = request.data.get('task')
            if task_id:
                perm = TaskPermission.create_scope_view_data(request, task_id)
                permissions.append(perm)

        return permissions

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + '/lambda/allow'

    @staticmethod
    def get_scopes(request, view, obj):
        return [{
            ('function', 'list'): 'list',
            ('function', 'retrieve'): 'view',
            ('function', 'call'): 'call:online',
            ('request', 'create'): 'call:offline',
            ('request', 'list'): 'call:offline',
            ('request', 'retrieve'): 'call:offline',
            ('request', 'destroy'): 'call:offline',
        }.get((view.basename, view.action), None)]

    def get_resource(self):
        return None

class CloudStoragePermission(OpenPolicyAgentPermission):
    @classmethod
    def create(cls, request, view, obj):
        permissions = []
        if view.basename == 'cloudstorage':
            for scope in cls.get_scopes(request, view, obj):
                self = cls.create_base_perm(request, view, scope, obj)
                permissions.append(self)

        return permissions

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + '/cloudstorages/allow'

    @staticmethod
    def get_scopes(request, view, obj):
        return [{
            'list': 'list',
            'create': 'create',
            'retrieve': 'view',
            'partial_update': 'update',
            'destroy': 'delete',
            'content': 'list:content',
            'preview': 'view',
            'status': 'view'
        }.get(view.action)]

    def get_resource(self):
        data = None
        if self.scope.startswith('create'):
            data = {
                'owner': { 'id': self.user_id },
                'organization': {
                    'id': self.org_id
                } if self.org_id != None else None,
                'user': {
                    'num_resources': Organization.objects.filter(
                        owner=self.user_id).count()
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
            assignee_id = request.data.get('assignee_id') or request.data.get('assignee')
            for scope in cls.get_scopes(request, view, obj):
                self = cls.create_base_perm(request, view, scope, obj,
                    assignee_id=assignee_id)
                permissions.append(self)

            if view.action == 'tasks':
                perm = TaskPermission.create_scope_list(request)
                permissions.append(perm)

            owner = request.data.get('owner_id') or request.data.get('owner')
            if owner:
                perm = UserPermission.create_scope_view(request, owner)
                permissions.append(perm)

            if assignee_id:
                perm = UserPermission.create_scope_view(request, assignee_id)
                permissions.append(perm)

            if 'organization' in request.data:
                org_id = request.data.get('organization')
                perm = ProjectPermission.create_scope_create(request, org_id)
                # We don't create a project, just move it. Thus need to decrease
                # the number of resources.
                perm.payload['input']['resource']['user']['num_resources'] -= 1
                permissions.append(perm)

        return permissions

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + '/projects/allow'

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
            ('append_dataset_chunk', 'HEAD'): 'import:dataset',
            ('append_dataset_chunk', 'PATCH'): 'import:dataset',
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
            if 'organization' in request.data:
                scopes.append(scope + ':organization')
        else:
            scopes.append(scope)

        return scopes

    @classmethod
    def create_scope_view(cls, request, project_id):
        try:
            obj = Project.objects.get(id=project_id)
        except Project.DoesNotExist as ex:
            raise ValidationError(str(ex))
        return cls(**cls.unpack_context(request), obj=obj, scope='view')

    @classmethod
    def create_scope_create(cls, request, org_id):
        organization = None
        membership = None
        privilege = request.iam_context['privilege']
        if org_id:
            try:
                organization = Organization.objects.get(id=org_id)
            except Organization.DoesNotExist as ex:
                raise ValidationError(str(ex))

            try:
                membership = Membership.objects.filter(
                    organization=organization, user=request.user).first()
            except Membership.DoesNotExist:
                membership = None

        return cls(
            user_id=request.user.id,
            group_name=getattr(privilege, 'name', None),
            org_id=getattr(organization, 'id', None),
            org_owner_id=getattr(organization.owner, 'id', None)
                if organization else None,
            org_role=getattr(membership, 'role', None),
            scope='create')

    def get_resource(self):
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
        elif self.scope in ['create', 'import:backup']:
            data = {
                "id": None,
                "owner": { "id": self.user_id },
                "assignee": {
                    "id": self.assignee_id
                },
                'organization': {
                    "id": self.org_id
                },
                "user": {
                    "num_resources": Project.objects.filter(
                        owner_id=self.user_id).count()
                }
            }

        return data

class TaskPermission(OpenPolicyAgentPermission):
    @classmethod
    def create(cls, request, view, obj):
        permissions = []
        if view.basename == 'task':
            project_id = request.data.get('project_id') or request.data.get('project')
            assignee_id = request.data.get('assignee_id') or request.data.get('assignee')
            for scope in cls.get_scopes(request, view, obj):
                self = cls.create_base_perm(request, view, scope, obj,
                    project_id=project_id, assignee_id=assignee_id)
                permissions.append(self)

            if view.action == 'jobs':
                perm = JobPermission.create_scope_list(request)
                permissions.append(perm)

            owner = request.data.get('owner_id') or request.data.get('owner')
            if owner:
                perm = UserPermission.create_scope_view(request, owner)
                permissions.append(perm)

            if assignee_id:
                perm = UserPermission.create_scope_view(request, assignee_id)
                permissions.append(perm)

            if project_id:
                perm = ProjectPermission.create_scope_view(request, project_id)
                permissions.append(perm)

            if 'organization' in request.data:
                org_id = request.data.get('organization')
                perm = TaskPermission.create_scope_create(request, org_id)
                # We don't create a project, just move it. Thus need to decrease
                # the number of resources.
                if obj != None:
                    perm.payload['input']['resource']['user']['num_resources'] -= 1
                    if obj.project != None:
                        ValidationError('Cannot change the organization for '
                            'a task inside a project')
                permissions.append(perm)

        return permissions

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + '/tasks/allow'

    @staticmethod
    def get_scopes(request, view, obj):
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
            ('annotations', 'POST'): 'import:annotations',
            ('append_annotations_chunk', 'PATCH'): 'update:annotations',
            ('append_annotations_chunk', 'HEAD'): 'update:annotations',
            ('dataset_export', 'GET'): 'export:dataset',
            ('data', 'GET'): 'view:data',
            ('data_info', 'GET'): 'view:data',
            ('data', 'POST'): 'upload:data',
            ('append_data_chunk', 'PATCH'): 'upload:data',
            ('append_data_chunk', 'HEAD'): 'upload:data',
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
            if request.data.get('organization'):
                scopes.append(scope + ':organization')

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

    @classmethod
    def create_scope_view_data(cls, request, task_id):
        try:
            obj = Task.objects.get(id=task_id)
        except Task.DoesNotExist as ex:
            raise ValidationError(str(ex))
        return cls(**cls.unpack_context(request), obj=obj, scope='view:data')

    def get_resource(self):
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
        elif self.scope in ['create', 'create@project', 'import:backup']:
            project = None
            if self.project_id:
                try:
                    project = Project.objects.get(id=self.project_id)
                except Project.DoesNotExist as ex:
                    raise ValidationError(str(ex))

            data = {
                "id": None,
                "owner": { "id": self.user_id },
                "assignee": {
                    "id": self.assignee_id
                },
                'organization': {
                    "id": self.org_id
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
                        owner_id=self.user_id).count()
                }
            }

        return data

class JobPermission(OpenPolicyAgentPermission):
    @classmethod
    def create(cls, request, view, obj):
        permissions = []
        if view.basename == 'job':
            for scope in cls.get_scopes(request, view, obj):
                self = cls.create_base_perm(request, view, scope, obj)
                permissions.append(self)

            if view.action == 'issues':
                perm = IssuePermission.create_scope_list(request)
                permissions.append(perm)

            assignee_id = request.data.get('assignee')
            if assignee_id:
                perm = UserPermission.create_scope_view(request, assignee_id)
                permissions.append(perm)

        return permissions

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + '/jobs/allow'

    @staticmethod
    def get_scopes(request, view, obj):
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
            ('annotations', 'POST'): 'import:annotations',
            ('append_annotations_chunk', 'PATCH'): 'update:annotations',
            ('append_annotations_chunk', 'HEAD'): 'update:annotations',
            ('data', 'GET'): 'view:data',
            ('issues', 'GET'): 'view',
            ('commits', 'GET'): 'view:commits'
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
            if 'stage' in request.data:
                scopes.append(scope + ':stage')
            if 'state' in request.data:
                scopes.append(scope + ':state')

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

    def get_resource(self):
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

class CommentPermission(OpenPolicyAgentPermission):
    @classmethod
    def create(cls, request, view, obj):
        permissions = []
        if view.basename == 'comment':
            for scope in cls.get_scopes(request, view, obj):
                self = cls.create_base_perm(request, view, scope, obj,
                    issue_id=request.data.get('issue'))
                permissions.append(self)

        return permissions

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + '/comments/allow'

    @staticmethod
    def get_scopes(request, view, obj):
        return [{
            'list': 'list',
            'create': 'create@issue',
            'destroy': 'delete',
            'partial_update': 'update',
            'retrieve': 'view'
        }.get(view.action, None)]

    def get_resource(self):
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
        elif self.scope.startswith('create'):
            try:
                db_issue = Issue.objects.get(id=self.issue_id)
            except Issue.DoesNotExist as ex:
                raise ValidationError(str(ex))
            data = get_common_data(db_issue)
            data.update({
                "owner": { "id": self.user_id }
            })

        return data

class IssuePermission(OpenPolicyAgentPermission):
    @classmethod
    def create(cls, request, view, obj):
        permissions = []
        if view.basename == 'issue':
            assignee_id = request.data.get('assignee')
            for scope in cls.get_scopes(request, view, obj):
                self = cls.create_base_perm(request, view, scope, obj,
                    job_id=request.data.get('job'),
                    assignee_id=assignee_id)
                permissions.append(self)

            if assignee_id:
                perm = UserPermission.create_scope_view(request, assignee_id)
                permissions.append(perm)

        return permissions

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + '/issues/allow'

    @staticmethod
    def get_scopes(request, view, obj):
        return [{
            'list': 'list',
            'create': 'create@job',
            'destroy': 'delete',
            'partial_update': 'update',
            'retrieve': 'view',
            'comments': 'view'
        }.get(view.action, None)]

    def get_resource(self):
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
        elif self.scope.startswith('create'):
            job_id = self.job_id
            try:
                db_job = Job.objects.get(id=job_id)
            except Job.DoesNotExist as ex:
                raise ValidationError(str(ex))
            data = get_common_data(db_job)
            data.update({
                "owner": { "id": self.user_id },
                "assignee": { "id": self.assignee_id },
            })

        return data

class PolicyEnforcer(BasePermission):
    # pylint: disable=no-self-use
    def check_permission(self, request, view, obj):
        permissions = []
        # DRF can send OPTIONS request. Internally it will try to get
        # information about serializers for PUT and POST requests (clone
        # request and replace the http method). To avoid handling
        # ('POST', 'metadata') and ('PUT', 'metadata') in every request,
        # the condition below is enough.
        if not self.is_metadata_request(request, view):
            for perm in OpenPolicyAgentPermission.__subclasses__():
                permissions.extend(perm.create(request, view, obj))

        return all(permissions)

    def has_permission(self, request, view):
        if not view.detail:
            return self.check_permission(request, view, None)
        else:
            return True # has_object_permission will be called later

    def has_object_permission(self, request, view, obj):
        return self.check_permission(request, view, obj)

    @staticmethod
    def is_metadata_request(request, view):
        return request.method == 'OPTIONS' or view.action == 'metadata'

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
