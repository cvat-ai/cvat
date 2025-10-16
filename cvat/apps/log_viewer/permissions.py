# Copyright (C) 2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.conf import settings

from cvat.apps.iam.permissions import OpenPolicyAgentPermission, StrEnum, get_iam_context


class LogViewerPermission(OpenPolicyAgentPermission):
    has_analytics_access: bool

    class Scopes(StrEnum):
        VIEW = "view"

    @classmethod
    def create(cls, request, view, obj, iam_context):
        permissions = []
        for scope in cls.get_scopes(request, view, obj):
            self = cls.create_base_perm(request, view, scope, iam_context, obj)
            permissions.append(self)

        return permissions

    @classmethod
    def create_base_perm(cls, request, view, scope, iam_context, obj=None, **kwargs):
        if not iam_context and request:
            iam_context = get_iam_context(request, obj)
        return cls(
            scope=scope,
            obj=obj,
            has_analytics_access=request.user.profile.has_analytics_access,
            **iam_context,
            **kwargs,
        )

    def __init__(self, has_analytics_access=False, **kwargs):
        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + "/analytics/allow"
        self.has_analytics_access = has_analytics_access

    @classmethod
    def _get_scopes(cls, request, view, obj):
        Scopes = cls.Scopes
        return [
            {
                "list": Scopes.VIEW,
            }[view.action]
        ]

    def get_opa_auth_payload(self):
        data = super().get_opa_auth_payload()
        data["auth"]["user"]["has_analytics_access"] = self.has_analytics_access
        return data

    def get_resource(self):
        return None
