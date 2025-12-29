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
from attrs import asdict, define, fields_dict
from datumaro.util import dump_json, parse_json

from cvat.apps.engine.models import ShapeType
from cvat.apps.quality_control import models
from cvat.apps.quality_control.models import (
    AnnotationConflictSeverity,
    AnnotationConflictType,
    AnnotationType,
)
from cvat.apps.quality_control.utils import array_safe_divide


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
