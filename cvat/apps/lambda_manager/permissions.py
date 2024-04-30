# Copyright (C) 2022 Intel Corporation
# Copyright (C) 2022-2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.conf import settings

from cvat.apps.engine.permissions import JobPermission, TaskPermission
from cvat.apps.iam.permissions import OpenPolicyAgentPermission, StrEnum

class LambdaPermission(OpenPolicyAgentPermission):
    class Scopes(StrEnum):
        LIST = 'list'
        VIEW = 'view'
        CALL_ONLINE = 'call:online'
        CALL_OFFLINE = 'call:offline'
        LIST_OFFLINE = 'list:offline'

    @classmethod
    def create(cls, request, view, obj, iam_context):
        permissions = []
        if view.basename == 'function' or view.basename == 'request':
            scopes = cls.get_scopes(request, view, obj)
            for scope in scopes:
                self = cls.create_base_perm(request, view, scope, iam_context, obj)
                permissions.append(self)

            if job_id := request.data.get('job'):
                perm = JobPermission.create_scope_view_data(iam_context, job_id)
                permissions.append(perm)
            elif task_id := request.data.get('task'):
                perm = TaskPermission.create_scope_view_data(iam_context, task_id)
                permissions.append(perm)

        return permissions

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + '/lambda/allow'

    @staticmethod
    def get_scopes(request, view, obj):
        Scopes = __class__.Scopes
        return [{
            ('function', 'list'): Scopes.LIST,
            ('function', 'retrieve'): Scopes.VIEW,
            ('function', 'call'): Scopes.CALL_ONLINE,
            ('request', 'create'): Scopes.CALL_OFFLINE,
            ('request', 'list'): Scopes.LIST_OFFLINE,
            ('request', 'retrieve'): Scopes.CALL_OFFLINE,
            ('request', 'destroy'): Scopes.CALL_OFFLINE,
        }.get((view.basename, view.action), None)]

    def get_resource(self):
        return None
