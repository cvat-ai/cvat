# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.db.models import Count
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated

from cvat.apps.engine.models import LabeledShape, Task

from .permissions import check_task_access
from .serializers import TaskAnnotationAnalyticsResponseSerializer


def query_task_annotation_counts(task_id: int):
    query = (
        LabeledShape.objects.filter(job__segment__task_id=task_id)
        .values("label_id", "label__name", "label__color")
        .annotate(count=Count("id"))
        .order_by("-count")
    )

    counts = [
        {
            "label_id": item["label_id"],
            "label_name": item["label__name"],
            "color": item.get("label__color") or "",
            "count": item["count"],
        }
        for item in query
    ]
    total_annotations = sum(item["count"] for item in counts)
    return total_annotations, counts


@extend_schema(
    tags=["analytics"],
    summary="Get annotation counts by class for a task",
    responses={
        200: OpenApiResponse(
            response=TaskAnnotationAnalyticsResponseSerializer,
            description="Per-class annotation distribution",
        ),
        401: OpenApiResponse(description="Authentication credentials were not provided"),
        403: OpenApiResponse(description="User does not have access to this task"),
        404: OpenApiResponse(description="Task not found"),
    },
)
class TaskAnnotationCountsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk: int):
        task = get_object_or_404(Task, pk=pk)

        if not check_task_access(request, task):
            raise PermissionDenied("You do not have permission to access this task.")

        total, counts = query_task_annotation_counts(task.id)

        data = {
            "task_id": task.id,
            "total_annotations": total,
            "counts": counts,
        }
        serializer = TaskAnnotationAnalyticsResponseSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
