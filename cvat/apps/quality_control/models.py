# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from collections.abc import Sequence
from copy import deepcopy
from enum import Enum
from typing import Any

from django.core.exceptions import ValidationError
from django.db import models
from django.forms.models import model_to_dict

from cvat.apps.engine.models import Job, ShapeType, Task, User


class AnnotationConflictType(str, Enum):
    MISSING_ANNOTATION = "missing_annotation"
    EXTRA_ANNOTATION = "extra_annotation"
    MISMATCHING_LABEL = "mismatching_label"
    LOW_OVERLAP = "low_overlap"
    MISMATCHING_DIRECTION = "mismatching_direction"
    MISMATCHING_ATTRIBUTES = "mismatching_attributes"
    MISMATCHING_GROUPS = "mismatching_groups"
    COVERED_ANNOTATION = "covered_annotation"

    def __str__(self) -> str:
        return self.value

    @classmethod
    def choices(cls):
        return tuple((x.value, x.name) for x in cls)


class AnnotationConflictSeverity(str, Enum):
    WARNING = "warning"
    ERROR = "error"

    def __str__(self) -> str:
        return self.value

    @classmethod
    def choices(cls):
        return tuple((x.value, x.name) for x in cls)


class MismatchingAnnotationKind(str, Enum):
    ATTRIBUTE = "attribute"
    LABEL = "label"

    def __str__(self) -> str:
        return self.value

    @classmethod
    def choices(cls):
        return tuple((x.value, x.name) for x in cls)


class QualityReportTarget(str, Enum):
    JOB = "job"
    TASK = "task"

    def __str__(self) -> str:
        return self.value

    @classmethod
    def choices(cls):
        return tuple((x.value, x.name) for x in cls)


class QualityTargetMetricType(str, Enum):
    ACCURACY = "accuracy"
    PRECISION = "precision"
    RECALL = "recall"

    def __str__(self) -> str:
        return self.value

    @classmethod
    def choices(cls):
        return tuple((x.value, x.name) for x in cls)


class QualityReport(models.Model):
    job = models.ForeignKey(
        Job, on_delete=models.CASCADE, related_name="quality_reports", null=True, blank=True
    )
    task = models.ForeignKey(
        Task, on_delete=models.CASCADE, related_name="quality_reports", null=True, blank=True
    )

    parent = models.ForeignKey(
        "self", on_delete=models.CASCADE, related_name="children", null=True, blank=True
    )
    children: Sequence[QualityReport]

    created_date = models.DateTimeField(auto_now_add=True)
    target_last_updated = models.DateTimeField()
    gt_last_updated = models.DateTimeField()

    assignee = models.ForeignKey(
        User, on_delete=models.SET_NULL, related_name="quality_reports", null=True, blank=True
    )
    assignee_last_updated = models.DateTimeField(null=True)

    data = models.JSONField()

    conflicts: Sequence[AnnotationConflict]

    @property
    def target(self) -> QualityReportTarget:
        if self.job:
            return QualityReportTarget.JOB
        elif self.task:
            return QualityReportTarget.TASK
        else:
            assert False

    def _parse_report(self):
        from cvat.apps.quality_control.quality_reports import ComparisonReport

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


class AnnotationConflict(models.Model):
    report = models.ForeignKey(QualityReport, on_delete=models.CASCADE, related_name="conflicts")
    frame = models.PositiveIntegerField()
    type = models.CharField(max_length=32, choices=AnnotationConflictType.choices())
    severity = models.CharField(max_length=32, choices=AnnotationConflictSeverity.choices())

    annotation_ids: Sequence[AnnotationId]

    @property
    def organization_id(self):
        return self.report.organization_id


class AnnotationType(str, Enum):
    TAG = "tag"
    SHAPE = "shape"
    TRACK = "track"

    def __str__(self) -> str:
        return self.value

    @classmethod
    def choices(cls):
        return tuple((x.value, x.name) for x in cls)


class AnnotationId(models.Model):
    conflict = models.ForeignKey(
        AnnotationConflict, on_delete=models.CASCADE, related_name="annotation_ids"
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


class PointSizeBase(str, Enum):
    IMAGE_SIZE = "image_size"
    GROUP_BBOX_SIZE = "group_bbox_size"

    def __str__(self) -> str:
        return self.value

    @classmethod
    def choices(cls):
        return tuple((x.value, x.name) for x in cls)


class QualitySettings(models.Model):
    task = models.OneToOneField(Task, on_delete=models.CASCADE, related_name="quality_settings")

    iou_threshold = models.FloatField()
    oks_sigma = models.FloatField()
    line_thickness = models.FloatField()

    low_overlap_threshold = models.FloatField()

    point_size_base = models.CharField(
        max_length=32, choices=PointSizeBase.choices(), default=PointSizeBase.GROUP_BBOX_SIZE
    )

    compare_line_orientation = models.BooleanField()
    line_orientation_threshold = models.FloatField()

    compare_groups = models.BooleanField()
    group_match_threshold = models.FloatField()

    check_covered_annotations = models.BooleanField()
    object_visibility_threshold = models.FloatField()

    panoptic_comparison = models.BooleanField()

    compare_attributes = models.BooleanField()

    empty_is_annotated = models.BooleanField(default=False)

    target_metric = models.CharField(
        max_length=32,
        choices=QualityTargetMetricType.choices(),
        default=QualityTargetMetricType.ACCURACY,
    )

    target_metric_threshold = models.FloatField(default=0.7)

    max_validations_per_job = models.PositiveIntegerField(default=0)

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        defaults = deepcopy(self.get_defaults())
        for field in self._meta.fields:
            if field.name in defaults:
                field.default = defaults[field.name]

        super().__init__(*args, **kwargs)

    @classmethod
    def get_defaults(cls) -> dict:
        import cvat.apps.quality_control.quality_reports as qc

        default_settings = qc.DatasetComparator.DEFAULT_SETTINGS.to_dict()

        existing_fields = {f.name for f in cls._meta.fields}
        return {k: v for k, v in default_settings.items() if k in existing_fields}

    def to_dict(self):
        return model_to_dict(self)

    @property
    def organization_id(self):
        return getattr(self.task.organization, "id", None)
