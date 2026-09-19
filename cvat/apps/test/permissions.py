# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from rest_framework.exceptions import ValidationError

from cvat.apps.engine.permissions import TaskPermission
from cvat.apps.engine.types import ExtendedRequest
from cvat.apps.iam.permissions import OpenPolicyAgentPermission

if TYPE_CHECKING:
    from rest_framework.viewsets import ViewSet


class ClassCountsPermission:
    """
    Authorizes the class-wise image count endpoint.

    The endpoint exposes derived data of a task, so instead of defining new
    OPA rules it reuses TaskPermission's VIEW scope for the task named by the
    `task_id` query parameter -- the same check the engine app itself uses
    for e.g. viewing a task's annotations.
    """

    @classmethod
    def create(
        cls, request: ExtendedRequest, view: ViewSet, obj: Any, iam_context: dict
    ) -> list[OpenPolicyAgentPermission]:
        task_id = request.query_params.get("task_id")
        if not task_id:
            raise ValidationError("The 'task_id' query parameter is required")

        try:
            task_id = int(task_id)
        except ValueError:
            raise ValidationError("The 'task_id' query parameter must be an integer")

        return [TaskPermission.create_scope_view(request, task_id)]
