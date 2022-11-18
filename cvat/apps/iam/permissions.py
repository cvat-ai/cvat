# Copyright (C) 2022 Intel Corporation
# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations
from abc import ABCMeta, abstractmethod
from collections import namedtuple
from enum import Enum
import operator
from typing import Any, Dict, List, Optional, Sequence, Tuple, Type

from rest_framework.exceptions import ValidationError, PermissionDenied

import requests
from django.conf import settings
from django.db.models import Q
from rest_framework.permissions import BasePermission

from cvat.apps.organizations.models import Membership, Organization
from cvat.apps.engine.models import Project, Task, Job, Issue
from cvat.apps.limit_manager.core.limits import (CapabilityContext, LimitManager,
    ConsumableCapability, TaskCreateInProjectContext, WebhookCreateContext, TaskCreateContext)


class RequestNotAllowedError(PermissionDenied):
    pass


class OpenPolicyAgentPermission(metaclass=ABCMeta):
    url: str
    user_id: int
    group_name: Optional[str]
    org_id: Optional[int]
    org_owner_id: Optional[int]
    org_role: Optional[str]
    scope: str
    obj: Optional[Any]

    @classmethod
    @abstractmethod
    def create(cls, request, view, obj) -> Sequence[OpenPolicyAgentPermission]:
        ...

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
                    } if self.org_id is not None else None
                }
            }
        }

        self.payload['input']['resource'] = self.get_resource()

    @abstractmethod
    def get_resource(self):
        return None

    def __bool__(self):
        r = requests.post(self.url, json=self.payload)
        result = r.json()['result']
        if isinstance(result, dict):
            allow = result['allow']
            if allow:
                return allow
            else:
                raise RequestNotAllowedError(result.get('reasons', []))
        elif isinstance(result, bool):
            return result
        else:
            raise ValueError("Unexpected response format")

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
                    'num_resources': LimitManager().get_used_resources(user_id=self.user_id,
                        capability=ConsumableCapability.ORG_CREATE),
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
                } if self.org_id is not None else None
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
            'status': 'view',
            'actions': 'view',
        }.get(view.action)]

    def get_resource(self):
        data = None
        if self.scope.startswith('create'):
            # TODO: allow uniform unconditional invocation in future.
            # Send (context, operation) to LM
            limit_manager = LimitManager()
            data = {
                'owner': { 'id': self.user_id },
                'organization': {
                    'id': self.org_id,
                    'num_resources': limit_manager.get_used_resources(
                        org_id=self.org_id,
                        capability=ConsumableCapability.CLOUD_STORAGE_CREATE
                    ),
                    'max_resources': limit_manager.get_limits(
                        org_id=self.org_id,
                        capability=ConsumableCapability.CLOUD_STORAGE_CREATE
                    )
                } if self.org_id is not None else None,
                'user': {
                    'num_resources': limit_manager.get_used_resources(
                        user_id=self.user_id,
                        capability=ConsumableCapability.CLOUD_STORAGE_CREATE
                    ),
                    'max_resources': limit_manager.get_limits(
                        user_id=self.user_id,
                        capability=ConsumableCapability.CLOUD_STORAGE_CREATE
                    )
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
            ('append_backup_chunk', 'PATCH'): 'import:backup',
            ('append_backup_chunk', 'HEAD'): 'import:backup',
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
                    "id": self.org_id,
                } if self.org_id else None,
                "user": {
                    "num_resources": LimitManager().get_used_resources(
                        user_id=self.user_id,
                        capability=ConsumableCapability.PROJECT_CREATE,
                    ),
                    "max_resources": LimitManager().get_limits(
                        user_id=self.user_id,
                        capability=ConsumableCapability.PROJECT_CREATE,
                    ),
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
                if scope == __class__.Scopes.UPDATE_ORGANIZATION:
                    org_id = request.data.get('organization')
                    if obj is not None and obj.project is not None:
                        raise ValidationError('Cannot change the organization for '
                            'a task inside a project')
                    permissions.append(TaskPermission.create_scope_create(request, org_id))

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

        return permissions

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + '/tasks/result'

    class Scopes(str, Enum):
        LIST = 'list'
        CREATE = 'create'
        CREATE_IN_PROJECT = 'create@project'
        VIEW = 'view'
        UPDATE = 'update'
        UPDATE_DESC = 'update:desc'
        UPDATE_ORGANIZATION = 'update:organization'
        UPDATE_ASSIGNEE = 'update:assignee'
        UPDATE_PROJECT = 'update:project'
        UPDATE_OWNER = 'update:owner'
        DELETE = 'delete'
        VIEW_ANNOTATIONS = 'view:annotations'
        UPDATE_ANNOTATIONS = 'update:annotations'
        DELETE_ANNOTATIONS = 'delete:annotations'
        IMPORT_ANNOTATIONS = 'import:annotations'
        EXPORT_ANNOTATIONS = 'export:annotations'
        EXPORT_DATASET = 'export:dataset'
        VIEW_METADATA = 'view:metadata'
        UPDATE_METADATA = 'update:metadata'
        VIEW_DATA = 'view:data'
        UPLOAD_DATA = 'upload:data'
        IMPORT_BACKUP = 'import:backup'
        EXPORT_BACKUP = 'export:backup'

        def __str__(self) -> str:
            return self.value

    @staticmethod
    def get_scopes(request, view, obj) -> Scopes:
        Scopes = __class__.Scopes
        scope = {
            ('list', 'GET'): Scopes.LIST,
            ('create', 'POST'): Scopes.CREATE,
            ('retrieve', 'GET'): Scopes.VIEW,
            ('status', 'GET'): Scopes.VIEW,
            ('partial_update', 'PATCH'): Scopes.UPDATE,
            ('update', 'PUT'): Scopes.UPDATE,
            ('destroy', 'DELETE'): Scopes.DELETE,
            ('annotations', 'GET'): Scopes.VIEW_ANNOTATIONS,
            ('annotations', 'PATCH'): Scopes.UPDATE_ANNOTATIONS,
            ('annotations', 'DELETE'): Scopes.DELETE_ANNOTATIONS,
            ('annotations', 'PUT'): Scopes.UPDATE_ANNOTATIONS,
            ('annotations', 'POST'): Scopes.IMPORT_ANNOTATIONS,
            ('append_annotations_chunk', 'PATCH'): Scopes.UPDATE_ANNOTATIONS,
            ('append_annotations_chunk', 'HEAD'): Scopes.UPDATE_ANNOTATIONS,
            ('dataset_export', 'GET'): Scopes.EXPORT_DATASET,
            ('metadata', 'GET'): Scopes.VIEW_METADATA,
            ('metadata', 'PATCH'): Scopes.UPDATE_METADATA,
            ('data', 'GET'): Scopes.VIEW_DATA,
            ('data', 'POST'): Scopes.UPLOAD_DATA,
            ('append_data_chunk', 'PATCH'): Scopes.UPLOAD_DATA,
            ('append_data_chunk', 'HEAD'): Scopes.UPLOAD_DATA,
            ('jobs', 'GET'): Scopes.VIEW,
            ('import_backup', 'POST'): Scopes.IMPORT_BACKUP,
            ('append_backup_chunk', 'PATCH'): Scopes.IMPORT_BACKUP,
            ('append_backup_chunk', 'HEAD'): Scopes.IMPORT_BACKUP,
            ('export_backup', 'GET'): Scopes.EXPORT_BACKUP,
        }.get((view.action, request.method))

        scopes = []
        if scope == Scopes.CREATE:
            project_id = request.data.get('project_id') or request.data.get('project')
            if project_id:
                scope = Scopes.CREATE_IN_PROJECT

            scopes.append(scope)

        elif scope == Scopes.UPDATE:
            if any(k in request.data for k in ('owner_id', 'owner')):
                owner_id = request.data.get('owner_id') or request.data.get('owner')
                if owner_id != getattr(obj.owner, 'id', None):
                    scopes.append(Scopes.UPDATE_OWNER)

            if any(k in request.data for k in ('assignee_id', 'assignee')):
                assignee_id = request.data.get('assignee_id') or request.data.get('assignee')
                if assignee_id != getattr(obj.assignee, 'id', None):
                    scopes.append(Scopes.UPDATE_ASSIGNEE)

            if any(k in request.data for k in ('project_id', 'project')):
                project_id = request.data.get('project_id') or request.data.get('project')
                if project_id != getattr(obj.project, 'id', None):
                    scopes.append(Scopes.UPDATE_PROJECT)

            if any(k in request.data for k in ('name', 'labels', 'bug_tracker', 'subset')):
                scopes.append(Scopes.UPDATE_DESC)

            if request.data.get('organization'):
                scopes.append(Scopes.UPDATE_ORGANIZATION)

        elif scope == Scopes.VIEW_ANNOTATIONS:
            if 'format' in request.query_params:
                scope = Scopes.EXPORT_ANNOTATIONS

            scopes.append(scope)

        elif scope == Scopes.UPDATE_ANNOTATIONS:
            if 'format' in request.query_params and request.method == 'PUT':
                scope = Scopes.IMPORT_ANNOTATIONS

            scopes.append(scope)

        elif scope is not None:
            scopes.append(scope)

        else:
            # TODO: think if we can protect from missing endpoints
            # assert False, "Unknown scope"
            pass

        return scopes

    @classmethod
    def create_scope_view_data(cls, request, task_id):
        try:
            obj = Task.objects.get(id=task_id)
        except Task.DoesNotExist as ex:
            raise ValidationError(str(ex))
        return cls(**cls.unpack_context(request), obj=obj, scope=__class__.Scopes.VIEW_DATA)

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
        elif self.scope in [
            __class__.Scopes.CREATE,
            __class__.Scopes.CREATE_IN_PROJECT,
            __class__.Scopes.IMPORT_BACKUP
        ]:
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
                        "id": getattr(project.organization, 'id', None),
                    } if project.organization is not None else None,
                } if project is not None else None,
            }

        return data


class WebhookPermission(OpenPolicyAgentPermission):
    @classmethod
    def create(cls, request, view, obj):
        permissions = []
        if view.basename == 'webhook':

            project_id = request.data.get('project_id')
            for scope in cls.get_scopes(request, view, obj):
                self = cls.create_base_perm(request, view, scope, obj,
                    project_id=project_id)
                permissions.append(self)

            owner = request.data.get('owner_id') or request.data.get('owner')
            if owner:
                perm = UserPermission.create_scope_view(request, owner)
                permissions.append(perm)

            if project_id:
                perm = ProjectPermission.create_scope_view(request, project_id)
                permissions.append(perm)

        return permissions

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + '/webhooks/allow'

    @staticmethod
    def get_scopes(request, view, obj):
        scope = {
            ('create', 'POST'): 'create',
            ('destroy', 'DELETE'): 'delete',
            ('partial_update', 'PATCH'): 'update',
            ('update', 'PUT'): 'update',
            ('list', 'GET'): 'list',
            ('retrieve', 'GET'): 'view',
        }.get((view.action, request.method))

        scopes = []
        if scope == 'create':
            webhook_type = request.data.get('type')
            if webhook_type:
                scope += f'@{webhook_type}'
                scopes.append(scope)
        elif scope in ['update', 'delete', 'list', 'view']:
            scopes.append(scope)

        return scopes

    def get_resource(self):
        data = None
        if self.obj:
            data = {
                "id": self.obj.id,
                "owner": {"id": getattr(self.obj.owner, 'id', None) },
                'organization': {
                    "id": getattr(self.obj.organization, 'id', None)
                },
                "project": None
            }
            if self.obj.type == 'project' and getattr(self.obj, 'project', None):
                data['project'] = {
                    'owner': {'id': getattr(self.obj.project.owner, 'id', None)}
                }
        elif self.scope in ['create', 'create@project', 'create@organization']:
            project = None
            if self.project_id:
                try:
                    project = Project.objects.get(id=self.project_id)
                except Project.DoesNotExist:
                    raise ValidationError(f"Could not find project with provided id: {self.project_id}")

            limit_manager = LimitManager()
            data = {
                'id': None,
                'owner': self.user_id,
                'project': {
                    'owner': {
                        'id': project.owner.id,
                    } if project.owner else None,
                } if project else None,
                'organization': {
                    'id': self.org_id,
                    'num_resources': limit_manager.get_used_resources(
                        org_id=self.org_id,
                        context=WebhookCreateContext(project_id=self.project_id),
                        capability=ConsumableCapability.WEBHOOK_CREATE,
                    ),
                    'max_resources': limit_manager.get_limits(
                        org_id=self.org_id,
                        context=WebhookCreateContext(project_id=self.project_id),
                        capability=ConsumableCapability.WEBHOOK_CREATE,
                    ),
                } if self.org_id is not None else None,
                'user': {
                    'id': self.user_id,
                    'num_resources': limit_manager.get_used_resources(
                        user_id=self.user_id,
                        context=WebhookCreateContext(project_id=self.project_id),
                        capability=ConsumableCapability.WEBHOOK_CREATE,
                    ),
                    'max_resources': limit_manager.get_limits(
                        user_id=self.user_id,
                        context=WebhookCreateContext(project_id=self.project_id),
                        capability=ConsumableCapability.WEBHOOK_CREATE,
                    ),
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
            ('metadata','GET'): 'view:metadata',
            ('metadata','PATCH'): 'update:metadata',
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


class LimitPermission(OpenPolicyAgentPermission):
    @classmethod
    def create(cls, request, view, obj):
        return [
            cls.create_base_perm(request, view, str(scope_handler.scope), obj,
                scope_handler=scope_handler
            )
            for scope_handler in cls.get_scopes(request, view, obj)
        ]

    def __init__(self, **kwargs):
        self.url = settings.IAM_OPA_DATA_URL + '/limits/result'
        self.scope_handler = kwargs.pop('scope_handler')
        super().__init__(**kwargs)

    @classmethod
    def get_scopes(cls, request, view, obj):
        return [
            scope_handler
            for ctx, _ in cls._supported_capabilities().keys()
            for scope_handler in ctx.create(request, view, obj)
            if cls._get_capabilities(scope_handler)
        ]

    def get_resource(self):
        data = {}
        limit_manager = LimitManager()

        def _get_capability_status(
            capability: ConsumableCapability, capability_params: Optional[CapabilityContext]
        ) -> dict:
            status = limit_manager.get_status(capability=capability, context=capability_params)
            return { 'used': status[0], 'max': status[1] }

        for capability in self._get_capabilities(self.scope_handler):
            data[self._get_capability_name(capability)] = _get_capability_status(
                capability=capability,
                capability_params=self._parse_capability_params(self.scope_handler, capability)
            )

        return { 'limits': data }

    @classmethod
    def _get_capability_name(cls, capability: ConsumableCapability) -> str:
        return capability.name.lower()

    @classmethod
    def _get_capabilities(
        cls, scope_handler: OpenPolicyAgentPermission
    ) -> List[ConsumableCapability]:
        return cls._supported_capabilities().get(
            (type(scope_handler), str(scope_handler.scope)),
            []
        )

    @classmethod
    def _supported_capabilities(cls) -> Dict[
        Tuple[Type[OpenPolicyAgentPermission], str], List[ConsumableCapability]
    ]:
        return {
            (TaskPermission, TaskPermission.Scopes.CREATE.value): [
                ConsumableCapability.TASK_CREATE
            ],
            (TaskPermission, TaskPermission.Scopes.CREATE_IN_PROJECT.value): [
                # TaskPermissions outputs both parent scope and this one
                # no need to copy this logic here
                ConsumableCapability.TASK_CREATE_IN_PROJECT
            ],
        }

    @classmethod
    def _parse_capability_params(cls,
        scope: OpenPolicyAgentPermission, capability: ConsumableCapability
    ) -> CapabilityContext:
        scope_id = (type(scope), scope.scope)
        if scope_id == (TaskPermission, TaskPermission.Scopes.CREATE.value):
            assert capability == ConsumableCapability.TASK_CREATE
            capability_params = TaskCreateContext(org_id=scope.org_id, user_id=scope.user_id)

        elif scope_id == (TaskPermission, TaskPermission.Scopes.CREATE_IN_PROJECT.value):
            assert capability == ConsumableCapability.TASK_CREATE_IN_PROJECT
            capability_params = TaskCreateInProjectContext(org_id=scope.org_id,
                user_id=scope.user_id, project_id=scope.project_id)

        elif scope_id == (WebhookPermission, 'create'):
            assert capability == ConsumableCapability.WEBHOOK_CREATE
            capability_params = WebhookCreateContext(
                user_id=scope.user_id,
                project_id=scope.project_id,
                org_id=scope.org_id
            )
        else:
            raise NotImplementedError(f"Unknown scope {scope_id}")

        return capability_params


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
        return request.method == 'OPTIONS' \
            or (request.method == 'POST' and view.action == 'metadata' and len(request.data) == 0)

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

