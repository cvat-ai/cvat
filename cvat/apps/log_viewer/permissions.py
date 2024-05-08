# Copyright (C) 2022 Intel Corporation
# Copyright (C) 2022-2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.conf import settings

from cvat.apps.iam.permissions import OpenPolicyAgentPermission, StrEnum

class LogViewerPermission(OpenPolicyAgentPermission):
    class Scopes(StrEnum):
        VIEW = 'view'

    @classmethod
    def create(cls, request, view, obj, iam_context):
        permissions = []
        if view.basename == 'analytics':
            for scope in cls.get_scopes(request, view, obj):
                self = cls.create_base_perm(request, view, scope, iam_context, obj)
                permissions.append(self)

        return permissions

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + '/analytics/allow'

    @staticmethod
    def get_scopes(request, view, obj):
        Scopes = __class__.Scopes
        return [{
            'list': Scopes.VIEW,
        }.get(view.action, None)]

    def get_resource(self):
        return {
            'visibility': 'public' if settings.RESTRICTIONS['analytics_visibility'] else 'private',
        }
