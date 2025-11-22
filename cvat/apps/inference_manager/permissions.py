# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from typing import TYPE_CHECKING, Any, Optional, cast

from django.conf import settings
from rest_framework.exceptions import ValidationError

from cvat.apps.iam.permissions import OpenPolicyAgentPermission, StrEnum, get_iam_context

if TYPE_CHECKING:
    from rest_framework.viewsets import ViewSet

    from cvat.apps.engine.types import ExtendedRequest
    from cvat.apps.inference_manager.models import InferenceService


class InferenceServicePermission(OpenPolicyAgentPermission):
    obj: Optional[InferenceService]

    class Scopes(StrEnum):
        LIST = 'list'
        CREATE = 'create'
        VIEW = 'view'
        UPDATE = 'update'
        DELETE = 'delete'
        STOP = 'stop'
        PREDICT = 'predict'
        HEALTH = 'health'
        LOGS = 'logs'

    @classmethod
    def create(
        cls,
        request: ExtendedRequest,
        view: ViewSet,
        obj: InferenceService | None,
        iam_context: dict[str, Any]
    ) -> list[OpenPolicyAgentPermission]:
        permissions = []
        for scope in cls.get_scopes(request, view, obj):
            self = cls.create_base_perm(request, view, scope, iam_context, obj)
            permissions.append(self)

        return permissions

    @classmethod
    def create_scope_view(
        cls,
        iam_context: dict[str, Any],
        service_id: int,
        request: ExtendedRequest | None = None
    ):
        from cvat.apps.inference_manager.models import InferenceService

        try:
            obj = InferenceService.objects.get(id=service_id)
        except InferenceService.DoesNotExist as ex:
            raise ValidationError(str(ex))

        if not iam_context and request:
            iam_context = get_iam_context(request, obj)

        return cls(**iam_context, obj=obj, scope=cls.Scopes.VIEW)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + '/inference_services/allow'

    @classmethod
    def _get_scopes(
        cls,
        request: ExtendedRequest,
        view: ViewSet,
        obj: InferenceService | None
    ):
        Scopes = cls.Scopes
        return [{
            'list': Scopes.LIST,
            'create': Scopes.CREATE,
            'retrieve': Scopes.VIEW,
            'partial_update': Scopes.UPDATE,
            'destroy': Scopes.DELETE,
            'stop': Scopes.STOP,
            'predict': Scopes.PREDICT,
            'health': Scopes.HEALTH,
            'logs': Scopes.LOGS,
        }[view.action]]

    def get_resource(self):
        data = None
        if self.scope.startswith('create'):
            data = {
                'owner': {'id': self.user_id},
                'organization': {
                    'id': self.org_id,
                } if self.org_id is not None else None,
            }
        elif self.obj:
            data = {
                'id': self.obj.id,
                'owner': {'id': self.obj.owner_id},
                'organization': {
                    'id': self.obj.organization_id
                } if self.obj.organization_id else None,
                'model': {
                    'id': self.obj.model_id
                }
            }

        return data
