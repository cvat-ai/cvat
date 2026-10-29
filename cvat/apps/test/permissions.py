# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from enum import StrEnum

from cvat.apps.engine.models import Task
from cvat.apps.engine.permissions import TaskPermission
from cvat.apps.iam.permissions import OpenPolicyAgentPermission
from cvat.utils import django_database as db_utils

from .serializers import LabelCountsQuerySerializer


class LabelCountsPermission(OpenPolicyAgentPermission):
    """
    Label counts have no policy of their own: reading them requires the same access
    as viewing the task, so the check is delegated to TaskPermission.
    """

    class Scopes(StrEnum):
        LIST = "list"

    @classmethod
    def create(cls, request, view, obj, iam_context):
        permissions = []
        for scope in cls.get_scopes(request, view, obj):
            assert scope == cls.Scopes.LIST

            serializer = LabelCountsQuerySerializer(data=request.query_params)
            serializer.is_valid(raise_exception=True)
            task = db_utils.get_or_404(
                Task.objects.select_related("organization"), serializer.validated_data["task_id"]
            )

            # The request may have a different org or org unset,
            # so the context is retrieved from the task, not taken from the request
            permissions.append(TaskPermission.create_scope_view(request, task))

        return permissions

    @classmethod
    def _get_scopes(cls, request, view, obj):
        return [{"list": cls.Scopes.LIST}[view.action]]

    def get_resource(self):
        raise NotImplementedError("This permission is only a wrapper around TaskPermission")
