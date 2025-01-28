# Copyright (C) 2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from collections import namedtuple
from collections.abc import Sequence
from typing import Any, Optional, Union, cast

from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import PermissionDenied, ValidationError
from rq.job import Job as RQJob

from cvat.apps.engine.rq_job_handler import is_rq_job_owner
from cvat.apps.engine.utils import is_dataset_export
from cvat.apps.iam.permissions import (
    OpenPolicyAgentPermission,
    StrEnum,
    get_iam_context,
    get_membership,
)
from cvat.apps.organizations.models import Organization

from .models import AnnotationGuide, CloudStorage, Comment, Issue, Job, Label, Project, Task, User


def _get_key(d: dict[str, Any], key_path: Union[str, Sequence[str]]) -> Optional[Any]:
    """
    Like dict.get(), but supports nested fields. If the field is missing, returns None.
    """

    if isinstance(key_path, str):
        key_path = [key_path]
    else:
        assert key_path

    for key_part in key_path:
        d = d.get(key_part)
        if d is None:
            return d

    return d

class ServerPermission(OpenPolicyAgentPermission):
    class Scopes(StrEnum):
        VIEW = 'view'
        LIST_CONTENT = 'list:content'

    @classmethod
    def create(cls, request, view, obj, iam_context):
        permissions = []
        if view.basename == 'server':
            for scope in cls.get_scopes(request, view, obj):
                self = cls.create_base_perm(request, view, scope, iam_context, obj)
                permissions.append(self)

        return permissions

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + '/server/allow'

    @staticmethod
    def get_scopes(request, view, obj):
        Scopes = __class__.Scopes
        return [{
            ('annotation_formats', 'GET'): Scopes.VIEW,
            ('about', 'GET'): Scopes.VIEW,
            ('plugins', 'GET'): Scopes.VIEW,
            ('share', 'GET'): Scopes.LIST_CONTENT,
        }[(view.action, request.method)]]

    def get_resource(self):
        return None

class UserPermission(OpenPolicyAgentPermission):
    obj: Optional[User]

    class Scopes(StrEnum):
        LIST = 'list'
        VIEW = 'view'
        UPDATE = 'update'
        DELETE = 'delete'

    @classmethod
    def create(cls, request, view, obj, iam_context):
        permissions = []
        if view.basename == 'user':
            for scope in cls.get_scopes(request, view, obj):
                self = cls.create_base_perm(request, view, scope, iam_context, obj)
                permissions.append(self)

        return permissions

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + '/users/allow'

    @staticmethod
    def get_scopes(request, view, obj):
        Scopes = __class__.Scopes
        return [{
            'list': Scopes.LIST,
            'self': Scopes.VIEW,
            'retrieve': Scopes.VIEW,
            'partial_update': Scopes.UPDATE,
            'destroy': Scopes.DELETE,
        }[view.action]]

    @classmethod
    def create_scope_view(cls, iam_context, user_id):
        obj = namedtuple('User', ['id'])(id=int(user_id))
        return cls(**iam_context, scope=__class__.Scopes.VIEW, obj=obj)

    def get_resource(self):
        data = None
        organization = self.payload['input']['auth']['organization']
        if self.obj:
            data = {
                'id': self.obj.id
            }
        elif self.scope == __class__.Scopes.VIEW: # self
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

class CloudStoragePermission(OpenPolicyAgentPermission):
    obj: Optional[CloudStorage]

    class Scopes(StrEnum):
        LIST = 'list'
        LIST_CONTENT = 'list:content'
        CREATE = 'create'
        VIEW = 'view'
        UPDATE = 'update'
        DELETE = 'delete'

    @classmethod
    def create(cls, request, view, obj, iam_context):
        permissions = []
        if view.basename == 'cloudstorage':
            for scope in cls.get_scopes(request, view, obj):
                self = cls.create_base_perm(request, view, scope, iam_context, obj)
                permissions.append(self)

        return permissions

    @classmethod
    def create_scope_view(cls, iam_context, storage_id, request=None):
        try:
            obj = CloudStorage.objects.get(id=storage_id)
        except CloudStorage.DoesNotExist as ex:
            raise ValidationError(str(ex))

        if not iam_context and request:
            iam_context = get_iam_context(request, obj)

        return cls(**iam_context, obj=obj, scope=__class__.Scopes.VIEW)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + '/cloudstorages/allow'

    @staticmethod
    def get_scopes(request, view, obj):
        Scopes = __class__.Scopes
        return [{
            'list': Scopes.LIST,
            'create': Scopes.CREATE,
            'retrieve': Scopes.VIEW,
            'partial_update': Scopes.UPDATE,
            'destroy': Scopes.DELETE,
            'content': Scopes.LIST_CONTENT,
            'content_v2': Scopes.LIST_CONTENT,
            'preview': Scopes.VIEW,
            'status': Scopes.VIEW,
            'actions': Scopes.VIEW,
        }[view.action]]

    def get_resource(self):
        data = None
        if self.scope.startswith('create'):
            data = {
                'owner': { 'id': self.user_id },
                'organization': {
                    'id': self.org_id,
                } if self.org_id is not None else None,
            }
        elif self.obj:
            data = {
                'id': self.obj.id,
                'owner': { 'id': self.obj.owner_id },
                'organization': {
                    'id': self.obj.organization_id
                } if self.obj.organization_id else None
            }

        return data

class ProjectPermission(OpenPolicyAgentPermission):
    obj: Optional[Project]

    class Scopes(StrEnum):
        LIST = 'list'
        CREATE = 'create'
        DELETE = 'delete'
        UPDATE = 'update'
        UPDATE_OWNER = 'update:owner'
        UPDATE_ASSIGNEE = 'update:assignee'
        UPDATE_DESC = 'update:desc'
        UPDATE_ORG = 'update:organization'
        UPDATE_ASSOCIATED_STORAGE = 'update:associated_storage'
        VIEW = 'view'
        IMPORT_DATASET = 'import:dataset'
        EXPORT_ANNOTATIONS = 'export:annotations'
        EXPORT_DATASET = 'export:dataset'
        EXPORT_BACKUP = 'export:backup'
        IMPORT_BACKUP = 'import:backup'

    @classmethod
    def create(cls, request, view, obj, iam_context):
        permissions = []
        if view.basename == 'project':
            assignee_id = request.data.get('assignee_id') or request.data.get('assignee')
            for scope in cls.get_scopes(request, view, obj):
                self = cls.create_base_perm(request, view, scope, iam_context, obj,
                    assignee_id=assignee_id)
                permissions.append(self)

            if view.action == 'tasks':
                perm = TaskPermission.create_scope_list(request, iam_context)
                permissions.append(perm)

            owner = request.data.get('owner_id') or request.data.get('owner')
            if owner:
                perm = UserPermission.create_scope_view(iam_context, owner)
                permissions.append(perm)

            if assignee_id:
                perm = UserPermission.create_scope_view(iam_context, assignee_id)
                permissions.append(perm)

            for field_source, field in [
                # from ProjectWriteSerializer used in create and partial update endpoints
                (request.data, 'source_storage.cloud_storage_id'),
                (request.data, 'target_storage.cloud_storage_id'),

                # from /backup, /annotations and /dataset endpoints
                (request.query_params, 'cloud_storage_id'),
            ]:
                field_path = field.split('.')
                if cloud_storage_id := _get_key(field_source, field_path):
                    permissions.append(CloudStoragePermission.create_scope_view(
                        iam_context, storage_id=cloud_storage_id))

        return permissions

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + '/projects/allow'

    @staticmethod
    def get_scopes(request, view, obj):
        Scopes = __class__.Scopes
        scope = {
            ('list', 'GET'): Scopes.LIST,
            ('create', 'POST'): Scopes.CREATE,
            ('destroy', 'DELETE'): Scopes.DELETE,
            ('partial_update', 'PATCH'): Scopes.UPDATE,
            ('retrieve', 'GET'): Scopes.VIEW,
            ('tasks', 'GET'): Scopes.VIEW,
            ('dataset', 'POST'): Scopes.IMPORT_DATASET,
            ('append_dataset_chunk', 'HEAD'): Scopes.IMPORT_DATASET,
            ('append_dataset_chunk', 'PATCH'): Scopes.IMPORT_DATASET,
            ('annotations', 'GET'): Scopes.EXPORT_ANNOTATIONS,
            ('dataset', 'GET'): Scopes.IMPORT_DATASET if request.query_params.get('action') == 'import_status' else Scopes.EXPORT_DATASET,
            ('export_dataset_v2', 'POST'): Scopes.EXPORT_DATASET if is_dataset_export(request) else Scopes.EXPORT_ANNOTATIONS,
            ('export_backup', 'GET'): Scopes.EXPORT_BACKUP,
            ('export_backup_v2', 'POST'): Scopes.EXPORT_BACKUP,
            ('import_backup', 'POST'): Scopes.IMPORT_BACKUP,
            ('append_backup_chunk', 'PATCH'): Scopes.IMPORT_BACKUP,
            ('append_backup_chunk', 'HEAD'): Scopes.IMPORT_BACKUP,
            ('preview', 'GET'): Scopes.VIEW,
        }[(view.action, request.method)]

        scopes = []
        if scope == Scopes.UPDATE:
            scopes.extend(__class__.get_per_field_update_scopes(request, {
                'owner_id': Scopes.UPDATE_OWNER,
                'assignee_id': Scopes.UPDATE_ASSIGNEE,
                'name': Scopes.UPDATE_DESC,
                'labels': Scopes.UPDATE_DESC,
                'bug_tracker': Scopes.UPDATE_DESC,
                'organization': Scopes.UPDATE_ORG,
                'source_storage': Scopes.UPDATE_ASSOCIATED_STORAGE,
                'target_storage': Scopes.UPDATE_ASSOCIATED_STORAGE,
            }))
        else:
            scopes.append(scope)

        return scopes

    @classmethod
    def create_scope_view(cls, request, project: Union[int, Project], iam_context=None):
        if isinstance(project, int):
            try:
                project = Project.objects.get(id=project)
            except Project.DoesNotExist as ex:
                raise ValidationError(str(ex))

        if not iam_context and request:
            iam_context = get_iam_context(request, project)

        return cls(**iam_context, obj=project, scope=__class__.Scopes.VIEW)

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

            membership = get_membership(request, organization)

        return cls(
            user_id=request.user.id,
            group_name=getattr(privilege, 'name', None),
            org_id=getattr(organization, 'id', None),
            org_owner_id=getattr(organization.owner, 'id', None)
                if organization else None,
            org_role=getattr(membership, 'role', None),
            scope=__class__.Scopes.CREATE)

    def get_resource(self):
        data = None
        if self.obj:
            data = {
                "id": self.obj.id,
                "owner": { "id": self.obj.owner_id },
                "assignee": { "id": self.obj.assignee_id },
                'organization': { "id": self.obj.organization_id },
            }
        elif self.scope in [__class__.Scopes.CREATE, __class__.Scopes.IMPORT_BACKUP]:
            data = {
                "id": None,
                "owner": { "id": self.user_id },
                "assignee": {
                    "id": self.assignee_id,
                } if self.assignee_id else None,
                'organization': {
                    "id": self.org_id,
                } if self.org_id else None,
            }

        return data

class TaskPermission(OpenPolicyAgentPermission):
    obj: Optional[Task]

    class Scopes(StrEnum):
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
        UPDATE_ASSOCIATED_STORAGE = 'update:associated_storage'
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
        VIEW_VALIDATION_LAYOUT = 'view:validation_layout'
        UPDATE_VALIDATION_LAYOUT = 'update:validation_layout'

    @classmethod
    def create(cls, request, view, obj, iam_context):
        permissions = []
        if view.basename == 'task':
            project_id = request.data.get('project_id') or request.data.get('project')
            assignee_id = request.data.get('assignee_id') or request.data.get('assignee')
            owner = request.data.get('owner_id') or request.data.get('owner')

            for scope in cls.get_scopes(request, view, obj):
                params = { 'project_id': project_id, 'assignee_id': assignee_id }

                if scope == __class__.Scopes.UPDATE_ORGANIZATION:
                    org_id = request.data.get('organization')
                    if obj is not None and obj.project is not None:
                        raise ValidationError('Cannot change the organization for '
                            'a task inside a project')
                    # FIX IT: TaskPermission doesn't have create_scope_create method
                    permissions.append(TaskPermission.create_scope_create(request, org_id))
                elif scope == __class__.Scopes.UPDATE_OWNER:
                    params['owner_id'] = owner

                self = cls.create_base_perm(request, view, scope, iam_context, obj, **params)
                permissions.append(self)

            if view.action == 'jobs':
                perm = JobPermission.create_scope_list(request, iam_context)
                permissions.append(perm)

            if owner:
                perm = UserPermission.create_scope_view(iam_context, owner)
                permissions.append(perm)

            if assignee_id:
                perm = UserPermission.create_scope_view(iam_context, assignee_id)
                permissions.append(perm)

            if project_id:
                perm = ProjectPermission.create_scope_view(request, int(project_id), iam_context)
                permissions.append(perm)

            for field_source, field in [
                # from TaskWriteSerializer being used in the create and partial_update endpoints
                (request.data, 'source_storage.cloud_storage_id'),
                (request.data, 'target_storage.cloud_storage_id'),

                # from DataSerializer being used in the /data endpoint
                (request.data, 'cloud_storage_id'),

                # from /backup, /annotations and /dataset endpoints
                (request.query_params, 'cloud_storage_id'),
            ]:
                field_path = field.split('.')
                if cloud_storage_id := _get_key(field_source, field_path):
                    permissions.append(CloudStoragePermission.create_scope_view(
                        iam_context, storage_id=cloud_storage_id))

        return permissions

    @classmethod
    def create_scope_view(cls, request, task: Union[int, Task], iam_context=None):
        if isinstance(task, int):
            try:
                task = Task.objects.get(id=task)
            except Task.DoesNotExist as ex:
                raise ValidationError(str(ex))

        if not iam_context and request:
            iam_context = get_iam_context(request, task)

        return cls(**iam_context, obj=task, scope=__class__.Scopes.VIEW)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + '/tasks/allow'

    @staticmethod
    def get_scopes(request, view, obj) -> list[Scopes]:
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
            ('export_dataset_v2', 'POST'): Scopes.EXPORT_DATASET if is_dataset_export(request) else Scopes.EXPORT_ANNOTATIONS,
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
            ('export_backup_v2', 'POST'): Scopes.EXPORT_BACKUP,
            ('preview', 'GET'): Scopes.VIEW,
            ('validation_layout', 'GET'): Scopes.VIEW_VALIDATION_LAYOUT,
            ('validation_layout', 'PATCH'): Scopes.UPDATE_VALIDATION_LAYOUT,
        }[(view.action, request.method)]

        scopes = []
        if scope == Scopes.CREATE:
            project_id = request.data.get('project_id') or request.data.get('project')
            if project_id:
                scope = Scopes.CREATE_IN_PROJECT

            scopes.append(scope)

        elif scope == Scopes.UPDATE:
            scopes.extend(__class__.get_per_field_update_scopes(request, {
                'owner_id': Scopes.UPDATE_OWNER,
                'assignee_id': Scopes.UPDATE_ASSIGNEE,
                'project_id': Scopes.UPDATE_PROJECT,
                'name': Scopes.UPDATE_DESC,
                'labels': Scopes.UPDATE_DESC,
                'bug_tracker': Scopes.UPDATE_DESC,
                'subset': Scopes.UPDATE_DESC,
                'organization': Scopes.UPDATE_ORGANIZATION,
                'source_storage': Scopes.UPDATE_ASSOCIATED_STORAGE,
                'target_storage': Scopes.UPDATE_ASSOCIATED_STORAGE,
            }))

        elif scope == Scopes.VIEW_ANNOTATIONS:
            if 'format' in request.query_params:
                scope = Scopes.EXPORT_ANNOTATIONS

            scopes.append(scope)

        elif scope == Scopes.UPDATE_ANNOTATIONS:
            if 'format' in request.query_params and request.method == 'PUT':
                scope = Scopes.IMPORT_ANNOTATIONS

            scopes.append(scope)

        else:
            scopes.append(scope)

        return scopes

    @classmethod
    def create_scope_view_data(cls, iam_context, task_id):
        try:
            obj = Task.objects.get(id=task_id)
        except Task.DoesNotExist as ex:
            raise ValidationError(str(ex))
        return cls(**iam_context, obj=obj, scope=__class__.Scopes.VIEW_DATA)

    def get_resource(self):
        data = None
        if self.obj:
            data = {
                "id": self.obj.id,
                "owner": { "id": self.obj.owner_id },
                "assignee": { "id": self.obj.assignee_id },
                'organization': { "id": self.obj.organization_id },
                "project": {
                    "owner": { "id": self.obj.project.owner_id },
                    "assignee": { "id": self.obj.project.assignee_id },
                    'organization': { "id": self.obj.project.organization_id },
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
                    "owner": { "id": project.owner_id },
                    "assignee": { "id": project.assignee_id },
                    'organization': {
                        "id": project.organization_id,
                    } if project.organization_id else None,
                } if project is not None else None,
            }

        return data

class JobPermission(OpenPolicyAgentPermission):
    task_id: Optional[int]
    obj: Optional[Job]

    class Scopes(StrEnum):
        CREATE = 'create'
        LIST = 'list'
        VIEW = 'view'
        UPDATE = 'update'
        UPDATE_ASSIGNEE = 'update:assignee'
        UPDATE_STAGE = 'update:stage'
        UPDATE_STATE = 'update:state'
        DELETE = 'delete'
        VIEW_ANNOTATIONS = 'view:annotations'
        UPDATE_ANNOTATIONS = 'update:annotations'
        DELETE_ANNOTATIONS = 'delete:annotations'
        IMPORT_ANNOTATIONS = 'import:annotations'
        EXPORT_ANNOTATIONS = 'export:annotations'
        EXPORT_DATASET = 'export:dataset'
        VIEW_DATA = 'view:data'
        VIEW_METADATA = 'view:metadata'
        UPDATE_METADATA = 'update:metadata'
        VIEW_VALIDATION_LAYOUT = 'view:validation_layout'
        UPDATE_VALIDATION_LAYOUT = 'update:validation_layout'

    @classmethod
    def create(cls, request, view, obj, iam_context):
        permissions = []
        if view.basename == 'job':
            task_id = request.data.get('task_id')
            for scope in cls.get_scopes(request, view, obj):
                scope_params = {}

                if scope == __class__.Scopes.CREATE:
                    scope_params['task_id'] = task_id

                    if task_id:
                        try:
                            task = Task.objects.get(id=task_id)
                        except Task.DoesNotExist as ex:
                            raise ValidationError(str(ex))

                        iam_context = get_iam_context(request, task)
                        permissions.append(TaskPermission.create_scope_view(
                            request, task, iam_context=iam_context
                        ))

                self = cls.create_base_perm(request, view, scope, iam_context, obj, **scope_params)
                permissions.append(self)

            if view.action == 'issues':
                perm = IssuePermission.create_scope_list(request, iam_context)
                permissions.append(perm)

            assignee_id = request.data.get('assignee')
            if assignee_id:
                perm = UserPermission.create_scope_view(iam_context, assignee_id)
                permissions.append(perm)

            for field_source, field in [
                # from /annotations and /dataset endpoints
                (request.query_params, 'cloud_storage_id'),
            ]:
                field_path = field.split('.')
                if cloud_storage_id := _get_key(field_source, field_path):
                    permissions.append(CloudStoragePermission.create_scope_view(
                        iam_context, storage_id=cloud_storage_id))

        return permissions

    @classmethod
    def create_scope_view_data(cls, iam_context, job_id):
        try:
            obj = Job.objects.get(id=job_id)
        except Job.DoesNotExist as ex:
            raise ValidationError(str(ex))
        return cls(**iam_context, obj=obj, scope='view:data')

    @classmethod
    def create_scope_view(cls, request, job: Union[int, Job], iam_context=None):
        if isinstance(job, int):
            try:
                job = Job.objects.get(id=job)
            except Job.DoesNotExist as ex:
                raise ValidationError(str(ex))

        if not iam_context and request:
            iam_context = get_iam_context(request, job)

        return cls(**iam_context, obj=job, scope=__class__.Scopes.VIEW)

    def __init__(self, **kwargs):
        self.task_id = kwargs.pop('task_id', None)
        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + '/jobs/allow'

    @staticmethod
    def get_scopes(request, view, obj):
        Scopes = __class__.Scopes
        scope = {
            ('list', 'GET'): Scopes.LIST,
            ('create', 'POST'): Scopes.CREATE,
            ('retrieve', 'GET'): Scopes.VIEW,
            ('partial_update', 'PATCH'): Scopes.UPDATE,
            ('destroy', 'DELETE'): Scopes.DELETE,
            ('annotations', 'GET'): Scopes.VIEW_ANNOTATIONS,
            ('annotations', 'PATCH'): Scopes.UPDATE_ANNOTATIONS,
            ('annotations', 'DELETE'): Scopes.DELETE_ANNOTATIONS,
            ('annotations', 'PUT'): Scopes.UPDATE_ANNOTATIONS,
            ('annotations', 'POST'): Scopes.IMPORT_ANNOTATIONS,
            ('append_annotations_chunk', 'PATCH'): Scopes.UPDATE_ANNOTATIONS,
            ('append_annotations_chunk', 'HEAD'): Scopes.UPDATE_ANNOTATIONS,
            ('data', 'GET'): Scopes.VIEW_DATA,
            ('metadata','GET'): Scopes.VIEW_METADATA,
            ('metadata','PATCH'): Scopes.UPDATE_METADATA,
            ('issues', 'GET'): Scopes.VIEW,
            ('dataset_export', 'GET'): Scopes.EXPORT_DATASET,
            ('export_dataset_v2', 'POST'): Scopes.EXPORT_DATASET if is_dataset_export(request) else Scopes.EXPORT_ANNOTATIONS,
            ('preview', 'GET'): Scopes.VIEW,
            ('validation_layout', 'GET'): Scopes.VIEW_VALIDATION_LAYOUT,
            ('validation_layout', 'PATCH'): Scopes.UPDATE_VALIDATION_LAYOUT,
        }[(view.action, request.method)]

        scopes = []
        if scope == Scopes.UPDATE:
            scopes.extend(__class__.get_per_field_update_scopes(request, {
                'assignee': Scopes.UPDATE_ASSIGNEE,
                'stage': Scopes.UPDATE_STAGE,
                'state': Scopes.UPDATE_STATE,
            }))
        elif scope == Scopes.VIEW_ANNOTATIONS:
            if 'format' in request.query_params:
                scope = Scopes.EXPORT_ANNOTATIONS

            scopes.append(scope)
        elif scope == Scopes.UPDATE_ANNOTATIONS:
            if 'format' in request.query_params and request.method == 'PUT':
                scope = Scopes.IMPORT_ANNOTATIONS

            scopes.append(scope)
        else:
            scopes.append(scope)

        return scopes

    def get_resource(self):
        data = None
        if self.obj:
            if self.obj.segment.task.project:
                organization_id = self.obj.segment.task.project.organization_id
            else:
                organization_id = self.obj.segment.task.organization_id

            data = {
                "id": self.obj.id,
                "assignee": { "id": self.obj.assignee_id },
                'organization': { "id": organization_id },
                "task": {
                    "owner": { "id": self.obj.segment.task.owner_id },
                    "assignee": { "id": self.obj.segment.task.assignee_id }
                },
                "project": {
                    "owner": { "id": self.obj.segment.task.project.owner_id },
                    "assignee": { "id": self.obj.segment.task.project.assignee_id }
                } if self.obj.segment.task.project else None
            }
        elif self.scope == __class__.Scopes.CREATE:
            if self.task_id is None:
                raise ValidationError("task_id is not specified")
            task = Task.objects.get(id=self.task_id)

            if task.project:
                organization_id = task.project.organization_id
            else:
                organization_id = task.organization_id

            data = {
                'organization': { "id": organization_id },
                "task": {
                    "owner": { "id": task.owner_id },
                    "assignee": { "id": task.assignee_id }
                },
                "project": {
                    "owner": { "id": task.project.owner_id },
                    "assignee": { "id": task.project.assignee_id }
                } if task.project else None
            }

        return data

class CommentPermission(OpenPolicyAgentPermission):
    obj: Optional[Comment]

    class Scopes(StrEnum):
        LIST = 'list'
        CREATE  = 'create'
        CREATE_IN_ISSUE  = 'create@issue'
        DELETE = 'delete'
        UPDATE = 'update'
        VIEW = 'view'

    @classmethod
    def create(cls, request, view, obj, iam_context):
        permissions = []
        if view.basename == 'comment':
            for scope in cls.get_scopes(request, view, obj):
                self = cls.create_base_perm(request, view, scope, iam_context, obj,
                    issue_id=request.data.get('issue'))
                permissions.append(self)

        return permissions

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + '/comments/allow'

    @staticmethod
    def get_scopes(request, view, obj):
        Scopes = __class__.Scopes
        return [{
            'list': Scopes.LIST,
            'create': Scopes.CREATE_IN_ISSUE,
            'destroy': Scopes.DELETE,
            'partial_update': Scopes.UPDATE,
            'retrieve': Scopes.VIEW,
        }[view.action]]

    def get_resource(self):
        data = None
        def get_common_data(db_issue):
            if db_issue.job.segment.task.project:
                organization_id = db_issue.job.segment.task.project.organization_id
            else:
                organization_id = db_issue.job.segment.task.organization_id

            data = {
                "project": {
                    "owner": { "id": db_issue.job.segment.task.project.owner_id },
                    "assignee": { "id": db_issue.job.segment.task.project.assignee_id }
                } if db_issue.job.segment.task.project else None,
                "task": {
                    "owner": { "id": db_issue.job.segment.task.owner_id},
                    "assignee": { "id": db_issue.job.segment.task.assignee_id }
                },
                "job": {
                    "assignee": { "id": db_issue.job.assignee_id }
                },
                "issue": {
                    "owner": { "id": db_issue.owner_id},
                    "assignee": { "id": db_issue.assignee_id }
                },
                'organization': { "id": organization_id }
            }

            return data

        if self.obj:
            db_issue = self.obj.issue
            data = get_common_data(db_issue)
            data.update({
                "id": self.obj.id,
                "owner": { "id": getattr(self.obj.owner, 'id', None) }
            })
        elif self.scope.startswith(__class__.Scopes.CREATE):
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
    obj: Optional[Issue]

    class Scopes(StrEnum):
        LIST = 'list'
        CREATE  = 'create'
        CREATE_IN_JOB  = 'create@job'
        DELETE = 'delete'
        UPDATE = 'update'
        VIEW = 'view'

    @classmethod
    def create(cls, request, view, obj, iam_context):
        permissions = []
        if view.basename == 'issue':
            assignee_id = request.data.get('assignee')
            for scope in cls.get_scopes(request, view, obj):
                self = cls.create_base_perm(request, view, scope, iam_context, obj,
                    job_id=request.data.get('job'),
                    assignee_id=assignee_id)
                permissions.append(self)

            if assignee_id:
                perm = UserPermission.create_scope_view(iam_context, assignee_id)
                permissions.append(perm)

        return permissions

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + '/issues/allow'

    @staticmethod
    def get_scopes(request, view, obj):
        Scopes = __class__.Scopes
        return [{
            'list': Scopes.LIST,
            'create': Scopes.CREATE_IN_JOB,
            'destroy': Scopes.DELETE,
            'partial_update': Scopes.UPDATE,
            'retrieve': Scopes.VIEW,
            'comments': Scopes.VIEW,
        }[view.action]]

    def get_resource(self):
        data = None
        def get_common_data(db_job):
            if db_job.segment.task.project:
                organization_id = db_job.segment.task.project.organization_id
            else:
                organization_id = db_job.segment.task.organization_id

            data = {
                "project": {
                    "owner": { "id": db_job.segment.task.project.owner_id },
                    "assignee": { "id": db_job.segment.task.project.assignee_id }
                } if db_job.segment.task.project else None,
                "task": {
                    "owner": { "id": db_job.segment.task.owner_id },
                    "assignee": { "id": db_job.segment.task.assignee_id }
                },
                "job": {
                    "assignee": { "id": db_job.assignee_id }
                },
                'organization': {
                    "id": organization_id
                }
            }

            return data

        if self.obj:
            db_job = self.obj.job
            data = get_common_data(db_job)
            data.update({
                "id": self.obj.id,
                "owner": { "id": self.obj.owner_id },
                "assignee": { "id": self.obj.assignee_id }
            })
        elif self.scope.startswith(__class__.Scopes.CREATE):
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


class LabelPermission(OpenPolicyAgentPermission):
    obj: Optional[Label]

    class Scopes(StrEnum):
        LIST = 'list'
        DELETE = 'delete'
        UPDATE = 'update'
        VIEW = 'view'

    @classmethod
    def create(cls, request, view, obj, iam_context):
        Scopes = __class__.Scopes

        permissions = []
        if view.basename == 'label':
            for scope in cls.get_scopes(request, view, obj):
                if scope in [Scopes.DELETE, Scopes.UPDATE, Scopes.VIEW]:
                    obj = cast(Label, obj)

                    # Access rights are the same as in the owning objects
                    # Job assignees are not supposed to work with separate labels.
                    # They should only use the list operation.
                    if obj.project:
                        if scope == Scopes.VIEW:
                            owning_perm_scope = ProjectPermission.Scopes.VIEW
                        else:
                            owning_perm_scope = ProjectPermission.Scopes.UPDATE_DESC

                        owning_perm = ProjectPermission.create_base_perm(
                            request, view, owning_perm_scope, iam_context, obj=obj.project
                        )
                    else:
                        if scope == Scopes.VIEW:
                            owning_perm_scope = TaskPermission.Scopes.VIEW
                        else:
                            owning_perm_scope = TaskPermission.Scopes.UPDATE_DESC

                        owning_perm = TaskPermission.create_base_perm(
                            request, view, owning_perm_scope, iam_context, obj=obj.task,
                        )

                    # This component doesn't define its own rules for these cases
                    permissions.append(owning_perm)
                elif scope == Scopes.LIST and isinstance(obj, Job):
                    permissions.append(JobPermission.create_base_perm(
                        request, view, JobPermission.Scopes.VIEW, iam_context, obj=obj,
                    ))
                elif scope == Scopes.LIST and isinstance(obj, Task):
                    permissions.append(TaskPermission.create_base_perm(
                        request, view, TaskPermission.Scopes.VIEW, iam_context, obj=obj,
                    ))
                elif scope == Scopes.LIST and isinstance(obj, Project):
                    permissions.append(ProjectPermission.create_base_perm(
                        request, view, ProjectPermission.Scopes.VIEW, iam_context, obj=obj,
                    ))
                else:
                    permissions.append(cls.create_base_perm(request, view, scope, iam_context, obj))

        return permissions

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + '/labels/allow'

    @staticmethod
    def get_scopes(request, view, obj):
        Scopes = __class__.Scopes
        return [{
            'list': Scopes.LIST,
            'destroy': Scopes.DELETE,
            'partial_update': Scopes.UPDATE,
            'retrieve': Scopes.VIEW,
        }[view.action]]

    def get_resource(self):
        data = None

        if self.obj:
            if self.obj.project:
                organization_id = self.obj.project.organization_id
            else:
                organization_id = self.obj.task.organization_id

            data = {
                "id": self.obj.id,
                'organization': { "id": organization_id },
                "task": {
                    "owner": { "id": self.obj.task.owner_id },
                    "assignee": { "id": self.obj.task.assignee_id }
                } if self.obj.task else None,
                "project": {
                    "owner": { "id": self.obj.project.owner_id },
                    "assignee": { "id": self.obj.project.assignee_id }
                } if self.obj.project else None,
            }

        return data

class AnnotationGuidePermission(OpenPolicyAgentPermission):
    obj: Optional[AnnotationGuide]

    class Scopes(StrEnum):
        VIEW = 'view'
        UPDATE = 'update'
        DELETE = 'delete'
        CREATE  = 'create'

    @classmethod
    def create(cls, request, view, obj, iam_context):
        permissions = []

        if view.basename == 'annotationguide':
            project_id = request.data.get('project_id')
            task_id = request.data.get('task_id')
            params = { 'project_id': project_id, 'task_id': task_id }

            for scope in cls.get_scopes(request, view, obj):
                self = cls.create_base_perm(request, view, scope, iam_context, obj, **params)
                permissions.append(self)

        return permissions

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + '/annotationguides/allow'

    @staticmethod
    def get_scopes(request, view, obj):
        Scopes = __class__.Scopes
        return [{
            'create': Scopes.CREATE,
            'destroy': Scopes.DELETE,
            'partial_update': Scopes.UPDATE,
            'retrieve': Scopes.VIEW,
        }[view.action]]

    def get_resource(self):
        data = {}
        if self.obj:
            db_target = self.obj.target
            data.update({
                'id': self.obj.id,
                'target': {
                    'owner': { 'id': db_target.owner_id },
                    'assignee': { 'id': db_target.assignee_id },
                    'is_job_staff': db_target.is_job_staff(self.user_id),
                },
                'organization': { 'id': self.obj.organization_id }
            })
        elif self.scope == __class__.Scopes.CREATE:
            db_target = None
            if self.project_id is not None:
                try:
                    db_target = Project.objects.get(id=self.project_id)
                except Project.DoesNotExist as ex:
                    raise ValidationError(str(ex))
            elif self.task_id is not None:
                try:
                    db_target = Task.objects.get(id=self.task_id)
                except Task.DoesNotExist as ex:
                    raise ValidationError(str(ex))

            organization_id = getattr(db_target, 'organization_id', None)
            data.update({
                'target': {
                    'owner': { 'id': getattr(db_target, "owner_id", None) },
                    'assignee': { 'id': getattr(db_target, "assignee_id", None) },
                },
                'organization': { 'id': organization_id }
            })
        return data

class GuideAssetPermission(OpenPolicyAgentPermission):
    class Scopes(StrEnum):
        VIEW = 'view'
        DELETE = 'delete'
        CREATE  = 'create'

    @classmethod
    def create(cls, request, view, obj, iam_context):
        Scopes = __class__.Scopes
        permissions = []

        if view.basename == 'asset':
            for scope in cls.get_scopes(request, view, obj):
                if scope == Scopes.VIEW and isinstance(obj, AnnotationGuide):
                    permissions.append(AnnotationGuidePermission.create_base_perm(
                        request, view, AnnotationGuidePermission.Scopes.VIEW, iam_context, obj=obj)
                    )
                if scope == Scopes.DELETE and isinstance(obj, AnnotationGuide):
                    permissions.append(AnnotationGuidePermission.create_base_perm(
                        request, view, AnnotationGuidePermission.Scopes.UPDATE, iam_context, obj=obj)
                    )
                if scope == Scopes.CREATE:
                    guide_id = request.data.get('guide_id')
                    try:
                        obj = AnnotationGuide.objects.get(id=guide_id)
                        permissions.append(AnnotationGuidePermission.create_base_perm(
                            request, view, AnnotationGuidePermission.Scopes.UPDATE, iam_context, obj=obj)
                        )
                    except AnnotationGuide.DoesNotExist as ex:
                        raise ValidationError(str(ex))

        return permissions

    @staticmethod
    def get_scopes(request, view, obj):
        Scopes = __class__.Scopes
        return [{
            'create': Scopes.CREATE,
            'destroy': Scopes.DELETE,
            'retrieve': Scopes.VIEW,
        }[view.action]]


class RequestPermission(OpenPolicyAgentPermission):
    class Scopes(StrEnum):
        LIST = 'list'
        VIEW = 'view'
        CANCEL = 'cancel'

    @classmethod
    def create(cls, request, view, obj: Optional[RQJob], iam_context: dict):
        permissions = []
        if view.basename == 'request':
            for scope in cls.get_scopes(request, view, obj):
                if scope != cls.Scopes.LIST:
                    user_id = request.user.id
                    if not is_rq_job_owner(obj, user_id):
                        raise PermissionDenied('You don\'t have permission to perform this action')

        return permissions

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + '/requests/allow'

    @staticmethod
    def get_scopes(request, view, obj) -> list[Scopes]:
        Scopes = __class__.Scopes
        return [{
            ('list', 'GET'): Scopes.LIST,
            ('retrieve', 'GET'): Scopes.VIEW,
            ('cancel', 'POST'): Scopes.CANCEL,
        }[(view.action, request.method)]]


    def get_resource(self):
        return None

def get_cloud_storage_for_import_or_export(
    storage_id: int, *, request, is_default: bool = False
) -> CloudStorage:
    perm = CloudStoragePermission.create_scope_view(None, storage_id=storage_id, request=request)
    result = perm.check_access()
    if not result.allow:
        if is_default:
            # In this case, the user did not specify the location explicitly
            error_message = "A cloud storage is selected as the default location. "
        else:
            error_message = ""
        error_message += "You don't have access to this cloud storage"
        raise PermissionDenied(error_message)

    return get_object_or_404(CloudStorage, pk=storage_id)
