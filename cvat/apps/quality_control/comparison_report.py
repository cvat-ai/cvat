# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import itertools
import math
from abc import ABCMeta
from collections import Counter
from copy import deepcopy
from functools import cached_property, lru_cache
from io import StringIO
from typing import Any, ClassVar

import datumaro as dm
import json_stream
import numpy as np
from attrs import asdict, define, field, fields_dict
from datumaro.util import dump_json, parse_json

from cvat.apps.engine.models import ShapeType
from cvat.apps.quality_control import models
from cvat.apps.quality_control.models import (
    AnnotationConflictSeverity,
    AnnotationConflictType,
    AnnotationType,
)
from cvat.apps.quality_control.utils import array_safe_divide


def _parse_annotation_conflict_type(value: str) -> AnnotationConflictType:
    return AnnotationConflictType(value)


def _parse_annotation_conflict_severity(value: str) -> AnnotationConflictSeverity:
    return AnnotationConflictSeverity(value)


@define(slots=False)
class Serializable(metaclass=ABCMeta):
    def _value_serializer(self, v):
        if isinstance(v, Serializable):
            return v.to_dict()
        elif isinstance(v, (list, tuple, set, frozenset)):
            return [self._value_serializer(vv) for vv in v]
        elif isinstance(v, dict):
            return {self._value_serializer(vk): self._value_serializer(vv) for vk, vv in v.items()}
        else:
            return v

    def to_dict(self) -> dict:
        return self._value_serializer(self._as_dict())

    def _as_dict(self, *, include_fields: list[str] | None = None) -> dict:
        d = asdict(self, recurse=False)

        for field_name in include_fields or []:
            d[field_name] = getattr(self, field_name)

        return d

    @classmethod
    def from_dict(cls, d: dict):
        raise NotImplementedError("Must be implemented in the subclass")


@define(slots=False)
class ReportNode(Serializable):
    _CACHED_FIELDS: ClassVar[list[str] | None] = None
    "Fields that can be set externally or be computed on access. Can be defined in a subclass"
    # subclasses must have a __dict__ attribute (i.e. don't use slots)

    @classmethod
    def _find_cached_fields(cls) -> list[str]:
        return [
            member.attrname
            for _, member in cls.__dict__.items()
            if isinstance(member, cached_property)
        ]

    @classmethod
    def _find_computable_fields(cls) -> list[str]:
        return [
            attrname for attrname, member in cls.__dict__.items() if isinstance(member, property)
        ]

    @classmethod
    def _collect_base_fields(cls, method: str) -> set:
        fields = set()

        for base_class in cls.__bases__:
            if issubclass(base_class, ReportNode) and base_class is not ReportNode:
                fields.update(getattr(base_class, method)(recursive=False))

        return fields

    @classmethod
    @lru_cache(maxsize=128)
    def _get_computable_fields(cls, recursive: bool = True) -> list[str]:
        fields = cls._find_computable_fields()

        if recursive:
            fields = list(set(fields) | cls._collect_base_fields("_get_computable_fields"))

        return fields

    @classmethod
    @lru_cache(maxsize=128)
    def _get_cached_fields(cls, recursive: bool = True) -> list[str]:
        fields = cls.__dict__.get("_CACHED_FIELDS")
        if fields is None:
            fields = cls._find_cached_fields()

        if recursive:
            fields = list(set(fields) | cls._collect_base_fields("_get_cached_fields"))

        return fields

    def __init__(self, *args, **kwargs):
        cached_field_kwargs = {
            field_name: kwargs.pop(field_name)
            for field_name in self._get_cached_fields()
            if field_name in kwargs
        }

        self.__attrs_init__(*args, **kwargs)

        self.__setattr__ = self.__checking_setattr__

        for field_name, field_value in cached_field_kwargs.items():
            setattr(self, field_name, field_value)

    def __checking_setattr__(self, __name: str, __value: Any):
        if __name not in self._get_cached_fields():
            self.reset_cached_fields()

        return super().__setattr__(__name, __value)

    def reset_cached_fields(self):
        for field in self._get_cached_fields():
            if field in self.__dict__:
                delattr(self, field)

    def _as_dict(self, *, include_fields: list[str] | None = None) -> dict:
        return super()._as_dict(
            include_fields=include_fields
            or (self._get_computable_fields() + self._get_cached_fields())
        )


@define(kw_only=True, init=False, slots=False)
class AnnotationId(ReportNode):
    obj_id: int
    job_id: int
    type: AnnotationType
    shape_type: ShapeType | None

    def _value_serializer(self, v):
        if isinstance(v, (AnnotationType, ShapeType)):
            return str(v)
        else:
            return super()._value_serializer(v)

    @classmethod
    def from_dict(cls, d: dict):
        return cls(
            obj_id=d["obj_id"],
            job_id=d["job_id"],
            type=AnnotationType(d["type"]),
            shape_type=ShapeType(d["shape_type"]) if d.get("shape_type") else None,
        )


@define(kw_only=True, init=False, slots=False)
class AnnotationConflict(ReportNode):
    frame_id: int
    type: AnnotationConflictType
    annotation_ids: list[AnnotationId]
    severity: AnnotationConflictSeverity = AnnotationConflictSeverity.ERROR
    attribute_names: list[str] = field(factory=list)

    @staticmethod
    def default_severity_for_type(
        conflict_type: AnnotationConflictType,
    ) -> AnnotationConflictSeverity:
        return AnnotationConflictSeverity.ERROR

    def _value_serializer(self, v):
        if isinstance(v, (AnnotationConflictType, AnnotationConflictSeverity)):
            return str(v)
        else:
            return super()._value_serializer(v)

    @classmethod
    def from_dict(cls, d: dict):
        conflict_type = _parse_annotation_conflict_type(d["type"])
        return cls(
            frame_id=d["frame_id"],
            type=conflict_type,
            annotation_ids=list(AnnotationId.from_dict(v) for v in d["annotation_ids"]),
            severity=(
                _parse_annotation_conflict_severity(d["severity"])
                if d.get("severity")
                else cls.default_severity_for_type(conflict_type)
            ),
            attribute_names=sorted(set(d.get("attribute_names") or [])),
        )


def _annotation_id_key(
    annotation_id: AnnotationId,
) -> tuple[int, int, AnnotationType, ShapeType | None]:
    return (
        annotation_id.obj_id,
        annotation_id.job_id,
        annotation_id.type,
        annotation_id.shape_type,
    )


def annotation_conflict_key(
    conflict: AnnotationConflict,
) -> tuple[
    int,
    AnnotationConflictType,
    tuple[tuple[int, int, AnnotationType, ShapeType | None], ...],
]:
    return (
        conflict.frame_id,
        conflict.type,
        tuple(
            sorted(_annotation_id_key(annotation_id) for annotation_id in conflict.annotation_ids)
        ),
    )


def merge_annotation_conflicts(
    target: AnnotationConflict, other: AnnotationConflict
) -> AnnotationConflict:
    merged_attribute_names = sorted(set(target.attribute_names) | set(other.attribute_names))
    if merged_attribute_names != target.attribute_names:
        target.attribute_names = merged_attribute_names

    return target


def deduplicate_annotation_conflicts(
    conflicts: list[AnnotationConflict],
) -> list[AnnotationConflict]:
    deduplicated_conflicts: dict[
        tuple[
            int,
            AnnotationConflictType,
            tuple[tuple[int, int, AnnotationType, ShapeType | None], ...],
        ],
        AnnotationConflict,
    ] = {}

    for conflict in conflicts:
        key = annotation_conflict_key(conflict)
        if key in deduplicated_conflicts:
            merge_annotation_conflicts(deduplicated_conflicts[key], conflict)
        else:
            deduplicated_conflicts[key] = conflict

    return list(deduplicated_conflicts.values())


@define(kw_only=True, init=False, slots=False)
class ComparisonParameters(ReportNode):
    included_annotation_types: list[dm.AnnotationType] = [
        dm.AnnotationType.bbox,
        dm.AnnotationType.points,
        dm.AnnotationType.mask,
        dm.AnnotationType.polygon,
        dm.AnnotationType.polyline,
        dm.AnnotationType.skeleton,
        dm.AnnotationType.label,
        dm.AnnotationType.ellipse,
    ]

    non_groupable_ann_type = dm.AnnotationType.label
    "Annotation type that can't be grouped"

    compare_attributes: bool = True
    "Enables or disables attribute checks"

    ignored_attributes: list[str] = []

    iou_threshold: float = 0.4
    "Used for distinction between matched / unmatched shapes"

    oks_sigma: float = 0.09
    "Like IoU threshold, but for points, % of the bbox area to match a pair of points"

    point_size_base: models.PointSizeBase = models.PointSizeBase.GROUP_BBOX_SIZE
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

    empty_is_annotated: bool = True
    """
    Consider unannotated (empty) frames virtually annotated as "nothing".
    If disabled, quality metrics, such as accuracy, will be 0 if both GT and DS frames
    have no annotations. When enabled, they will be 1 instead.
    This will also add virtual annotations to empty frames in the comparison results.
    """

    inherited: bool = False
    """
    Indicates that parent object parameters are inherited.
    For example, a task can inherit project parameters.
    """

    job_filter: str = ""
    "JSON filter expression for included jobs"

    def _value_serializer(self, v):
        if isinstance(v, dm.AnnotationType):
            return str(v.name)
        else:
            return super()._value_serializer(v)

    @classmethod
    def from_dict(cls, d: dict) -> ComparisonParameters:
        fields = fields_dict(cls)
        return cls(**{field_name: d[field_name] for field_name in fields if field_name in d})

    @classmethod
    def from_settings(
        cls, settings: models.QualitySettings, *, inherited: bool
    ) -> ComparisonParameters:
        parameters = cls.from_dict(settings.to_dict())
        parameters.inherited = inherited
        return parameters


@define(kw_only=True, init=False, slots=False)
class ComparisonReportParameters(ReportNode):
    inherited: bool = False
    """
    Indicates that parent object parameters are inherited.
    For example, a task can inherit project parameters.
    """

    job_filter: str = ""
    "JSON filter expression for included jobs"

    @classmethod
    def from_dict(cls, d: dict) -> ComparisonReportParameters:
        return cls(inherited=d["inherited"], job_filter=d["job_filter"])

    @classmethod
    def from_comparison_parameters(
        cls, parameters: ComparisonParameters
    ) -> ComparisonReportParameters:
        return cls(
            inherited=parameters.inherited,
            job_filter=parameters.job_filter,
        )


@define(kw_only=True, init=False, slots=False)
class ConfusionMatrix(ReportNode):
    labels: list[str] | None
    rows: np.ndarray | None

    @property
    def axes(self):
        return dict(cols="gt", rows="ds")

    def _value_serializer(self, v):
        if isinstance(v, np.ndarray):
            return v.tolist()
        else:
            return super()._value_serializer(v)

    def _update_cached_fields(self):
        self.reset_cached_fields()

        labels = self.labels
        if not labels:
            self.precision = None
            self.recall = None
            self.accuracy = None
            self.jaccard_index = None
            return

        assert self.rows is not None
        confusion_matrix = self.rows
        matched_ann_counts = np.diag(confusion_matrix)
        ds_ann_counts = np.sum(confusion_matrix, axis=1)
        gt_ann_counts = np.sum(confusion_matrix, axis=0)
        total_annotations_count = np.sum(confusion_matrix)

        self.jaccard_index = array_safe_divide(
            matched_ann_counts, ds_ann_counts + gt_ann_counts - matched_ann_counts
        )
        self.precision = array_safe_divide(matched_ann_counts, ds_ann_counts)
        self.recall = array_safe_divide(matched_ann_counts, gt_ann_counts)
        self.accuracy = (
            total_annotations_count  # TP + TN + FP + FN
            - (ds_ann_counts - matched_ann_counts)  # - FP
            - (gt_ann_counts - matched_ann_counts)  # - FN
            # ... = TP + TN
        ) / (total_annotations_count or 1)

    @cached_property
    def precision(self) -> np.ndarray | None:  # pylint: disable=method-hidden
        self._update_cached_fields()
        return self.precision

    @cached_property
    def recall(self) -> np.ndarray | None:  # pylint: disable=method-hidden
        self._update_cached_fields()
        return self.recall

    @cached_property
    def accuracy(self) -> np.ndarray | None:  # pylint: disable=method-hidden
        self._update_cached_fields()
        return self.accuracy

    @cached_property
    def jaccard_index(self) -> np.ndarray | None:  # pylint: disable=method-hidden
        self._update_cached_fields()
        return self.jaccard_index

    def accumulate(self, other: ConfusionMatrix, *, weight: float = 1):
        assert not other.labels or not self.labels or self.labels == other.labels

        if not self.labels and other.labels:
            self.labels = deepcopy(other.labels)
            self.rows = np.zeros_like(other.rows)

        if other.labels:
            self.rows += np.ceil(other.rows * weight).astype(self.rows.dtype)

        return self

    @classmethod
    def from_dict(cls, d: dict):
        return cls(
            # Avoid computing matrix values lazily if they are not in the report.
            # Doing so can result in unexpected extra matrix computations in a get list endpoint
            # TODO: maybe save all the summary output values in the DB as separate fields
            labels=d["labels"],
            rows=np.asarray(d["rows"]) if "rows" in d else None,
            precision=np.asarray(d["precision"]) if "precision" in d else None,
            recall=np.asarray(d["recall"]) if "recall" in d else None,
            accuracy=np.asarray(d["accuracy"]) if "accuracy" in d else None,
            jaccard_index=np.asarray(d["jaccard_index"]) if "jaccard_index" in d else None,
        )

    @classmethod
    def create_empty(cls, *, labels: list[str] | None = None) -> ConfusionMatrix:
        return cls(
            labels=labels,
            rows=np.zeros((len(labels), len(labels)), dtype=int) if labels else None,
        )


@define(kw_only=True, init=False, slots=False)
class ComparisonReportScoreComponents(ReportNode):
    valid_count: int
    missing_count: int
    extra_count: int

    @classmethod
    def from_counts(
        cls, *, valid_count: int, missing_count: int, extra_count: int
    ) -> ComparisonReportScoreComponents:
        return cls(
            valid_count=valid_count,
            missing_count=missing_count,
            extra_count=extra_count,
        )

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> ComparisonReportScoreComponents:
        return cls(
            valid_count=d.get("valid_count", 0),
            missing_count=d.get("missing_count", 0),
            extra_count=d.get("extra_count", 0),
        )

    @classmethod
    def create_empty(cls) -> ComparisonReportScoreComponents:
        return cls(valid_count=0, missing_count=0, extra_count=0)


@define(kw_only=True, init=False, slots=False)
class ComparisonReportAnnotationsSummary(ReportNode):
    valid_count: int
    missing_count: int
    extra_count: int
    total_count: int
    ds_count: int
    gt_count: int
    confusion_matrix: ConfusionMatrix | None

    @property
    def accuracy(self) -> float:
        return self.valid_count / (self.total_count or 1)

    @property
    def precision(self) -> float:
        return self.valid_count / (self.ds_count or 1)

    @property
    def recall(self) -> float:
        return self.valid_count / (self.gt_count or 1)

    def to_score_components(self) -> ComparisonReportScoreComponents:
        return ComparisonReportScoreComponents.from_counts(
            valid_count=self.valid_count,
            missing_count=self.missing_count,
            extra_count=self.extra_count,
        )

    @classmethod
    def from_confusion_matrix(
        cls, confusion_matrix: ConfusionMatrix | None
    ) -> ComparisonReportAnnotationsSummary:
        if not confusion_matrix or confusion_matrix.rows is None:
            return cls.create_empty()

        rows = confusion_matrix.rows
        matched_ann_counts = np.diag(rows)
        ds_ann_counts = np.sum(rows, axis=1)
        gt_ann_counts = np.sum(rows, axis=0)
        unmatched_idx = -1

        return cls(
            valid_count=np.sum(matched_ann_counts),
            missing_count=np.sum(rows[unmatched_idx, :]),
            extra_count=np.sum(rows[:, unmatched_idx]),
            total_count=np.sum(rows),
            ds_count=np.sum(ds_ann_counts[:unmatched_idx]),
            gt_count=np.sum(gt_ann_counts[:unmatched_idx]),
            confusion_matrix=confusion_matrix,
        )

    def accumulate(self, other: ComparisonReportAnnotationsSummary, *, weight: float = 1):
        for field in [
            "valid_count",
            "missing_count",
            "extra_count",
            "total_count",
            "ds_count",
            "gt_count",
        ]:
            setattr(self, field, getattr(self, field) + math.ceil(getattr(other, field) * weight))

        if self.confusion_matrix and other.confusion_matrix:
            self.confusion_matrix.accumulate(other.confusion_matrix, weight=weight)
        elif other.confusion_matrix:
            self.confusion_matrix = ConfusionMatrix.create_empty().accumulate(
                other.confusion_matrix, weight=weight
            )

    @classmethod
    def from_dict(cls, d: dict) -> ComparisonReportAnnotationsSummary:
        return cls(
            valid_count=d["valid_count"],
            missing_count=d["missing_count"],
            extra_count=d["extra_count"],
            total_count=d["total_count"],
            ds_count=d["ds_count"],
            gt_count=d["gt_count"],
            confusion_matrix=(
                ConfusionMatrix.from_dict(d["confusion_matrix"])
                if d.get("confusion_matrix")
                else None
            ),
        )

    @classmethod
    def create_empty(cls) -> ComparisonReportAnnotationsSummary:
        return cls(
            valid_count=0,
            missing_count=0,
            extra_count=0,
            total_count=0,
            ds_count=0,
            gt_count=0,
            confusion_matrix=None,
        )


@define(kw_only=True, init=False, slots=False)
class ComparisonReportTaskStats(ReportNode):
    all: set[int]
    custom: set[int]
    not_configured: set[int]
    excluded: set[int]
    completed: set[int]

    @property
    def total_count(self) -> int:
        return len(self.all)

    @property
    def custom_count(self) -> int:
        return len(self.custom)

    @property
    def not_configured_count(self) -> int:
        return len(self.not_configured)

    @property
    def excluded_count(self) -> int:
        return len(self.excluded)

    @property
    def included_count(self) -> int:
        return (
            self.total_count - self.custom_count - self.not_configured_count - self.excluded_count
        )

    @property
    def completed_count(self) -> int:
        return len(self.completed)

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> ComparisonReportTaskStats:
        return cls(
            all=d.get("all", set()),
            custom=d.get("custom", set()),
            not_configured=d.get("not_configured", set()),
            excluded=d.get("excluded", set()),
            completed=d.get("completed", set()),
        )

    @classmethod
    def create_empty(cls) -> ComparisonReportTaskStats:
        return cls(all=set(), custom=set(), not_configured=set(), excluded=set(), completed=set())


@define(kw_only=True, init=False, slots=False)
class ComparisonReportJobStats(ReportNode):
    all: set[int]
    excluded: set[int]
    not_checkable: set[int]
    completed: set[int]

    @property
    def total_count(self) -> int:
        return len(self.all)

    @property
    def not_checkable_count(self) -> int:
        return len(self.not_checkable)

    @property
    def excluded_count(self) -> int:
        return len(self.excluded)

    @property
    def included_count(self) -> int:
        # not_checkable are included
        return self.total_count - self.excluded_count

    @property
    def completed_count(self) -> int:
        return len(self.completed)

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> ComparisonReportJobStats:
        return cls(
            all=d.get("all", set()),
            excluded=d.get("excluded", set()),
            not_checkable=d.get("not_checkable", set()),
            completed=d.get("completed", set()),
        )

    @classmethod
    def create_empty(cls) -> ComparisonReportJobStats:
        return cls(all=set(), excluded=set(), not_checkable=set(), completed=set())


@define(kw_only=True, init=False, slots=False)
class ComparisonReportRequirementSummaryItem(ReportNode):
    name: str
    metric: str
    score: float | None
    score_components: ComparisonReportScoreComponents
    threshold: float
    requirement_id: int | None = None

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> ComparisonReportRequirementSummaryItem:
        return cls(
            requirement_id=d["requirement_id"],
            name=d["name"],
            metric=d["metric"],
            score=d.get("score"),
            score_components=ComparisonReportScoreComponents.from_dict(
                d.get("score_components", {})
            ),
            threshold=d["threshold"],
        )


@define(kw_only=True, init=False, slots=False)
class ComparisonReportRequirementsSummary(ReportNode):
    total: int
    enabled: int
    completed: int
    items: list[ComparisonReportRequirementSummaryItem] = field(factory=list)

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> ComparisonReportRequirementsSummary:
        return cls(
            total=d.get("total", 0),
            enabled=d.get("enabled", 0),
            completed=d.get("completed", 0),
            items=[
                ComparisonReportRequirementSummaryItem.from_dict(item)
                for item in d.get("items", [])
            ],
        )

    @classmethod
    def create_empty(cls) -> ComparisonReportRequirementsSummary:
        return cls(total=0, enabled=0, completed=0, items=[])


@define(kw_only=True, init=False, slots=False)
class ComparisonReportSummary(ReportNode):
    frames: list[str] | None
    total_frames: int

    conflict_count: int
    error_count: int
    conflicts_by_type: dict[AnnotationConflictType, int]

    tasks: ComparisonReportTaskStats | None
    jobs: ComparisonReportJobStats | None
    requirements: ComparisonReportRequirementsSummary | None = None

    @property
    def validation_frame_share(self) -> float:
        return self.validation_frames / (self.total_frames or 1)

    @property
    def mean_conflict_count(self) -> float:
        return self.conflict_count / (self.validation_frames or 1)

    @cached_property
    def validation_frames(self) -> int:
        if self.frames is None:
            assert False

        return len(self.frames)

    def __init__(self, **kwargs):
        if not ("frames" in kwargs or "validation_frames" in kwargs):
            raise AssertionError('"frames" or "validation_frames" must be present')

        super().__init__(**kwargs)

    def _value_serializer(self, v):
        if isinstance(v, AnnotationConflictType):
            return str(v)
        else:
            return super()._value_serializer(v)

    @classmethod
    def _from_dict_kwargs(cls, d: dict) -> dict[str, Any]:
        return {
            "frames": d.get("frames"),
            "total_frames": d["total_frames"],
            **(dict(validation_frames=d["validation_frames"]) if "validation_frames" in d else {}),
            "conflict_count": d["conflict_count"],
            "error_count": d["error_count"],
            "conflicts_by_type": {
                _parse_annotation_conflict_type(k): v
                for k, v in d.get("conflicts_by_type", {}).items()
            },
            "tasks": ComparisonReportTaskStats.from_dict(d["tasks"]) if d.get("tasks") else None,
            "jobs": ComparisonReportJobStats.from_dict(d["jobs"]) if d.get("jobs") else None,
            "requirements": (
                ComparisonReportRequirementsSummary.from_dict(d["requirements"])
                if d.get("requirements") is not None
                else None
            ),
        }

    @classmethod
    def from_dict(cls, d: dict):
        return cls(**cls._from_dict_kwargs(d))


@define(kw_only=True, init=False, slots=False)
class ComparisonReportRequirementComparisonSummary(ReportNode):
    conflict_count: int
    error_count: int
    conflicts_by_type: dict[AnnotationConflictType, int]
    score: float | None
    score_components: ComparisonReportScoreComponents
    confusion_matrix: ConfusionMatrix | None

    def _value_serializer(self, v):
        if isinstance(v, AnnotationConflictType):
            return str(v)
        else:
            return super()._value_serializer(v)

    @classmethod
    def from_dict(cls, d: dict):
        return cls(
            conflict_count=d["conflict_count"],
            error_count=d["error_count"],
            conflicts_by_type={
                _parse_annotation_conflict_type(k): v
                for k, v in d.get("conflicts_by_type", {}).items()
            },
            score=d.get("score"),
            score_components=ComparisonReportScoreComponents.from_dict(
                d.get("score_components", {})
            ),
            confusion_matrix=(
                ConfusionMatrix.from_dict(d["confusion_matrix"])
                if d.get("confusion_matrix")
                else None
            ),
        )


@define(kw_only=True, init=False, slots=False)
class ComparisonReportFrameSummary(ReportNode):
    conflicts: list[AnnotationConflict]

    @cached_property
    def conflict_count(self) -> int:
        return len(self.conflicts)

    @cached_property
    def error_count(self) -> int:
        return len(self.conflicts)

    @cached_property
    def conflicts_by_type(self) -> dict[AnnotationConflictType, int]:
        return Counter(c.type for c in self.conflicts)

    def _value_serializer(self, v):
        if isinstance(v, AnnotationConflictType):
            return str(v)
        else:
            return super()._value_serializer(v)

    @classmethod
    def from_dict(cls, d: dict):
        optional_fields = set(cls._get_cached_fields()) - {
            "conflicts_by_type"  # requires extra conversion
        }
        return cls(
            **{field: d[field] for field in optional_fields if field in d},
            **(
                dict(
                    conflicts_by_type={
                        _parse_annotation_conflict_type(k): v
                        for k, v in d["conflicts_by_type"].items()
                    }
                )
                if "conflicts_by_type" in d
                else {}
            ),
            conflicts=[AnnotationConflict.from_dict(v) for v in d["conflicts"]],
        )


@define(kw_only=True, init=False, slots=False)
class ComparisonReportFrameComparisonSummary(ComparisonReportFrameSummary):
    annotations: ComparisonReportAnnotationsSummary

    @classmethod
    def from_dict(cls, d: dict):
        frame_summary = ComparisonReportFrameSummary.from_dict(d)
        return cls(
            conflicts=frame_summary.conflicts,
            **{
                field: getattr(frame_summary, field)
                for field in frame_summary._get_cached_fields()
                if field in frame_summary.__dict__
            },
            annotations=ComparisonReportAnnotationsSummary.from_dict(d["annotations"]),
        )


@define(kw_only=True, init=False, slots=False)
class ComparisonReportRequirementSummary(ReportNode):
    parameters: dict[str, Any]
    comparison_summary: ComparisonReportRequirementComparisonSummary
    frame_results: dict[int, ComparisonReportFrameComparisonSummary] | None

    @property
    def conflicts(self) -> list[AnnotationConflict]:
        if not self.frame_results:
            return []

        return deduplicate_annotation_conflicts(
            list(itertools.chain.from_iterable(r.conflicts for r in self.frame_results.values()))
        )

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> ComparisonReportRequirementSummary:
        return cls(
            parameters=d.get("parameters", {}),
            comparison_summary=ComparisonReportRequirementComparisonSummary.from_dict(
                d["comparison_summary"]
            ),
            frame_results=(
                {
                    int(k): ComparisonReportFrameComparisonSummary.from_dict(v)
                    for k, v in d["frame_results"].items()
                }
                if d.get("frame_results") is not None
                else None
            ),
        )


@define(kw_only=True, init=False, slots=False)
class ComparisonReport(ReportNode):
    parameters: ComparisonReportParameters
    comparison_summary: ComparisonReportSummary
    frame_results: dict[int, ComparisonReportFrameSummary] | None
    groups: dict[str, ComparisonReportRequirementSummary] | None = None

    @property
    def conflicts(self) -> list[AnnotationConflict]:
        if not self.frame_results:
            return []

        return deduplicate_annotation_conflicts(
            list(itertools.chain.from_iterable(r.conflicts for r in self.frame_results.values()))
        )

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> ComparisonReport:
        groups = (
            {k: ComparisonReportRequirementSummary.from_dict(v) for k, v in d["groups"].items()}
            if d.get("groups") is not None
            else None
        )
        return cls(
            parameters=ComparisonReportParameters.from_dict(d["parameters"]),
            comparison_summary=ComparisonReportSummary.from_dict(d["comparison_summary"]),
            frame_results=(
                {
                    int(k): ComparisonReportFrameSummary.from_dict(v)
                    for k, v in d["frame_results"].items()
                }
                if d.get("frame_results") is not None
                else None
            ),
            groups=groups,
        )

    def to_json(self) -> str:
        d = self.to_dict()

        # String keys are needed for json dumping
        if d.get("frame_results") is not None:
            d["frame_results"] = {str(k): v for k, v in d["frame_results"].items()}

        if d.get("groups") is not None:
            for group in d["groups"].values():
                if group.get("frame_results") is not None:
                    group["frame_results"] = {str(k): v for k, v in group["frame_results"].items()}

        return dump_json(d).decode()

    @classmethod
    def from_json(cls, data: str) -> ComparisonReport:
        return cls.from_dict(parse_json(data))

    @classmethod
    def summary_from_json(cls, data: str) -> ComparisonReportSummary:
        # parse only what's needed
        report_data = json_stream.load(StringIO(data), persistent=True)
        return ComparisonReportSummary.from_dict(report_data["comparison_summary"])
