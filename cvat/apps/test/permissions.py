# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from cvat.apps.engine.models import Task
from cvat.apps.engine.permissions import TaskPermission
from cvat.apps.iam.permissions import OpenPolicyAgentPermission


class ClassCountsPermission(OpenPolicyAgentPermission):
    """
    Reuse CVAT task annotation visibility: logged-in users must be allowed
    to view annotations on the task. Unauthenticated requests are refused by
    the global IsAuthenticated permission.
    """

    @classmethod
    def create(cls, request, view, obj, iam_context):
        if obj is None:
            return []

        if not isinstance(obj, Task):
            return []

        return [
            TaskPermission.create_base_perm(
                request,
                view,
                TaskPermission.Scopes.VIEW_ANNOTATIONS,
                iam_context,
                obj=obj,
            )
        ]
