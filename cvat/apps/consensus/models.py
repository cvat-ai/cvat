from copy import deepcopy
from typing import Any

from django.db import models
from django.forms.models import model_to_dict

from cvat.apps.engine.models import Job, ShapeType, Task


class ConsensusSettings(models.Model):
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name="consensus_settings",
        null=True,
        blank=True,
    )
    agreement_score_threshold = models.FloatField(default=0)
    quorum = models.IntegerField(default=0)
    iou_threshold = models.FloatField(default=0)

    def to_dict(self):
        return model_to_dict(self)

    @property
    def organization_id(self):
        return getattr(self.task.organization, "id", None)


class ConsensusReport(models.Model):
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name="consensus_reports",
        null=True,
        blank=True,
    )
    created_date = models.DateTimeField(auto_now_add=True)
    data = models.JSONField()
