# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from collections import Counter

from django.db.models import Count
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, OpenApiTypes, extend_schema
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from cvat.apps.engine.models import (
    Job,
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
    def _counts_for_task(task: Task, *, job_id: int | None = None) -> list[dict]:
        task_filter: dict = {"job__segment__task_id": task.id}
        if job_id is not None:
            task_filter["job_id"] = job_id

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

    @staticmethod
    def _parse_job_id(request: ExtendedRequest, task: Task) -> int | None:
        raw = request.query_params.get("job_id")
        if raw in (None, ""):
            return None
        try:
            job_id = int(raw)
        except (TypeError, ValueError) as ex:
            raise ValidationError({"job_id": "Must be an integer."}) from ex

        belongs = Job.objects.filter(id=job_id, segment__task_id=task.id).exists()
        if not belongs:
            raise ValidationError(
                {"job_id": f"Job {job_id} does not belong to task {task.id}."}
            )
        return job_id

    @extend_schema(
        summary="Get annotation counts per class for a task",
        parameters=[
            OpenApiParameter(
                "job_id",
                location=OpenApiParameter.QUERY,
                type=OpenApiTypes.INT,
                required=False,
                description=(
                    "Optional filter: limit counts to annotations in this job "
                    "(must belong to the task)."
                ),
            ),
        ],
        responses={
            "200": OpenApiResponse(description="Per-class annotation counts"),
            "400": OpenApiResponse(description="Invalid job_id filter"),
            "401": OpenApiResponse(description="Not authenticated"),
            "403": OpenApiResponse(description="No access to the task"),
            "404": OpenApiResponse(description="Task not found"),
        },
    )
    @action(detail=True, methods=["GET"], url_path="class-counts")
    def class_counts(self, request: ExtendedRequest, pk: int | None = None):
        task = self.get_object()
        job_id = self._parse_job_id(request, task)
        return Response(
            {
                "task_id": task.id,
                "job_id": job_id,
                "filter": {"job_id": job_id} if job_id is not None else None,
                "counts": self._counts_for_task(task, job_id=job_id),
            }
        )
