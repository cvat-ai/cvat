# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from django.db import models

from cvat.apps.engine.models import Task


class ConsensusSettings(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="consensus_settings")
    iou_threshold = models.FloatField(default=0.4)

    @property
    def organization_id(self):
        return self.task.organization_id
