from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema
from django.db.models import Count
from cvat.apps.engine.models import Task, LabeledShape, LabeledTrack, LabeledImage, LabeledInterval
from .permissions import TestTaskPermission
from .serializers import TaskAnnotationStatsSerializer

class TestTaskViewSet(viewsets.GenericViewSet):
    queryset = Task.objects.all()
    iam_supports_organization_params = True
    iam_permission_class = TestTaskPermission
    search_fields = ("name",)
    ordering_fields = ("id",)
    ordering = "-id"

    @extend_schema(
        summary="Get annotation counts per class for a task",
        description="Returns the number of annotations per class for the specified task, aggregated directly from the database.",
        responses={
            "200": TaskAnnotationStatsSerializer,
        },
        tags=["test"],
    )
    @action(detail=True, methods=["GET"], url_path="annotations/stats")
    def annotations_stats(self, request, pk=None):
        task = self.get_object()

        labels = task.get_labels()

        shape_counts = dict(
            LabeledShape.objects.filter(job__segment__task_id=task.id)
            .values("label_id")
            .annotate(count=Count("id"))
            .values_list("label_id", "count")
        )
        track_counts = dict(
            LabeledTrack.objects.filter(job__segment__task_id=task.id)
            .values("label_id")
            .annotate(count=Count("id"))
            .values_list("label_id", "count")
        )
        tag_counts = dict(
            LabeledImage.objects.filter(job__segment__task_id=task.id)
            .values("label_id")
            .annotate(count=Count("id"))
            .values_list("label_id", "count")
        )
        interval_counts = dict(
            LabeledInterval.objects.filter(job__segment__task_id=task.id)
            .values("label_id")
            .annotate(count=Count("id"))
            .values_list("label_id", "count")
        )

        classes = []
        total_annotations = 0
        for label in labels:
            shapes = shape_counts.get(label.id, 0)
            tracks = track_counts.get(label.id, 0)
            tags = tag_counts.get(label.id, 0)
            intervals = interval_counts.get(label.id, 0)
            label_total = shapes + tracks + tags + intervals
            total_annotations += label_total

            classes.append({
                "id": label.id,
                "name": label.name,
                "color": label.color,
                "shapes": shapes,
                "tracks": tracks,
                "tags": tags,
                "intervals": intervals,
                "total": label_total,
            })

        data = {
            "task_id": task.id,
            "total_annotations": total_annotations,
            "classes": classes,
        }
        return Response(TaskAnnotationStatsSerializer(data).data)
