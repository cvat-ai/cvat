# SPDX-License-Identifier: MIT

from drf_spectacular.utils import extend_schema
from rest_framework import viewsets
from rest_framework.decorators import action
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
        responses={"200": AnnotationCountsSerializer},
    )
    @action(detail=True, methods=["GET"], url_path="annotation-counts", serializer_class=None)
    def annotation_counts(self, request, pk: int):
        task = self.get_object()  # runs the access check for this task
        labels = count_annotations_per_label(task)
        serializer = AnnotationCountsSerializer(
            {
                "task_id": task.id,
                "total": sum(label["count"] for label in labels),
                "labels": labels,
            }
        )
        return Response(serializer.data)
