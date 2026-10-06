# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework import permissions
from rest_framework.exceptions import PermissionDenied

from cvat.apps.engine.models import Task
from cvat.apps.engine.permissions import TaskPermission


def check_task_access(request, task: Task) -> bool:
    if not request.user or not request.user.is_authenticated:
        return False

    if request.user.is_superuser or request.user.is_staff:
        return True

    if task.owner_id == request.user.id or task.assignee_id == request.user.id:
        return True

    try:
        perm = TaskPermission.create_scope_view(request, task)
        return bool(perm.check_access().allow)
    except Exception:
        return False


class HasTaskAccessPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if not isinstance(obj, Task):
            return False
        return check_task_access(request, obj)
