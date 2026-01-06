# Copyright (C) 2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from collections import namedtuple
from collections.abc import Sequence
from typing import TYPE_CHECKING, Any, cast

from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import PermissionDenied, ValidationError

from cvat.apps.engine.rq import ExportRequestId
from cvat.apps.engine.types import ExtendedRequest
from cvat.apps.engine.utils import is_dataset_export
from cvat.apps.iam.permissions import (
    OpenPolicyAgentPermission,
    StrEnum,
    build_iam_context,
    get_iam_context,
    get_membership,
)
from cvat.apps.organizations.models import Organization

from .location import StorageType, get_location_configuration
from .models import (
    AnnotationGuide,
    CloudStorage,
    Comment,
    Issue,
    Job,
    Label,
    Location,
    Project,
    Task,
    User,
)

if TYPE_CHECKING:
    from rest_framework.viewsets import ViewSet

    from cvat.apps.iam.permissions import IamContext

def _get_key(d: dict[str, Any], key_path: str | Sequence[str]) -> Any | None:
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

class DownloadExportedExtension:
    rq_job_id: ExportRequestId | None

    class Scopes(StrEnum):
        DOWNLOAD_EXPORTED_FILE = 'download:exported_file'

    @staticmethod
    def extend_params_with_rq_job_details(*, request: ExtendedRequest, params: dict[str, Any]) -> None:
        # prevent importing from partially initialized module
        from cvat.apps.redis_handler.background import AbstractExporter

        if rq_id := request.query_params.get("rq_id"):
            try:
                params["rq_job_id"] = ExportRequestId.parse_and_validate_queue(rq_id, expected_queue=AbstractExporter.QUEUE_NAME, try_legacy_format=True)
                return
            except Exception:
                raise ValidationError("Unexpected request id format")

        raise ValidationError("Missing request id in the query parameters")

    def extend_resource_with_rq_job_details(self, data: dict[str, Any]) -> None:
        data["rq_job"] = {
            "owner": {
                "id": self.rq_job_id.user_id if self.rq_job_id else None
            }
        }

class ExportableResourceExtension:
    location: Location

    @classmethod
    def update_scope_params(
        cls: type[OpenPolicyAgentPermission],
        scope_params: dict[str, Any],
        *,
        request: ExtendedRequest,
        db_instance: Project | Task | Job
    ):
        location_configuration = get_location_configuration(
            request.query_params, field_name=StorageType.TARGET, db_instance=db_instance
        )
        scope_params['location'] = location_configuration.location

    def update_resource_data(self, resource_data: dict[str, Any]):
        resource_data["destination"] = self.location


class ServerPermission(OpenPolicyAgentPermission):
    class Scopes(StrEnum):
        VIEW = 'view'
        LIST_CONTENT = 'list:content'

    @classmethod
    def create(cls, request: ExtendedRequest, view: ViewSet, obj: None, iam_context: dict[str, Any]) -> list[OpenPolicyAgentPermission]:
        permissions = []
        for scope in cls.get_scopes(request, view, obj):
            self = cls.create_base_perm(request, view, scope, iam_context, obj)
            permissions.append(self)

        return permissions

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + '/server/allow'

    @classmethod
    def _get_scopes(cls, request: ExtendedRequest, view: ViewSet, obj: None):
        Scopes = cls.Scopes
        return [{
            ('annotation_formats', 'GET'): Scopes.VIEW,
            ('about', 'GET'): Scopes.VIEW,
            ('plugins', 'GET'): Scopes.VIEW,
            ('share', 'GET'): Scopes.LIST_CONTENT,
        }[(view.action, request.method)]]

    def get_resource(self):
        return None

class UserPermission(OpenPolicyAgentPermission):
    obj: User | None

    class Scopes(StrEnum):
        LIST = 'list'
        VIEW = 'view'
        UPDATE = 'update'
        DELETE = 'delete'

    @classmethod
    def create(cls, request: ExtendedRequest, view: ViewSet, obj: User | None, iam_context: dict[str, Any]):
        permissions = []
        for scope in cls.get_scopes(request, view, obj):
            self = cls.create_base_perm(request, view, scope, iam_context, obj)
            permissions.append(self)

        return permissions

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + '/users/allow'

    @classmethod
    def _get_scopes(cls, request: ExtendedRequest, view: ViewSet, obj: User | None):
        Scopes = cls.Scopes
        return [{
            'list': Scopes.LIST,
            'self': Scopes.VIEW,
            'retrieve': Scopes.VIEW,
            'partial_update': Scopes.UPDATE,
            'destroy': Scopes.DELETE,
        }[view.action]]

    @classmethod
    def create_scope_view(cls, iam_context: dict[str, Any], user_id: int | str):
        obj = namedtuple('User', ['id'])(id=int(user_id))
        return cls(**iam_context, scope=cls.Scopes.VIEW, obj=obj)

    def get_resource(self):
        data = None
        if self.obj:
            data = {
                'id': self.obj.id
            }
        elif self.scope == self.Scopes.VIEW: # self
            data = {
                'id': self.user_id
            }

        if data:
            data['membership'] = { 'role': self.org_role if self.org_id else None }

        return data

class CloudStoragePermission(OpenPolicyAgentPermission):
    obj: CloudStorage | None

    class Scopes(StrEnum):
        LIST = 'list'
        LIST_CONTENT = 'list:content'
        CREATE = 'create'
        VIEW = 'view'
        UPDATE = 'update'
        DELETE = 'delete'

    @classmethod
    def create(cls, request: ExtendedRequest, view: ViewSet, obj: CloudStorage | None, iam_context: dict[str, Any]) -> list[OpenPolicyAgentPermission]:
        permissions = []
        for scope in cls.get_scopes(request, view, obj):
            self = cls.create_base_perm(request, view, scope, iam_context, obj)
            permissions.append(self)

        return permissions

    @classmethod
    def create_scope_view(cls, iam_context: dict[str, Any], storage_id: int, request: ExtendedRequest | None = None):
        try:
            obj = CloudStorage.objects.get(id=storage_id)
        except CloudStorage.DoesNotExist as ex:
            raise ValidationError(str(ex))

        if not iam_context and request:
            iam_context = get_iam_context(request, obj)

        return cls(**iam_context, obj=obj, scope=cls.Scopes.VIEW)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + '/cloudstorages/allow'

    @classmethod
    def _get_scopes(cls, request: ExtendedRequest, view: ViewSet, obj: CloudStorage | None):
        Scopes = cls.Scopes
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

class ProjectPermission(
    OpenPolicyAgentPermission, DownloadExportedExtension, ExportableResourceExtension
):
    obj: Project | None

    class Scopes(StrEnum):
        CREATE = 'create'
        DELETE = 'delete'
        EXPORT_ANNOTATIONS = 'export:annotations'
        EXPORT_BACKUP = 'export:backup'
        EXPORT_DATASET = 'export:dataset'
        IMPORT_BACKUP = 'import:backup'
        IMPORT_DATASET = 'import:dataset'
        LIST = 'list'
        UPDATE = 'update'
        UPDATE_ASSIGNEE = 'update:assignee'
        UPDATE_ASSOCIATED_STORAGE = 'update:associated_storage'
        UPDATE_DESC = 'update:desc'
        UPDATE_ORGANIZATION = 'update:organization'
        UPDATE_OWNER = 'update:owner'
        VIEW = 'view'

    @classmethod
    def create(cls, request: ExtendedRequest, view: ViewSet, obj: Project | None, iam_context: dict[str, Any]) -> list[OpenPolicyAgentPermission]:
        permissions = []
        assignee_id = request.data.get('assignee_id') or request.data.get('assignee')
        owner_id = request.data.get('owner_id') or request.data.get('owner')

        scopes = cls.get_scopes(request, view, obj)

        if cls.Scopes.UPDATE_ORGANIZATION in scopes:
            # consider this case as deleting a project in the org A and creating a new one in the org B
            permissions.append(cls.create_base_perm(
                request, view, cls.Scopes.DELETE, iam_context, obj, assignee_id=assignee_id
            ))

            if dst_org_id := request.data['organization_id']:
                try:
                    dst_org = Organization.objects.get(pk=dst_org_id)
                except Organization.DoesNotExist:
                    raise ValidationError("Invalid org id")
                dst_iam_context = get_iam_context(request, dst_org)
            else:
                # do not use here get_iam_context since it checks also org_id/org_slug query params and X-Organization header
                dst_iam_context = build_iam_context(request, None, None)
            permissions.append(cls.create_base_perm(
                request, view, cls.Scopes.CREATE, dst_iam_context, assignee_id=assignee_id
            ))
            scopes.remove(cls.Scopes.UPDATE_ORGANIZATION)

        for scope in scopes:
            params = { 'assignee_id': assignee_id }
            if scope == cls.Scopes.UPDATE_OWNER:
                params['owner_id'] = owner_id

            params.update(cls.get_scope_specific_params(
                scope=scope, request=request, view=view, obj=obj, iam_context=iam_context
            ))

            self = cls.create_base_perm(request, view, scope, iam_context, obj, **params)
            permissions.append(self)


        if owner_id:
            perm = UserPermission.create_scope_view(iam_context, owner_id)
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

    @classmethod
    def _get_scopes(cls, request: ExtendedRequest, view: ViewSet, obj: Project | None):
        Scopes = cls.Scopes
        scope = {
            ('list', 'GET'): Scopes.LIST,
            ('create', 'POST'): Scopes.CREATE,
            ('destroy', 'DELETE'): Scopes.DELETE,
            ('partial_update', 'PATCH'): Scopes.UPDATE,
            ('retrieve', 'GET'): Scopes.VIEW,
            ('dataset', 'POST'): Scopes.IMPORT_DATASET,
            ('append_dataset_chunk', 'HEAD'): Scopes.IMPORT_DATASET,
            ('append_dataset_chunk', 'PATCH'): Scopes.IMPORT_DATASET,
            ('initiate_dataset_export', 'POST'): Scopes.EXPORT_DATASET if is_dataset_export(request) else Scopes.EXPORT_ANNOTATIONS,
            ('initiate_backup_export', 'POST'): Scopes.EXPORT_BACKUP,
            ('import_backup', 'POST'): Scopes.IMPORT_BACKUP,
            ('append_backup_chunk', 'PATCH'): Scopes.IMPORT_BACKUP,
            ('append_backup_chunk', 'HEAD'): Scopes.IMPORT_BACKUP,
            ('preview', 'GET'): Scopes.VIEW,
            ('download_dataset', 'GET'): DownloadExportedExtension.Scopes.DOWNLOAD_EXPORTED_FILE,
            ('download_backup', 'GET'): DownloadExportedExtension.Scopes.DOWNLOAD_EXPORTED_FILE,
            # FUTURE-TODO: delete this after dropping support for deprecated API
            ('annotations', 'GET'): Scopes.EXPORT_ANNOTATIONS,
            ('dataset', 'GET'): Scopes.IMPORT_DATASET if request.query_params.get('action') == 'import_status' else Scopes.EXPORT_DATASET,
            ('export_backup', 'GET'): Scopes.EXPORT_BACKUP,

        }[(view.action, request.method)]

        scopes = []
        if scope == Scopes.UPDATE:
            scopes.extend(cls.get_per_field_update_scopes(request, {
                'owner_id': Scopes.UPDATE_OWNER,
                'assignee_id': Scopes.UPDATE_ASSIGNEE,
                'name': Scopes.UPDATE_DESC,
                'labels': Scopes.UPDATE_DESC,
                'bug_tracker': Scopes.UPDATE_DESC,
                'organization_id': Scopes.UPDATE_ORGANIZATION,
                'source_storage': Scopes.UPDATE_ASSOCIATED_STORAGE,
                'target_storage': Scopes.UPDATE_ASSOCIATED_STORAGE,
            }))
        else:
            scopes.append(scope)

        return scopes

    @classmethod
    def create_scope_view(cls, request: ExtendedRequest, project: int | Project, iam_context: dict[str, Any] | None = None):
        if isinstance(project, int):
            try:
                project = Project.objects.get(id=project)
            except Project.DoesNotExist as ex:
                raise ValidationError(str(ex))

        if not iam_context and request:
            iam_context = get_iam_context(request, project)

        return cls(**iam_context, obj=project, scope=cls.Scopes.VIEW)

    @classmethod
    def create_scope_create(cls, request: ExtendedRequest, org_id: int | None):
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
            scope=cls.Scopes.CREATE)

    @classmethod
    def get_scope_specific_params(
        cls,
        scope: Scopes,
        *,
        request: ExtendedRequest,
        view: ViewSet,
        obj: Project | None,
        iam_context: IamContext | None
    ):
        params = {}

        if DownloadExportedExtension.Scopes.DOWNLOAD_EXPORTED_FILE == scope:
            DownloadExportedExtension.extend_params_with_rq_job_details(
                request=request, params=params
            )

        if scope in (
            cls.Scopes.EXPORT_ANNOTATIONS,
            cls.Scopes.EXPORT_BACKUP,
            cls.Scopes.EXPORT_DATASET,
        ) and obj:
            ExportableResourceExtension.update_scope_params.__func__(
                cls, params, request=request, db_instance=obj
            )

        return params

    def get_resource(self):
        data = None
        if self.obj:
            data = {
                "id": self.obj.id,
                "owner": { "id": self.obj.owner_id },
                "assignee": { "id": self.obj.assignee_id },
                'organization': { "id": self.obj.organization_id },
            }

            if DownloadExportedExtension.Scopes.DOWNLOAD_EXPORTED_FILE == self.scope:
                self.extend_resource_with_rq_job_details(data)

            if self.scope in (
                self.Scopes.EXPORT_ANNOTATIONS,
                self.Scopes.EXPORT_BACKUP,
                self.Scopes.EXPORT_DATASET,
            ):
                ExportableResourceExtension.update_resource_data(self, data)

        elif self.scope in [self.Scopes.CREATE, self.Scopes.IMPORT_BACKUP]:
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

class TaskPermission(
    OpenPolicyAgentPermission, DownloadExportedExtension, ExportableResourceExtension
):
    obj: Task | None

    class Scopes(StrEnum):
        CREATE = 'create'
        CREATE_IN_PROJECT = 'create@project'
        DELETE = 'delete'
        DELETE_ANNOTATIONS = 'delete:annotations'
        EXPORT_ANNOTATIONS = 'export:annotations'
        EXPORT_BACKUP = 'export:backup'
        EXPORT_DATASET = 'export:dataset'
        IMPORT_ANNOTATIONS = 'import:annotations'
        IMPORT_BACKUP = 'import:backup'
        LIST = 'list'
        UPDATE = 'update'
        UPDATE_ANNOTATIONS = 'update:annotations'
        UPDATE_ASSIGNEE = 'update:assignee'
        UPDATE_ASSOCIATED_STORAGE = 'update:associated_storage'
        UPDATE_DESC = 'update:desc'
        UPDATE_METADATA = 'update:metadata'
        UPDATE_ORGANIZATION = 'update:organization'
        UPDATE_OWNER = 'update:owner'
        UPDATE_PROJECT = 'update:project'
        UPDATE_VALIDATION_LAYOUT = 'update:validation_layout'
        UPLOAD_DATA = 'upload:data'
        VIEW = 'view'
        VIEW_ANNOTATIONS = 'view:annotations'
        VIEW_DATA = 'view:data'
        VIEW_METADATA = 'view:metadata'
        VIEW_VALIDATION_LAYOUT = 'view:validation_layout'

    @classmethod
    def create(cls, request: ExtendedRequest, view: ViewSet, obj: Task | None, iam_context: dict[str, Any]) -> list[OpenPolicyAgentPermission]:
        permissions = []
        project_id = request.data.get('project_id') or request.data.get('project')
        assignee_id = request.data.get('assignee_id') or request.data.get('assignee')
        owner_id = request.data.get('owner_id') or request.data.get('owner')

        scopes = cls.get_scopes(request, view, obj)

        if cls.Scopes.UPDATE_ORGANIZATION in scopes:
            # consider this case as deleting a task in the org A and creating a new one in the org B
            permissions.append(cls.create_base_perm(
                request, view, cls.Scopes.DELETE, iam_context, obj, project_id=project_id, assignee_id=assignee_id
            ))

            if dst_org_id := request.data['organization_id']:
                try:
                    dst_org = Organization.objects.get(pk=dst_org_id)
                except Organization.DoesNotExist:
                    raise ValidationError("Invalid org id")
                dst_iam_context = get_iam_context(request, dst_org)
            else: # sandbox
                # do not use here get_iam_context since it checks also org_id/org_slug query params and X-Organization header
                dst_iam_context = build_iam_context(request, None, None)
            permissions.append(cls.create_base_perm(
                request, view, cls.Scopes.CREATE, dst_iam_context, project_id=project_id, assignee_id=assignee_id
            ))
            scopes.remove(cls.Scopes.UPDATE_ORGANIZATION)

        for scope in scopes:
            params = { 'project_id': project_id, 'assignee_id': assignee_id }

            if scope == cls.Scopes.UPDATE_OWNER:
                params['owner_id'] = owner_id

            params.update(cls.get_scope_specific_params(
                scope=scope, request=request, view=view, obj=obj, iam_context=iam_context
            ))

            self = cls.create_base_perm(request, view, scope, iam_context, obj, **params)
            permissions.append(self)

        if owner_id:
            perm = UserPermission.create_scope_view(iam_context, owner_id)
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
    def create_scope_view(cls, request: ExtendedRequest, task: int | Task, iam_context: dict[str, Any] | None = None):
        if isinstance(task, int):
            try:
                task = Task.objects.select_related("organization").get(id=task)
            except Task.DoesNotExist as ex:
                raise ValidationError(str(ex))

        if not iam_context and request:
            iam_context = get_iam_context(request, task)

        return cls(**iam_context, obj=task, scope=cls.Scopes.VIEW)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + '/tasks/allow'

    @classmethod
    def _get_scopes(cls, request: ExtendedRequest, view: ViewSet, obj: Task | None) -> list[Scopes]:
        Scopes = cls.Scopes
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
            ('initiate_dataset_export', 'POST'): Scopes.EXPORT_DATASET if is_dataset_export(request) else Scopes.EXPORT_ANNOTATIONS,
            ('metadata', 'GET'): Scopes.VIEW_METADATA,
            ('metadata', 'PATCH'): Scopes.UPDATE_METADATA,
            ('data', 'GET'): Scopes.VIEW_DATA,
            ('data', 'POST'): Scopes.UPLOAD_DATA,
            ('append_data_chunk', 'PATCH'): Scopes.UPLOAD_DATA,
            ('append_data_chunk', 'HEAD'): Scopes.UPLOAD_DATA,
            ('import_backup', 'POST'): Scopes.IMPORT_BACKUP,
            ('append_backup_chunk', 'PATCH'): Scopes.IMPORT_BACKUP,
            ('append_backup_chunk', 'HEAD'): Scopes.IMPORT_BACKUP,
            ('initiate_backup_export', 'POST'): Scopes.EXPORT_BACKUP,
            ('preview', 'GET'): Scopes.VIEW,
            ('validation_layout', 'GET'): Scopes.VIEW_VALIDATION_LAYOUT,
            ('validation_layout', 'PATCH'): Scopes.UPDATE_VALIDATION_LAYOUT,
            ('download_dataset', 'GET'): DownloadExportedExtension.Scopes.DOWNLOAD_EXPORTED_FILE,
            ('download_backup', 'GET'): DownloadExportedExtension.Scopes.DOWNLOAD_EXPORTED_FILE,
            # FUTURE-TODO: deprecated API
            ('dataset_export', 'GET'): Scopes.EXPORT_DATASET,
            ('export_backup', 'GET'): Scopes.EXPORT_BACKUP,
        }[(view.action, request.method)]

        scopes = []
        if scope == Scopes.CREATE:
            project_id = request.data.get('project_id') or request.data.get('project')
            if project_id:
                scope = Scopes.CREATE_IN_PROJECT

            scopes.append(scope)

        elif scope == Scopes.UPDATE:
            scopes.extend(cls.get_per_field_update_scopes(request, {
                'owner_id': Scopes.UPDATE_OWNER,
                'assignee_id': Scopes.UPDATE_ASSIGNEE,
                'project_id': Scopes.UPDATE_PROJECT,
                'name': Scopes.UPDATE_DESC,
                'labels': Scopes.UPDATE_DESC,
                'bug_tracker': Scopes.UPDATE_DESC,
                'subset': Scopes.UPDATE_DESC,
                'organization_id': Scopes.UPDATE_ORGANIZATION,
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
    def get_scope_specific_params(
        cls,
        scope: Scopes,
        *,
        request: ExtendedRequest,
        view: ViewSet,
        obj: Task | None,
        iam_context: IamContext | None
    ):
        params = {}

        if DownloadExportedExtension.Scopes.DOWNLOAD_EXPORTED_FILE == scope:
            DownloadExportedExtension.extend_params_with_rq_job_details(
                request=request, params=params
            )

        if scope in (
            cls.Scopes.EXPORT_ANNOTATIONS,
            cls.Scopes.EXPORT_BACKUP,
            cls.Scopes.EXPORT_DATASET,
        ) and obj:
            ExportableResourceExtension.update_scope_params.__func__(
                cls, params, request=request, db_instance=obj
            )

        return params

    @classmethod
    def create_scope_view_data(cls, iam_context: dict[str, Any], task_id: int):
        try:
            obj = Task.objects.get(id=task_id)
        except Task.DoesNotExist as ex:
            raise ValidationError(str(ex))
        return cls(**iam_context, obj=obj, scope=cls.Scopes.VIEW_DATA)

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

            if DownloadExportedExtension.Scopes.DOWNLOAD_EXPORTED_FILE == self.scope:
                self.extend_resource_with_rq_job_details(data)

            if self.scope in (
                self.Scopes.EXPORT_ANNOTATIONS,
                self.Scopes.EXPORT_BACKUP,
                self.Scopes.EXPORT_DATASET,
            ):
                ExportableResourceExtension.update_resource_data(self, data)

        elif self.scope in [
            self.Scopes.CREATE,
            self.Scopes.CREATE_IN_PROJECT,
            self.Scopes.IMPORT_BACKUP
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

class JobPermission(OpenPolicyAgentPermission, DownloadExportedExtension):
    task_id: int | None
    obj: Job | None

    class Scopes(StrEnum):
        CREATE = 'create'
        DELETE = 'delete'
        DELETE_ANNOTATIONS = 'delete:annotations'
        EXPORT_ANNOTATIONS = 'export:annotations'
        EXPORT_DATASET = 'export:dataset'
        IMPORT_ANNOTATIONS = 'import:annotations'
        LIST = 'list'
        UPDATE = 'update'
        UPDATE_ANNOTATIONS = 'update:annotations'
        UPDATE_ASSIGNEE = 'update:assignee'
        UPDATE_METADATA = 'update:metadata'
        UPDATE_STAGE = 'update:stage'
        UPDATE_STATE = 'update:state'
        UPDATE_VALIDATION_LAYOUT = 'update:validation_layout'
        VIEW = 'view'
        VIEW_ANNOTATIONS = 'view:annotations'
        VIEW_DATA = 'view:data'
        VIEW_METADATA = 'view:metadata'
        VIEW_VALIDATION_LAYOUT = 'view:validation_layout'

    @classmethod
    def create(cls, request: ExtendedRequest, view: ViewSet, obj: Job | None, iam_context: dict[str, Any]) -> list[OpenPolicyAgentPermission]:
        permissions = []
        task_id = request.data.get('task_id')
        for scope in cls.get_scopes(request, view, obj):
            scope_params = {}

            if scope == cls.Scopes.CREATE:
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

            scope_params.update(cls.get_scope_specific_params(
                scope=scope, request=request, view=view, obj=obj, iam_context=iam_context
            ))

            self = cls.create_base_perm(request, view, scope, iam_context, obj, **scope_params)
            permissions.append(self)

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
    def create_scope_view_data(cls, iam_context: dict[str, Any], job_id: int):
        try:
            obj = Job.objects.get(id=job_id)
        except Job.DoesNotExist as ex:
            raise ValidationError(str(ex))
        return cls(**iam_context, obj=obj, scope='view:data')

    @classmethod
    def create_scope_view(cls, request: ExtendedRequest, job: int | Job, iam_context: dict[str, Any] | None = None):
        if isinstance(job, int):
            try:
                job = Job.objects.get(id=job)
            except Job.DoesNotExist as ex:
                raise ValidationError(str(ex))

        if not iam_context and request:
            iam_context = get_iam_context(request, job)

        return cls(**iam_context, obj=job, scope=cls.Scopes.VIEW)

    def __init__(self, **kwargs):
        self.task_id = kwargs.pop('task_id', None)
        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + '/jobs/allow'

    @classmethod
    def _get_scopes(cls, request: ExtendedRequest, view: ViewSet, obj: Job | None):
        Scopes = cls.Scopes
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
            ('initiate_dataset_export', 'POST'): Scopes.EXPORT_DATASET if is_dataset_export(request) else Scopes.EXPORT_ANNOTATIONS,
            ('preview', 'GET'): Scopes.VIEW,
            ('validation_layout', 'GET'): Scopes.VIEW_VALIDATION_LAYOUT,
            ('validation_layout', 'PATCH'): Scopes.UPDATE_VALIDATION_LAYOUT,
            ('download_dataset', 'GET'): DownloadExportedExtension.Scopes.DOWNLOAD_EXPORTED_FILE,
            # deprecated API
            ('dataset_export', 'GET'): Scopes.EXPORT_DATASET,
        }[(view.action, request.method)]

        scopes = []
        if scope == Scopes.UPDATE:
            scopes.extend(cls.get_per_field_update_scopes(request, {
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

    @classmethod
    def get_scope_specific_params(
        cls,
        scope: Scopes,
        *,
        request: ExtendedRequest,
        view: ViewSet,
        obj: Job | None,
        iam_context: IamContext | None
    ):
        params = {}

        if DownloadExportedExtension.Scopes.DOWNLOAD_EXPORTED_FILE == scope:
            DownloadExportedExtension.extend_params_with_rq_job_details(
                request=request, params=params
            )

        if scope in (cls.Scopes.EXPORT_ANNOTATIONS, cls.Scopes.EXPORT_DATASET):
            ExportableResourceExtension.update_scope_params.__func__(
                cls, params, request=request, db_instance=obj
            )

        return params

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

            if DownloadExportedExtension.Scopes.DOWNLOAD_EXPORTED_FILE == self.scope:
                self.extend_resource_with_rq_job_details(data)

            if self.scope in (self.Scopes.EXPORT_ANNOTATIONS, self.Scopes.EXPORT_DATASET):
                ExportableResourceExtension.update_resource_data(self, data)

        elif self.scope == self.Scopes.CREATE:
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
    obj: Comment | None

    class Scopes(StrEnum):
        LIST = 'list'
        CREATE  = 'create'
        CREATE_IN_ISSUE  = 'create@issue'
        DELETE = 'delete'
        UPDATE = 'update'
        VIEW = 'view'

    @classmethod
    def create(cls, request: ExtendedRequest, view: ViewSet, obj: Comment | None, iam_context: dict[str, Any]) -> list[OpenPolicyAgentPermission]:
        permissions = []
        for scope in cls.get_scopes(request, view, obj):
            self = cls.create_base_perm(request, view, scope, iam_context, obj,
                issue_id=request.data.get('issue'))
            permissions.append(self)

        return permissions

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + '/comments/allow'

    @classmethod
    def _get_scopes(cls, request: ExtendedRequest, view: ViewSet, obj: Comment | None):
        Scopes = cls.Scopes
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
        elif self.scope.startswith(self.Scopes.CREATE):
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
    obj: Issue | None

    class Scopes(StrEnum):
        LIST = 'list'
        CREATE  = 'create'
        CREATE_IN_JOB  = 'create@job'
        DELETE = 'delete'
        UPDATE = 'update'
        VIEW = 'view'

    @classmethod
    def create(cls, request: ExtendedRequest, view: ViewSet, obj: Issue | None, iam_context: dict[str, Any]) -> list[OpenPolicyAgentPermission]:
        permissions = []
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

    @classmethod
    def _get_scopes(cls, request: ExtendedRequest, view: ViewSet, obj: Issue | None):
        Scopes = cls.Scopes
        return [{
            'list': Scopes.LIST,
            'create': Scopes.CREATE_IN_JOB,
            'destroy': Scopes.DELETE,
            'partial_update': Scopes.UPDATE,
            'retrieve': Scopes.VIEW,
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
        elif self.scope.startswith(self.Scopes.CREATE):
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
    obj: Label | None

    class Scopes(StrEnum):
        LIST = 'list'
        DELETE = 'delete'
        UPDATE = 'update'
        VIEW = 'view'

    @classmethod
    def create(cls, request: ExtendedRequest, view: ViewSet, obj: Label | None, iam_context: dict[str, Any]) -> list[OpenPolicyAgentPermission]:
        Scopes = cls.Scopes

        permissions = []
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

    @classmethod
    def _get_scopes(cls, request: ExtendedRequest, view: ViewSet, obj: Label | None):
        Scopes = cls.Scopes
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
    obj: AnnotationGuide | None

    class Scopes(StrEnum):
        VIEW = 'view'
        UPDATE = 'update'
        DELETE = 'delete'
        CREATE  = 'create'

    @classmethod
    def create(cls, request: ExtendedRequest, view: ViewSet, obj: AnnotationGuide | None, iam_context: dict[str, Any]) -> list[OpenPolicyAgentPermission]:
        permissions = []

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

    @classmethod
    def _get_scopes(cls, request: ExtendedRequest, view: ViewSet, obj: AnnotationGuide | None):
        Scopes = cls.Scopes
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
        elif self.scope == self.Scopes.CREATE:
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
    def create(cls, request: ExtendedRequest, view: ViewSet, obj: AnnotationGuide | None, iam_context: dict[str, Any]) -> list[OpenPolicyAgentPermission]:
        Scopes = cls.Scopes
        permissions = []

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

    @classmethod
    def _get_scopes(cls, request: ExtendedRequest, view: ViewSet, obj: AnnotationGuide | None):
        Scopes = cls.Scopes
        return [{
            'create': Scopes.CREATE,
            'destroy': Scopes.DELETE,
            'retrieve': Scopes.VIEW,
        }[view.action]]


def get_cloud_storage_for_import_or_export(
    storage_id: int, *, request: ExtendedRequest, is_default: bool = False
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
