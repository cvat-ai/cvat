from pathlib import Path

from django.db.models import Count
from django.http import HttpResponse
from rest_framework import viewsets
from rest_framework.response import Response

from cvat.apps.engine.models import LabeledShape, Task

from cvat.apps.engine.permissions import TaskPermission


class ClassCountViewSet(viewsets.GenericViewSet):
    queryset = Task.objects.all()
    iam_permission_class = TaskPermission
    iam_supports_organization_params = False
    search_fields = ()
    simple_filters = ()
    filter_fields = ()
    ordering_fields = ()
    ordering = ()

    def retrieve(self, request, pk=None):
        task = self.get_object()
        rows = (
            LabeledShape.objects.filter(job__segment__task_id=task.id)
            .values("label__name")
            .annotate(count=Count("id"))
            .order_by("-count", "label__name")
        )
        counts = [{"label": row["label__name"], "count": row["count"]} for row in rows]
        return Response(
            {
                "task_id": task.id,
                "total": sum(item["count"] for item in counts),
                "counts": counts,
            }
        )


def analytics_page(request):
    html = (Path(__file__).parent / "analytics.html").read_text(encoding="utf-8")
    return HttpResponse(html)
