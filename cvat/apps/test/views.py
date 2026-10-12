# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.db.models import Count, F
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from cvat.apps.engine.models import LabeledShape, Task
from cvat.apps.engine.permissions import TaskPermission


class TaskClassCountsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, task_id: int):
        task = get_object_or_404(Task.objects.select_related("organization"), pk=task_id)

        if not TaskPermission.create_scope_view(request, task).check_access().allow:
            raise PermissionDenied("You do not have access to this task")

        counts = (
            LabeledShape.objects.filter(job__segment__task_id=task_id)
            .values(name=F("label__name"))
            .annotate(count=Count("id"))
            .order_by("-count", "name")
        )

        return Response({"counts": list(counts)})
