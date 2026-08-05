# Copyright (C) 2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from enum import StrEnum

from django.conf import settings

from cvat.apps.engine.permissions import JobPermission, TaskPermission
from cvat.apps.iam.permissions import OpenPolicyAgentPermission


class LambdaPermission(OpenPolicyAgentPermission):
    class Scopes(StrEnum):
        LIST = "list"
        VIEW = "view"
        CALL_ONLINE = "call:online"

    @classmethod
    def create(cls, request, view, obj, iam_context):
        permissions = []
        scopes = cls.get_scopes(request, view, obj)
        for scope in scopes:
            self = cls.create_base_perm(request, view, scope, iam_context, obj)
            permissions.append(self)

        if job_id := request.data.get("job"):
            perm = JobPermission.create_scope_view_data(iam_context, job_id)
            permissions.append(perm)
        elif task_id := request.data.get("task"):
            perm = TaskPermission.create_scope_view_data(iam_context, task_id)
            permissions.append(perm)

        return permissions

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + "/lambda/allow"

    @classmethod
    def _get_scopes(cls, request, view, obj):
        Scopes = cls.Scopes
        return [
            {
                "list": Scopes.LIST,
                "retrieve": Scopes.VIEW,
                "call": Scopes.CALL_ONLINE,
            }[view.action]
        ]

    def get_resource(self):
        return None


class LambdaRequestPermission(OpenPolicyAgentPermission):
    class Scopes(StrEnum):
        LIST = "list"
        CREATE = "create"
        VIEW = "view"
        DELETE = "delete"

    @classmethod
    def create(cls, request, view, obj, iam_context):
        permissions = []
        for scope in cls.get_scopes(request, view, obj):
            self = cls.create_base_perm(request, view, scope, iam_context, obj)
            permissions.append(self)

            if scope == cls.Scopes.CREATE:
                for field, target_permission_class in (
                    ("job", JobPermission),
                    ("task", TaskPermission),
                ):
                    if (target_id := request.data.get(field)) is not None:
                        target_view_data_perm = target_permission_class.create_scope_view_data(
                            iam_context, target_id
                        )
                        permissions.append(target_view_data_perm)
                        permissions.append(
                            target_permission_class(
                                **iam_context,
                                obj=target_view_data_perm.obj,
                                scope=target_view_data_perm.Scopes.UPDATE_ANNOTATIONS,
                            )
                        )
                        break

        if obj:
            if (job_id := obj.get_job()) is not None:
                permissions.append(JobPermission.create_scope_view(request, job_id, iam_context))
            else:
                permissions.append(
                    TaskPermission.create_scope_view(request, obj.get_task(), iam_context)
                )

        return permissions

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + "/lambda_requests/allow"

    @classmethod
    def _get_scopes(cls, request, view, obj):
        Scopes = cls.Scopes
        return [
            {
                "list": Scopes.LIST,
                "create": Scopes.CREATE,
                "retrieve": Scopes.VIEW,
                "destroy": Scopes.DELETE,
            }[view.action]
        ]

    def get_resource(self):
        if self.obj:
            return {
                "id": self.obj.job.id,
                "owner": {"id": self.obj.get_owner().id},
            }
        elif self.scope == self.Scopes.CREATE:
            return {
                "id": None,
                "owner": {"id": self.user_id},
            }

        return None
