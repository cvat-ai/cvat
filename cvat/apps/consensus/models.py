# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from attrs import fields_dict
from django.db import models

from cvat.apps.engine.models import Task
from cvat.apps.quality_control.comparison_report import ComparisonParameters

DEFAULT_CONSENSUS_IOU_THRESHOLD = fields_dict(ComparisonParameters)["iou_threshold"].default


class ConsensusSettings(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="consensus_settings")
    iou_threshold = models.FloatField(default=DEFAULT_CONSENSUS_IOU_THRESHOLD)

    @property
    def organization_id(self):
        return self.task.organization_id
