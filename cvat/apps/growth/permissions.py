# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from enum import StrEnum
from typing import Any

from django.conf import settings
from rest_framework.request import Request
from rest_framework.viewsets import ViewSetMixin

from cvat.apps.iam.permissions import OpenPolicyAgentPermission, get_iam_context

from .models import UserGrowthData


class UserGrowthDataPermission(OpenPolicyAgentPermission):
    class Scopes(StrEnum):
        LIST = "list"
        VIEW = "view"
        UPDATE = "update"

    @classmethod
    def create(cls, request, view, obj, iam_context):
        return [
            cls.create_base_perm(request, view, scope, iam_context, obj)
            for scope in cls.get_scopes(request, view, obj)
        ]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + "/growth/allow"

    @classmethod
    def _get_scopes(cls, request, view, obj):
        Scopes = cls.Scopes
        return [
            {
                "list": Scopes.LIST,
                "retrieve": Scopes.VIEW,
                "partial_update": Scopes.UPDATE,
            }[view.action]
        ]

    def get_resource(self):
        if self.obj:
            return {
                "id": self.obj.id,
                "user": {"id": self.obj.user_id},
            }

        return None


class UpdatesPermission(OpenPolicyAgentPermission):
    """Reuse the growth policy for read/write access to the current user's state."""

    @classmethod
    def create(
        cls, request: Request, view: ViewSetMixin, obj: Any, iam_context: dict[str, Any] | None
    ) -> list[UserGrowthDataPermission]:
        iam_context = iam_context or get_iam_context(request, None)
        return [
            UserGrowthDataPermission(
                **iam_context, scope=scope, obj=UserGrowthData(user=request.user)
            )
            for scope in cls.get_scopes(request, view, obj)
        ]

    @classmethod
    def _get_scopes(
        cls, request: Request, view: ViewSetMixin, obj: Any
    ) -> list[UserGrowthDataPermission.Scopes]:
        Scopes = UserGrowthDataPermission.Scopes
        scopes = {
            "list": Scopes.VIEW,
            "acknowledge": Scopes.UPDATE,
        }
        return [scopes[view.action]]

    def get_resource(self) -> None:
        return None
