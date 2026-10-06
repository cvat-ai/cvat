# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.db.models import Count
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from rest_framework.authentication import BasicAuthentication, SessionAuthentication
from rest_framework.exceptions import NotAuthenticated, PermissionDenied
from rest_framework.permissions import IsAuthenticated

from cvat.apps.engine.models import LabeledShape, ShapeType, Task

from .permissions import check_task_access
from .serializers import TaskAnnotationAnalyticsResponseSerializer


def query_task_annotation_counts(task_id: int, shape_type: str | None = None):
    shapes = LabeledShape.objects.filter(job__segment__task_id=task_id)

    if shape_type:
        shapes = shapes.filter(type=shape_type)

    query = (
        shapes.values("label_id", "label__name", "label__color")
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
    parameters=[
        OpenApiParameter(
            name="shape_type",
            type=str,
            location=OpenApiParameter.QUERY,
            required=False,
            description="Optional filter by shape geometry (e.g. rectangle, polygon)",
        )
    ],
    responses={
        200: OpenApiResponse(
            response=TaskAnnotationAnalyticsResponseSerializer,
            description="Per-class annotation distribution",
        ),
        400: OpenApiResponse(description="Invalid shape_type parameter"),
        401: OpenApiResponse(description="Authentication credentials were not provided"),
        403: OpenApiResponse(description="User does not have access to this task"),
        404: OpenApiResponse(description="Task not found"),
    },
)
class TaskAnnotationCountsView(APIView):
    authentication_classes = [BasicAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, pk: int):
        if not request.user or not request.user.is_authenticated:
            raise NotAuthenticated("Authentication credentials were not provided.")

        task = get_object_or_404(Task, pk=pk)

        if not check_task_access(request, task):
            raise PermissionDenied("You do not have permission to access this task.")

        shape_type = request.query_params.get("shape_type")
        if shape_type:
            valid_shapes = {item.value for item in ShapeType}
            if shape_type not in valid_shapes:
                return Response(
                    {"error": f"Invalid shape_type '{shape_type}'. Must be one of: {sorted(valid_shapes)}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        total, counts = query_task_annotation_counts(task.id, shape_type=shape_type)

        data = {
            "task_id": task.id,
            "total_annotations": total,
            "shape_type": shape_type,
            "counts": counts,
        }
        serializer = TaskAnnotationAnalyticsResponseSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
