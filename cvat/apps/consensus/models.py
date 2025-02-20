# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from django.db import models

import cvat.apps.quality_control.quality_reports as qc
from cvat.apps.engine.models import Task


class ConsensusSettings(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="consensus_settings")
    quorum = models.FloatField(default=0.5)
    iou_threshold = models.FloatField(default=qc.DatasetComparator.DEFAULT_SETTINGS.iou_threshold)

    @property
    def organization_id(self):
        return self.task.organization_id
