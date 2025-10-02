# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from typing import TYPE_CHECKING

from django.conf import settings
from rq.job import Job as RQJob

from cvat.apps.engine.types import ExtendedRequest
from cvat.apps.iam.permissions import OpenPolicyAgentPermission, StrEnum

if TYPE_CHECKING:
    from rest_framework.viewsets import ViewSet

from cvat.apps.engine.models import RequestTarget
from cvat.apps.engine.permissions import JobPermission, ProjectPermission, TaskPermission
from cvat.apps.engine.rq import BaseRQMeta
from cvat.apps.redis_handler.rq import CustomRQJob


class RequestPermission(OpenPolicyAgentPermission):

    class Scopes(StrEnum):
        LIST = "list"
        VIEW = "view"
        DELETE = "delete"

    @classmethod
    def create(
        cls, request: ExtendedRequest, view: ViewSet, obj: CustomRQJob | None, iam_context: dict
    ) -> list[OpenPolicyAgentPermission]:
        permissions = []
        for scope in cls.get_scopes(request, view, obj):
            if scope == cls.Scopes.LIST:
                continue
            elif scope == cls.Scopes.VIEW:
                parsed_request_id = obj.parsed_id

                # In case when background job is unique for a user, status check should be available only for this user/admin
                # In other cases, status check should be available for all users that have target resource VIEW permission
                if parsed_request_id.user_id:
                    job_owner = BaseRQMeta.for_job(obj).user
                    assert job_owner and job_owner.id == parsed_request_id.user_id

                elif parsed_request_id.target_id is not None:
                    if parsed_request_id.target == RequestTarget.PROJECT.value:
                        permissions.append(
                            ProjectPermission.create_scope_view(
                                request, parsed_request_id.target_id
                            )
                        )
                        continue
                    elif parsed_request_id.target == RequestTarget.TASK.value:
                        permissions.append(
                            TaskPermission.create_scope_view(request, parsed_request_id.target_id)
                        )
                        continue
                    elif parsed_request_id.target == RequestTarget.JOB.value:
                        permissions.append(
                            JobPermission.create_scope_view(request, parsed_request_id.target_id)
                        )
                        continue
                    assert False, "Unsupported operation on resource"

            self = cls.create_base_perm(request, view, scope, iam_context, obj)
            permissions.append(self)

        return permissions

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + "/requests/allow"

    @classmethod
    def _get_scopes(
        cls, request: ExtendedRequest, view: ViewSet, obj: RQJob | None
    ) -> list[Scopes]:
        return [
            {
                ("list", "GET"): cls.Scopes.LIST,
                ("retrieve", "GET"): cls.Scopes.VIEW,
                ("cancel", "POST"): cls.Scopes.DELETE,
            }[(view.action, request.method)]
        ]

    def get_resource(self):
        if self.obj and (owner := BaseRQMeta.for_job(self.obj).user):
            return {
                "owner": {
                    "id": owner.id,
                },
            }
        return None
