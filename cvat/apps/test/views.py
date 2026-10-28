
from django.db.models import Count
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from cvat.apps.engine.models import (
    Job,
    LabeledImage,
    LabeledShape,
    LabeledTrack,
    Task,
)

from rest_framework.permissions import IsAuthenticated


class AnnotationCountView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request, task_id):
        task = get_object_or_404(Task, id=task_id)

        # Check access through CVAT's existing task permission scope.
        from cvat.apps.engine.permissions import TaskPermission
        permission = TaskPermission.create_scope_list(request)
        if not permission.filter(Task.objects.filter(id=task_id)).exists():
            raise PermissionDenied("You do not have access to this task.")

        jobs = Job.objects.filter(segment__task=task)
        counts = {}

        for model in (LabeledShape, LabeledImage, LabeledTrack):
            rows = (
                model.objects.filter(job__in=jobs)
                .values("label__name")
                .annotate(count=Count("id"))
                .order_by("label__name")
            )

            for row in rows:
                name = row["label__name"]
                counts[name] = counts.get(name, 0) + row["count"]

        return Response({
            "task_id": task_id,
            "counts": [
                {"label": name, "count": count}
                for name, count in sorted(counts.items())
            ],
        })
