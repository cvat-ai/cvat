# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from collections import Counter

from django.db.models import Count
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from cvat.apps.engine.models import (
    LabeledImage,
    LabeledInterval,
    LabeledShape,
    LabeledTrack,
    Task,
)
from cvat.apps.engine.types import ExtendedRequest

from .permissions import ClassCountsPermission


class TaskClassCountsViewSet(viewsets.GenericViewSet):
    """Return per-class annotation counts for a task (DB read)."""

    iam_permission_class = ClassCountsPermission
    queryset = Task.objects.select_related("organization", "project").all()
    lookup_value_regex = r"[0-9]+"
    # Required by CVAT's SearchFilter / filter backends
    search_fields = ()
    filter_fields = ("id",)
    simple_filters = ()
    ordering_fields = ("id",)
    ordering = "id"

    def get_queryset(self):
        return Task.objects.select_related("organization", "project").all()

    @staticmethod
    def _counts_for_task(task: Task) -> list[dict]:
        task_filter = {"job__segment__task_id": task.id}
        # Top-level shapes/tracks only (exclude skeleton element children).
        shape_filter = {**task_filter, "parent__isnull": True}
        track_filter = {**task_filter, "parent__isnull": True}

        totals: Counter[str] = Counter()
        query_specs = (
            (LabeledShape, shape_filter),
            (LabeledImage, task_filter),
            (LabeledTrack, track_filter),
            (LabeledInterval, task_filter),
        )
        for model, filt in query_specs:
            rows = model.objects.filter(**filt).values("label__name").annotate(c=Count("id"))
            for row in rows:
                name = row["label__name"]
                if name is None:
                    continue
                totals[name] += row["c"]

        label_names = list(task.get_labels().order_by("name").values_list("name", flat=True))
        counts = [{"label": name, "count": int(totals.get(name, 0))} for name in label_names]

        # Include any annotation label not present in the task label set.
        known = set(label_names)
        for name, count in sorted(totals.items()):
            if name not in known:
                counts.append({"label": name, "count": int(count)})

        return counts

    @extend_schema(
        summary="Get annotation counts per class for a task",
        responses={
            "200": OpenApiResponse(description="Per-class annotation counts"),
            "401": OpenApiResponse(description="Not authenticated"),
            "403": OpenApiResponse(description="No access to the task"),
            "404": OpenApiResponse(description="Task not found"),
        },
    )
    @action(detail=True, methods=["GET"], url_path="class-counts")
    def class_counts(self, request: ExtendedRequest, pk: int | None = None):
        task = self.get_object()
        return Response(
            {
                "task_id": task.id,
                "counts": self._counts_for_task(task),
            }
        )
