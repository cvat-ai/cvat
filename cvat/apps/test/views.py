# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.db.models import Count
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from cvat.apps.engine import models
from cvat.apps.engine.permissions import TaskPermission


class TaskAnnotationCountViewSet(viewsets.GenericViewSet):
    queryset = models.Task.objects.all()
    search_fields = []
    ordering_fields = ["id"]
    iam_permission_class = TaskPermission

    @action(detail=True, methods=["GET"], url_path="annotation-counts")
    def annotations(self, request, pk=None):
        task = get_object_or_404(models.Task, pk=pk)
        self.check_object_permissions(request, task)
        counts = (
            models.LabeledShape.objects.filter(job__segment__task=task)
            .values("label__name")
            .annotate(count=Count("id"))
            .order_by("label__name")
        )

        return Response(
            {
                "counts": [
                    {"label": row["label__name"], "count": row["count"]} for row in counts
                ]
            }
        )
