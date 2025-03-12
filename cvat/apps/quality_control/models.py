# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from collections.abc import Sequence
from copy import deepcopy
from enum import Enum
from typing import Any

from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.forms.models import model_to_dict

from cvat.apps.engine.models import Job, JobType, Project, ShapeType, Task, TimestampedModel, User


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
    PROJECT = "project"

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


class QualityReportQuerySet(models.QuerySet):
    def count(self):
        # By default, Django produces count() requests possibly with a subquery inside
        # in some cases, e.g. if SELECT DISTINCT is used. The DISTINCT condition
        # compares all the rows to leave only unique ones.
        # This works extremely slow because of the large "data" fields.
        # In reality, we only need to check pk for uniqueness.
        # Here is a simple workaround - we drop all the fields but pk to get COUNT.
        # Ideally, put this optimization into paginator or permission filtering somehow.
        return models.QuerySet.count(self.only("pk"))


class QualityReport(models.Model):
    objects = QualityReportQuerySet.as_manager()

    job = models.ForeignKey(
        Job, on_delete=models.CASCADE, related_name="quality_reports", null=True, blank=True
    )
    task = models.ForeignKey(
        Task, on_delete=models.CASCADE, related_name="quality_reports", null=True, blank=True
    )
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="quality_reports", null=True, blank=True
    )

    # job reports should all have a single parent report
    # task reports may have none, or be shared between several project reports
    parents = models.ManyToManyField("self", symmetrical=False, blank=True, related_name="children")
    children: models.manager.ManyToManyRelatedManager[QualityReport]

    created_date = models.DateTimeField(auto_now_add=True)
    target_last_updated = models.DateTimeField()
    gt_last_updated = models.DateTimeField(null=True)

    assignee = models.ForeignKey(
        User, on_delete=models.SET_NULL, related_name="quality_reports", null=True, blank=True
    )
    assignee_last_updated = models.DateTimeField(null=True)

    data = models.JSONField()

    conflicts: models.manager.RelatedManager[AnnotationConflict]

    @property
    def parent(self) -> QualityReport | None:
        try:
            return self.parents.first()
        except self.DoesNotExist:
            return None

    @property
    def target(self) -> QualityReportTarget:
        if self.job:
            return QualityReportTarget.JOB
        elif self.task:
            return QualityReportTarget.TASK
        elif self.project:
            return QualityReportTarget.PROJECT
        else:
            assert False

    def _parse_report(self):
        from cvat.apps.quality_control.quality_reports import ComparisonReport

        return ComparisonReport.from_json(self.data)

    def _parse_report_summary(self):
        from cvat.apps.quality_control.quality_reports import ComparisonReport

        return ComparisonReport.summary_from_json(self.data)

    @property
    def summary(self):
        return self._parse_report_summary()

    def get_task(self) -> Task | None:
        if self.task:
            return self.task
        elif self.job:
            return self.job.segment.task
        else:
            return None

    def get_project(self) -> Project | None:
        if self.project:
            return self.project
        elif task := self.get_task():
            return task.project
        else:
            return None

    def get_json_report(self) -> str:
        return self.data

    def clean(self):
        if not (self.job is not None) ^ (self.task is not None):
            raise ValidationError("One of the 'job' and 'task' fields must be set")

    @property
    def organization_id(self) -> int | None:
        if task := self.get_task():
            return task.organization_id
        elif project := self.project:
            return project.organization_id
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


class QualitySettingsQuerySet(models.QuerySet):
    @transaction.atomic
    def create(self, **kwargs: Any):
        self._validate_constraints(kwargs)

        return super().create(**kwargs)

    @transaction.atomic
    def update(self, **kwargs: Any) -> int:
        self._validate_constraints(kwargs)

        return super().update(**kwargs)

    @transaction.atomic
    def get_or_create(self, *args, **kwargs: Any):
        self._validate_constraints(kwargs)

        return super().get_or_create(*args, **kwargs)

    @transaction.atomic
    def update_or_create(self, *args, **kwargs: Any):
        self._validate_constraints(kwargs)

        return super().update_or_create(*args, **kwargs)

    @transaction.atomic(savepoint=False)
    def _validate_constraints(self, obj: dict[str, Any]):
        # Constraints can't be set on the related model fields
        # This method requires the save operation to be called as a transaction
        if obj.get("task_id") and obj.get("project_id"):
            raise QualitySettings.InvalidParametersError(
                "'task[_id]' and 'project[_id]' cannot be used together"
            )


class QualitySettings(TimestampedModel):
    class InvalidParametersError(ValidationError):
        pass

    objects = QualitySettingsQuerySet.as_manager()

    task = models.OneToOneField(
        Task, on_delete=models.CASCADE, related_name="quality_settings", null=True, blank=True
    )  # OneToOneField implies unique
    project = models.OneToOneField(
        Project, on_delete=models.CASCADE, related_name="quality_settings", null=True, blank=True
    )  # OneToOneField implies unique

    inherit = models.BooleanField(default=True)

    job_filter = models.TextField(
        default='{"==": [{"var": "type"}, "%s"]}' % JobType.ANNOTATION,
        max_length=1024,
        blank=True,
    )

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
        if self.task_id:
            return self.task.organization_id
        elif self.project_id:
            return self.project.organization_id

        assert False

    @classmethod
    def get_job_filter_terms(cls) -> list[str]:
        from .quality_reports import TaskQualityCalculator

        return sorted(TaskQualityCalculator.JOB_FILTER_LOOKUPS.keys())
