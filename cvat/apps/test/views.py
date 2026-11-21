from pathlib import Path

from django.db.models import Count
from django.http import HttpResponse
from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from cvat.apps.engine.models import LabeledShape, ShapeType, Task

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
        shapes = LabeledShape.objects.filter(job__segment__task_id=task.id)
        shape_type = request.query_params.get("shape_type")
        if shape_type:
            valid_types = {shape.value for shape in ShapeType}
            if shape_type not in valid_types:
                raise ValidationError(
                    {
                        "shape_type": (
                            f"Invalid shape type '{shape_type}'. "
                            f"Valid values: {', '.join(sorted(valid_types))}"
                        )
                    }
                )
            shapes = shapes.filter(type=shape_type)

        rows = (
            shapes.values("label__name")
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
