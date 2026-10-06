# SPDX-License-Identifier: MIT

from cvat.apps.engine.permissions import TaskPermission
from cvat.apps.iam.permissions import OpenPolicyAgentPermission


class AnnotationCountsPermission(OpenPolicyAgentPermission):
    @classmethod
    def create(cls, request, view, obj, iam_context):
        # Whoever may view the task may see its annotation counts.
        # This app defines no access rules of its own.
        return [TaskPermission.create_scope_view(request, obj, iam_context=iam_context)]
