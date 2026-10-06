# SPDX-License-Identifier: MIT

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from cvat.apps.engine.models import Task

from .counts import count_annotations_per_label
from .permissions import AnnotationCountsPermission
from .serializers import AnnotationCountsSerializer


class TaskAnnotationCountsViewSet(viewsets.GenericViewSet):
    queryset = Task.objects.select_related("organization", "project")
    iam_permission_class = AnnotationCountsPermission
    filter_backends = []  # only single tasks are fetched by id, so list filters do not apply

    @extend_schema(
        summary="Get the number of annotations per label in a task",
        parameters=[
            OpenApiParameter(
                "group_by",
                description="Also count each label's annotations per shape type",
                location=OpenApiParameter.QUERY,
                type=OpenApiTypes.STR,
                enum=["shape_type"],
                required=False,
            ),
        ],
        responses={"200": AnnotationCountsSerializer},
    )
    @action(detail=True, methods=["GET"], url_path="annotation-counts", serializer_class=None)
    def annotation_counts(self, request, pk: int):
        task = self.get_object()  # runs the access check for this task

        group_by = request.query_params.get("group_by")
        if group_by not in (None, "shape_type"):
            raise ValidationError({"group_by": "The only supported value is 'shape_type'"})

        labels = count_annotations_per_label(task, by_shape_type=group_by == "shape_type")
        serializer = AnnotationCountsSerializer(
            {
                "task_id": task.id,
                "total": sum(label["count"] for label in labels),
                "labels": labels,
            }
        )
        return Response(serializer.data)
