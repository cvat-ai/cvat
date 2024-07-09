# Copyright (C) 2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations  # this allows forward references

from copy import deepcopy
from enum import Enum
from typing import Any, Sequence

from datumaro.components.errors import (
    AnnotationsTooCloseError,
    FailedAttrVotingError,
    FailedLabelVotingError,
    NoMatchingAnnError,
    NoMatchingItemError,
    WrongGroupError,
)
from django.core.exceptions import ValidationError
from django.db import models
from django.forms.models import model_to_dict

from cvat.apps.engine.models import Job, ShapeType, Task


class ConsensusConflictType(str, Enum):
    NoMatchingItemError = "NO_MATCHING_ITEM"
    FailedAttrVotingError = "FAILED_ATTRIBUTE_VOTING"
    NoMatchingAnnError = "NO_MATCHING_ANNOTATION"
    AnnotationsTooCloseError = "ANNOTATION_TOO_CLOSE"
    WrongGroupError = "WRONG_GROUP"
    FailedLabelVotingError = "FAILED_LABEL_VOTING"

    def __str__(self) -> str:
        return self.value

    @classmethod
    def choices(cls):
        return tuple((x.value, x.name) for x in cls)


class AnnotationType(str, Enum):
    TAG = "tag"
    SHAPE = "shape"
    TRACK = "track"

    def __str__(self) -> str:
        return self.value

    @classmethod
    def choices(cls):
        return tuple((x.value, x.name) for x in cls)


class ConsensusSettings(models.Model):
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name="consensus_settings",
        null=True,
        blank=True,
    )
    agreement_score_threshold = models.FloatField(default=0)
    quorum = models.IntegerField(default=-1)
    iou_threshold = models.FloatField(default=0.5)

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)

        if self.quorum == -1:
            self.quorum = self.task.consensus_jobs_per_normal_job // 2

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
    job = models.ForeignKey(
        Job,
        on_delete=models.CASCADE,
        related_name="consensus_reports",
        null=True,
        blank=True,
    )

    created_date = models.DateTimeField(auto_now_add=True)
    target_last_updated = models.DateTimeField()

    data = models.JSONField()

    conflicts: Sequence[ConsensusConflict]

    def _parse_report(self):
        from cvat.apps.consensus.consensus_reports import ComparisonReport

        return ComparisonReport.from_json(self.data)

    @property
    def summary(self):
        report = self._parse_report()
        return report.comparison_summary

    def get_task(self) -> Task:
        if self.task is not None:
            return self.task
        else:
            return self.job.segment.task

    def get_json_report(self) -> str:
        return self.data

    def clean(self):
        if not (self.job is not None) ^ (self.task is not None):
            raise ValidationError("One of the 'job' and 'task' fields must be set")

    @property
    def organization_id(self):
        if task := self.get_task():
            return getattr(task.organization, "id", None)
        return None


class ConsensusConflict(models.Model):
    report = models.ForeignKey(ConsensusReport, on_delete=models.CASCADE, related_name="conflicts")
    frame = models.PositiveIntegerField()
    type = models.CharField(max_length=32, choices=ConsensusConflictType.choices())

    annotation_ids: Sequence[AnnotationId]

    @property
    def organization_id(self):
        return self.report.organization_id


class AnnotationId(models.Model):
    conflict = models.ForeignKey(
        ConsensusConflict, on_delete=models.CASCADE, related_name="annotation_ids"
    )

    obj_id = models.PositiveIntegerField()
    job_id = models.PositiveIntegerField()
    type = models.CharField(max_length=32, choices=AnnotationType.choices())
    shape_type = models.CharField(
        max_length=32, choices=ShapeType.choices(), null=True, default=None
    )

    def clean(self) -> None:
        if self.type in [AnnotationType.SHAPE, AnnotationType.TRACK]:
            if not self.shape_type:
                raise ValidationError("Annotation kind must be specified")
        elif self.type == AnnotationType.TAG:
            if self.shape_type:
                raise ValidationError("Annotation kind must be empty")
        else:
            raise ValidationError(f"Unexpected type value '{self.type}'")
