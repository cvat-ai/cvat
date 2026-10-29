# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.db.models import Count
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from cvat.apps.engine import models
from cvat.apps.engine.models import Task
from cvat.apps.engine.types import ExtendedRequest


ANNOTATION_MODELS = (
    (models.LabeledImage, "Image"),
    (models.LabeledShape, "Shape"),
    (models.LabeledTrack, "Track"),
    (models.LabeledInterval, "Interval"),
)


def get_task_annotation_counts(task: Task, group_by: str) -> list[dict[str, int | str]]:
    if group_by == "type":
        counts_by_type = {name: 0 for _, name in ANNOTATION_MODELS}

        for annotation_model, name in ANNOTATION_MODELS:
            counts_by_type[name] = annotation_model.objects.filter(
                job__segment__task_id=task.id
            ).count()

        return [
            {"group_name": name, "count": count}
            for name, count in counts_by_type.items()
        ]

    labels = task.project.label_set.all() if task.project else task.label_set.all()
    counts_by_label = {label.id: 0 for label in labels}

    annotation_counts = [
        annotation_model.objects.filter(job__segment__task_id=task.id)
        .values("label_id")
        .annotate(total=Count("id"))
        .order_by()
        for annotation_model, _ in ANNOTATION_MODELS
    ]
    for row in annotation_counts[0].union(*annotation_counts[1:], all=True):
        label_id = row["label_id"]
        if label_id in counts_by_label:
            counts_by_label[label_id] += int(row["total"])

    counts = [
        {
            "label_id": label.id,
            "label_name": label.name,
            "count": counts_by_label[label.id],
        }
        for label in labels
    ]
    return sorted(counts, key=lambda item: (-item["count"], item["label_name"]))


class TaskAnnotationCountsMixin:
    @extend_schema(
        methods=["GET"],
        summary="Get annotation counts by label or annotation type for a task",
        parameters=[
            OpenApiParameter(
                "group_by",
                OpenApiTypes.STR,
                OpenApiParameter.QUERY,
                enum=["label", "type"],
                description="Group counts by label (default) or annotation record type",
            )
        ],
        responses={
            "200": OpenApiResponse(
                description="Annotation counts aggregated across all task jobs"
            )
        },
    )
    @action(detail=True, methods=["GET"], url_path="annotation_counts")
    def annotation_counts(self, request: ExtendedRequest, pk: int) -> Response:
        task = self.get_object()
        group_by = request.query_params.get("group_by", "label")
        if group_by not in {"label", "type"}:
            raise ValidationError("group_by must be either 'label' or 'type'")

        return Response({"counts": get_task_annotation_counts(task, group_by)})
