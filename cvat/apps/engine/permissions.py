# Copyright (C) 2022 Intel Corporation
# Copyright (C) 2022-2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from collections import namedtuple
from typing import Any, Dict, List, Optional, Sequence, Union, cast

from django.conf import settings

from rest_framework.exceptions import ValidationError

from cvat.apps.iam.permissions import (
    OpenPolicyAgentPermission, StrEnum, get_iam_context, get_membership
)
from cvat.apps.organizations.models import Organization

from .models import AnnotationGuide, CloudStorage, Issue, Job, Label, Project, Task

def _get_key(d: Dict[str, Any], key_path: Union[str, Sequence[str]]) -> Optional[Any]:
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
        }.get((view.action, request.method))]

    def get_resource(self):
        return None

class UserPermission(OpenPolicyAgentPermission):
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
        }.get(view.action)]

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
        }.get(view.action)]

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
                'owner': { 'id': getattr(self.obj.owner, 'id', None) },
                'organization': {
                    'id': self.obj.organization.id
                } if self.obj.organization else None
            }

        return data

class ProjectPermission(OpenPolicyAgentPermission):
    class Scopes(StrEnum):
        LIST = 'list'
        CREATE = 'create'
        DELETE = 'delete'
        UPDATE = 'update'
        UPDATE_OWNER = 'update:owner'
        UPDATE_ASSIGNEE = 'update:assignee'
        UPDATE_DESC = 'update:desc'
        UPDATE_ORG = 'update:organization'
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
            ('export_backup', 'GET'): Scopes.EXPORT_BACKUP,
            ('import_backup', 'POST'): Scopes.IMPORT_BACKUP,
            ('append_backup_chunk', 'PATCH'): Scopes.IMPORT_BACKUP,
            ('append_backup_chunk', 'HEAD'): Scopes.IMPORT_BACKUP,
            ('preview', 'GET'): Scopes.VIEW,
        }.get((view.action, request.method))

        scopes = []
        if scope == Scopes.UPDATE:
            if any(k in request.data for k in ('owner_id', 'owner')):
                owner_id = request.data.get('owner_id') or request.data.get('owner')
                if owner_id != getattr(obj.owner, 'id', None):
                    scopes.append(Scopes.UPDATE_OWNER)
            if any(k in request.data for k in ('assignee_id', 'assignee')):
                assignee_id = request.data.get('assignee_id') or request.data.get('assignee')
                if assignee_id != getattr(obj.assignee, 'id', None):
                    scopes.append(Scopes.UPDATE_ASSIGNEE)
            for field in ('name', 'labels', 'bug_tracker'):
                if field in request.data:
                    scopes.append(Scopes.UPDATE_DESC)
                    break
            if 'organization' in request.data:
                scopes.append(Scopes.UPDATE_ORG)
        else:
            scopes.append(scope)

        return scopes

    @classmethod
    def create_scope_view(cls, iam_context, project_id):
        try:
            obj = Project.objects.get(id=project_id)
        except Project.DoesNotExist as ex:
            raise ValidationError(str(ex))
        return cls(**iam_context, obj=obj, scope=__class__.Scopes.VIEW)

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
                "owner": { "id": getattr(self.obj.owner, 'id', None) },
                "assignee": { "id": getattr(self.obj.assignee, 'id', None) },
                'organization': {
                    "id": getattr(self.obj.organization, 'id', None)
                }
            }
        elif self.scope in [__class__.Scopes.CREATE, __class__.Scopes.IMPORT_BACKUP]:
            data = {
                "id": None,
                "owner": { "id": self.user_id },
                "assignee": {
                    "id": self.assignee_id,
                } if getattr(self, 'assignee_id', None) else None,
                'organization': {
                    "id": self.org_id,
                } if self.org_id else None,
            }

        return data

class TaskPermission(OpenPolicyAgentPermission):
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
                perm = ProjectPermission.create_scope_view(iam_context, project_id)
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
    def get_scopes(request, view, obj) -> List[Scopes]:
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
            ('preview', 'GET'): Scopes.VIEW,
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

class JobPermission(OpenPolicyAgentPermission):
    task_id: Optional[int]

    class Scopes(StrEnum):
        CREATE = 'create'
        LIST = 'list'
        VIEW = 'view'
        UPDATE = 'update'
        UPDATE_ASSIGNEE = 'update:assignee'
        UPDATE_OWNER = 'update:owner'
        UPDATE_PROJECT = 'update:project'
        UPDATE_STAGE = 'update:stage'
        UPDATE_STATE = 'update:state'
        UPDATE_DESC = 'update:desc'
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
    def create_scope_view(cls, iam_context, job_id):
        try:
            obj = Job.objects.get(id=job_id)
        except Job.DoesNotExist as ex:
            raise ValidationError(str(ex))
        return cls(**iam_context, obj=obj, scope=__class__.Scopes.VIEW)

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
            ('preview', 'GET'): Scopes.VIEW,
        }.get((view.action, request.method))

        scopes = []
        if scope == Scopes.UPDATE:
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
            if 'stage' in request.data:
                scopes.append(Scopes.UPDATE_STAGE)
            if 'state' in request.data:
                scopes.append(Scopes.UPDATE_STATE)

            if any(k in request.data for k in ('name', 'labels', 'bug_tracker', 'subset')):
                scopes.append(Scopes.UPDATE_DESC)
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
        elif self.scope == __class__.Scopes.CREATE:
            if self.task_id is None:
                raise ValidationError("task_id is not specified")
            task = Task.objects.get(id=self.task_id)

            if task.project:
                organization = task.project.organization
            else:
                organization = task.organization

            data = {
                'organization': {
                    "id": getattr(organization, 'id', None)
                },
                "task": {
                    "owner": { "id": getattr(task.owner, 'id', None) },
                    "assignee": { "id": getattr(task.assignee, 'id', None) }
                },
                "project": {
                    "owner": { "id": getattr(task.project.owner, 'id', None) },
                    "assignee": { "id": getattr(task.project.assignee, 'id', None) }
                } if task.project else None
            }

        return data

class CommentPermission(OpenPolicyAgentPermission):
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
        }.get(view.action, None)]

    def get_resource(self):
        data = None

        if self.obj:
            if self.obj.project:
                organization = self.obj.project.organization
            else:
                organization = self.obj.task.organization

            data = {
                "id": self.obj.id,
                'organization': {
                    "id": getattr(organization, 'id', None)
                },
                "task": {
                    "owner": { "id": getattr(self.obj.task.owner, 'id', None) },
                    "assignee": { "id": getattr(self.obj.task.assignee, 'id', None) }
                } if self.obj.task else None,
                "project": {
                    "owner": { "id": getattr(self.obj.project.owner, 'id', None) },
                    "assignee": { "id": getattr(self.obj.project.assignee, 'id', None) }
                } if self.obj.project else None,
            }

        return data

class AnnotationGuidePermission(OpenPolicyAgentPermission):
    class Scopes(StrEnum):
        VIEW = 'view'
        UPDATE = 'update'
        DELETE = 'delete'
        CREATE  = 'create'

    @classmethod
    def create(cls, request, view, obj, iam_context):
        Scopes = __class__.Scopes
        permissions = []

        if view.basename == 'annotationguide':
            project_id = request.data.get('project_id')
            task_id = request.data.get('task_id')
            params = { 'project_id': project_id, 'task_id': task_id }

            for scope in cls.get_scopes(request, view, obj):
                if scope == Scopes.VIEW and isinstance(obj, Job):
                    permissions.append(JobPermission.create_base_perm(
                        request, view, JobPermission.Scopes.VIEW, iam_context, obj=obj,
                    ))
                else:
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
        }.get(view.action, None)]

    def get_resource(self):
        data = {}
        if self.obj:
            db_target = getattr(self.obj, 'target', {})
            db_organization = getattr(db_target, 'organization', {})
            data.update({
                'id': self.obj.id,
                'target': {
                    'owner': { 'id': getattr(getattr(db_target, 'owner', {}), 'id', None) },
                    'assignee': { 'id': getattr(getattr(db_target, 'assignee', {}), 'id', None) },
                    'is_job_staff': db_target.is_job_staff(self.user_id),
                },
                'organization': { 'id': getattr(db_organization, 'id', None) }
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
            db_organization = getattr(db_target, 'organization', {})
            data.update({
                'target': {
                    'owner': { 'id': db_target.owner.id },
                    'assignee': { 'id': getattr(db_target.assignee, 'id', None) }
                },
                'organization': { 'id': getattr(db_organization, 'id', None) }
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
        }.get(view.action, None)]
