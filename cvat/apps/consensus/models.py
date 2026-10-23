# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from django.db import models

from cvat.apps.engine.models import Task
from cvat.apps.quality_control.models import DefaultComparisonSettings


class ConsensusSettings(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="consensus_settings")
    iou_threshold = models.FloatField(default=DefaultComparisonSettings.iou_threshold)

    @property
    def organization_id(self):
        return self.task.organization_id
