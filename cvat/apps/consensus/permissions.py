# Copyright (C) 2022 Intel Corporation
# Copyright (C) 2022-2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from typing import Optional, Union, cast

from django.conf import settings
from rest_framework.exceptions import ValidationError

from cvat.apps.engine.models import Task
from cvat.apps.engine.permissions import TaskPermission
from cvat.apps.iam.permissions import OpenPolicyAgentPermission, StrEnum, get_iam_context

from .models import ConsensusSettings


class ConsensusSettingPermission(OpenPolicyAgentPermission):
    obj: Optional[ConsensusSettings]

    class Scopes(StrEnum):
        LIST = "list"
        VIEW = "view"
        UPDATE = "update"

    @classmethod
    def create(cls, request, view, obj, iam_context):
        Scopes = __class__.Scopes

        permissions = []
        if view.basename == "consensus_settings":
            for scope in cls.get_scopes(request, view, obj):
                if scope in [Scopes.VIEW, Scopes.UPDATE]:
                    obj = cast(ConsensusSettings, obj)

                    if scope == Scopes.VIEW:
                        task_scope = TaskPermission.Scopes.VIEW
                    elif scope == Scopes.UPDATE:
                        task_scope = TaskPermission.Scopes.UPDATE_DESC
                    else:
                        assert False

                    # Access rights are the same as in the owning task
                    # This component doesn't define its own rules in this case
                    permissions.append(
                        TaskPermission.create_base_perm(
                            request, view, iam_context=iam_context, scope=task_scope, obj=obj.task
                        )
                    )
                elif scope == cls.Scopes.LIST:
                    if task_id := request.query_params.get("task_id", None):
                        permissions.append(
                            TaskPermission.create_scope_view(
                                request,
                                int(task_id),
                                iam_context=iam_context,
                            )
                        )

                    permissions.append(cls.create_scope_list(request, iam_context))
                else:
                    permissions.append(cls.create_base_perm(request, view, scope, iam_context, obj))

        return permissions

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + "/consensus_settings/allow"

    @staticmethod
    def get_scopes(request, view, obj):
        Scopes = __class__.Scopes
        return [
            {
                "list": Scopes.LIST,
                "retrieve": Scopes.VIEW,
                "partial_update": Scopes.UPDATE,
            }.get(view.action, None)
        ]

    def get_resource(self):
        data = None

        if self.obj:
            task = self.obj.task
            if task.project:
                organization = task.project.organization
            else:
                organization = task.organization

            data = {
                "id": self.obj.id,
                "organization": {"id": getattr(organization, "id", None)},
                "task": (
                    {
                        "owner": {"id": getattr(task.owner, "id", None)},
                        "assignee": {"id": getattr(task.assignee, "id", None)},
                    }
                    if task
                    else None
                ),
                "project": (
                    {
                        "owner": {"id": getattr(task.project.owner, "id", None)},
                        "assignee": {"id": getattr(task.project.assignee, "id", None)},
                    }
                    if task.project
                    else None
                ),
            }

        return data
