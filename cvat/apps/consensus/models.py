from django.db import models
from cvat.apps.engine.models import Job, ShapeType, Task
from django.db import models


class MergeReport(models.Model):
    task = models.ForeignKey(
        Task, on_delete=models.CASCADE, related_name="merge_reports", null=True, blank=True
    )
    created_date = models.DateTimeField(auto_now_add=True)
    data = models.JSONField()