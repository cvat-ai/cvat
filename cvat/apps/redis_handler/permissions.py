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
from cvat.apps.engine.permissions import JobPermission, TaskPermission
from cvat.apps.engine.rq import BaseRQMeta


class RequestPermission(OpenPolicyAgentPermission):

    class Scopes(StrEnum):
        LIST = "list"
        VIEW = "view"
        DELETE = "delete"

    @classmethod
    def create(
        cls, request: ExtendedRequest, view: ViewSet, obj: RQJob | None, iam_context: dict
    ) -> list[OpenPolicyAgentPermission]:
        permissions = []
        if view.basename == "request":
            for scope in cls.get_scopes(request, view, obj):
                if scope == cls.Scopes.LIST:
                    continue
                elif scope == cls.Scopes.VIEW:
                    parsed_rq_id = obj.parsed_rq_id

                    if (
                        parsed_rq_id.queue
                        in (
                            settings.CVAT_QUEUES.CONSENSUS,
                            settings.CVAT_QUEUES.QUALITY_REPORTS,
                        )
                        and parsed_rq_id.target == RequestTarget.TASK
                    ):
                        permissions.append(
                            TaskPermission.create_scope_view(request, parsed_rq_id.id)
                        )
                        continue

                    if (
                        parsed_rq_id.queue == settings.CVAT_QUEUES.CONSENSUS
                        and parsed_rq_id.target == RequestTarget.JOB
                    ):
                        permissions.append(
                            JobPermission.create_scope_view(request, parsed_rq_id.id)
                        )
                        continue

                self = cls.create_base_perm(request, view, scope, iam_context, obj)
                permissions.append(self)

        return permissions

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + "/requests/allow"

    @staticmethod
    def get_scopes(request: ExtendedRequest, view: ViewSet, obj: RQJob | None) -> list[Scopes]:
        return [
            {
                ("list", "GET"): __class__.Scopes.LIST,
                ("retrieve", "GET"): __class__.Scopes.VIEW,
                ("cancel", "POST"): __class__.Scopes.DELETE,
            }[(view.action, request.method)]
        ]

    def get_resource(self):
        if owner := BaseRQMeta.for_job(self.obj).user:
            return {
                "owner": {
                    "id": owner.id,
                },
            }
        return None
