# Copyright (C) 2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations  # this allows forward references

from copy import deepcopy
from typing import Any

from django.db import models
from django.forms.models import model_to_dict

from cvat.apps.engine.models import Task


class ConsensusSettings(models.Model):
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name="consensus_settings",
        null=True,
        blank=True,
    )
    quorum = models.FloatField(default=0.5)
    iou_threshold = models.FloatField()

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        defaults = deepcopy(self.get_defaults())
        for field in self._meta.fields:
            if field.name in defaults:
                field.default = defaults[field.name]

        super().__init__(*args, **kwargs)

    @classmethod
    def get_defaults(cls) -> dict:
        # Here we use the same annotation matching settings as in quality control
        import cvat.apps.quality_control.quality_reports as qc

        default_settings = qc.DatasetComparator.DEFAULT_SETTINGS.to_dict()

        existing_fields = {f.name for f in cls._meta.fields}
        return {k: v for k, v in default_settings.items() if k in existing_fields}

    def to_dict(self):
        return model_to_dict(self)

    @property
    def organization_id(self):
        return getattr(self.task.organization, "id", None)
