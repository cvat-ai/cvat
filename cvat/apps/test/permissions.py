# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from cvat.apps.engine.permissions import TaskPermission


class AnnotationStatsPermission(TaskPermission):
    """
    Counting a task's annotations needs the same right as reading them,
    so the request is checked against the existing task "view:annotations" rule.
    """

    @classmethod
    def _get_scopes(cls, request, view, obj):
        return [cls.Scopes.VIEW_ANNOTATIONS]
