# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import itertools
import json
from abc import ABC, abstractmethod
from collections import Counter
from collections.abc import Mapping
from copy import deepcopy
from typing import TYPE_CHECKING, Any

import attrs
import datumaro as dm
import numpy as np

from cvat.apps.quality_control import models
from cvat.apps.quality_control.annotation_matching import Comparator, LineMatcher, MatchingResults
from cvat.apps.quality_control.comparison_report import (
    AnnotationConflict,
    AnnotationId,
    ComparisonParameters,
    ComparisonReport,
    ComparisonReportAnnotationComponentsSummary,
    ComparisonReportAnnotationLabelSummary,
    ComparisonReportAnnotationShapeSummary,
    ComparisonReportAnnotationsSummary,
    ComparisonReportFrameSummary,
    ComparisonReportRequirementSummaryItem,
    ComparisonReportRequirementsSummary,
    ComparisonReportRequirementSummary,
    ComparisonReportSummary,
    ConfusionMatrix,
    deduplicate_annotation_conflicts,
)
from cvat.apps.quality_control.filters import RequirementJsonLogicFilter
from cvat.apps.quality_control.models import AnnotationConflictSeverity, AnnotationConflictType
from cvat.apps.quality_control.utils import array_safe_divide

if TYPE_CHECKING:
    from cvat.apps.quality_control.quality_reports import JobDataProvider


@attrs.define
class RequirementFrameResult:
    summary: ComparisonReportFrameSummary
    matched_pairs: list[tuple[dm.Annotation, dm.Annotation]] = attrs.Factory(list)


@attrs.define
class MatchingContext:
    frame_id: int
    estimator: DatasetQualityEstimator
    categories: dm.Categories
    annotation_requirements: dict[int, set]  # ann_id -> set of requirement names


@attrs.define(slots=False)
class EffectiveQualityRequirement:
    name: str
    enabled: bool
    filter: str
    annotation_type: str
    target_metric: str
    target_metric_threshold: float
    source_requirement_id: int | None = None
    parent_requirement: int | None = None
    sort_order: int = 0
    iou_threshold: float | None = None
    oks_sigma: float | None = None
    line_thickness: float | None = None
    low_overlap_threshold: float | None = None
    point_size_base: str | None = None
    compare_line_orientation: bool | None = None
    line_orientation_threshold: float | None = None
    compare_groups: bool | None = None
    group_match_threshold: float | None = None
    check_covered_annotations: bool | None = None
    object_visibility_threshold: float | None = None
    panoptic_comparison: bool | None = None
    compare_attributes: bool | None = None
    attribute_comparison: dict[str, Any] | None = None
    empty_is_annotated: bool | None = None
    _effective_requirement: bool = True


_INHERITED_REQUIREMENT_FIELDS = (
    "annotation_type",
    "target_metric",
    "target_metric_threshold",
    "iou_threshold",
    "oks_sigma",
    "line_thickness",
    "low_overlap_threshold",
    "point_size_base",
    "compare_line_orientation",
    "line_orientation_threshold",
    "compare_groups",
    "group_match_threshold",
    "check_covered_annotations",
    "object_visibility_threshold",
    "panoptic_comparison",
    "compare_attributes",
    "attribute_comparison",
    "empty_is_annotated",
)


def _combine_filters(parent_filter: str | None, child_filter: str | None) -> str:
    parent_filter = (parent_filter or "").strip()
    child_filter = (child_filter or "").strip()

    if not parent_filter:
        return child_filter

    if not child_filter:
        return parent_filter

    return json.dumps(
        {"and": [json.loads(parent_filter), json.loads(child_filter)]},
        separators=(",", ":"),
    )


def _merge_attribute_comparison(
    parent_value: dict[str, Any] | None, child_value: dict[str, Any] | None
) -> dict[str, Any] | None:
    if child_value is None:
        return deepcopy(parent_value)

    if parent_value is None:
        return deepcopy(child_value)

    merged = deepcopy(parent_value)
    for field_name in ("enabled", "default"):
        if field_name in child_value:
            merged[field_name] = deepcopy(child_value[field_name])

    parent_rules = {
        rule.get("name"): deepcopy(rule)
        for rule in (parent_value.get("rules") or [])
        if rule.get("name")
    }
    for rule in child_value.get("rules") or []:
        if rule.get("name"):
            parent_rules[rule["name"]] = deepcopy(rule)

    if parent_rules:
        merged["rules"] = list(parent_rules.values())

    return merged


def _requirement_sort_key(requirement: Any) -> tuple[int, int]:
    return (
        getattr(requirement, "sort_order", 0) or 0,
        getattr(requirement, "id", 0) or 0,
    )


def _requirement_parent_id(requirement: Any) -> int | None:
    parent_id = getattr(requirement, "parent_id", None)
    if parent_id is not None:
        return parent_id

    parent = getattr(requirement, "parent", None)
    return getattr(parent, "id", None)


def _make_effective_requirement(
    requirement: Any, inherited: EffectiveQualityRequirement | None
) -> EffectiveQualityRequirement:
    if inherited is None:
        defaults = models.QualityRequirement.get_defaults()
        values = {
            "annotation_type": models.QualityRequirementAnnotationType.RECTANGLE,
            "target_metric": models.QualityTargetMetricType.ACCURACY,
            "target_metric_threshold": 0.7,
            **defaults,
            "attribute_comparison": None,
        }
    else:
        values = {
            field_name: deepcopy(getattr(inherited, field_name))
            for field_name in _INHERITED_REQUIREMENT_FIELDS
        }

    for field_name in _INHERITED_REQUIREMENT_FIELDS:
        local_value = getattr(requirement, field_name, None)
        if local_value is None:
            continue

        if field_name == "attribute_comparison":
            values[field_name] = _merge_attribute_comparison(
                values.get(field_name), local_value
            )
        else:
            values[field_name] = local_value

    effective_filter = _combine_filters(
        getattr(inherited, "filter", "") if inherited else "",
        getattr(requirement, "filter", "") or "",
    )

    return EffectiveQualityRequirement(
        name=requirement.name,
        enabled=bool(getattr(requirement, "enabled", True)),
        filter=effective_filter,
        source_requirement_id=getattr(requirement, "id", None),
        parent_requirement=_requirement_parent_id(requirement),
        sort_order=getattr(requirement, "sort_order", 0) or 0,
        **values,
    )


def resolve_effective_requirement(requirement: Any) -> EffectiveQualityRequirement:
    if getattr(requirement, "_effective_requirement", False):
        return requirement

    chain = []
    current = requirement
    visited_ids = set()
    while current is not None:
        current_id = getattr(current, "id", None)
        if current_id is not None:
            if current_id in visited_ids:
                raise ValueError("Requirement parent cycle is not allowed")
            visited_ids.add(current_id)

        chain.append(current)
        current = getattr(current, "parent", None)

    effective = None
    for chain_requirement in reversed(chain):
        effective = _make_effective_requirement(chain_requirement, effective)

    assert effective is not None
    return effective


def resolve_effective_requirements(requirements: list[Any]) -> list[EffectiveQualityRequirement]:
    if all(getattr(requirement, "_effective_requirement", False) for requirement in requirements):
        return requirements

    requirements_by_id = {
        requirement.id: requirement
        for requirement in requirements
        if getattr(requirement, "id", None)
    }
    children_by_parent_id: dict[int | None, list[Any]] = {}
    for requirement in requirements:
        children_by_parent_id.setdefault(_requirement_parent_id(requirement), []).append(requirement)

    effective_leaves: list[EffectiveQualityRequirement] = []

    def dfs(
        requirement: Any, inherited: EffectiveQualityRequirement | None, path: set[int]
    ) -> None:
        requirement_id = getattr(requirement, "id", None)
        if requirement_id is not None:
            if requirement_id in path:
                raise ValueError("Requirement parent cycle is not allowed")
            path = {*path, requirement_id}

        effective = _make_effective_requirement(requirement, inherited)
        children = sorted(children_by_parent_id.get(requirement_id, []), key=_requirement_sort_key)
        if not children:
            effective_leaves.append(effective)
            return

        for child in children:
            dfs(child, effective, path)

    roots = [
        requirement
        for requirement in requirements
        if _requirement_parent_id(requirement) not in requirements_by_id
    ]
    for root in sorted(roots, key=_requirement_sort_key):
        dfs(root, None, set())

    return effective_leaves


def _get_requirement_field(requirement: Any, *names: str, default=None):
    if isinstance(requirement, dict):
        for name in names:
            if name in requirement:
                return requirement[name]
    else:
        for name in names:
            if hasattr(requirement, name):
                return getattr(requirement, name)

    return default


def serialize_requirement_parameters(requirement: Any) -> dict[str, Any]:
    if hasattr(requirement, "to_dict") and callable(requirement.to_dict):
        params = dict(requirement.to_dict())
    elif isinstance(requirement, dict):
        params = dict(requirement)
    else:
        params = {
            name: value for name, value in vars(requirement).items() if not name.startswith("_")
        }

    parent = params.pop("parent", None)
    if "parent_requirement" not in params:
        params["parent_requirement"] = getattr(parent, "id", parent)

    for internal_name, public_name in {
        "target_metric": "metric",
        "target_metric_threshold": "required_score",
        "oks_sigma": "point_size",
        "compare_line_orientation": "match_orientation",
        "compare_attributes": "match_attributes",
        "compare_groups": "match_groups",
    }.items():
        if public_name not in params and internal_name in params:
            params[public_name] = params[internal_name]

        params.pop(internal_name, None)

    for field in ("id", "settings", "settings_id", "created_date", "updated_date"):
        params.pop(field, None)

    return params


def merge_annotations_summary(
    target: ComparisonReportAnnotationsSummary, other: ComparisonReportAnnotationsSummary
) -> None:
    for field in (
        "valid_count",
        "missing_count",
        "extra_count",
        "total_count",
        "ds_count",
        "gt_count",
    ):
        setattr(target, field, getattr(target, field) + getattr(other, field))

    if target.confusion_matrix is None:
        target.confusion_matrix = (
            deepcopy(other.confusion_matrix) if other.confusion_matrix else None
        )
    elif (
        other.confusion_matrix
        and target.confusion_matrix.labels
        and other.confusion_matrix.labels
        and target.confusion_matrix.labels == other.confusion_matrix.labels
    ):
        target.confusion_matrix.accumulate(other.confusion_matrix)
    elif other.confusion_matrix and other.confusion_matrix.labels:
        target.confusion_matrix = None


def merge_frame_summaries(
    target: ComparisonReportFrameSummary,
    other: ComparisonReportFrameSummary,
    *,
    current_count: int,
) -> None:
    target.conflicts = deduplicate_annotation_conflicts([*target.conflicts, *other.conflicts])
    merge_annotations_summary(target.annotations, other.annotations)
    target.annotation_components.accumulate(other.annotation_components)
    target.annotation_components.shape.mean_iou = (
        target.annotation_components.shape.mean_iou * current_count
        + other.annotation_components.shape.mean_iou
    ) / (current_count + 1)


def build_requirement_report(
    *,
    requirement: Any,
    frame_results: dict[int, ComparisonReportFrameSummary],
    total_frames: int,
    include_frame_results: bool = True,
) -> ComparisonReportRequirementSummary:
    conflicts: list[AnnotationConflict] = []
    annotations_summary = ComparisonReportAnnotationsSummary.create_empty()
    annotation_components = ComparisonReportAnnotationComponentsSummary.create_empty()
    mean_ious = []

    for frame_result in frame_results.values():
        conflicts += frame_result.conflicts
        merge_annotations_summary(annotations_summary, frame_result.annotations)
        annotation_components.accumulate(frame_result.annotation_components)
        mean_ious.append(frame_result.annotation_components.shape.mean_iou)

    annotation_components.shape.mean_iou = np.mean(mean_ious) if mean_ious else 0
    conflicts = deduplicate_annotation_conflicts(conflicts)

    conflicts_by_severity = Counter(c.severity for c in conflicts)
    return ComparisonReportRequirementSummary(
        parameters=serialize_requirement_parameters(requirement),
        comparison_summary=ComparisonReportSummary(
            frames=sorted(frame_results),
            total_frames=total_frames,
            conflict_count=len(conflicts),
            warning_count=conflicts_by_severity.get(AnnotationConflictSeverity.WARNING, 0),
            error_count=conflicts_by_severity.get(AnnotationConflictSeverity.ERROR, 0),
            conflicts_by_type=Counter(c.type for c in conflicts),
            annotations=annotations_summary,
            annotation_components=annotation_components,
            tasks=None,
            jobs=None,
            requirements=None,
        ),
        frame_results=deepcopy(frame_results) if include_frame_results else None,
    )


def build_requirements_summary(
    requirements: list[Any],
    group_reports: dict[str, ComparisonReportRequirementSummary],
) -> ComparisonReportRequirementsSummary:
    enabled_requirements = [
        requirement
        for requirement in requirements
        if _get_requirement_field(requirement, "enabled", default=True)
    ]
    completed_count = 0
    items: list[ComparisonReportRequirementSummaryItem] = []

    for requirement in enabled_requirements:
        group_name = _get_requirement_field(requirement, "name")
        group_report = group_reports.get(group_name)
        if not group_report:
            continue

        metric = _get_requirement_field(requirement, "target_metric", "metric")
        required_score = _get_requirement_field(
            requirement, "target_metric_threshold", "required_score", default=0
        )
        actual_score = getattr(group_report.comparison_summary.annotations, metric, None)
        items.append(
            ComparisonReportRequirementSummaryItem(
                name=group_name,
                metric=str(metric),
                score=float(actual_score) if actual_score is not None else None,
                threshold=float(required_score),
            )
        )
        if actual_score is not None and required_score <= actual_score:
            completed_count += 1

    return ComparisonReportRequirementsSummary(
        total=len(requirements),
        enabled=len(enabled_requirements),
        completed=completed_count,
        items=items,
    )


class RequirementHandler(ABC):
    def __init__(self, *, requirement: models.QualityRequirement, context: MatchingContext):
        self.requirement = requirement
        self.context = context

        # Set up commonly used references from context
        self._ds_dataset = self.context.estimator._ds_dataset
        self._gt_dataset = self.context.estimator._gt_dataset
        self._ds_data_provider = self.context.estimator._ds_data_provider
        self._gt_data_provider = self.context.estimator._gt_data_provider

        # Create comparison parameters from requirement
        self.settings = self._create_comparison_parameters()

        # Create comparator with these settings
        self._comparator = Comparator(self.context.categories, settings=self.settings)
        self._filter = RequirementJsonLogicFilter(
            expression=getattr(self.requirement, "filter", "") or "",
            categories=self.context.categories,
            included_annotation_types=self.settings.included_annotation_types,
            annotation_requirements=self.context.annotation_requirements,
        )

    def _create_comparison_parameters(self) -> ComparisonParameters:
        """Create ComparisonParameters from requirement settings"""
        # Start with default parameters
        params = ComparisonParameters()

        # Map requirement fields to ComparisonParameters fields
        # TODO: Refactor it

        items = [
            "iou_threshold",
            "oks_sigma",
            "line_thickness",
            "low_overlap_threshold",
            "point_size_base",
            "compare_line_orientation",
            "line_orientation_threshold",
            "compare_attributes",
            "compare_groups",
            "group_match_threshold",
            "check_covered_annotations",
            "object_visibility_threshold",
            "panoptic_comparison",
            "empty_is_annotated",
        ]
        field_mapping = {i: i for i in items}  # direct mapping for all fields

        for req_field, param_field in field_mapping.items():
            if hasattr(self.requirement, req_field):
                value = getattr(self.requirement, req_field)
                if value is not None:
                    setattr(params, param_field, value)

        attribute_comparison = getattr(self.requirement, "attribute_comparison", None) or {}
        if "enabled" in attribute_comparison:
            params.compare_attributes = bool(attribute_comparison["enabled"])

        params.included_annotation_types = self._get_included_annotation_types()
        return params

    def _get_included_annotation_types(self) -> list[dm.AnnotationType]:
        mapping = {
            models.QualityRequirementAnnotationType.TAG: [dm.AnnotationType.label],
            models.QualityRequirementAnnotationType.RECTANGLE: [dm.AnnotationType.bbox],
            models.QualityRequirementAnnotationType.SKELETON: [dm.AnnotationType.skeleton],
            models.QualityRequirementAnnotationType.SKELETON_KEYPOINT: [dm.AnnotationType.points],
            models.QualityRequirementAnnotationType.POINTS: [dm.AnnotationType.points],
            models.QualityRequirementAnnotationType.POLYLINE: [dm.AnnotationType.polyline],
            # Masks and polygons are compared together by the comparator.
            models.QualityRequirementAnnotationType.MASK: [
                dm.AnnotationType.mask,
                dm.AnnotationType.polygon,
            ],
            models.QualityRequirementAnnotationType.POLYGON: [
                dm.AnnotationType.polygon,
                dm.AnnotationType.mask,
            ],
            models.QualityRequirementAnnotationType.ELLIPSE: [dm.AnnotationType.ellipse],
        }
        return mapping.get(self.requirement.annotation_type, [])

    def _make_empty_frame_summary(self) -> ComparisonReportFrameSummary:
        return ComparisonReportFrameSummary(
            annotations=ComparisonReportAnnotationsSummary(
                valid_count=0,
                missing_count=0,
                extra_count=0,
                total_count=0,
                ds_count=0,
                gt_count=0,
                confusion_matrix=ConfusionMatrix(
                    labels=[],
                    rows=np.zeros((0, 0), dtype=int),
                    precision=np.array([]),
                    recall=np.array([]),
                    accuracy=np.array([]),
                    jaccard_index=np.array([]),
                ),
            ),
            annotation_components=ComparisonReportAnnotationComponentsSummary(
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
            ),
            conflicts=[],
        )

    def _empty_result(self) -> RequirementFrameResult:
        return RequirementFrameResult(summary=self._make_empty_frame_summary())

    def _filter_unassigned_item(self, item: dm.DatasetItem) -> dm.DatasetItem:
        if not getattr(self.requirement, "enabled", True):
            return item

        assigned_annotation_ids = self.context.annotation_requirements
        filtered_annotations = [
            ann for ann in item.annotations if id(ann) not in assigned_annotation_ids
        ]

        if len(filtered_annotations) == len(item.annotations):
            return item

        return item.wrap(annotations=filtered_annotations)

    def _mark_item_annotations_assigned(self, item: dm.DatasetItem) -> None:
        if not getattr(self.requirement, "enabled", True):
            return

        requirement_name = getattr(self.requirement, "name", "")
        for ann in item.annotations:
            self.context.annotation_requirements.setdefault(id(ann), set()).add(requirement_name)

    @staticmethod
    def _levenshtein_similarity(left: Any, right: Any) -> float:
        left = str(left)
        right = str(right)

        if left == right:
            return 1.0

        if not left or not right:
            return 0.0

        previous_row = list(range(len(right) + 1))
        for left_index, left_char in enumerate(left, start=1):
            current_row = [left_index]
            for right_index, right_char in enumerate(right, start=1):
                insert_cost = current_row[right_index - 1] + 1
                delete_cost = previous_row[right_index] + 1
                replace_cost = previous_row[right_index - 1] + (left_char != right_char)
                current_row.append(min(insert_cost, delete_cost, replace_cost))
            previous_row = current_row

        distance = previous_row[-1]
        return 1 - distance / max(len(left), len(right))

    def _match_attrs(self, ann_a: dm.Annotation, ann_b: dm.Annotation):
        attribute_comparison = getattr(self.requirement, "attribute_comparison", None) or {}
        if not attribute_comparison:
            return self._comparator.match_attrs(ann_a, ann_b)

        if attribute_comparison.get("enabled") is False:
            return [], [], [], []

        default_rule = {
            "enabled": True,
            "comparator": "exact",
            **(attribute_comparison.get("default") or {}),
        }
        rules_by_name = {
            rule["name"]: {**default_rule, **rule}
            for rule in attribute_comparison.get("rules", [])
            if rule.get("name")
        }

        attrs_a = ann_a.attributes
        attrs_b = ann_b.attributes
        keys_to_match = (attrs_a.keys() | attrs_b.keys()).difference(
            self._comparator.ignored_attrs
        )

        matches = []
        mismatches = []
        a_extra = []
        b_extra = []
        notfound = object()

        for attr_name in keys_to_match:
            rule = rules_by_name.get(attr_name, default_rule)
            if rule.get("enabled") is False:
                continue

            attr_a = attrs_a.get(attr_name, notfound)
            attr_b = attrs_b.get(attr_name, notfound)
            if attr_a is notfound:
                b_extra.append(attr_name)
            elif attr_b is notfound:
                a_extra.append(attr_name)
            elif self._attribute_values_match(attr_a, attr_b, rule):
                matches.append(attr_name)
            else:
                mismatches.append(attr_name)

        return matches, mismatches, a_extra, b_extra

    def _attribute_values_match(self, left: Any, right: Any, rule: Mapping[str, Any]) -> bool:
        comparator = rule.get("comparator", "exact")
        if comparator == "levenshtein":
            return self._levenshtein_similarity(left, right) >= rule.get("threshold", 1.0)

        return left == right

    def _dm_ann_to_ann_id(self, ann: dm.Annotation, dataset: dm.Dataset) -> AnnotationId:
        """Convert Datumaro annotation to AnnotationId"""
        return self.context.estimator._dm_ann_to_ann_id(ann, dataset)

    def _dm_item_to_frame_id(self, item: dm.DatasetItem, dataset: dm.Dataset) -> int:
        """Convert Datumaro item to frame ID"""
        return self.context.estimator._dm_item_to_frame_id(item, dataset)

    def _get_conflict_severity(self) -> AnnotationConflictSeverity:
        return (
            AnnotationConflictSeverity.ERROR
            if getattr(self.requirement, "enabled", True)
            else AnnotationConflictSeverity.WARNING
        )

    def _make_conflict(
        self,
        *,
        frame_id: int,
        conflict_type: AnnotationConflictType,
        annotation_ids: list[AnnotationId],
        attribute_names: list[str] | None = None,
    ) -> AnnotationConflict:
        return AnnotationConflict(
            frame_id=frame_id,
            type=conflict_type,
            annotation_ids=annotation_ids,
            severity=self._get_conflict_severity(),
            attribute_names=sorted(set(attribute_names or [])),
        )

    @classmethod
    def for_requirement(
        cls, requirement: models.QualityRequirement, *, context: MatchingContext
    ) -> RequirementHandler:
        """Factory method to create appropriate handler based on requirement type"""
        from cvat.apps.quality_control.models import QualityRequirementAnnotationType

        ann_type = requirement.annotation_type

        # Map annotation types to handlers
        if ann_type == QualityRequirementAnnotationType.TAG:
            return TagRequirementHandler(requirement=requirement, context=context)
        else:
            # All shape types use ShapeRequirementHandler
            return ShapeRequirementHandler(requirement=requirement, context=context)

    @abstractmethod
    def match_annotations(
        self, *, ds_item: dm.DatasetItem, gt_item: dm.DatasetItem
    ) -> RequirementFrameResult:
        """Match annotations between dataset and ground truth items. Must be implemented in subclasses."""
        raise NotImplementedError("Subclasses must implement match_annotations()")

    # row/column index in the confusion matrix corresponding to unmatched annotations
    _UNMATCHED_IDX = -1

    def _make_zero_confusion_matrix(self) -> tuple[list[str], np.ndarray, dict[int, int]]:
        label_id_idx_map = {}
        label_names = []
        for label_id, label in enumerate(self._gt_dataset.categories()[dm.AnnotationType.label]):
            if (
                self.requirement.annotation_type
                == models.QualityRequirementAnnotationType.SKELETON_KEYPOINT
            ):
                if label.parent:
                    label_id_idx_map[label_id] = len(label_names)
                    label_names.append(f"{label.parent}.{label.name}")
            elif not label.parent:
                label_id_idx_map[label_id] = len(label_names)
                label_names.append(label.name)

        label_names.append("unmatched")

        num_labels = len(label_names)
        confusion_matrix = np.zeros((num_labels, num_labels), dtype=int)

        return label_names, confusion_matrix, label_id_idx_map

    def _prepare_item_for_requirement(self, item: dm.DatasetItem) -> dm.DatasetItem:
        if (
            self.requirement.annotation_type
            != models.QualityRequirementAnnotationType.SKELETON_KEYPOINT
        ):
            return item

        flattened_annotations: list[dm.Annotation] = []
        for ann in item.annotations:
            if ann.type != dm.AnnotationType.skeleton:
                continue

            parent_skeleton_context = self._filter.build_shape_context_for_annotation(ann)
            parent_attrs = dict(getattr(ann, "attributes", {}) or {})
            for element in ann.elements:
                element_attrs = dict(getattr(element, "attributes", {}) or {})
                if "source" not in element_attrs and "source" in parent_attrs:
                    element_attrs["source"] = parent_attrs["source"]
                if "track_id" not in element_attrs and "track_id" in parent_attrs:
                    element_attrs["track_id"] = parent_attrs["track_id"]
                if "keyframe" not in element_attrs and "keyframe" in parent_attrs:
                    element_attrs["keyframe"] = parent_attrs["keyframe"]

                visibility = list(getattr(element, "visibility", []) or [])
                if visibility:
                    element_visibility = visibility[0]
                    element_attrs.setdefault(
                        "outside", element_visibility == dm.Points.Visibility.absent
                    )
                    element_attrs.setdefault(
                        "occluded", element_visibility == dm.Points.Visibility.hidden
                    )

                element_attrs[RequirementJsonLogicFilter.PARENT_SKELETON_CONTEXT_KEY] = (
                    parent_skeleton_context
                )
                flattened_annotations.append(element.wrap(attributes=element_attrs))

        return item.wrap(annotations=flattened_annotations)

    def _compute_annotations_summary(
        self, confusion_matrix: np.ndarray, confusion_matrix_labels: list[str]
    ) -> ComparisonReportAnnotationsSummary:
        matched_ann_counts = np.diag(confusion_matrix)
        ds_ann_counts = np.sum(confusion_matrix, axis=1)
        gt_ann_counts = np.sum(confusion_matrix, axis=0)
        total_annotations_count = np.sum(confusion_matrix)

        label_jaccard_indices = array_safe_divide(
            matched_ann_counts, ds_ann_counts + gt_ann_counts - matched_ann_counts
        )
        label_precisions = array_safe_divide(matched_ann_counts, ds_ann_counts)
        label_recalls = array_safe_divide(matched_ann_counts, gt_ann_counts)
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
        annotation_components.shape.mean_iou = np.mean(mean_ious) if mean_ious else 0

        return annotation_summary, annotation_components


class TagRequirementHandler(RequirementHandler):
    def match_annotations(
        self,
        *,
        gt_item: dm.DatasetItem,
        ds_item: dm.DatasetItem,
    ) -> RequirementFrameResult:
        conflicts = []
        frame_id = self.context.frame_id
        gt_item = self._filter.filter_item(gt_item)
        ds_item = self._filter.filter_item(ds_item)
        gt_item = self._filter_unassigned_item(gt_item)
        ds_item = self._filter_unassigned_item(ds_item)
        self._mark_item_annotations_assigned(gt_item)
        self._mark_item_annotations_assigned(ds_item)

        # Call comparator to match annotations
        matching_results: MatchingResults = self._comparator.match_annotations(gt_item, ds_item)

        # Unpack results for all annotation types (tags are in here)
        all_ann_types_result = matching_results["all_ann_types"]
        matches, mismatches, gt_unmatched, ds_unmatched, _ = all_ann_types_result

        # Generate conflicts for mismatches
        for gt_ann, ds_ann in mismatches:
            if gt_ann is not None and ds_ann is not None:
                conflicts.append(
                    self._make_conflict(
                        frame_id=frame_id,
                        conflict_type=AnnotationConflictType.MISMATCHING_LABEL,
                        annotation_ids=[
                            self._dm_ann_to_ann_id(ds_ann, self._ds_dataset),
                            self._dm_ann_to_ann_id(gt_ann, self._gt_dataset),
                        ],
                    )
                )

        # Generate conflicts for unmatched GT annotations (missing)
        for unmatched_ann in gt_unmatched:
            conflicts.append(
                self._make_conflict(
                    frame_id=frame_id,
                    conflict_type=AnnotationConflictType.MISSING_ANNOTATION,
                    annotation_ids=[self._dm_ann_to_ann_id(unmatched_ann, self._gt_dataset)],
                )
            )

        # Generate conflicts for unmatched DS annotations (extra)
        for unmatched_ann in ds_unmatched:
            conflicts.append(
                self._make_conflict(
                    frame_id=frame_id,
                    conflict_type=AnnotationConflictType.EXTRA_ANNOTATION,
                    annotation_ids=[self._dm_ann_to_ann_id(unmatched_ann, self._ds_dataset)],
                )
            )

        # Build confusion matrix
        confusion_matrix_labels, confusion_matrix, label_id_map = self._make_zero_confusion_matrix()

        for gt_ann, ds_ann in itertools.chain(
            matches,
            mismatches,
            zip(itertools.repeat(None), ds_unmatched),
            zip(gt_unmatched, itertools.repeat(None)),
        ):
            ds_label_idx = label_id_map[ds_ann.label] if ds_ann else self._UNMATCHED_IDX
            gt_label_idx = label_id_map[gt_ann.label] if gt_ann else self._UNMATCHED_IDX
            confusion_matrix[ds_label_idx, gt_label_idx] += 1

        # Compute summary metrics
        valid_count = len(matches)
        missing_count = len(gt_unmatched)
        extra_count = len(ds_unmatched)
        total_count = valid_count + len(mismatches) + missing_count + extra_count

        return RequirementFrameResult(
            summary=ComparisonReportFrameSummary(
                annotations=self._generate_frame_annotations_summary(
                    confusion_matrix, confusion_matrix_labels
                ),
                annotation_components=ComparisonReportAnnotationComponentsSummary(
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
                        valid_count=valid_count,
                        invalid_count=len(mismatches),
                        total_count=total_count,
                    ),
                ),
                conflicts=conflicts,
            ),
            matched_pairs=list(itertools.chain(matches, mismatches)),
        )


class ShapeRequirementHandler(RequirementHandler):
    def match_annotations(
        self,
        *,
        gt_item: dm.DatasetItem,
        ds_item: dm.DatasetItem,
    ) -> RequirementFrameResult:
        conflicts = []
        frame_id = self.context.frame_id
        gt_item = self._prepare_item_for_requirement(gt_item)
        ds_item = self._prepare_item_for_requirement(ds_item)
        gt_item = self._filter.filter_item(gt_item)
        ds_item = self._filter.filter_item(ds_item)
        gt_item = self._filter_unassigned_item(gt_item)
        ds_item = self._filter_unassigned_item(ds_item)
        self._mark_item_annotations_assigned(gt_item)
        self._mark_item_annotations_assigned(ds_item)

        # Call comparator to match annotations
        matching_results: MatchingResults = self._comparator.match_annotations(gt_item, ds_item)

        # Unpack results for all annotation types
        all_ann_types_result = matching_results["all_ann_types"]
        matches, mismatches, gt_unmatched, ds_unmatched, _ = all_ann_types_result

        # Unpack results for shape annotation types
        all_shape_types_result = matching_results["all_shape_ann_types"]
        (
            shape_matches,
            shape_mismatches,
            shape_gt_unmatched,
            shape_ds_unmatched,
            shape_pairwise_distances,
        ) = all_shape_types_result

        def _get_similarity(gt_ann: dm.Annotation, ds_ann: dm.Annotation) -> float | None:
            return self._comparator.get_distance(shape_pairwise_distances, gt_ann, ds_ann)

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
                    self._make_conflict(
                        frame_id=frame_id,
                        conflict_type=AnnotationConflictType.LOW_OVERLAP,
                        annotation_ids=[
                            self._dm_ann_to_ann_id(ds_ann, self._ds_dataset),
                            self._dm_ann_to_ann_id(gt_ann, self._gt_dataset),
                        ],
                    )
                )

        for unmatched_ann in gt_unmatched:
            conflicts.append(
                self._make_conflict(
                    frame_id=frame_id,
                    conflict_type=AnnotationConflictType.MISSING_ANNOTATION,
                    annotation_ids=[self._dm_ann_to_ann_id(unmatched_ann, self._gt_dataset)],
                )
            )

        for unmatched_ann in ds_unmatched:
            conflicts.append(
                self._make_conflict(
                    frame_id=frame_id,
                    conflict_type=AnnotationConflictType.EXTRA_ANNOTATION,
                    annotation_ids=[self._dm_ann_to_ann_id(unmatched_ann, self._ds_dataset)],
                )
            )

        for gt_ann, ds_ann in mismatches:
            conflicts.append(
                self._make_conflict(
                    frame_id=frame_id,
                    conflict_type=AnnotationConflictType.MISMATCHING_LABEL,
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
            and dm.AnnotationType.polyline in self._comparator.included_ann_types
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
                        self._make_conflict(
                            frame_id=frame_id,
                            conflict_type=AnnotationConflictType.MISMATCHING_DIRECTION,
                            annotation_ids=[
                                self._dm_ann_to_ann_id(ds_ann, self._ds_dataset),
                                self._dm_ann_to_ann_id(gt_ann, self._gt_dataset),
                            ],
                        )
                    )

        if self.settings.check_covered_annotations:
            ds_covered_anns = self._comparator.find_covered(ds_item)

            for ds_ann in ds_covered_anns:
                conflicts.append(
                    self._make_conflict(
                        frame_id=frame_id,
                        conflict_type=AnnotationConflictType.COVERED_ANNOTATION,
                        annotation_ids=[
                            self._dm_ann_to_ann_id(ds_ann, self._ds_dataset),
                        ],
                    )
                )

        if self.settings.compare_attributes:
            for gt_ann, ds_ann in matches:
                _, mismatching_attributes, missing_attributes, extra_attributes = (
                    self._match_attrs(gt_ann, ds_ann)
                )
                conflicting_attribute_names = [
                    *mismatching_attributes,
                    *missing_attributes,
                    *extra_attributes,
                ]
                if conflicting_attribute_names:
                    conflicts.append(
                        self._make_conflict(
                            frame_id=frame_id,
                            conflict_type=AnnotationConflictType.MISMATCHING_ATTRIBUTES,
                            annotation_ids=[
                                self._dm_ann_to_ann_id(ds_ann, self._ds_dataset),
                                self._dm_ann_to_ann_id(gt_ann, self._gt_dataset),
                            ],
                            attribute_names=conflicting_attribute_names,
                        )
                    )

        if self.settings.compare_groups:
            gt_groups, gt_group_map = self._comparator.find_groups(gt_item)
            ds_groups, ds_group_map = self._comparator.find_groups(ds_item)
            shape_matched_objects = shape_matches + shape_mismatches
            ds_to_gt_groups = self._comparator.match_groups(
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
                        self._make_conflict(
                            frame_id=frame_id,
                            conflict_type=AnnotationConflictType.MISMATCHING_GROUPS,
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

        return RequirementFrameResult(
            summary=ComparisonReportFrameSummary(
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
            ),
            matched_pairs=list(itertools.chain(shape_matches, shape_mismatches)),
        )

class DatasetQualityEstimator:
    DEFAULT_SETTINGS = ComparisonParameters()

    def __init__(
        self,
        ds_data_provider: JobDataProvider,
        gt_data_provider: JobDataProvider,
        *,
        requirements: list[models.QualityRequirement],
    ) -> None:
        self._requirements = resolve_effective_requirements(requirements)

        self._ds_data_provider = ds_data_provider
        self._gt_data_provider = gt_data_provider
        self._ds_dataset = self._ds_data_provider.dm_dataset
        self._gt_dataset = self._gt_data_provider.dm_dataset

        self._results: dict[str, dict[int, ComparisonReportFrameSummary]] = {}

    @staticmethod
    def _merge_annotations_summary(
        target: ComparisonReportAnnotationsSummary, other: ComparisonReportAnnotationsSummary
    ) -> None:
        merge_annotations_summary(target, other)

    @classmethod
    def _merge_frame_summaries(
        cls,
        target: ComparisonReportFrameSummary,
        other: ComparisonReportFrameSummary,
        *,
        current_count: int,
    ) -> None:
        merge_frame_summaries(target, other, current_count=current_count)

    def _dm_item_to_frame_id(self, item: dm.DatasetItem, dataset: dm.Dataset) -> int:
        if dataset is self._ds_dataset:
            source_data_provider = self._ds_data_provider
        elif dataset is self._gt_dataset:
            source_data_provider = self._gt_data_provider
        else:
            assert False

        return source_data_provider.dm_item_id_to_frame_id(item)

    def _dm_ann_to_ann_id(self, ann: dm.Annotation, dataset: dm.Dataset) -> AnnotationId:
        if dataset is self._ds_dataset:
            source_data_provider = self._ds_data_provider
        elif dataset is self._gt_dataset:
            source_data_provider = self._gt_data_provider
        else:
            assert False

        return source_data_provider.dm_ann_to_ann_id(ann)

    def _get_total_frames(self) -> int:
        return len(self._ds_data_provider.job_data)

    def _compute_summary_from_confusion_matrix(
        self, confusion_matrix: np.ndarray, confusion_matrix_labels: list[str]
    ) -> ComparisonReportAnnotationsSummary:
        unmatched_idx = -1

        matched_ann_counts = np.diag(confusion_matrix)
        ds_ann_counts = np.sum(confusion_matrix, axis=1)
        gt_ann_counts = np.sum(confusion_matrix, axis=0)
        total_annotations_count = np.sum(confusion_matrix)

        label_jaccard_indices = array_safe_divide(
            matched_ann_counts, ds_ann_counts + gt_ann_counts - matched_ann_counts
        )
        label_precisions = array_safe_divide(matched_ann_counts, ds_ann_counts)
        label_recalls = array_safe_divide(matched_ann_counts, gt_ann_counts)
        label_accuracies = (
            total_annotations_count
            - (ds_ann_counts - matched_ann_counts)
            - (gt_ann_counts - matched_ann_counts)
        ) / (total_annotations_count or 1)

        valid_annotations_count = np.sum(matched_ann_counts)
        missing_annotations_count = np.sum(confusion_matrix[unmatched_idx, :])
        extra_annotations_count = np.sum(confusion_matrix[:, unmatched_idx])
        ds_annotations_count = np.sum(ds_ann_counts[:unmatched_idx])
        gt_annotations_count = np.sum(gt_ann_counts[:unmatched_idx])

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

    def _compare_datasets(self):
        ds_job_dataset = self._ds_dataset
        gt_job_dataset = self._gt_dataset

        for gt_item in gt_job_dataset:
            ds_item = ds_job_dataset.get(id=gt_item.id, subset=gt_item.subset)
            if not ds_item:
                continue

            self._compare_samples(ds_item, gt_item)

    def _compare_samples(self, ds_item: dm.DatasetItem, gt_item: dm.DatasetItem):
        frame_id = self._dm_item_to_frame_id(ds_item, self._ds_dataset)

        if not self._requirements:
            return

        per_requirement_results = {}
        annotation_requirements: dict[int, set] = {}

        for requirement in self._requirements:
            handler = RequirementHandler.for_requirement(
                requirement,
                context=MatchingContext(
                    frame_id=frame_id,
                    estimator=self,
                    categories=self._gt_dataset.categories(),
                    annotation_requirements=annotation_requirements,
                ),
            )

            result = handler.match_annotations(ds_item=ds_item, gt_item=gt_item)
            per_requirement_results[requirement.name] = result
            self._results.setdefault(requirement.name, {})[frame_id] = result.summary

    def _aggregate_all_results(
        self,
    ) -> tuple[
        dict[int, ComparisonReportFrameSummary],
        list[int],
        list[AnnotationConflict],
        ComparisonReportAnnotationsSummary,
        ComparisonReportAnnotationComponentsSummary,
    ]:
        all_frame_results: dict[int, ComparisonReportFrameSummary] = {}
        frame_result_counts: dict[int, int] = {}
        intersection_frames = []
        conflicts: list[AnnotationConflict] = []

        total_annotations_summary = ComparisonReportAnnotationsSummary.create_empty()
        total_annotation_components = ComparisonReportAnnotationComponentsSummary.create_empty()
        mean_ious = []

        enabled_requirement_names = {
            requirement.name
            for requirement in self._requirements
            if getattr(requirement, "enabled", True)
        }

        for requirement_name, requirement_metrics in self._results.items():
            if requirement_name not in enabled_requirement_names:
                continue

            for frame_id, frame_result in requirement_metrics.items():
                if frame_id not in all_frame_results:
                    all_frame_results[frame_id] = deepcopy(frame_result)
                    frame_result_counts[frame_id] = 1
                    intersection_frames.append(frame_id)
                else:
                    self._merge_frame_summaries(
                        all_frame_results[frame_id],
                        frame_result,
                        current_count=frame_result_counts[frame_id],
                    )
                    frame_result_counts[frame_id] += 1

        for frame_result in all_frame_results.values():
            conflicts += frame_result.conflicts
            self._merge_annotations_summary(total_annotations_summary, frame_result.annotations)
            total_annotation_components.accumulate(frame_result.annotation_components)
            mean_ious.append(frame_result.annotation_components.shape.mean_iou)

        total_annotation_components.shape.mean_iou = np.mean(mean_ious) if mean_ious else 0
        conflicts = deduplicate_annotation_conflicts(conflicts)

        return (
            all_frame_results,
            intersection_frames,
            conflicts,
            total_annotations_summary,
            total_annotation_components,
        )

    def generate_report(self) -> ComparisonReport:
        self._compare_datasets()

        (
            all_frame_results,
            intersection_frames,
            conflicts,
            total_annotations_summary,
            total_annotation_components,
        ) = self._aggregate_all_results()

        group_reports = {
            requirement.name: build_requirement_report(
                requirement=requirement,
                frame_results=self._results.get(requirement.name, {}),
                total_frames=self._get_total_frames(),
            )
            for requirement in self._requirements
        }
        requirement_stats = build_requirements_summary(self._requirements, group_reports)
        conflicts_by_severity = Counter(c.severity for c in conflicts)
        return ComparisonReport(
            parameters=self.DEFAULT_SETTINGS,
            comparison_summary=ComparisonReportSummary(
                frames=intersection_frames,
                total_frames=self._get_total_frames(),
                conflict_count=len(conflicts),
                warning_count=conflicts_by_severity.get(AnnotationConflictSeverity.WARNING, 0),
                error_count=conflicts_by_severity.get(AnnotationConflictSeverity.ERROR, 0),
                conflicts_by_type=Counter(c.type for c in conflicts),
                annotations=total_annotations_summary,
                annotation_components=total_annotation_components,
                tasks=None,
                jobs=None,
                requirements=requirement_stats,
            ),
            frame_results=all_frame_results,
            groups=group_reports,
        )
