# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import itertools
import math
from abc import ABCMeta
from collections import Counter
from collections.abc import Callable, Hashable, Sequence
from contextlib import suppress
from copy import deepcopy
from functools import cached_property, lru_cache, partial
from io import StringIO
from typing import Any, ClassVar, TypeAlias, TypeVar, cast

import datumaro as dm
import datumaro.components.annotations.matcher
import datumaro.components.comparator
import datumaro.util.annotation_util
import datumaro.util.mask_tools
import json_stream
import numpy as np
from attrs import asdict, define, fields_dict
from datumaro.util import dump_json, parse_json
from django.conf import settings
from django.db import transaction
from django.db.models import OuterRef, Subquery, prefetch_related_objects
from rest_framework import serializers
from scipy.optimize import linear_sum_assignment

from cvat.apps.dataset_manager.bindings import (
    CommonData,
    CvatToDmAnnotationConverter,
    GetCVATDataExtractor,
    JobData,
    match_dm_item,
)
from cvat.apps.dataset_manager.formats.registry import dm_env
from cvat.apps.dataset_manager.task import JobAnnotation
from cvat.apps.engine import serializers as engine_serializers
from cvat.apps.engine.filters import JsonLogicFilter
from cvat.apps.engine.frame_provider import TaskFrameProvider
from cvat.apps.engine.model_utils import bulk_create
from cvat.apps.engine.models import (
    DimensionType,
    Image,
    Job,
    JobType,
    Project,
    RequestTarget,
    ShapeType,
    StageChoice,
    StateChoice,
    Task,
    User,
    ValidationMode,
)
from cvat.apps.engine.utils import take_by
from cvat.apps.profiler import silk_profile
from cvat.apps.quality_control import models
from cvat.apps.quality_control.models import (
    AnnotationConflictSeverity,
    AnnotationConflictType,
    AnnotationType,
)
from cvat.apps.quality_control.rq import QualityRequestId
from cvat.apps.redis_handler.background import AbstractRequestManager


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

    @property
    def severity(self) -> AnnotationConflictSeverity:
        if self.type in [
            AnnotationConflictType.MISSING_ANNOTATION,
            AnnotationConflictType.EXTRA_ANNOTATION,
            AnnotationConflictType.MISMATCHING_LABEL,
        ]:
            severity = AnnotationConflictSeverity.ERROR
        elif self.type in [
            AnnotationConflictType.LOW_OVERLAP,
            AnnotationConflictType.MISMATCHING_ATTRIBUTES,
            AnnotationConflictType.MISMATCHING_DIRECTION,
            AnnotationConflictType.MISMATCHING_GROUPS,
            AnnotationConflictType.COVERED_ANNOTATION,
        ]:
            severity = AnnotationConflictSeverity.WARNING
        else:
            assert False

        return severity

    def _value_serializer(self, v):
        if isinstance(v, (AnnotationConflictType, AnnotationConflictSeverity)):
            return str(v)
        else:
            return super()._value_serializer(v)

    @classmethod
    def from_dict(cls, d: dict):
        return cls(
            frame_id=d["frame_id"],
            type=AnnotationConflictType(d["type"]),
            annotation_ids=list(AnnotationId.from_dict(v) for v in d["annotation_ids"]),
        )


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

    low_overlap_threshold: float = 0.8
    "Used for distinction between strong / weak (low_overlap) matches"

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

    empty_is_annotated: bool = False
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

        self.jaccard_index = _arr_div(
            matched_ann_counts, ds_ann_counts + gt_ann_counts - matched_ann_counts
        )
        self.precision = _arr_div(matched_ann_counts, ds_ann_counts)
        self.recall = _arr_div(matched_ann_counts, gt_ann_counts)
        self.accuracy = (
            total_annotations_count  # TP + TN + FP + FN
            - (ds_ann_counts - matched_ann_counts)  # - FP
            - (gt_ann_counts - matched_ann_counts)  # - FN
            # ... = TP + TN
        ) / (total_annotations_count or 1)

    @cached_property
    def precision(self) -> np.ndarray | None:  # pylint: disable=method-hidden (fixed in pylint 3.0)
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
class ComparisonReportAnnotationShapeSummary(ReportNode):
    valid_count: int
    missing_count: int
    extra_count: int
    total_count: int
    ds_count: int
    gt_count: int
    # TODO: total_iou: float
    mean_iou: float

    @property
    def accuracy(self) -> float:
        return self.valid_count / (self.total_count or 1)

    def accumulate(self, other: ComparisonReportAnnotationShapeSummary, *, weight: float = 1):
        for field in [
            "valid_count",
            "missing_count",
            "extra_count",
            "total_count",
            "ds_count",
            "gt_count",
            # TODO: "total_iou",
        ]:
            setattr(self, field, getattr(self, field) + math.ceil(getattr(other, field) * weight))

    @classmethod
    def from_dict(cls, d: dict):
        return cls(
            valid_count=d["valid_count"],
            missing_count=d["missing_count"],
            extra_count=d["extra_count"],
            total_count=d["total_count"],
            ds_count=d["ds_count"],
            gt_count=d["gt_count"],
            # TODO: total_iou=d.get("total_iou"),
            mean_iou=d.get("mean_iou"),
        )

    @classmethod
    def create_empty(cls) -> ComparisonReportAnnotationShapeSummary:
        return cls(
            valid_count=0,
            missing_count=0,
            extra_count=0,
            total_count=0,
            ds_count=0,
            gt_count=0,
            mean_iou=0,
        )


@define(kw_only=True, init=False, slots=False)
class ComparisonReportAnnotationLabelSummary(ReportNode):
    valid_count: int
    invalid_count: int
    total_count: int

    @property
    def accuracy(self) -> float:
        return self.valid_count / (self.total_count or 1)

    def accumulate(self, other: ComparisonReportAnnotationLabelSummary, *, weight: float = 1):
        for field in ["valid_count", "total_count", "invalid_count"]:
            setattr(self, field, getattr(self, field) + math.ceil(getattr(other, field) * weight))

    @classmethod
    def from_dict(cls, d: dict):
        return cls(
            valid_count=d["valid_count"],
            invalid_count=d["invalid_count"],
            total_count=d["total_count"],
        )

    @classmethod
    def create_empty(cls) -> ComparisonReportAnnotationLabelSummary:
        return cls(
            valid_count=0,
            invalid_count=0,
            total_count=0,
        )


@define(kw_only=True, init=False, slots=False)
class ComparisonReportAnnotationComponentsSummary(ReportNode):
    shape: ComparisonReportAnnotationShapeSummary
    label: ComparisonReportAnnotationLabelSummary

    def accumulate(self, other: ComparisonReportAnnotationComponentsSummary, *, weight: float = 1):
        self.shape.accumulate(other.shape, weight=weight)
        self.label.accumulate(other.label, weight=weight)

    @classmethod
    def from_dict(cls, d: dict):
        return cls(
            shape=ComparisonReportAnnotationShapeSummary.from_dict(d["shape"]),
            label=ComparisonReportAnnotationLabelSummary.from_dict(d["label"]),
        )

    @classmethod
    def create_empty(cls) -> ComparisonReportAnnotationComponentsSummary:
        return cls(
            shape=ComparisonReportAnnotationShapeSummary.create_empty(),
            label=ComparisonReportAnnotationLabelSummary.create_empty(),
        )


@define(kw_only=True, init=False, slots=False)
class ComparisonReportTaskStats(ReportNode):
    all: set[int]
    custom: set[int]
    not_configured: set[int]
    excluded: set[int]

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

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> ComparisonReportTaskStats:
        return cls(
            all=d.get("all", set()),
            custom=d.get("custom", set()),
            not_configured=d.get("not_configured", set()),
            excluded=d.get("excluded", set()),
        )

    @classmethod
    def create_empty(cls) -> ComparisonReportTaskStats:
        return cls(all=set(), custom=set(), not_configured=set(), excluded=set())


@define(kw_only=True, init=False, slots=False)
class ComparisonReportJobStats(ReportNode):
    all: set[int]
    excluded: set[int]
    not_checkable: set[int]

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

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> ComparisonReportJobStats:
        return cls(
            all=d.get("all", set()),
            excluded=d.get("excluded", set()),
            not_checkable=d.get("not_checkable", set()),
        )

    @classmethod
    def create_empty(cls) -> ComparisonReportJobStats:
        return cls(all=set(), excluded=set(), not_checkable=set())


@define(kw_only=True, init=False, slots=False)
class ComparisonReportSummary(ReportNode):
    frames: list[str] | None
    total_frames: int

    conflict_count: int
    warning_count: int
    error_count: int
    conflicts_by_type: dict[AnnotationConflictType, int]

    annotations: ComparisonReportAnnotationsSummary
    annotation_components: ComparisonReportAnnotationComponentsSummary

    tasks: ComparisonReportTaskStats | None
    jobs: ComparisonReportJobStats | None

    @property
    def frame_share(self) -> float:
        return self.frame_count / (self.total_frames or 1)

    @property
    def mean_conflict_count(self) -> float:
        return self.conflict_count / (self.frame_count or 1)

    @cached_property
    def frame_count(self) -> int:
        if self.frames is None:
            assert False

        return len(self.frames)

    def __init__(self, **kwargs):
        if not ("frames" in kwargs or "frame_count" in kwargs):
            raise AssertionError('"frames" or "frame_count" must be present')

        super().__init__(**kwargs)

    def _value_serializer(self, v):
        if isinstance(v, AnnotationConflictType):
            return str(v)
        else:
            return super()._value_serializer(v)

    @classmethod
    def from_dict(cls, d: dict):
        if "total_frames" in d:
            total_frames = d["total_frames"]
        else:
            # backward compatibility - old reports have only frame_count or frames,
            # but not total_frames. However, we can obtain total_frames from frame_share
            frame_share = d.get("frame_share", 0)
            frame_count = d.get("frame_count", len(d.get("frames", [])))
            total_frames = math.ceil(frame_count / (frame_share or 1))

        return cls(
            frames=d["frames"] if "frames" in d else None,
            total_frames=total_frames,
            **(dict(frame_count=d["frame_count"]) if "frame_count" in d else {}),
            conflict_count=d["conflict_count"],
            warning_count=d.get("warning_count", 0),
            error_count=d.get("error_count", 0),
            conflicts_by_type={
                AnnotationConflictType(k): v for k, v in d.get("conflicts_by_type", {}).items()
            },
            annotations=ComparisonReportAnnotationsSummary.from_dict(d["annotations"]),
            annotation_components=(
                ComparisonReportAnnotationComponentsSummary.from_dict(d["annotation_components"])
            ),
            tasks=ComparisonReportTaskStats.from_dict(d["tasks"]) if d.get("tasks") else None,
            jobs=ComparisonReportJobStats.from_dict(d["jobs"]) if d.get("jobs") else None,
        )


@define(kw_only=True, init=False, slots=False)
class ComparisonReportFrameSummary(ReportNode):
    conflicts: list[AnnotationConflict]

    annotations: ComparisonReportAnnotationsSummary
    annotation_components: ComparisonReportAnnotationComponentsSummary

    @cached_property
    def conflict_count(self) -> int:
        return len(self.conflicts)

    @cached_property
    def warning_count(self) -> int:
        return len([c for c in self.conflicts if c.severity == AnnotationConflictSeverity.WARNING])

    @cached_property
    def error_count(self) -> int:
        return len([c for c in self.conflicts if c.severity == AnnotationConflictSeverity.ERROR])

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
                        AnnotationConflictType(k): v for k, v in d["conflicts_by_type"].items()
                    }
                )
                if "conflicts_by_type" in d
                else {}
            ),
            conflicts=[AnnotationConflict.from_dict(v) for v in d["conflicts"]],
            annotations=ComparisonReportAnnotationsSummary.from_dict(d["annotations"]),
            annotation_components=ComparisonReportAnnotationComponentsSummary.from_dict(
                d["annotation_components"]
            ),
        )


@define(kw_only=True, init=False, slots=False)
class ComparisonReport(ReportNode):
    parameters: ComparisonParameters
    comparison_summary: ComparisonReportSummary
    frame_results: dict[int, ComparisonReportFrameSummary] | None

    @property
    def conflicts(self) -> list[AnnotationConflict]:
        if not self.frame_results:
            return []

        return list(itertools.chain.from_iterable(r.conflicts for r in self.frame_results.values()))

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> ComparisonReport:
        return cls(
            parameters=ComparisonParameters.from_dict(d["parameters"]),
            comparison_summary=ComparisonReportSummary.from_dict(d["comparison_summary"]),
            frame_results=(
                {
                    int(k): ComparisonReportFrameSummary.from_dict(v)
                    for k, v in d["frame_results"].items()
                }
                if d.get("frame_results") is not None
                else None
            ),
        )

    def to_json(self) -> str:
        d = self.to_dict()

        # String keys are needed for json dumping
        if d.get("frame_results") is not None:
            d["frame_results"] = {str(k): v for k, v in d["frame_results"].items()}

        return dump_json(d).decode()

    @classmethod
    def from_json(cls, data: str) -> ComparisonReport:
        return cls.from_dict(parse_json(data))

    @classmethod
    def summary_from_json(cls, data: str) -> ComparisonReportSummary:
        # parse only what's needed
        return ComparisonReportSummary.from_dict(
            json_stream.load(StringIO(data), persistent=True)["comparison_summary"]
        )


class JobDataProvider:
    @classmethod
    def add_prefetch_info(cls, queryset):
        return JobAnnotation.add_prefetch_info(queryset)

    @transaction.atomic
    def __init__(self, job_id: int, *, queryset=None, included_frames=None) -> None:
        self.job_id = job_id
        self.job_annotation = JobAnnotation(job_id, queryset=queryset)
        self.job_annotation.init_from_db()
        self.job_data = JobData(
            annotation_ir=self.job_annotation.ir_data,
            db_job=self.job_annotation.db_job,
            use_server_track_ids=True,
            included_frames=included_frames,
        )

        self._annotation_memo = _MemoizingAnnotationConverterFactory()

    @cached_property
    def dm_dataset(self):
        extractor = GetCVATDataExtractor(self.job_data, convert_annotations=self._annotation_memo)
        return dm.Dataset.from_extractors(extractor, env=dm_env)

    def dm_item_id_to_frame_id(self, item: dm.DatasetItem) -> int:
        return match_dm_item(item, self.job_data)

    def dm_ann_to_ann_id(self, ann: dm.Annotation) -> AnnotationId:
        source_ann = self._annotation_memo.get_source_ann(ann)
        if "track_id" in ann.attributes:
            source_ann_id = source_ann.track_id
            ann_type = AnnotationType.TRACK
            shape_type = source_ann.type
        else:
            if isinstance(source_ann, CommonData.LabeledShape):
                ann_type = AnnotationType.SHAPE
                shape_type = source_ann.type
            elif isinstance(source_ann, CommonData.Tag):
                ann_type = AnnotationType.TAG
                shape_type = None
            else:
                assert False

            source_ann_id = source_ann.id

        return AnnotationId(
            obj_id=source_ann_id, type=ann_type, shape_type=shape_type, job_id=self.job_id
        )


class _MemoizingAnnotationConverterFactory:
    def __init__(self):
        self._annotation_mapping = {}  # dm annotation -> cvat annotation

    def remember_conversion(self, cvat_ann, dm_anns):
        for dm_ann in dm_anns:
            self._annotation_mapping[self._make_key(dm_ann)] = cvat_ann

    def _make_key(self, dm_ann: dm.Annotation) -> Hashable:
        return id(dm_ann)

    def get_source_ann(self, dm_ann: dm.Annotation) -> CommonData.Tag | CommonData.LabeledShape:
        return self._annotation_mapping[self._make_key(dm_ann)]

    def clear(self):
        self._annotation_mapping.clear()

    def __call__(self, *args, **kwargs) -> list[dm.Annotation]:
        converter = _MemoizingAnnotationConverter(*args, factory=self, **kwargs)
        return converter.convert()


class _MemoizingAnnotationConverter(CvatToDmAnnotationConverter):
    def __init__(self, *args, factory: _MemoizingAnnotationConverterFactory, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self._factory = factory

    def _convert_tag(self, tag):
        converted = list(super()._convert_tag(tag))
        for dm_ann in converted:
            dm_ann.id = tag.id

        self._factory.remember_conversion(tag, converted)
        return converted

    def _convert_shape(self, shape, *, index):
        converted = list(super()._convert_shape(shape, index=index))
        for dm_ann in converted:
            dm_ann.id = shape.id

        self._factory.remember_conversion(shape, converted)
        return converted


_ShapeT1 = TypeVar("_ShapeT1")
_ShapeT2 = TypeVar("_ShapeT2")
ShapeSimilarityFunction: TypeAlias = Callable[
    [_ShapeT1, _ShapeT2], float
]  # (shape1, shape2) -> [0; 1], returns 0 for mismatches, 1 for matches
LabelEqualityFunction: TypeAlias = Callable[[_ShapeT1, _ShapeT2], bool]
SegmentMatchingResult: TypeAlias = tuple[
    list[tuple[_ShapeT1, _ShapeT2]],  # matches
    list[tuple[_ShapeT1, _ShapeT2]],  # mismatches
    list[_ShapeT1],  # a unmatched
    list[_ShapeT2],  # b unmatched
]


def match_segments(
    a_segms: Sequence[_ShapeT1],
    b_segms: Sequence[_ShapeT2],
    *,
    distance: ShapeSimilarityFunction[_ShapeT1, _ShapeT2],
    dist_thresh: float = 1.0,
    label_matcher: LabelEqualityFunction[_ShapeT1, _ShapeT2] = lambda a, b: a.label == b.label,
) -> SegmentMatchingResult[_ShapeT1, _ShapeT2]:
    # Comparing to the dm version, this one changes the algorithm to match shapes first
    # label comparison is only used to distinguish between matches and mismatches

    assert callable(distance), distance
    assert callable(label_matcher), label_matcher

    max_anns = max(len(a_segms), len(b_segms))
    distances = np.array(
        [
            [
                1 - distance(a, b) if a is not None and b is not None else 1
                for b, _ in itertools.zip_longest(b_segms, range(max_anns), fillvalue=None)
            ]
            for a, _ in itertools.zip_longest(a_segms, range(max_anns), fillvalue=None)
        ]
    )
    distances[~np.isfinite(distances)] = 1
    distances[distances > 1 - dist_thresh] = 1

    if a_segms and b_segms:
        a_matches, b_matches = linear_sum_assignment(distances)
    else:
        a_matches = []
        b_matches = []

    # matches: segments we succeeded to match completely
    # mispred: segments we succeeded to match, having label mismatch
    matches = []
    mispred = []
    # *_umatched: segments of (*) we failed to match
    a_unmatched = []
    b_unmatched = []

    for a_idx, b_idx in zip(a_matches, b_matches):
        dist = distances[a_idx, b_idx]
        if dist > 1 - dist_thresh or dist == 1:
            if a_idx < len(a_segms):
                a_unmatched.append(a_segms[a_idx])
            if b_idx < len(b_segms):
                b_unmatched.append(b_segms[b_idx])
        else:
            a_ann = a_segms[a_idx]
            b_ann = b_segms[b_idx]
            if label_matcher(a_ann, b_ann):
                matches.append((a_ann, b_ann))
            else:
                mispred.append((a_ann, b_ann))

    if not len(a_matches) and not len(b_matches):
        a_unmatched = list(a_segms)
        b_unmatched = list(b_segms)

    return matches, mispred, a_unmatched, b_unmatched


def oks(a, b, sigma=0.1, bbox=None, scale=None, visibility_a=None, visibility_b=None):
    """
    Object Keypoint Similarity metric.
    https://cocodataset.org/#keypoints-eval
    """

    p1 = np.array(a.points).reshape((-1, 2))
    p2 = np.array(b.points).reshape((-1, 2))
    if len(p1) != len(p2):
        return 0

    if visibility_a is None:
        visibility_a = np.full(len(p1), True)
    else:
        visibility_a = np.asarray(visibility_a, dtype=bool)

    if visibility_b is None:
        visibility_b = np.full(len(p2), True)
    else:
        visibility_b = np.asarray(visibility_b, dtype=bool)

    if not scale:
        if bbox is None:
            bbox = datumaro.util.annotation_util.mean_bbox([a, b])
        scale = bbox[2] * bbox[3]

    dists = np.linalg.norm(p1 - p2, axis=1)
    return np.sum(
        visibility_a
        * visibility_b
        * np.exp((visibility_a == visibility_b) * (-(dists**2) / (2 * scale * (2 * sigma) ** 2)))
    ) / np.sum(visibility_a | visibility_b, dtype=float)


@define(kw_only=True)
class KeypointsMatcher(datumaro.components.annotations.matcher.PointsMatcher):
    def distance(self, a: dm.Points, b: dm.Points) -> float:
        a_bbox = self.instance_map[id(a)][1]
        b_bbox = self.instance_map[id(b)][1]
        if datumaro.util.annotation_util.bbox_iou(a_bbox, b_bbox) <= 0:
            return 0

        bbox = datumaro.util.annotation_util.mean_bbox([a_bbox, b_bbox])
        return oks(
            a,
            b,
            sigma=self.sigma,
            bbox=bbox,
            visibility_a=[v == dm.Points.Visibility.visible for v in a.visibility],
            visibility_b=[v == dm.Points.Visibility.visible for v in b.visibility],
        )


def _arr_div(a_arr: np.ndarray, b_arr: np.ndarray) -> np.ndarray:
    divisor = b_arr.copy()
    divisor[b_arr == 0] = 1
    return a_arr / divisor


def to_rle(ann: dm.Annotation, *, img_h: int, img_w: int):
    from pycocotools import mask as mask_utils

    if ann.type == dm.AnnotationType.polygon:
        return mask_utils.frPyObjects([ann.points], img_h, img_w)
    elif isinstance(ann, dm.RleMask):
        return [ann.rle]
    elif ann.type == dm.AnnotationType.mask:
        return [mask_utils.encode(ann.image)]
    else:
        assert False


def segment_iou(a: dm.Annotation, b: dm.Annotation, *, img_h: int, img_w: int) -> float:
    """
    Generic IoU computation with masks and polygons.
    Returns -1 if no intersection, [0; 1] otherwise
    """
    # Comparing to the dm version, this fixes the comparison for segments,
    # as the images size are required for correct decoding.
    # Boxes are not included, because they are not needed

    from pycocotools import mask as mask_utils

    a = to_rle(a, img_h=img_h, img_w=img_w)
    b = to_rle(b, img_h=img_h, img_w=img_w)

    # Note that mask_utils.iou expects (dt, gt). Check this if the 3rd param is True
    return float(mask_utils.iou(b, a, [0]))


@define(kw_only=True)
class LineMatcher(datumaro.components.annotations.matcher.LineMatcher):
    EPSILON = 1e-7

    torso_r: float = 0.25
    oriented: bool = False
    scale: float = None

    def distance(self, gt_ann: dm.PolyLine, ds_ann: dm.PolyLine) -> float:
        # Check distances of the very coarse estimates for the curves
        def _get_bbox_circle(ann: dm.PolyLine):
            xs = ann.points[0::2]
            ys = ann.points[1::2]
            x0 = min(xs)
            x1 = max(xs)
            y0 = min(ys)
            y1 = max(ys)
            return (x0 + x1) / 2, (y0 + y1) / 2, ((x1 - x0) ** 2 + (y1 - y0) ** 2) / 4

        gt_center_x, gt_center_y, gt_r2 = _get_bbox_circle(gt_ann)
        ds_center_x, ds_center_y, ds_r2 = _get_bbox_circle(ds_ann)
        sigma6_2 = self.scale * (6 * self.torso_r) ** 2
        if (
            (ds_center_x - gt_center_x) ** 2 + (ds_center_y - gt_center_y) ** 2
        ) > ds_r2 + gt_r2 + sigma6_2:
            return 0

        # Approximate lines to the same number of points for pointwise comparison
        a, b = self.approximate_points(
            np.array(gt_ann.points).reshape((-1, 2)), np.array(ds_ann.points).reshape((-1, 2))
        )

        # Compare the direct and, optionally, the reverse variants
        similarities = []
        candidates = [b]
        if not self.oriented:
            candidates.append(b[::-1])

        for candidate_b in candidates:
            similarities.append(self._compare_lines(a, candidate_b))

        return max(similarities)

    def _compare_lines(self, a: np.ndarray, b: np.ndarray) -> float:
        dists = np.linalg.norm(a - b, axis=1)

        scale = self.scale
        if scale is None:
            segment_dists = np.linalg.norm(a[1:] - a[:-1], axis=1)
            scale = np.sum(segment_dists) ** 2

        # Compute Gaussian for approximated lines similarly to OKS
        return sum(np.exp(-(dists**2) / (2 * scale * (2 * self.torso_r) ** 2))) / len(a)

    @classmethod
    def approximate_points(cls, a: np.ndarray, b: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        """
        Creates 2 polylines with the same numbers of points,
        the points are placed on the original lines with the same step.
        The step for each point is determined as minimal to the next original
        point on one of the curves.
        A simpler, but slower version could be just approximate each curve to
        some big number of points. The advantage of this algo is that it keeps
        corners and original points untouched, while adding intermediate points.
        """
        a_segment_count = len(a) - 1
        b_segment_count = len(b) - 1

        a_segment_lengths = np.linalg.norm(a[1:] - a[:-1], axis=1)
        a_segment_end_dists = [0]
        for l in a_segment_lengths:
            a_segment_end_dists.append(a_segment_end_dists[-1] + l)
        a_segment_end_dists.pop(0)
        a_segment_end_dists.append(a_segment_end_dists[-1])  # duplicate for simpler code

        b_segment_lengths = np.linalg.norm(b[1:] - b[:-1], axis=1)
        b_segment_end_dists = [0]
        for l in b_segment_lengths:
            b_segment_end_dists.append(b_segment_end_dists[-1] + l)
        b_segment_end_dists.pop(0)
        b_segment_end_dists.append(b_segment_end_dists[-1])  # duplicate for simpler code

        a_length = a_segment_end_dists[-1]
        b_length = b_segment_end_dists[-1]

        # lines can have lesser number of points in some cases
        max_points_count = len(a) + len(b) - 1
        a_new_points = np.zeros((max_points_count, 2))
        b_new_points = np.zeros((max_points_count, 2))
        a_new_points[0] = a[0]
        b_new_points[0] = b[0]

        a_segment_idx = 0
        b_segment_idx = 0
        while a_segment_idx < a_segment_count or b_segment_idx < b_segment_count:
            next_point_idx = a_segment_idx + b_segment_idx + 1

            a_segment_end_pos = a_segment_end_dists[a_segment_idx] / (a_length or 1)
            b_segment_end_pos = b_segment_end_dists[b_segment_idx] / (b_length or 1)
            if a_segment_idx < a_segment_count and a_segment_end_pos <= b_segment_end_pos:
                if b_segment_idx < b_segment_count:
                    # advance b in the current segment to the relative position in a
                    q = (b_segment_end_pos - a_segment_end_pos) * (
                        b_length / (b_segment_lengths[b_segment_idx] or 1)
                    )
                    if abs(q) <= cls.EPSILON:
                        b_new_points[next_point_idx] = b[1 + b_segment_idx]
                    else:
                        b_new_points[next_point_idx] = b[b_segment_idx] * q + b[
                            1 + b_segment_idx
                        ] * (1 - q)
                elif b_segment_idx == b_segment_count:
                    b_new_points[next_point_idx] = b[b_segment_idx]

                # advance a to the end of the current segment
                a_segment_idx += 1
                a_new_points[next_point_idx] = a[a_segment_idx]

            elif b_segment_idx < b_segment_count:
                if a_segment_idx < a_segment_count:
                    # advance a in the current segment to the relative position in b
                    q = (a_segment_end_pos - b_segment_end_pos) * (
                        a_length / (a_segment_lengths[a_segment_idx] or 1)
                    )
                    if abs(q) <= cls.EPSILON:
                        a_new_points[next_point_idx] = a[1 + a_segment_idx]
                    else:
                        a_new_points[next_point_idx] = a[a_segment_idx] * q + a[
                            1 + a_segment_idx
                        ] * (1 - q)
                elif a_segment_idx == a_segment_count:
                    a_new_points[next_point_idx] = a[a_segment_idx]

                # advance b to the end of the current segment
                b_segment_idx += 1
                b_new_points[next_point_idx] = b[b_segment_idx]

            else:
                assert False

        # truncate the final values
        if next_point_idx < max_points_count:
            a_new_points = a_new_points[:next_point_idx]
            b_new_points = b_new_points[:next_point_idx]

        return a_new_points, b_new_points


class DistanceComparator(datumaro.components.comparator.DistanceComparator):
    def __init__(
        self,
        categories: dm.CategoriesInfo,
        *,
        included_ann_types: list[dm.AnnotationType] | None = None,
        return_distances: bool = False,
        iou_threshold: float = 0.5,
        # https://cocodataset.org/#keypoints-eval
        # https://github.com/cocodataset/cocoapi/blob/8c9bcc3cf640524c4c20a9c40e89cb6a2f2fa0e9/PythonAPI/pycocotools/cocoeval.py#L523
        oks_sigma: float = 0.09,
        point_size_base: models.PointSizeBase = models.PointSizeBase.GROUP_BBOX_SIZE,
        compare_line_orientation: bool = False,
        line_torso_radius: float = 0.01,
        panoptic_comparison: bool = False,
        allow_groups: bool = True,
    ):
        super().__init__(iou_threshold=iou_threshold)
        self.categories = categories
        self._skeleton_info = {}
        self.included_ann_types = included_ann_types
        self.return_distances = return_distances

        self.oks_sigma = oks_sigma
        "% of the shape area"

        self.point_size_base = point_size_base
        "Compare point groups using the group bbox size or the image size"

        self.compare_line_orientation = compare_line_orientation
        "Whether lines are oriented or not"

        # Here we use a % of image size in pixels, using the image size as the scale
        self.line_torso_radius = line_torso_radius
        "% of the line length at the specified scale"

        self.panoptic_comparison = panoptic_comparison
        "Compare only the visible parts of polygons and masks"

        self.allow_groups = allow_groups
        """
        When comparing grouped annotations, consider all the group elements with the same label
        as the same annotation, if applicable. Affects polygons, masks, and points
        """

    def instance_bbox(
        self, instance_anns: Sequence[dm.Annotation]
    ) -> tuple[float, float, float, float]:
        return datumaro.util.annotation_util.max_bbox(
            a.get_bbox() if isinstance(a, dm.Skeleton) else a
            for a in instance_anns
            if hasattr(a, "get_bbox") and not a.attributes.get("outside", False)
        )

    @staticmethod
    def to_polygon(bbox_ann: dm.Bbox | dm.Ellipse):
        points = bbox_ann.as_polygon()
        angle = bbox_ann.attributes.get("rotation", 0) / 180 * math.pi

        if angle:
            points = np.reshape(points, (-1, 2))
            if isinstance(bbox_ann, dm.Bbox):
                center = (points[0] + points[2]) / 2
            else:
                center = (bbox_ann.c_x, bbox_ann.c_y)
            rel_points = points - center
            cos = np.cos(angle)
            sin = np.sin(angle)
            rotation_matrix = ((cos, sin), (-sin, cos))
            points = np.matmul(rel_points, rotation_matrix) + center
            points = points.flatten()

        return dm.Polygon(points)

    @staticmethod
    def _get_ann_type(t: dm.AnnotationType, item: dm.DatasetItem) -> Sequence[dm.Annotation]:
        return [
            a for a in item.annotations if a.type == t and not a.attributes.get("outside", False)
        ]

    def _match_ann_type(self, t: dm.AnnotationType, *args):
        if t not in self.included_ann_types:
            return None

        if t == dm.AnnotationType.label:
            return self.match_labels(*args)
        elif t == dm.AnnotationType.bbox:
            return self.match_boxes(*args)
        elif t == dm.AnnotationType.polygon:
            return self.match_segmentations(*args)
        elif t == dm.AnnotationType.points:
            return self.match_points(*args)
        elif t == dm.AnnotationType.skeleton:
            return self.match_skeletons(*args)
        elif t == dm.AnnotationType.polyline:
            return self.match_lines(*args)
        elif t == dm.AnnotationType.ellipse:
            return self.match_ellipses(*args)
        else:
            return None

    def match_labels(self, item_a: dm.DatasetItem, item_b: dm.DatasetItem):
        def label_distance(a: dm.Label, b: dm.Label) -> float:
            if a is None or b is None:
                return 0
            return 0.5 + (a.label == b.label) / 2

        return self.match_segments(
            dm.AnnotationType.label,
            item_a,
            item_b,
            distance=label_distance,
            label_matcher=lambda a, b: a.label == b.label,
            dist_thresh=0.5,
        )

    def match_segments(
        self,
        t: dm.AnnotationType,
        item_a: dm.DatasetItem,
        item_b: dm.DatasetItem,
        *,
        distance: ShapeSimilarityFunction[_ShapeT1, _ShapeT2],
        label_matcher: LabelEqualityFunction[_ShapeT1, _ShapeT2] | None = None,
        a_objs: Sequence[_ShapeT1] | None = None,
        b_objs: Sequence[_ShapeT2] | None = None,
        dist_thresh: float | None = None,
    ):
        if a_objs is None:
            a_objs = self._get_ann_type(t, item_a)
        if b_objs is None:
            b_objs = self._get_ann_type(t, item_b)

        if self.return_distances:
            distance, distances = self._make_memoizing_distance(distance)

        if not a_objs and not b_objs:
            distances = {}
            returned_values = [], [], [], []
        else:
            extra_args = {}
            if label_matcher:
                extra_args["label_matcher"] = label_matcher

            returned_values = match_segments(
                a_objs,
                b_objs,
                distance=distance,
                dist_thresh=dist_thresh if dist_thresh is not None else self.iou_threshold,
                **extra_args,
            )

        if self.return_distances:
            returned_values = returned_values + (distances,)

        return returned_values

    def match_boxes(self, item_a: dm.DatasetItem, item_b: dm.DatasetItem):
        def _bbox_iou(a: dm.Bbox, b: dm.Bbox, *, img_w: int, img_h: int) -> float:
            if a.attributes.get("rotation", 0) == b.attributes.get("rotation", 0):
                return datumaro.util.annotation_util.bbox_iou(a, b)
            else:
                return segment_iou(self.to_polygon(a), self.to_polygon(b), img_h=img_h, img_w=img_w)

        img_h, img_w = item_a.media_as(dm.Image).size
        return self.match_segments(
            dm.AnnotationType.bbox,
            item_a,
            item_b,
            distance=partial(_bbox_iou, img_h=img_h, img_w=img_w),
        )

    def match_ellipses(self, item_a: dm.DatasetItem, item_b: dm.DatasetItem):
        def _ellipse_iou(a: dm.Ellipse, b: dm.Ellipse, *, img_w: int, img_h: int) -> float:
            return segment_iou(self.to_polygon(a), self.to_polygon(b), img_h=img_h, img_w=img_w)

        img_h, img_w = item_a.media_as(dm.Image).size
        return self.match_segments(
            dm.AnnotationType.ellipse,
            item_a,
            item_b,
            distance=partial(_ellipse_iou, img_h=img_h, img_w=img_w),
        )

    def match_segmentations(self, item_a: dm.DatasetItem, item_b: dm.DatasetItem):
        def _get_segmentations(item):
            return self._get_ann_type(dm.AnnotationType.polygon, item) + self._get_ann_type(
                dm.AnnotationType.mask, item
            )

        img_h, img_w = item_a.media_as(dm.Image).size

        def _find_instances(annotations):
            instances = []
            instance_map = {}  # ann id -> instance id

            if self.allow_groups:
                # Group instance annotations by label.
                # Annotations with the same label and group will be merged,
                # and considered a single object in comparison
                groups = datumaro.util.annotation_util.find_instances(annotations)
            else:
                groups = [[a] for a in annotations]  # ignore groups

            for ann_group in groups:
                ann_group = sorted(ann_group, key=lambda a: a.label)
                for _, label_group in itertools.groupby(ann_group, key=lambda a: a.label):
                    label_group = list(label_group)
                    instance_id = len(instances)
                    instances.append(label_group)
                    for ann in label_group:
                        instance_map[id(ann)] = instance_id

            return instances, instance_map

        def _get_compiled_mask(
            anns: Sequence[dm.Annotation], *, instance_ids: dict[int, int]
        ) -> dm.CompiledMask:
            if not anns:
                return None

            from pycocotools import mask as mask_utils

            # Merge instance groups
            object_rle_groups = [to_rle(ann, img_h=img_h, img_w=img_w) for ann in anns]
            object_rles = [mask_utils.merge(g) for g in object_rle_groups]

            # Mask materialization can consume a lot of memory,
            # avoid storing all the masks simultaneously
            def _make_lazy_decode(i: int):
                def _lazy_decode() -> dm.BinaryMaskImage:
                    return mask_utils.decode([object_rles[i]])[:, :, 0]

                return _lazy_decode

            return dm.CompiledMask.from_instance_masks(
                # need to increment labels and instance ids by 1 to avoid confusion with background
                instance_masks=(
                    dm.Mask(image=_make_lazy_decode(i), z_order=ann.z_order, label=ann.label + 1)
                    for i, ann in enumerate(anns)
                ),
                instance_ids=(iid + 1 for iid in instance_ids),
            )

        a_instances, a_instance_map = _find_instances(_get_segmentations(item_a))
        b_instances, b_instance_map = _find_instances(_get_segmentations(item_b))

        if self.panoptic_comparison:
            a_compiled_mask = _get_compiled_mask(
                list(itertools.chain.from_iterable(a_instances)),
                instance_ids=[
                    a_instance_map[id(ann)] for ann in itertools.chain.from_iterable(a_instances)
                ],
            )
            b_compiled_mask = _get_compiled_mask(
                list(itertools.chain.from_iterable(b_instances)),
                instance_ids=[
                    b_instance_map[id(ann)] for ann in itertools.chain.from_iterable(b_instances)
                ],
            )
        else:
            a_compiled_mask = None
            b_compiled_mask = None

        segment_cache = {}

        def _get_segment(obj_id: int, *, compiled_mask: dm.CompiledMask | None = None, instances):
            key = (id(instances), obj_id)
            rle = segment_cache.get(key)

            if rle is None:
                from pycocotools import mask as mask_utils

                if compiled_mask is not None:
                    mask = compiled_mask.extract(obj_id + 1)

                    rle = mask_utils.encode(mask)
                else:
                    # Create merged RLE for the instance shapes
                    object_anns = instances[obj_id]
                    object_rle_groups = [
                        to_rle(ann, img_h=img_h, img_w=img_w) for ann in object_anns
                    ]
                    rle = mask_utils.merge(list(itertools.chain.from_iterable(object_rle_groups)))

                segment_cache[key] = rle

            return rle

        def _segment_comparator(a_inst_id: int, b_inst_id: int) -> float:
            a_segm = _get_segment(a_inst_id, compiled_mask=a_compiled_mask, instances=a_instances)
            b_segm = _get_segment(b_inst_id, compiled_mask=b_compiled_mask, instances=b_instances)

            from pycocotools import mask as mask_utils

            return float(mask_utils.iou([b_segm], [a_segm], [0])[0])

        def _label_matcher(a_inst_id: int, b_inst_id: int) -> bool:
            # labels are the same in the instance annotations
            # instances are required to have the same labels in all shapes
            a = a_instances[a_inst_id][0]
            b = b_instances[b_inst_id][0]
            return a.label == b.label

        results = self.match_segments(
            dm.AnnotationType.polygon,
            item_a,
            item_b,
            a_objs=range(len(a_instances)),
            b_objs=range(len(b_instances)),
            distance=_segment_comparator,
            label_matcher=_label_matcher,
        )

        # restore results for original annotations
        matched, mismatched, a_extra, b_extra = results[:4]
        if self.return_distances:
            distances = results[4]

        # i_x ~ instance idx in _x
        # ia_x ~ instance annotation in _x
        matched = [
            (ia_a, ia_b)
            for (i_a, i_b) in matched
            for (ia_a, ia_b) in itertools.product(a_instances[i_a], b_instances[i_b])
        ]
        mismatched = [
            (ia_a, ia_b)
            for (i_a, i_b) in mismatched
            for (ia_a, ia_b) in itertools.product(a_instances[i_a], b_instances[i_b])
        ]
        a_extra = [ia_a for i_a in a_extra for ia_a in a_instances[i_a]]
        b_extra = [ia_b for i_b in b_extra for ia_b in b_instances[i_b]]

        if self.return_distances:
            for i_a, i_b in list(distances.keys()):
                dist = distances.pop((i_a, i_b))

                for ia_a, ia_b in itertools.product(a_instances[i_a], b_instances[i_b]):
                    distances[(id(ia_a), id(ia_b))] = dist

        returned_values = (matched, mismatched, a_extra, b_extra)

        if self.return_distances:
            returned_values = returned_values + (distances,)

        return returned_values

    def match_lines(self, item_a: dm.DatasetItem, item_b: dm.DatasetItem):
        matcher = LineMatcher(
            oriented=self.compare_line_orientation,
            torso_r=self.line_torso_radius,
            scale=np.prod(item_a.media_as(dm.Image).size),
        )
        return self.match_segments(
            dm.AnnotationType.polyline, item_a, item_b, distance=matcher.distance
        )

    def match_points(self, item_a: dm.DatasetItem, item_b: dm.DatasetItem):
        a_points = self._get_ann_type(dm.AnnotationType.points, item_a)
        b_points = self._get_ann_type(dm.AnnotationType.points, item_b)

        if not a_points and not b_points:
            results = [[], [], [], []]

            if self.return_distances:
                results.append({})

            return tuple(results)

        instance_map = {}  # points id -> (instance group, instance bbox)
        for source_anns in [item_a.annotations, item_b.annotations]:
            if self.allow_groups:
                # Group instance annotations by label.
                # Annotations with the same label and group will be merged,
                # and considered a single object in comparison
                source_instances = datumaro.util.annotation_util.find_instances(source_anns)
            else:
                source_instances = [[a] for a in source_anns]  # ignore groups

            for instance_group in source_instances:
                instance_bbox = self.instance_bbox(instance_group)

                for ann in instance_group:
                    if ann.type == datumaro.AnnotationType.points:
                        instance_map[id(ann)] = [instance_group, instance_bbox]

        img_h, img_w = item_a.media_as(dm.Image).size

        def _distance(a: dm.Points, b: dm.Points) -> float:
            a_bbox = instance_map[id(a)][1]
            b_bbox = instance_map[id(b)][1]
            a_area = a_bbox[2] * a_bbox[3]
            b_area = b_bbox[2] * b_bbox[3]

            if a_area == 0 and b_area == 0:
                # Simple case: singular points without bbox
                # match them in the image space
                return oks(a, b, sigma=self.oks_sigma, scale=img_h * img_w)

            else:
                # Complex case: multiple points, grouped points, points with a bbox
                # Try to align points and then return the metric

                if self.point_size_base == models.PointSizeBase.IMAGE_SIZE:
                    scale = img_h * img_w
                elif self.point_size_base == models.PointSizeBase.GROUP_BBOX_SIZE:
                    # match points in their bbox space

                    if datumaro.util.annotation_util.bbox_iou(a_bbox, b_bbox) <= 0:
                        # this early exit may not work for points forming an axis-aligned line
                        return 0

                    bbox = datumaro.util.annotation_util.mean_bbox([a_bbox, b_bbox])
                    scale = bbox[2] * bbox[3]
                else:
                    assert False, f"Unknown point size base {self.point_size_base}"

                a_points = np.reshape(a.points, (-1, 2))
                b_points = np.reshape(b.points, (-1, 2))

                matches, mismatches, a_extra, b_extra = match_segments(
                    range(len(a_points)),
                    range(len(b_points)),
                    distance=lambda ai, bi: oks(
                        dm.Points(a_points[ai]),
                        dm.Points(b_points[bi]),
                        sigma=self.oks_sigma,
                        scale=scale,
                    ),
                    dist_thresh=self.iou_threshold,
                    label_matcher=lambda ai, bi: True,
                )

                # the exact array is determined by the label matcher
                # all the points will have the same match status,
                # because there is only 1 shared label for all the points
                matched_points = matches + mismatches

                a_sorting_indices = [ai for ai, _ in matched_points]
                a_points = a_points[a_sorting_indices]

                b_sorting_indices = [bi for _, bi in matched_points]
                b_points = b_points[b_sorting_indices]

                # Compute OKS for 2 groups of points, matching points aligned
                dists = np.linalg.norm(a_points - b_points, axis=1)
                return np.sum(np.exp(-(dists**2) / (2 * scale * (2 * self.oks_sigma) ** 2))) / (
                    len(matched_points) + len(a_extra) + len(b_extra)
                )

        return self.match_segments(
            dm.AnnotationType.points,
            item_a,
            item_b,
            a_objs=a_points,
            b_objs=b_points,
            distance=_distance,
        )

    def _get_skeleton_info(self, skeleton_label_id: int):
        label_cat = cast(dm.LabelCategories, self.categories[dm.AnnotationType.label])
        skeleton_info = self._skeleton_info.get(skeleton_label_id)

        if skeleton_info is None:
            skeleton_label_name = label_cat[skeleton_label_id].name

            # Build a sorted list of sublabels to arrange skeleton points during comparison
            skeleton_info = sorted(
                idx for idx, label in enumerate(label_cat) if label.parent == skeleton_label_name
            )
            self._skeleton_info[skeleton_label_id] = skeleton_info

        return skeleton_info

    def match_skeletons(self, item_a, item_b):
        a_skeletons = self._get_ann_type(dm.AnnotationType.skeleton, item_a)
        b_skeletons = self._get_ann_type(dm.AnnotationType.skeleton, item_b)
        if not a_skeletons and not b_skeletons:
            results = [[], [], [], []]

            if self.return_distances:
                results.append({})

            return tuple(results)

        # Convert skeletons to point lists for comparison
        # This is required to compute correct per-instance distance
        # It is assumed that labels are the same in the datasets
        skeleton_infos = {}
        points_map = {}
        skeleton_map = {}
        a_points = []
        b_points = []
        for source, source_points in [(a_skeletons, a_points), (b_skeletons, b_points)]:
            for skeleton in source:
                skeleton_info = skeleton_infos.setdefault(
                    skeleton.label, self._get_skeleton_info(skeleton.label)
                )

                # Merge skeleton points into a single list
                # The list is ordered by skeleton_info
                skeleton_points = [
                    next((p for p in skeleton.elements if p.label == sublabel), None)
                    for sublabel in skeleton_info
                ]

                # Build a single Points object for further comparisons
                merged_points = dm.Points()
                merged_points.points = np.ravel(
                    [p.points if p else [0, 0] for p in skeleton_points]
                )
                merged_points.visibility = np.ravel(
                    [p.visibility if p else [dm.Points.Visibility.absent] for p in skeleton_points]
                )
                merged_points.label = skeleton.label
                # no per-point attributes currently in CVAT

                if all(v == dm.Points.Visibility.absent for v in merged_points.visibility):
                    # The whole skeleton is outside, exclude it
                    skeleton_map[id(skeleton)] = None
                    continue

                points_map[id(merged_points)] = skeleton
                skeleton_map[id(skeleton)] = merged_points
                source_points.append(merged_points)

        instance_map = {}
        for source in [item_a.annotations, item_b.annotations]:
            for instance_group in datumaro.util.annotation_util.find_instances(source):
                instance_bbox = self.instance_bbox(instance_group)

                instance_group = [
                    skeleton_map[id(a)] if isinstance(a, dm.Skeleton) else a
                    for a in instance_group
                    if not isinstance(a, dm.Skeleton) or skeleton_map[id(a)] is not None
                ]
                for ann in instance_group:
                    instance_map[id(ann)] = [instance_group, instance_bbox]

        matcher = KeypointsMatcher(instance_map=instance_map, sigma=self.oks_sigma)

        results = self.match_segments(
            dm.AnnotationType.points,
            item_a,
            item_b,
            a_objs=a_points,
            b_objs=b_points,
            distance=matcher.distance,
        )

        matched, mismatched, a_extra, b_extra = results[:4]
        if self.return_distances:
            distances = results[4]

        matched = [(points_map[id(p_a)], points_map[id(p_b)]) for (p_a, p_b) in matched]
        mismatched = [(points_map[id(p_a)], points_map[id(p_b)]) for (p_a, p_b) in mismatched]
        a_extra = [points_map[id(p_a)] for p_a in a_extra]
        b_extra = [points_map[id(p_b)] for p_b in b_extra]

        # Map points back to skeletons
        if self.return_distances:
            for p_a_id, p_b_id in list(distances.keys()):
                dist = distances.pop((p_a_id, p_b_id))
                distances[(id(points_map[p_a_id]), id(points_map[p_b_id]))] = dist

        returned_values = (matched, mismatched, a_extra, b_extra)

        if self.return_distances:
            returned_values = returned_values + (distances,)

        return returned_values

    @classmethod
    def _make_memoizing_distance(cls, distance_function: Callable[[Any, Any], float]):
        distances = {}
        notfound = object()

        def memoizing_distance(a, b):
            if isinstance(a, int) and isinstance(b, int):
                key = (a, b)
            else:
                key = (id(a), id(b))

            dist = distances.get(key, notfound)

            if dist is notfound:
                dist = distance_function(a, b)
                distances[key] = dist

            return dist

        return memoizing_distance, distances

    def match_annotations(self, item_a, item_b):
        return {t: self._match_ann_type(t, item_a, item_b) for t in self.included_ann_types}


def _find_covered_segments(
    segments, *, img_w: int, img_h: int, visibility_threshold: float = 0.01
) -> Sequence[int]:
    from pycocotools import mask as mask_utils

    segments = [[s] for s in segments]
    input_rles = [mask_utils.frPyObjects(s, img_h, img_w) for s in segments]
    covered_ids = []
    for i, bottom_rles in enumerate(input_rles):
        top_rles = input_rles[i + 1 :]
        top_rle = mask_utils.merge(list(itertools.chain.from_iterable(top_rles)))
        intersection_rle = mask_utils.merge([top_rle] + bottom_rles, intersect=True)
        union_rle = mask_utils.merge([top_rle] + bottom_rles)

        bottom_area, intersection_area, union_area = mask_utils.area(
            bottom_rles + [intersection_rle, union_rle]
        )
        iou = intersection_area / (union_area or 1)

        if iou == 0:
            continue

        # Check if the bottom segment is fully covered by the top one
        if 1 - intersection_area / (bottom_area or 1) < visibility_threshold:
            covered_ids.append(i)

    return covered_ids


class _Comparator:
    def __init__(self, categories: dm.CategoriesInfo, *, settings: ComparisonParameters):
        self.ignored_attrs = set(settings.ignored_attributes) | {
            "track_id",  # changes from task to task, can't be defined manually with the same name
            "keyframe",  # indicates the way annotation obtained, meaningless to compare
            "z_order",  # changes from frame to frame, compared by other means
            "group",  # changes from job to job, compared by other means
            "rotation",  # handled by other means
            "outside",  # handled by other means
        }
        self.included_ann_types = settings.included_annotation_types
        self.non_groupable_ann_type = settings.non_groupable_ann_type
        self._annotation_comparator = DistanceComparator(
            categories,
            included_ann_types=set(self.included_ann_types)
            - {dm.AnnotationType.mask},  # masks are compared together with polygons
            return_distances=True,
            panoptic_comparison=settings.panoptic_comparison,
            iou_threshold=settings.iou_threshold,
            oks_sigma=settings.oks_sigma,
            point_size_base=settings.point_size_base,
            line_torso_radius=settings.line_thickness,
            compare_line_orientation=False,  # should not be taken from outside, handled differently
        )
        self.coverage_threshold = settings.object_visibility_threshold
        self.group_match_threshold = settings.group_match_threshold

    def match_attrs(self, ann_a: dm.Annotation, ann_b: dm.Annotation):
        a_attrs = ann_a.attributes
        b_attrs = ann_b.attributes

        keys_to_match = (a_attrs.keys() | b_attrs.keys()).difference(self.ignored_attrs)

        matches = []
        mismatches = []
        a_extra = []
        b_extra = []

        notfound = object()

        for k in keys_to_match:
            a_attr = a_attrs.get(k, notfound)
            b_attr = b_attrs.get(k, notfound)

            if a_attr is notfound:
                b_extra.append(k)
            elif b_attr is notfound:
                a_extra.append(k)
            elif a_attr == b_attr:
                matches.append(k)
            else:
                mismatches.append(k)

        return matches, mismatches, a_extra, b_extra

    def find_groups(
        self, item: dm.DatasetItem
    ) -> tuple[dict[int, list[dm.Annotation]], dict[int, int]]:
        ann_groups = datumaro.util.annotation_util.find_instances(
            [
                ann
                for ann in item.annotations
                if ann.type in self.included_ann_types and ann.type != self.non_groupable_ann_type
            ]
        )

        groups = {}
        group_map = {}  # ann id -> group id
        for group_id, group in enumerate(ann_groups):
            groups[group_id] = group
            for ann in group:
                group_map[id(ann)] = group_id

        return groups, group_map

    def match_groups(self, gt_groups, ds_groups, matched_anns):
        matched_ann_ids = dict((id(a), id(b)) for a, b in matched_anns)

        def _group_distance(gt_group_id, ds_group_id):
            intersection = sum(
                1
                for gt_ann in gt_groups[gt_group_id]
                for ds_ann in ds_groups[ds_group_id]
                if matched_ann_ids.get(id(gt_ann), None) == id(ds_ann)
            )
            union = len(gt_groups[gt_group_id]) + len(ds_groups[ds_group_id]) - intersection
            return intersection / (union or 1)

        matches, mismatches, gt_unmatched, ds_unmatched = match_segments(
            list(gt_groups),
            list(ds_groups),
            distance=_group_distance,
            label_matcher=lambda a, b: _group_distance(a, b) == 1,
            dist_thresh=self.group_match_threshold,
        )

        ds_to_gt_groups = {
            ds_group_id: gt_group_id
            for gt_group_id, ds_group_id in itertools.chain(
                matches, mismatches, zip(itertools.repeat(None), ds_unmatched)
            )
        }
        ds_to_gt_groups[None] = gt_unmatched

        return ds_to_gt_groups

    def find_covered(self, item: dm.DatasetItem) -> list[dm.Annotation]:
        # Get annotations that can cover or be covered
        spatial_types = {
            dm.AnnotationType.polygon,
            dm.AnnotationType.mask,
            dm.AnnotationType.bbox,
            dm.AnnotationType.ellipse,
        }.intersection(self.included_ann_types)
        anns = sorted(
            [a for a in item.annotations if a.type in spatial_types], key=lambda a: a.z_order
        )

        segms = []
        for ann in anns:
            if ann.type in (dm.AnnotationType.bbox, dm.AnnotationType.ellipse):
                segms.append(ann.as_polygon())
            elif ann.type == dm.AnnotationType.polygon:
                segms.append(ann.points)
            elif ann.type == dm.AnnotationType.mask:
                segms.append(datumaro.util.mask_tools.mask_to_rle(ann.image))
            else:
                assert False

        img_h, img_w = item.media_as(dm.Image).size
        covered_ids = _find_covered_segments(
            segms, img_w=img_w, img_h=img_h, visibility_threshold=self.coverage_threshold
        )
        return [anns[i] for i in covered_ids]

    def match_annotations(self, item_a: dm.DatasetItem, item_b: dm.DatasetItem):
        per_type_results = self._annotation_comparator.match_annotations(item_a, item_b)

        merged_results = [[], [], [], [], {}]
        shape_merged_results = [[], [], [], [], {}]
        for shape_type in self.included_ann_types:
            shape_type_results = per_type_results.get(shape_type, None)
            if shape_type_results is None:
                continue

            for merged_field, field in zip(merged_results, shape_type_results[:-1]):
                merged_field.extend(field)

            if shape_type != dm.AnnotationType.label:
                for merged_field, field in zip(shape_merged_results, shape_type_results[:-1]):
                    merged_field.extend(field)
                shape_merged_results[-1].update(per_type_results[shape_type][-1])

            merged_results[-1].update(per_type_results[shape_type][-1])

        return {"all_ann_types": merged_results, "all_shape_ann_types": shape_merged_results}

    def get_distance(
        self, pairwise_distances, gt_ann: dm.Annotation, ds_ann: dm.Annotation
    ) -> float | None:
        return pairwise_distances.get((id(gt_ann), id(ds_ann)))


class DatasetComparator:
    DEFAULT_SETTINGS = ComparisonParameters()

    def __init__(
        self,
        ds_data_provider: JobDataProvider,
        gt_data_provider: JobDataProvider,
        *,
        settings: ComparisonParameters | None = None,
    ) -> None:
        if settings is None:
            settings = self.DEFAULT_SETTINGS
        self.settings = settings

        self._ds_data_provider = ds_data_provider
        self._gt_data_provider = gt_data_provider
        self._ds_dataset = self._ds_data_provider.dm_dataset
        self._gt_dataset = self._gt_data_provider.dm_dataset

        self._frame_results: dict[int, ComparisonReportFrameSummary] = {}

        self.comparator = _Comparator(self._gt_dataset.categories(), settings=settings)

    def _dm_item_to_frame_id(self, item: dm.DatasetItem, dataset: dm.Dataset) -> int:
        if dataset is self._ds_dataset:
            source_data_provider = self._ds_data_provider
        elif dataset is self._gt_dataset:
            source_data_provider = self._gt_data_provider
        else:
            assert False

        return source_data_provider.dm_item_id_to_frame_id(item)

    def _dm_ann_to_ann_id(self, ann: dm.Annotation, dataset: dm.Dataset):
        if dataset is self._ds_dataset:
            source_data_provider = self._ds_data_provider
        elif dataset is self._gt_dataset:
            source_data_provider = self._gt_data_provider
        else:
            assert False

        return source_data_provider.dm_ann_to_ann_id(ann)

    def _get_total_frames(self) -> int:
        return len(self._ds_data_provider.job_data)

    def _find_gt_conflicts(self):
        ds_job_dataset = self._ds_dataset
        gt_job_dataset = self._gt_dataset

        for gt_item in gt_job_dataset:
            ds_item = ds_job_dataset.get(id=gt_item.id, subset=gt_item.subset)
            if not ds_item:
                continue  # we need to compare only intersecting frames

            self._process_frame(ds_item, gt_item)

    def _process_frame(
        self, ds_item: dm.DatasetItem, gt_item: dm.DatasetItem
    ) -> list[AnnotationConflict]:
        frame_id = self._dm_item_to_frame_id(ds_item, self._ds_dataset)

        frame_results = self.comparator.match_annotations(gt_item, ds_item)
        self._frame_results.setdefault(frame_id, {})

        self._generate_frame_annotation_conflicts(
            frame_id, frame_results, gt_item=gt_item, ds_item=ds_item
        )

    def _generate_frame_annotation_conflicts(
        self, frame_id: str, frame_results, *, gt_item: dm.DatasetItem, ds_item: dm.DatasetItem
    ) -> list[AnnotationConflict]:
        conflicts = []

        matches, mismatches, gt_unmatched, ds_unmatched, _ = frame_results["all_ann_types"]
        (
            shape_matches,
            shape_mismatches,
            shape_gt_unmatched,
            shape_ds_unmatched,
            shape_pairwise_distances,
        ) = frame_results["all_shape_ann_types"]

        def _get_similarity(gt_ann: dm.Annotation, ds_ann: dm.Annotation) -> float | None:
            return self.comparator.get_distance(shape_pairwise_distances, gt_ann, ds_ann)

        _matched_shapes = set(
            id(shape)
            for shape_pair in itertools.chain(shape_matches, shape_mismatches)
            for shape in shape_pair
        )

        def _find_closest_unmatched_shape(shape: dm.Annotation):
            this_shape_id = id(shape)

            this_shape_distances = []

            for (gt_shape_id, ds_shape_id), dist in shape_pairwise_distances.items():
                if gt_shape_id == this_shape_id:
                    other_shape_id = ds_shape_id
                elif ds_shape_id == this_shape_id:
                    other_shape_id = gt_shape_id
                else:
                    continue

                this_shape_distances.append((other_shape_id, dist))

            matched_ann, distance = max(this_shape_distances, key=lambda v: v[1], default=(None, 0))
            return matched_ann, distance

        for gt_ann, ds_ann in itertools.chain(matches, mismatches):
            similarity = _get_similarity(gt_ann, ds_ann)
            if similarity and similarity < self.settings.low_overlap_threshold:
                conflicts.append(
                    AnnotationConflict(
                        frame_id=frame_id,
                        type=AnnotationConflictType.LOW_OVERLAP,
                        annotation_ids=[
                            self._dm_ann_to_ann_id(ds_ann, self._ds_dataset),
                            self._dm_ann_to_ann_id(gt_ann, self._gt_dataset),
                        ],
                    )
                )

        for unmatched_ann in gt_unmatched:
            conflicts.append(
                AnnotationConflict(
                    frame_id=frame_id,
                    type=AnnotationConflictType.MISSING_ANNOTATION,
                    annotation_ids=[self._dm_ann_to_ann_id(unmatched_ann, self._gt_dataset)],
                )
            )

        for unmatched_ann in ds_unmatched:
            conflicts.append(
                AnnotationConflict(
                    frame_id=frame_id,
                    type=AnnotationConflictType.EXTRA_ANNOTATION,
                    annotation_ids=[self._dm_ann_to_ann_id(unmatched_ann, self._ds_dataset)],
                )
            )

        for gt_ann, ds_ann in mismatches:
            conflicts.append(
                AnnotationConflict(
                    frame_id=frame_id,
                    type=AnnotationConflictType.MISMATCHING_LABEL,
                    annotation_ids=[
                        self._dm_ann_to_ann_id(ds_ann, self._ds_dataset),
                        self._dm_ann_to_ann_id(gt_ann, self._gt_dataset),
                    ],
                )
            )

        resulting_distances = [
            _get_similarity(shape_gt_ann, shape_ds_ann)
            for shape_gt_ann, shape_ds_ann in itertools.chain(shape_matches, shape_mismatches)
        ]

        for shape_unmatched_ann in itertools.chain(shape_gt_unmatched, shape_ds_unmatched):
            shape_matched_ann_id, similarity = _find_closest_unmatched_shape(shape_unmatched_ann)
            if shape_matched_ann_id is not None:
                _matched_shapes.add(shape_matched_ann_id)
            resulting_distances.append(similarity)

        resulting_distances = [
            sim if sim is not None and (sim >= 0) else 0 for sim in resulting_distances
        ]

        mean_iou = np.mean(resulting_distances) if resulting_distances else 0

        if (
            self.settings.compare_line_orientation
            and dm.AnnotationType.polyline in self.comparator.included_ann_types
        ):
            # Check line directions
            line_matcher = LineMatcher(
                torso_r=self.settings.line_thickness,
                oriented=True,
                scale=np.prod(gt_item.media_as(dm.Image).size),
            )

            for gt_ann, ds_ann in itertools.chain(matches, mismatches):
                if gt_ann.type != ds_ann.type or gt_ann.type != dm.AnnotationType.polyline:
                    continue

                non_oriented_distance = _get_similarity(gt_ann, ds_ann)
                oriented_distance = line_matcher.distance(gt_ann, ds_ann)

                # need to filter computation errors from line approximation
                # and (almost) orientation-independent cases
                if (
                    non_oriented_distance - oriented_distance
                    > self.settings.line_orientation_threshold
                ):
                    conflicts.append(
                        AnnotationConflict(
                            frame_id=frame_id,
                            type=AnnotationConflictType.MISMATCHING_DIRECTION,
                            annotation_ids=[
                                self._dm_ann_to_ann_id(ds_ann, self._ds_dataset),
                                self._dm_ann_to_ann_id(gt_ann, self._gt_dataset),
                            ],
                        )
                    )

        if self.settings.check_covered_annotations:
            ds_covered_anns = self.comparator.find_covered(ds_item)

            for ds_ann in ds_covered_anns:
                conflicts.append(
                    AnnotationConflict(
                        frame_id=frame_id,
                        type=AnnotationConflictType.COVERED_ANNOTATION,
                        annotation_ids=[
                            self._dm_ann_to_ann_id(ds_ann, self._ds_dataset),
                        ],
                    )
                )

        if self.settings.compare_attributes:
            for gt_ann, ds_ann in matches:
                attribute_results = self.comparator.match_attrs(gt_ann, ds_ann)
                if any(attribute_results[1:]):
                    conflicts.append(
                        AnnotationConflict(
                            frame_id=frame_id,
                            type=AnnotationConflictType.MISMATCHING_ATTRIBUTES,
                            annotation_ids=[
                                self._dm_ann_to_ann_id(ds_ann, self._ds_dataset),
                                self._dm_ann_to_ann_id(gt_ann, self._gt_dataset),
                            ],
                        )
                    )

        if self.settings.compare_groups:
            gt_groups, gt_group_map = self.comparator.find_groups(gt_item)
            ds_groups, ds_group_map = self.comparator.find_groups(ds_item)
            shape_matched_objects = shape_matches + shape_mismatches
            ds_to_gt_groups = self.comparator.match_groups(
                gt_groups, ds_groups, shape_matched_objects
            )

            for gt_ann, ds_ann in shape_matched_objects:
                gt_group = gt_groups.get(gt_group_map[id(gt_ann)], [gt_ann])
                ds_group = ds_groups.get(ds_group_map[id(ds_ann)], [ds_ann])
                ds_gt_group = ds_to_gt_groups.get(ds_group_map[id(ds_ann)], None)

                if (
                    # Check ungrouped objects
                    (len(gt_group) == 1 and len(ds_group) != 1)
                    or
                    # Check grouped objects
                    ds_gt_group != gt_group_map[id(gt_ann)]
                ):
                    conflicts.append(
                        AnnotationConflict(
                            frame_id=frame_id,
                            type=AnnotationConflictType.MISMATCHING_GROUPS,
                            annotation_ids=[
                                self._dm_ann_to_ann_id(ds_ann, self._ds_dataset),
                                self._dm_ann_to_ann_id(gt_ann, self._gt_dataset),
                            ],
                        )
                    )

        valid_shapes_count = len(shape_matches) + len(shape_mismatches)
        missing_shapes_count = len(shape_gt_unmatched)
        extra_shapes_count = len(shape_ds_unmatched)
        total_shapes_count = (
            len(shape_matches)
            + len(shape_mismatches)
            + len(shape_gt_unmatched)
            + len(shape_ds_unmatched)
        )
        ds_shapes_count = len(shape_matches) + len(shape_mismatches) + len(shape_ds_unmatched)
        gt_shapes_count = len(shape_matches) + len(shape_mismatches) + len(shape_gt_unmatched)

        valid_labels_count = len(matches)
        invalid_labels_count = len(mismatches)
        total_labels_count = valid_labels_count + invalid_labels_count

        confusion_matrix_labels, confusion_matrix, label_id_map = self._make_zero_confusion_matrix()
        for gt_ann, ds_ann in itertools.chain(
            # fully matched annotations - shape, label, attributes
            matches,
            mismatches,
            zip(itertools.repeat(None), ds_unmatched),
            zip(gt_unmatched, itertools.repeat(None)),
        ):
            ds_label_idx = label_id_map[ds_ann.label] if ds_ann else self._UNMATCHED_IDX
            gt_label_idx = label_id_map[gt_ann.label] if gt_ann else self._UNMATCHED_IDX
            confusion_matrix[ds_label_idx, gt_label_idx] += 1

        if self.settings.empty_is_annotated:
            # Add virtual annotations for empty frames
            if not gt_item.annotations and not ds_item.annotations:
                valid_labels_count = 1
                total_labels_count = 1

                valid_shapes_count = 1
                total_shapes_count = 1

            if not ds_item.annotations:
                ds_shapes_count = 1

            if not gt_item.annotations:
                gt_shapes_count = 1

        self._frame_results[frame_id] = ComparisonReportFrameSummary(
            annotations=self._generate_frame_annotations_summary(
                confusion_matrix, confusion_matrix_labels
            ),
            annotation_components=ComparisonReportAnnotationComponentsSummary(
                shape=ComparisonReportAnnotationShapeSummary(
                    valid_count=valid_shapes_count,
                    missing_count=missing_shapes_count,
                    extra_count=extra_shapes_count,
                    total_count=total_shapes_count,
                    ds_count=ds_shapes_count,
                    gt_count=gt_shapes_count,
                    mean_iou=mean_iou,
                ),
                label=ComparisonReportAnnotationLabelSummary(
                    valid_count=valid_labels_count,
                    invalid_count=invalid_labels_count,
                    total_count=total_labels_count,
                ),
            ),
            conflicts=conflicts,
        )

        return conflicts

    # row/column index in the confusion matrix corresponding to unmatched annotations
    _UNMATCHED_IDX = -1

    def _make_zero_confusion_matrix(self) -> tuple[list[str], np.ndarray, dict[int, int]]:
        label_id_idx_map = {}
        label_names = []
        for label_id, label in enumerate(self._gt_dataset.categories()[dm.AnnotationType.label]):
            if not label.parent:
                label_id_idx_map[label_id] = len(label_names)
                label_names.append(label.name)

        label_names.append("unmatched")

        num_labels = len(label_names)
        confusion_matrix = np.zeros((num_labels, num_labels), dtype=int)

        return label_names, confusion_matrix, label_id_idx_map

    def _compute_annotations_summary(
        self, confusion_matrix: np.ndarray, confusion_matrix_labels: list[str]
    ) -> ComparisonReportAnnotationsSummary:
        matched_ann_counts = np.diag(confusion_matrix)
        ds_ann_counts = np.sum(confusion_matrix, axis=1)
        gt_ann_counts = np.sum(confusion_matrix, axis=0)
        total_annotations_count = np.sum(confusion_matrix)

        label_jaccard_indices = _arr_div(
            matched_ann_counts, ds_ann_counts + gt_ann_counts - matched_ann_counts
        )
        label_precisions = _arr_div(matched_ann_counts, ds_ann_counts)
        label_recalls = _arr_div(matched_ann_counts, gt_ann_counts)
        label_accuracies = (
            total_annotations_count  # TP + TN + FP + FN
            - (ds_ann_counts - matched_ann_counts)  # - FP
            - (gt_ann_counts - matched_ann_counts)  # - FN
            # ... = TP + TN
        ) / (total_annotations_count or 1)

        valid_annotations_count = np.sum(matched_ann_counts)
        missing_annotations_count = np.sum(confusion_matrix[self._UNMATCHED_IDX, :])
        extra_annotations_count = np.sum(confusion_matrix[:, self._UNMATCHED_IDX])
        ds_annotations_count = np.sum(ds_ann_counts[: self._UNMATCHED_IDX])
        gt_annotations_count = np.sum(gt_ann_counts[: self._UNMATCHED_IDX])

        return ComparisonReportAnnotationsSummary(
            valid_count=valid_annotations_count,
            missing_count=missing_annotations_count,
            extra_count=extra_annotations_count,
            total_count=total_annotations_count,
            ds_count=ds_annotations_count,
            gt_count=gt_annotations_count,
            confusion_matrix=ConfusionMatrix(
                labels=confusion_matrix_labels,
                rows=confusion_matrix,
                precision=label_precisions,
                recall=label_recalls,
                accuracy=label_accuracies,
                jaccard_index=label_jaccard_indices,
            ),
        )

    def _generate_frame_annotations_summary(
        self, confusion_matrix: np.ndarray, confusion_matrix_labels: list[str]
    ) -> ComparisonReportAnnotationsSummary:
        summary = self._compute_annotations_summary(confusion_matrix, confusion_matrix_labels)

        if self.settings.empty_is_annotated:
            # Add virtual annotations for empty frames
            if not summary.total_count:
                summary.valid_count = 1
                summary.total_count = 1

            if not summary.ds_count:
                summary.ds_count = 1

            if not summary.gt_count:
                summary.gt_count = 1

        return summary

    def _generate_dataset_annotations_summary(
        self, frame_summaries: dict[int, ComparisonReportFrameSummary]
    ) -> tuple[ComparisonReportAnnotationsSummary, ComparisonReportAnnotationComponentsSummary]:
        # accumulate stats
        annotation_components = ComparisonReportAnnotationComponentsSummary(
            shape=ComparisonReportAnnotationShapeSummary(
                valid_count=0,
                missing_count=0,
                extra_count=0,
                total_count=0,
                ds_count=0,
                gt_count=0,
                mean_iou=0,
            ),
            label=ComparisonReportAnnotationLabelSummary(
                valid_count=0,
                invalid_count=0,
                total_count=0,
            ),
        )
        mean_ious = []
        empty_gt_frames = set()
        empty_ds_frames = set()
        confusion_matrix_labels, confusion_matrix, _ = self._make_zero_confusion_matrix()

        for frame_id, frame_result in frame_summaries.items():
            confusion_matrix += frame_result.annotations.confusion_matrix.rows

            if self.settings.empty_is_annotated and not np.any(
                frame_result.annotations.confusion_matrix.rows[
                    np.triu_indices_from(frame_result.annotations.confusion_matrix.rows)
                ]
            ):
                empty_ds_frames.add(frame_id)

            if self.settings.empty_is_annotated and not np.any(
                frame_result.annotations.confusion_matrix.rows[
                    np.tril_indices_from(frame_result.annotations.confusion_matrix.rows)
                ]
            ):
                empty_gt_frames.add(frame_id)

            if annotation_components is None:
                annotation_components = deepcopy(frame_result.annotation_components)
            else:
                annotation_components.accumulate(frame_result.annotation_components)

            mean_ious.append(frame_result.annotation_components.shape.mean_iou)

        annotation_summary = self._compute_annotations_summary(
            confusion_matrix, confusion_matrix_labels
        )

        if self.settings.empty_is_annotated:
            # Add virtual annotations for empty frames,
            # they are not included in the confusion matrix
            annotation_summary.valid_count += len(empty_ds_frames & empty_gt_frames)
            annotation_summary.total_count += len(empty_ds_frames | empty_gt_frames)
            annotation_summary.ds_count += len(empty_ds_frames)
            annotation_summary.gt_count += len(empty_gt_frames)

        # Cannot be computed in accumulate()
        annotation_components.shape.mean_iou = np.mean(mean_ious or [])

        return annotation_summary, annotation_components

    def generate_report(self) -> ComparisonReport:
        self._find_gt_conflicts()

        intersection_frames = []
        conflicts = []
        for frame_id, frame_result in self._frame_results.items():
            intersection_frames.append(frame_id)
            conflicts += frame_result.conflicts

        annotation_summary, annotations_component_summary = (
            self._generate_dataset_annotations_summary(self._frame_results)
        )

        conflicts_by_severity = Counter(c.severity for c in conflicts)
        return ComparisonReport(
            parameters=self.settings,
            comparison_summary=ComparisonReportSummary(
                frames=intersection_frames,
                total_frames=self._get_total_frames(),
                conflict_count=len(conflicts),
                warning_count=conflicts_by_severity.get(AnnotationConflictSeverity.WARNING, 0),
                error_count=conflicts_by_severity.get(AnnotationConflictSeverity.ERROR, 0),
                conflicts_by_type=Counter(c.type for c in conflicts),
                annotations=annotation_summary,
                annotation_components=annotations_component_summary,
                tasks=None,
                jobs=None,
            ),
            frame_results=self._frame_results,
        )


class QualityReportRQJobManager(AbstractRequestManager):
    QUEUE_NAME = settings.CVAT_QUEUES.QUALITY_REPORTS.value
    SUPPORTED_TARGETS: ClassVar[set[RequestTarget]] = {RequestTarget.TASK, RequestTarget.PROJECT}

    @property
    def job_result_ttl(self):
        return 120

    def get_job_by_id(self, id_, /):
        try:
            id_ = QualityRequestId.parse_and_validate_queue(
                id_, expected_queue=self.QUEUE_NAME, try_legacy_format=True
            ).render()
        except ValueError:
            raise serializers.ValidationError("Provided request ID is invalid")

        return super().get_job_by_id(id_)

    def build_request_id(self):
        return QualityRequestId(
            target=self.target,
            target_id=self.db_instance.pk,
        ).render()

    def validate_request(self):
        super().validate_request()

        if isinstance(self.db_instance, Project):
            return  # nothing prevents project reports
        elif isinstance(self.db_instance, Task):
            if self.db_instance.dimension != DimensionType.DIM_2D:
                raise serializers.ValidationError("Quality reports are only supported in 2d tasks")

            gt_job = self.db_instance.gt_job
            if gt_job is None or not (
                gt_job.stage == StageChoice.ACCEPTANCE and gt_job.state == StateChoice.COMPLETED
            ):
                raise serializers.ValidationError(
                    "Quality reports require a Ground Truth job in the task "
                    f"at the {StageChoice.ACCEPTANCE} stage "
                    f"and in the {StateChoice.COMPLETED} state"
                )
        else:
            assert False

    def init_callback_with_params(self):
        assert isinstance(self.db_instance, (Task, Project))
        method_name = f"_check_{self.target}_quality"
        self.callback = getattr(QualityReportManager, method_name)
        self.callback_kwargs = {
            f"{self.target}_id": self.db_instance.pk,
        }


class QualityReportManager:
    @classmethod
    @silk_profile()
    def _check_task_quality(cls, *, task_id: int) -> int:
        report = TaskQualityCalculator().compute_report(task=task_id)
        if not report:
            return None

        return report.id

    @classmethod
    @silk_profile()
    def _check_project_quality(cls, *, project_id: int) -> int:
        return ProjectQualityCalculator().compute_report(project=project_id).id


class QualitySettingsManager:
    def get_project_settings(self, project: Project) -> models.QualitySettings:
        return project.quality_settings

    def get_task_settings(self, task: Task, *, inherit: bool = True) -> models.QualitySettings:
        quality_settings = task.quality_settings

        if inherit and quality_settings.inherit and task.project:
            quality_settings = self.get_project_settings(task.project)

        return quality_settings


_DEFAULT_FETCH_CHUNK_SIZE = 1000


class TaskQualityCalculator:
    # JSON filter lookups
    JOB_FILTER_LOOKUPS = {
        "id": "id",
        "type": "type",
        "state": "state",
        "stage": "stage",
        "assignee": "assignee__username",
        "task_id": "segment__task__id",
        "task_name": "segment__task__name",
    }

    def compute_report(self, task: Task | int) -> models.QualityReport | None:
        with transaction.atomic():
            # Preload all the required data for computations.
            # Ideally, we would lock the task to fetch all the data and produce
            # consistent report. However, data fetching can also take long time.
            # For this reason, we don't guarantee absolute consistency.
            if isinstance(task, int):
                task = Task.objects.select_related("data").get(id=task)

            # The GT job could have been removed or marked incomplete during scheduling,
            # so we need to check it
            gt_job_id = (
                Job.objects.filter(
                    segment__task=task,
                    type=JobType.GROUND_TRUTH,
                    state=StateChoice.COMPLETED,
                    stage=StageChoice.ACCEPTANCE,
                )
                .values_list("id", flat=True)
                .first()
            )
            if not gt_job_id:
                return None

            quality_params = self.get_quality_params(task)

            all_job_ids: set[int] = set(
                Job.objects.filter(segment__task=task)
                .exclude(type=JobType.GROUND_TRUTH)
                .values_list("id", flat=True)
            )

            job_filter = JsonLogicFilter()
            if job_filter_rules := job_filter.parse_query(
                quality_params.job_filter or "[]", raise_on_empty=False
            ):
                job_queryset = job_filter.apply_filter(
                    Job.objects,
                    parsed_rules=job_filter_rules,
                    lookup_fields=self.JOB_FILTER_LOOKUPS,
                )
                filtered_job_ids: set[int] = set(
                    job_id
                    for ids_chunk in take_by(all_job_ids, chunk_size=_DEFAULT_FETCH_CHUNK_SIZE)
                    for job_id in job_queryset.filter(id__in=ids_chunk).values_list("id", flat=True)
                )
            else:
                filtered_job_ids = set(all_job_ids)

            # TODO: Probably, can be optimized to this:
            # - task updated (the gt job, frame set or labels changed) -> everything is computed
            # - job updated -> job report is computed
            #   old reports can be reused in this case

            # Try to use a shared queryset to minimize DB requests
            job_queryset = Job.objects.select_related("segment").filter(segment__task=task)

            # Add prefetch data to the shared queryset
            # All the jobs / segments share the same task, so we can load it just once.
            # We reuse the same object for better memory use (OOM is possible otherwise).
            # Perform manual "join", since django can't do this.
            gt_job = JobDataProvider.add_prefetch_info(job_queryset).get(id=gt_job_id)

            jobs: dict[int, Job] = [j for j in job_queryset if j.id in filtered_job_ids]
            for job in job_queryset:
                job.segment.task = gt_job.segment.task  # put the prefetched object

            gt_job_data_provider = JobDataProvider(gt_job.id, queryset=job_queryset)
            active_validation_frames = gt_job_data_provider.job_data.get_included_frames()

            validation_layout = task.data.validation_layout
            if validation_layout.mode == ValidationMode.GT_POOL:
                task_frame_provider = TaskFrameProvider(task)
                active_validation_frames = set(
                    task_frame_provider.get_rel_frame_number(abs_frame)
                    for abs_frame, abs_real_frame in (
                        Image.objects.filter(data=task.data, is_placeholder=True)
                        .values_list("frame", "real_frame")
                        .iterator(chunk_size=_DEFAULT_FETCH_CHUNK_SIZE)
                    )
                    if task_frame_provider.get_rel_frame_number(abs_real_frame)
                    in active_validation_frames
                )

            job_data_providers = {
                job.id: JobDataProvider(
                    job.id,
                    queryset=job_queryset,
                    included_frames=active_validation_frames,
                )
                for job in jobs
            }

        job_comparison_reports: dict[int, ComparisonReport] = {}
        for job in jobs:
            if job.id not in filtered_job_ids:
                continue

            job_data_provider = job_data_providers[job.id]
            comparator = DatasetComparator(
                job_data_provider,
                gt_job_data_provider,
                settings=quality_params,
            )
            job_comparison_reports[job.id] = comparator.generate_report()

            # Release resources
            del job_data_provider.dm_dataset

        task_comparison_report = self._compute_task_report(
            job_comparison_reports,
            quality_params,
            all_job_ids=all_job_ids,
        )

        with transaction.atomic():
            job_quality_reports = {}
            for job in jobs:
                job_comparison_report = job_comparison_reports[job.id]
                job_report = dict(
                    job=job,
                    target_last_updated=job.updated_date,
                    gt_last_updated=gt_job.updated_date,
                    assignee_id=job.assignee_id,
                    assignee_last_updated=job.assignee_updated_date,
                    data=job_comparison_report.to_json(),
                    conflicts=[c.to_dict() for c in job_comparison_report.conflicts],
                )

                job_quality_reports[job.id] = job_report

            task_report = self._save_reports(
                task_report=dict(
                    task=task,
                    target_last_updated=task.updated_date,
                    gt_last_updated=gt_job.updated_date,
                    assignee_id=task.assignee_id,
                    assignee_last_updated=task.assignee_updated_date,
                    data=task_comparison_report.to_json(),
                    conflicts=[],  # the task doesn't have own conflicts
                ),
                job_reports=list(job_quality_reports.values()),
            )

        return task_report

    def _compute_task_report(
        self,
        job_reports: dict[int, ComparisonReport],
        comparison_parameters: ComparisonParameters,
        *,
        all_job_ids: set[int],
    ) -> ComparisonReport:
        # Accumulate job stats
        job_stats = ComparisonReportJobStats.create_empty()
        job_stats.all.update(all_job_ids)
        job_stats.excluded.update(all_job_ids - job_reports.keys())
        job_stats.not_checkable.update(
            jid for jid, r in job_reports.items() if not r.comparison_summary.frame_count
        )

        # The task dataset can be different from any jobs' dataset because of frame overlaps
        # between jobs, from which annotations are merged to get the task annotations.
        # Thus, a separate report could be computed for the task. Instead, here we only
        # compute the combined summary of the job reports.
        # It's possible that overlapped frames checked more than once, ignore extra checks
        # in this statistics and results.
        task_validated_frames = set()
        task_validation_frames_count = 0  # in included and non-checkable jobs
        task_total_frames = 0  # in included and non-checkable jobs
        task_conflicts: list[AnnotationConflict] = []
        task_annotations_summary = ComparisonReportAnnotationsSummary.create_empty()
        task_ann_components_summary = ComparisonReportAnnotationComponentsSummary.create_empty()
        task_mean_shape_ious = []
        task_frame_results: dict[int, ComparisonReportFrameSummary] = {}
        task_frame_results_counts = {}
        for r in job_reports.values():
            task_validated_frames.update(r.comparison_summary.frames)
            task_validation_frames_count += r.comparison_summary.frame_count
            task_total_frames += r.comparison_summary.total_frames
            task_conflicts.extend(r.conflicts)

            task_annotations_summary.accumulate(r.comparison_summary.annotations)
            task_ann_components_summary.accumulate(r.comparison_summary.annotation_components)
            task_mean_shape_ious.append(task_ann_components_summary.shape.mean_iou)

            for frame_id, job_frame_result in r.frame_results.items():
                task_frame_result = task_frame_results.get(frame_id)
                frame_results_count = task_frame_results_counts.get(frame_id, 0)

                if task_frame_result is None:
                    task_frame_result = deepcopy(job_frame_result)
                else:
                    task_frame_result.conflicts += job_frame_result.conflicts

                    task_frame_result.annotations.accumulate(job_frame_result.annotations)
                    task_frame_result.annotation_components.accumulate(
                        job_frame_result.annotation_components
                    )

                    task_frame_result.annotation_components.shape.mean_iou = (
                        task_frame_result.annotation_components.shape.mean_iou * frame_results_count
                        + job_frame_result.annotation_components.shape.mean_iou
                    ) / (frame_results_count + 1)

                task_frame_results_counts[frame_id] = 1 + frame_results_count
                task_frame_results[frame_id] = task_frame_result

        task_ann_components_summary.shape.mean_iou = np.mean(task_mean_shape_ious or [])

        conflicts_by_severity = Counter(c.severity for c in task_conflicts)
        task_report_data = ComparisonReport(
            parameters=comparison_parameters,
            comparison_summary=ComparisonReportSummary(
                frame_count=task_validation_frames_count,
                total_frames=task_total_frames,
                frames=sorted(task_validated_frames),
                conflict_count=len(task_conflicts),
                warning_count=conflicts_by_severity.get(AnnotationConflictSeverity.WARNING, 0),
                error_count=conflicts_by_severity.get(AnnotationConflictSeverity.ERROR, 0),
                conflicts_by_type=Counter(c.type for c in task_conflicts),
                annotations=task_annotations_summary,
                annotation_components=task_ann_components_summary,
                tasks=None,
                jobs=job_stats,
            ),
            frame_results=task_frame_results,
        )

        return task_report_data

    def _save_reports(self, *, task_report: dict, job_reports: list[dict]) -> models.QualityReport:
        db_task_report = models.QualityReport(
            task=task_report["task"],
            target_last_updated=task_report["target_last_updated"],
            gt_last_updated=task_report["gt_last_updated"],
            assignee_id=task_report["assignee_id"],
            assignee_last_updated=task_report["assignee_last_updated"],
            data=task_report["data"],
        )
        db_task_report.save()

        db_job_reports = []
        for job_report in job_reports:
            db_job_report = models.QualityReport(
                job=job_report["job"],
                target_last_updated=job_report["target_last_updated"],
                gt_last_updated=job_report["gt_last_updated"],
                assignee_id=job_report["assignee_id"],
                assignee_last_updated=job_report["assignee_last_updated"],
                data=job_report["data"],
            )
            db_job_reports.append(db_job_report)

        db_job_reports = bulk_create(models.QualityReport, db_job_reports)
        db_task_report.children.add(*db_job_reports)

        db_conflicts = []
        db_report_iter = itertools.chain([db_task_report], db_job_reports)
        report_iter = itertools.chain([task_report], job_reports)
        for report, db_report in zip(report_iter, db_report_iter):
            for conflict in report["conflicts"]:
                db_conflict = models.AnnotationConflict(
                    report=db_report,
                    type=conflict["type"],
                    frame=conflict["frame_id"],
                    severity=conflict["severity"],
                )
                db_conflicts.append(db_conflict)

        db_conflicts = bulk_create(models.AnnotationConflict, db_conflicts)

        db_ann_ids = []
        db_conflicts_iter = iter(db_conflicts)
        for report in itertools.chain([task_report], job_reports):
            for conflict, db_conflict in zip(report["conflicts"], db_conflicts_iter):
                for ann_id in conflict["annotation_ids"]:
                    db_ann_id = models.AnnotationId(
                        conflict=db_conflict,
                        job_id=ann_id["job_id"],
                        obj_id=ann_id["obj_id"],
                        type=ann_id["type"],
                        shape_type=ann_id["shape_type"],
                    )
                    db_ann_ids.append(db_ann_id)

        bulk_create(models.AnnotationId, db_ann_ids)

        return db_task_report

    def get_quality_params(self, task: Task) -> ComparisonParameters:
        quality_settings_manager = QualitySettingsManager()
        task_own_settings = quality_settings_manager.get_task_settings(task, inherit=False)
        task_effective_settings = quality_settings_manager.get_task_settings(task)
        return ComparisonParameters.from_settings(
            task_effective_settings, inherited=task_own_settings.id != task_effective_settings.id
        )


class ProjectQualityCalculator:
    def is_task_report_relevant(self, quality_report: models.QualityReport) -> bool:
        assert quality_report.target == models.QualityReportTarget.TASK

        task = quality_report.task
        quality_settings = QualitySettingsManager().get_task_settings(task)

        return (quality_report.target_last_updated >= task.updated_date) and (
            quality_report.target_last_updated >= quality_settings.updated_date
        )

    def compute_report(self, project: Project | int) -> models.QualityReport:
        with transaction.atomic():
            # Preload the required data for computations.
            # Ideally, we would lock the task to fetch all the data and produce
            # consistent report. However, data fetching can also take long time.
            # For this reason, we don't guarantee absolute consistency.
            if isinstance(project, int):
                project = Project.objects.get(id=project)

            project_quality_params = self.get_quality_params(project)

            # Tasks could be added or removed in the project after initial report fetching
            # Fix working the set of tasks by requesting ids first.
            all_task_ids: set[int] = set(
                Task.objects.filter(project=project).values_list("id", flat=True)
            )

            configured_task_ids: set[int] = set(
                task_id
                for ids_chunk in take_by(all_task_ids, chunk_size=_DEFAULT_FETCH_CHUNK_SIZE)
                for task_id in Job.objects.filter(
                    type=JobType.GROUND_TRUTH,
                    stage=StageChoice.ACCEPTANCE,
                    state=StateChoice.COMPLETED,
                    segment__task__in=ids_chunk,
                ).values_list("segment__task__id", flat=True)
            )

            # Prefetch in batches
            configured_tasks = {}
            for ids_batch in take_by(configured_task_ids, chunk_size=_DEFAULT_FETCH_CHUNK_SIZE):
                tasks_batch = (
                    project.tasks.filter(id__in=ids_batch)
                    .annotate(
                        latest_quality_report_id=Subquery(
                            models.QualityReport.objects.filter(
                                created_date__isnull=False,
                                task_id=OuterRef("id"),
                            )
                            .order_by("-created_date")
                            .values("id")[:1]
                        )
                    )
                    .all()
                )
                configured_tasks.update((t.id, t) for t in tasks_batch)

                prefetch_related_objects(tasks_batch, "quality_settings")

        latest_quality_report_ids = set(
            t.latest_quality_report_id for t in configured_tasks.values()
        )
        latest_quality_reports = {
            r.id: r
            for ids_chunk in take_by(
                latest_quality_report_ids, chunk_size=_DEFAULT_FETCH_CHUNK_SIZE
            )
            for r in models.QualityReport.objects.filter(id__in=ids_chunk)
        }

        task_quality_reports: dict[int, models.QualityReport] = {}
        for task in configured_tasks.values():
            latest_task_quality_report_id = getattr(task, "latest_quality_report_id", None)
            latest_task_quality_report = latest_quality_reports.get(latest_task_quality_report_id)
            if not latest_task_quality_report:
                continue

            latest_task_quality_report.task = task  # put the prefetched object
            if not self.is_task_report_relevant(latest_task_quality_report):
                continue

            task_quality_reports[task.id] = latest_task_quality_report

        # Compute required task reports
        # This loop can take long time, maybe use RQ dependencies for each task instead
        tasks_without_reports = configured_tasks.keys() - task_quality_reports.keys()
        for ids_batch in take_by(tasks_without_reports, chunk_size=_DEFAULT_FETCH_CHUNK_SIZE):
            tasks_batch = [configured_tasks[task_id] for task_id in ids_batch]

            prefetch_related_objects(
                tasks_batch,
                "data",
                "data__validation_layout",
            )

            for task in tasks_batch:
                if task.id in task_quality_reports:
                    continue

                # Tasks could have been deleted during report computations, ignore them.
                # Tasks could be moved between projects. It can't be
                # reliably checked and it is quite rare, so we ignore it.
                with suppress(Task.DoesNotExist):
                    task_report_calculator = TaskQualityCalculator()
                    task_report = task_report_calculator.compute_report(task)
                    if task_report:
                        task_quality_reports[task.id] = task_report

        task_comparison_reports: dict[int, ComparisonReport] = {
            task_id: ComparisonReport.from_json(r.get_report_data())
            for task_id, r in task_quality_reports.items()
        }

        project_comparison_report = self._compute_project_report(
            task_reports=task_comparison_reports,
            quality_params=project_quality_params,
            all_task_ids=all_task_ids,
        )

        with transaction.atomic():
            project_report = self._save_report(
                models.QualityReport(
                    project=project,
                    target_last_updated=project.updated_date,
                    gt_last_updated=None,
                    data=project_comparison_report.to_json(),
                    # project reports don't include conflicts
                ),
                child_reports=[
                    r for r in task_quality_reports.values() if r.task.id in task_comparison_reports
                ],
            )

        return project_report

    def _compute_project_report(
        self,
        task_reports: dict[int, ComparisonReport],
        *,
        quality_params: ComparisonParameters,
        all_task_ids: set[int],
    ) -> ComparisonReport:
        # Aggregate nested reports. It's possible that there are no child reports,
        # but we still need to return a meaningful report.

        # Compute task stats
        task_stats = ComparisonReportTaskStats.create_empty()
        task_stats.all.update(all_task_ids)
        task_stats.not_configured.update(all_task_ids - task_reports.keys())
        task_stats.custom.update(
            tid for tid, r in task_reports.items() if not r.parameters.inherited
        )
        task_stats.excluded.update(
            task_stats.all
            - task_stats.not_configured
            - task_stats.custom
            - (
                task_reports.keys()
                - {
                    # Consider tasks excluded if no jobs were included
                    task_id
                    for task_id, r in task_reports.items()
                    if not r.comparison_summary.jobs.included_count
                }
            )
        )

        included_tasks: set[int] = (
            task_reports.keys()
            - task_stats.custom
            - task_stats.not_configured
            - task_stats.excluded
        )

        # Accumulate job stats
        job_stats = ComparisonReportJobStats.create_empty()
        for task_id in included_tasks:
            task_report_summary = task_reports[task_id].comparison_summary
            if not task_report_summary.jobs:
                continue

            job_stats.all.update(task_report_summary.jobs.all)
            job_stats.excluded.update(task_report_summary.jobs.excluded)
            job_stats.not_checkable.update(task_report_summary.jobs.not_checkable)

        total_frames = 0
        total_validated_frames = 0
        project_annotations_summary = ComparisonReportAnnotationsSummary.create_empty()
        project_ann_components_summary = ComparisonReportAnnotationComponentsSummary.create_empty()
        project_conflicts: list[AnnotationConflict] = []
        for task_id, r in task_reports.items():
            if task_id not in included_tasks:
                continue

            total_frames += r.comparison_summary.total_frames
            total_validated_frames += r.comparison_summary.frame_count

            # Compute the combined weighted summary of the task reports.
            # Task summary counts are extrapolated to the whole task size
            # This way, we get averages for the whole project (micro average)
            weight = 1 / (r.comparison_summary.frame_share or 1)
            project_annotations_summary.accumulate(r.comparison_summary.annotations, weight=weight)
            project_ann_components_summary.accumulate(
                r.comparison_summary.annotation_components, weight=weight
            )
            project_conflicts.extend(r.conflicts)

        conflicts_by_severity = Counter(c.severity for c in project_conflicts)
        project_report_data = ComparisonReport(
            parameters=quality_params,
            comparison_summary=ComparisonReportSummary(
                total_frames=total_frames,
                frame_count=total_validated_frames,
                frames=None,  # project reports do not provide this info
                conflict_count=len(project_conflicts),
                warning_count=conflicts_by_severity.get(AnnotationConflictSeverity.WARNING, 0),
                error_count=conflicts_by_severity.get(AnnotationConflictSeverity.ERROR, 0),
                conflicts_by_type=Counter(c.type for c in project_conflicts),
                annotations=project_annotations_summary,
                annotation_components=project_ann_components_summary,
                tasks=task_stats,
                jobs=job_stats,
            ),
            frame_results=None,  # this is too detailed for a project report
        )

        return project_report_data

    def _save_report(
        self, project_report: models.QualityReport, child_reports: list[models.QualityReport]
    ) -> models.QualityReport:
        project_report.save()
        project_report.children.add(*child_reports)

        return project_report

    def get_quality_params(self, project: Project) -> ComparisonParameters:
        quality_settings = QualitySettingsManager().get_project_settings(project)
        return ComparisonParameters.from_settings(quality_settings, inherited=False)


def prepare_report_for_downloading(db_report: models.QualityReport, *, host: str) -> str:
    # Decorate the report for better usability and readability:
    # - add conflicting annotation links like:
    # <host>/tasks/62/jobs/82?frame=250&type=shape&serverID=33741
    # - convert some fractions to percents
    # - add common report info

    project_id = None
    task_id = None
    job_id = None
    jobs_to_tasks: dict[int, int] = {}
    if db_report.project:
        project_id = db_report.project.id

        jobs = Job.objects.filter(segment__task__project__id=project_id).all()
        jobs_to_tasks.update((j.id, j.segment.task.id) for j in jobs)
    elif db_report.task:
        project_id = getattr(db_report.task.project, "id", None)
        task_id = db_report.task.id

        jobs = Job.objects.filter(segment__task__id=task_id).all()
        jobs_to_tasks.update((j.id, task_id) for j in jobs)
    elif db_report.job:
        project_id = getattr(db_report.get_task().project, "id", None)
        task_id = db_report.get_task().id
        job_id = db_report.job.id

        jobs_to_tasks[db_report.job.id] = task_id
        jobs_to_tasks[db_report.get_task().gt_job.id] = task_id
    else:
        assert False

    # Add ids for the hierarchy objects, don't add empty ids
    def _serialize_assignee(assignee: User | None) -> dict | None:
        if not db_report.assignee:
            return None

        reported_keys = ["id", "username", "first_name", "last_name"]
        assert set(reported_keys).issubset(engine_serializers.BasicUserSerializer.Meta.fields)
        # check that only safe fields are reported

        return {k: getattr(assignee, k) for k in reported_keys}

    serialized_data = dict(
        id=db_report.id,
        **dict(job_id=db_report.job.id) if job_id else {},
        **dict(task_id=task_id) if task_id else {},
        **dict(project_id=project_id) if project_id else {},
        **dict(parent_id=db_report.parent.id) if db_report.parent else {},
        created_date=str(db_report.created_date),
        target_last_updated=str(db_report.target_last_updated),
        **dict(gt_last_updated=str(db_report.gt_last_updated)) if db_report.gt_last_updated else {},
        assignee=_serialize_assignee(db_report.assignee),
    )

    comparison_report = ComparisonReport.from_json(db_report.get_report_data())
    serialized_data.update(comparison_report.to_dict())

    if db_report.project:
        # project reports should not have per-frame statistics, it's too detailed for this level
        serialized_data["comparison_summary"].pop("frames")
        serialized_data.pop("frame_results")
    else:
        for frame_result in serialized_data["frame_results"].values():
            for conflict in frame_result["conflicts"]:
                for ann_id in conflict["annotation_ids"]:
                    task_id = jobs_to_tasks[ann_id["job_id"]]
                    ann_id["url"] = (
                        f"{host}tasks/{task_id}/jobs/{ann_id['job_id']}"
                        f"?frame={conflict['frame_id']}"
                        f"&type={ann_id['type']}"
                        f"&serverID={ann_id['obj_id']}"
                    )

        # String keys are needed for json dumping
        serialized_data["frame_results"] = {
            str(k): v for k, v in serialized_data["frame_results"].items()
        }

    if task_stats := serialized_data["comparison_summary"].get("tasks", {}):
        for k in ("all", "custom", "not_configured", "excluded"):
            task_stats[k] = sorted(task_stats[k])

    if job_stats := serialized_data["comparison_summary"].get("jobs", {}):
        for k in ("all", "excluded", "not_checkable"):
            job_stats[k] = sorted(job_stats[k])

    # Add the percent representation for better human readability
    serialized_data["comparison_summary"]["frame_share_percent"] = (
        serialized_data["comparison_summary"]["frame_share"] * 100
    )

    return dump_json(serialized_data, indent=True, append_newline=True).decode()
