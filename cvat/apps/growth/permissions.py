# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from enum import StrEnum

from django.conf import settings

from cvat.apps.iam.permissions import OpenPolicyAgentPermission


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
