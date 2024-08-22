# Copyright (C) 2022 Intel Corporation
# Copyright (C) 2022-2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.conf import settings

from rest_framework.exceptions import ValidationError

from cvat.apps.engine.models import Project
from cvat.apps.engine.permissions import ProjectPermission, UserPermission
from cvat.apps.iam.permissions import OpenPolicyAgentPermission, StrEnum

from .models import WebhookTypeChoice

class WebhookPermission(OpenPolicyAgentPermission):
    class Scopes(StrEnum):
        CREATE = 'create'
        CREATE_IN_PROJECT = 'create@project'
        CREATE_IN_ORG = 'create@organization'
        DELETE = 'delete'
        UPDATE = 'update'
        LIST = 'list'
        VIEW = 'view'

    @classmethod
    def create(cls, request, view, obj, iam_context):
        permissions = []
        if view.basename == 'webhook':
            project_id = request.data.get('project_id')
            for scope in cls.get_scopes(request, view, obj):
                self = cls.create_base_perm(request, view, scope, iam_context, obj,
                    project_id=project_id)
                permissions.append(self)

            owner = request.data.get('owner_id') or request.data.get('owner')
            if owner:
                perm = UserPermission.create_scope_view(iam_context, owner)
                permissions.append(perm)

            if project_id:
                perm = ProjectPermission.create_scope_view(iam_context, project_id)
                permissions.append(perm)

        return permissions

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + '/webhooks/allow'

    @staticmethod
    def get_scopes(request, view, obj):
        Scopes = __class__.Scopes
        scope = {
            ('create', 'POST'): Scopes.CREATE,
            ('destroy', 'DELETE'): Scopes.DELETE,
            ('partial_update', 'PATCH'): Scopes.UPDATE,
            ('update', 'PUT'): Scopes.UPDATE,
            ('list', 'GET'): Scopes.LIST,
            ('retrieve', 'GET'): Scopes.VIEW,
        }.get((view.action, request.method))

        scopes = []
        if scope == Scopes.CREATE:
            webhook_type = request.data.get('type')
            if webhook_type in [m.value for m in WebhookTypeChoice]:
                scope = Scopes(str(scope) + f'@{webhook_type}')
            scopes.append(scope)
        elif scope in [Scopes.UPDATE, Scopes.DELETE, Scopes.LIST, Scopes.VIEW]:
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
        elif self.scope in [
            __class__.Scopes.CREATE,
            __class__.Scopes.CREATE_IN_PROJECT,
            __class__.Scopes.CREATE_IN_ORG
        ]:
            project = None
            if self.project_id:
                try:
                    project = Project.objects.get(id=self.project_id)
                except Project.DoesNotExist:
                    raise ValidationError(f"Could not find project with provided id: {self.project_id}")

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
                } if self.org_id is not None else None,
                'user': {
                    'id': self.user_id,
                }
            }

        return data
