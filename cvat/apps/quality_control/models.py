# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from enum import Enum
from functools import cached_property
from typing import TYPE_CHECKING, Any

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.forms.models import model_to_dict

from cvat.apps.engine.models import Job, JobType, Project, ShapeType, Task, TimestampedModel
from cvat.apps.quality_control.backends.capabilities import (
    get_all_backend_capabilities,
    get_backend_capabilities,
)
from cvat.utils import django_database as db_utils

if TYPE_CHECKING:
    from cvat.apps.organizations.models import Organization


class AnnotationConflictType(str, Enum):
    MISSING_ANNOTATION = "missing_annotation"
    EXTRA_ANNOTATION = "extra_annotation"
    MISMATCHING_LABEL = "mismatching_label"
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


class QualityReportVersion(models.TextChoices):
    "The format of QualityReport.data"

    LEGACY = "legacy"
    "The baseline format with mixed results, used before the quality requirements were introduced"

    GENERALIZED = "generalized"
    "The updated format with results grouped by quality requirements"


class QualityMetric(str, Enum):
    ACCURACY = "accuracy"
    PRECISION = "precision"
    RECALL = "recall"
    JACCARD_INDEX = "jaccard_index"
    DICE = "dice"

    def __str__(self) -> str:
        return self.value


class QualityMetricAggregation(str, Enum):
    MICRO = "micro"
    MEAN = "mean"
    LABEL = "label"

    @classmethod
    def from_metric_value(cls, value: str) -> QualityMetricAggregation:
        return next(
            (
                aggregation
                for aggregation in cls
                if aggregation != cls.MICRO and value.startswith(f"{aggregation.value}_")
            ),
            cls.MICRO,
        )


@dataclass(frozen=True)
class QualityTargetMetricType:
    metric: QualityMetric
    aggregation: QualityMetricAggregation = QualityMetricAggregation.MICRO

    @classmethod
    def parse(cls, value: QualityTargetMetricType | QualityMetric | str) -> QualityTargetMetricType:
        if isinstance(value, cls):
            return value

        value = str(value)
        aggregation = QualityMetricAggregation.from_metric_value(value)
        metric_value = (
            value.removeprefix(f"{aggregation.value}_")
            if aggregation != QualityMetricAggregation.MICRO
            else value
        )
        return cls(metric=QualityMetric(metric_value), aggregation=aggregation)

    @property
    def value(self) -> str:
        prefix = (
            f"{self.aggregation.value}_"
            if self.aggregation != QualityMetricAggregation.MICRO
            else ""
        )
        return f"{prefix}{self.metric.value}"

    def __str__(self) -> str:
        return self.value

    @classmethod
    def choices(cls) -> tuple[tuple[str, str], ...]:
        target_metrics = (
            cls(metric=metric, aggregation=aggregation)
            for aggregation in QualityMetricAggregation
            for metric in QualityMetric
        )
        return tuple(
            (target_metric.value, target_metric.value.upper()) for target_metric in target_metrics
        )

    @classmethod
    def __class_getitem__(cls, name: str) -> QualityTargetMetricType:
        # NOTE @grigorii: Keep enum-style lookup compatible with migration 0003.
        return cls(metric=QualityMetric[name])


QUALITY_TARGET_METRIC_CHOICES = QualityTargetMetricType.choices()


class QualityReport(models.Model):
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
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="quality_reports",
        null=True,
        blank=True,
    )
    assignee_last_updated = models.DateTimeField(null=True)

    data = models.JSONField()
    version = models.CharField(
        max_length=32,
        choices=QualityReportVersion.choices,
        default=QualityReportVersion.GENERALIZED,
    )

    conflicts: models.manager.RelatedManager[AnnotationConflict]

    class Meta:
        constraints = [
            models.CheckConstraint(
                name="quality_report_job_or_task_or_project",
                condition=(
                    models.Q(job_id__isnull=False, task_id__isnull=True, project_id__isnull=True)
                    | models.Q(job_id__isnull=True, task_id__isnull=False, project_id__isnull=True)
                    | models.Q(job_id__isnull=True, task_id__isnull=True, project_id__isnull=False)
                ),
            )
        ]

    @cached_property
    def parent_id(self) -> int | None:
        return getattr(self.parent, "id", None)

    @cached_property
    def parent(self) -> QualityReport | None:
        try:
            return self.parents.first()
        except self.DoesNotExist:
            return None

    @property
    def target(self) -> QualityReportTarget:
        if self.job_id:
            return QualityReportTarget.JOB
        elif self.task_id:
            return QualityReportTarget.TASK
        elif self.project_id:
            return QualityReportTarget.PROJECT
        else:
            assert False

    def _parse_report_summary(self):
        from cvat.apps.quality_control.comparison_report import ComparisonReport

        return ComparisonReport.summary_from_json(self.data)

    @property
    def summary(self):
        return self._parse_report_summary()

    def get_report_data(self) -> str:
        return self.data

    @property
    def has_readable_data(self) -> bool:
        from datumaro.util import parse_json

        try:
            report_data = parse_json(self.data)
        except (TypeError, ValueError):
            return False

        return isinstance(report_data, dict) and {
            "parameters",
            "comparison_summary",
        }.issubset(report_data)

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

    @property
    def organization_id(self) -> int | None:
        if task := self.get_task():
            return task.organization_id
        elif project := self.project:
            return project.organization_id
        return None

    @property
    def organization(self) -> Organization | None:
        if task := self.get_task():
            return task.organization
        elif project := self.project:
            return project.organization
        return None


class AnnotationConflict(models.Model):
    report = models.ForeignKey(QualityReport, on_delete=models.CASCADE, related_name="conflicts")
    frame = models.PositiveIntegerField()
    type = models.CharField(max_length=32, choices=AnnotationConflictType.choices())
    severity = models.CharField(max_length=32, choices=AnnotationConflictSeverity.choices())
    attribute_names = models.JSONField(default=list, blank=True)
    requirements = models.JSONField(default=list, blank=True)

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


class ShapeSimilarityMetricType(models.TextChoices):
    IOU = "iou", "IoU"
    OKS = "oks", "OKS"
    BOUNDARY_F = "boundary_f", "Boundary F"
    EQUALITY = "equality", "Equality"


class DefaultComparisonSettings:
    # Shared between the quality checks and consensus

    compare_attributes: bool = True
    "Enables or disables attribute checks"

    boundary_f_tolerance: float = 5
    "The maximum allowed boundary deviation, px"

    boundary_f_threshold: float = 0.8
    "Used for distinction between matched / unmatched shapes with the Boundary F metric"

    iou_threshold: float = 0.4
    "Used for distinction between matched / unmatched shapes with the IoU metric"

    oks_threshold: float = 0.4
    "Used for distinction between matched / unmatched shapes with the OKS metric"

    # This specific value is from the original implementation:
    # https://cocodataset.org/#keypoints-eval
    # https://github.com/cocodataset/cocoapi/blob/8c9bcc3cf640524c4c20a9c40e89cb6a2f2fa0e9/PythonAPI/pycocotools/cocoeval.py#L523
    oks_sigma: float = 0.09
    """
    The point size, as a fraction of the object size, defined by the point size base.
    Corresponds to the standard deviation of the keypoint position.
    """

    point_size_base: PointSizeBase = PointSizeBase.GROUP_BBOX_SIZE
    "Determines how to obtain the object size for point comparisons"

    line_thickness: float = 0.01
    "Thickness of polylines, relatively to the (image area) ^ 0.5"

    compare_line_orientation: bool = True
    "Indicates that polylines have direction"

    line_orientation_threshold: float = 0.1
    """
    The minimal gain in the IoU between the given and reversed line directions
    to count the line inverted
    """

    compare_groups: bool = True
    "Enables or disables group checks"

    group_match_threshold: float = 0.5
    "Minimal IoU for groups to be considered matching"

    check_covered_annotations: bool = True
    "Check for fully-covered annotations"

    object_visibility_threshold: float = 0.05
    "Minimal visible area % of the spatial annotations"

    panoptic_comparison: bool = True
    "Use only the visible part of the masks and polygons in comparisons"

    @staticmethod
    def get_default_similarity_metric(
        annotation_type: QualityRequirementAnnotationType,
    ) -> ShapeSimilarityMetricType:
        capabilities = get_backend_capabilities(annotation_type)
        return ShapeSimilarityMetricType(
            capabilities.get_default_similarity_metric(annotation_type)
        )

    @classmethod
    def as_dict(cls) -> dict[str, Any]:
        return {
            k: v
            for k, v in cls.__dict__.items()
            if not k.startswith("_")
            if not callable(v)
            if not isinstance(v, classmethod | staticmethod)
        }


class QualitySettings(TimestampedModel):
    class Meta:
        constraints = [
            models.CheckConstraint(
                name="quality_settings_task_or_project",
                condition=(
                    models.Q(task_id__isnull=False, project_id__isnull=True)
                    | models.Q(task_id__isnull=True, project_id__isnull=False)
                ),
            )
        ]

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

    max_validations_per_job = models.PositiveIntegerField(default=0)

    requirements: Sequence[QualityRequirement]

    @property
    def organization_id(self):
        if self.task_id:
            return self.task.organization_id
        elif self.project_id:
            return self.project.organization_id

        assert False

    @classmethod
    def get_job_filter_terms(cls) -> list[str]:
        from .quality_calculators import TaskQualityCalculator

        return sorted(TaskQualityCalculator.JOB_FILTER_LOOKUPS.keys())

    def to_dict(self):
        return model_to_dict(self)

    def get_dimension(self) -> str | None:
        if self.task_id:
            return self.task.dimension or None
        return self.project.tasks.exclude(dimension="").values_list("dimension", flat=True).first()

    def get_supported_annotation_types(self) -> tuple[QualityRequirementAnnotationType, ...]:
        dimension = self.get_dimension()
        supported_types = {
            annotation_type
            for capabilities in get_all_backend_capabilities()
            if capabilities.dimension == dimension
            for annotation_type in capabilities.similarity_metrics
        }
        return tuple(t for t in QualityRequirementAnnotationType if t in supported_types)


class QualityRequirementAnnotationType(models.TextChoices):
    TAG = "tag"
    RECTANGLE = "rectangle"
    SKELETON = "skeleton"
    SKELETON_KEYPOINT = "skeleton_keypoint"
    POINTS = "points"
    POLYLINE = "polyline"
    MASK = "mask"
    POLYGON = "polygon"
    ELLIPSE = "ellipse"
    CUBOID = "cuboid"


INHERITED_REQUIREMENT_FIELDS = (
    "annotation_type",
    "target_metric",
    "target_metric_threshold",
    "similarity_metric",
    "boundary_f_tolerance",
    "boundary_f_threshold",
    "iou_threshold",
    "oks_threshold",
    "oks_sigma",
    "line_thickness",
    "point_size_base",
    "compare_line_orientation",
    "line_orientation_threshold",
    "compare_groups",
    "group_match_threshold",
    "check_covered_annotations",
    "object_visibility_threshold",
    "panoptic_comparison",
    "attribute_comparison",
)


class QualityRequirement(TimestampedModel):
    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["settings", "name"],
                name="quality_requirements_unique_per_settings",
            )
        ]

    settings = models.ForeignKey(
        QualitySettings,
        on_delete=models.CASCADE,
        related_name="requirements",
        related_query_name="requirement",
        null=False,
        blank=False,
    )

    name = models.CharField(max_length=250, blank=False)

    sort_order = models.IntegerField(default=0)

    annotation_type = models.CharField(
        max_length=32,
        choices=QualityRequirementAnnotationType.choices,
        null=True,
        blank=True,
    )

    target_metric = models.CharField(
        max_length=32,
        choices=QUALITY_TARGET_METRIC_CHOICES,
        null=True,
        blank=True,
    )

    target_metric_threshold = models.FloatField(null=True, blank=True)

    filter = models.TextField(blank=True)
    enabled = models.BooleanField(default=True)

    parent = models.ForeignKey(
        "self", on_delete=models.DO_NOTHING, null=True, blank=True, related_name="children"
    )

    similarity_metric = models.CharField(
        max_length=32,
        choices=ShapeSimilarityMetricType.choices,
        null=True,
        blank=True,
    )

    boundary_f_tolerance = models.FloatField(null=True, blank=True)
    boundary_f_threshold = models.FloatField(null=True, blank=True)

    iou_threshold = models.JSONField(null=True, blank=True)

    oks_threshold = models.FloatField(null=True, blank=True)
    oks_sigma = models.FloatField(null=True, blank=True)

    line_thickness = models.FloatField(null=True, blank=True)

    point_size_base = models.CharField(
        max_length=32,
        choices=PointSizeBase.choices(),
        null=True,
        blank=True,
    )

    compare_line_orientation = models.BooleanField(null=True, blank=True)
    line_orientation_threshold = models.FloatField(null=True, blank=True)

    compare_groups = models.BooleanField(null=True, blank=True)
    group_match_threshold = models.FloatField(null=True, blank=True)

    check_covered_annotations = models.BooleanField(null=True, blank=True)
    object_visibility_threshold = models.FloatField(null=True, blank=True)

    panoptic_comparison = models.BooleanField(null=True, blank=True)

    compare_attributes = models.BooleanField(null=True, blank=True)
    attribute_comparison = models.JSONField(null=True, blank=True)

    @property
    def organization_id(self) -> int | None:
        return self.settings.organization_id

    @property
    def is_base(self) -> bool:
        return self.parent_id is None

    @classmethod
    def get_disabled_parameter_value(cls, field_name: str) -> bool | None:
        """Use False for switches and None for other inapplicable parameters."""
        return False if isinstance(cls._meta.get_field(field_name), models.BooleanField) else None

    @classmethod
    def get_base_defaults(cls, annotation_type: QualityRequirementAnnotationType) -> dict[str, Any]:
        default_settings = DefaultComparisonSettings.as_dict()
        default_settings.update(
            similarity_metric=DefaultComparisonSettings.get_default_similarity_metric(
                annotation_type
            ),
            target_metric=str(QualityTargetMetricType(metric=QualityMetric.ACCURACY)),
            target_metric_threshold=0.7,
            compare_attributes=False,
            attribute_comparison=None,
        )
        existing_fields = {f.name for f in cls._meta.fields}
        default_settings = {k: v for k, v in default_settings.items() if k in existing_fields}
        capabilities = get_backend_capabilities(annotation_type)
        for field_name in default_settings:
            if field_name not in capabilities.supported_parameters:
                default_settings[field_name] = cls.get_disabled_parameter_value(field_name)

        return default_settings

    @staticmethod
    def get_supported_similarity_metrics() -> (
        dict[QualityRequirementAnnotationType, tuple[ShapeSimilarityMetricType, ...]]
    ):
        return {
            QualityRequirementAnnotationType(annotation_type): tuple(
                ShapeSimilarityMetricType(metric) for metric in metrics
            )
            for capabilities in get_all_backend_capabilities()
            for annotation_type, metrics in capabilities.similarity_metrics.items()
        }

    def to_dict(self):
        return model_to_dict(self)


def get_base_requirement_name(annotation_type: str) -> str:
    return f"Base {str(annotation_type).replace('_', ' ')}"


def ensure_base_quality_requirements(quality_settings: QualitySettings) -> bool:
    annotation_types = quality_settings.get_supported_annotation_types()
    if not annotation_types:
        # Tasks receive a dimension after data upload; empty projects have none.
        return False

    existing_types = set(
        quality_settings.requirements.filter(parent__isnull=True).values_list(
            "annotation_type", flat=True
        )
    )
    if existing_types.issuperset(annotation_types):
        return False

    # Serialize initialization without locking settings that already have their bases.
    with transaction.atomic():
        QualitySettings.objects.select_for_update().get(pk=quality_settings.pk)
        # Recheck after locking: another GT may have initialized shared project settings.
        existing_requirements = list(
            quality_settings.requirements.values_list("annotation_type", "parent_id", "sort_order")
        )
        existing_base_annotation_types = {
            annotation_type
            for annotation_type, parent_id, _ in existing_requirements
            if parent_id is None
        }
        next_sort_order = max((order for _, _, order in existing_requirements), default=-1) + 1

        requirements_to_create = []
        for annotation_type in annotation_types:
            if annotation_type in existing_base_annotation_types:
                continue

            requirements_to_create.append(
                QualityRequirement(
                    settings=quality_settings,
                    name=get_base_requirement_name(annotation_type),
                    sort_order=next_sort_order,
                    annotation_type=annotation_type,
                    enabled=False,
                    **QualityRequirement.get_base_defaults(annotation_type),
                )
            )
            next_sort_order += 1

        if not requirements_to_create:
            return False

        db_utils.bulk_create(QualityRequirement, requirements_to_create)
        db_utils.clear_prefetched_relation_cache(quality_settings, "requirements")
        quality_settings.touch()
        return True
