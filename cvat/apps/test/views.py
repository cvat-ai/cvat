# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from drf_spectacular.utils import extend_schema
from rest_framework import viewsets
from rest_framework.response import Response

from cvat.apps.engine.models import Task

from .live import make_ticket
from .permissions import AnnotationStatsPermission
from .serializers import AnnotationStatsSerializer
from .stats import count_annotations_by_label


@extend_schema(tags=["annotation-stats"])
class AnnotationStatsViewSet(viewsets.GenericViewSet):
    queryset = Task.objects.select_related("project", "organization")
    iam_permission_class = AnnotationStatsPermission
    # The view only ever returns one task, so the list search/filter/ordering backends do not apply
    filter_backends = []
    lookup_url_kwarg = "task_id"
    lookup_value_regex = r"\d+"

    @extend_schema(
        summary="Get the number of annotations per label of a task",
        responses=AnnotationStatsSerializer,
    )
    def retrieve(self, request, task_id):
        task = self.get_object()
        labels = count_annotations_by_label(task)
        stats = {
            "task_id": task.id,
            "total": sum(label["count"] for label in labels),
            "labels": labels,
            "ws_ticket": make_ticket(task.id),
        }
        return Response(AnnotationStatsSerializer(stats).data)
