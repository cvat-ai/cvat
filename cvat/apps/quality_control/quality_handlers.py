# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import itertools
import json
from abc import ABC, abstractmethod
from collections import Counter
from copy import deepcopy
from typing import TYPE_CHECKING, Any

import attrs
import datumaro as dm
import numpy as np

from cvat.apps.quality_control import models
from cvat.apps.quality_control.annotation_matching import Comparator, LineMatcher, MatchingResults
from cvat.apps.quality_control.attribute_comparators import match_attribute_values
from cvat.apps.quality_control.attribute_comparison import (
    CVAT_ATTRIBUTE_SPEC_IDS_ATTR,
    attribute_comparison_may_compare,
    make_default_attribute_rule,
    merge_attribute_comparison,
    normalize_attribute_comparison,
)
from cvat.apps.quality_control.comparison_report import (
    AnnotationConflict,
    AnnotationId,
    ComparisonParameters,
    ComparisonReport,
    ComparisonReportAnnotationsSummary,
    ComparisonReportFrameComparisonSummary,
    ComparisonReportFrameSummary,
    ComparisonReportParameters,
    ComparisonReportRequirementComparisonSummary,
    ComparisonReportRequirementsSummary,
    ComparisonReportRequirementSummary,
    ComparisonReportRequirementSummaryItem,
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
    summary: ComparisonReportFrameComparisonSummary
    matched_pairs: list[tuple[dm.Annotation, dm.Annotation]] = attrs.Factory(list)


@attrs.define
class MatchingContext:
    frame_id: int
    estimator: DatasetQualityEstimator
    categories: dm.Categories


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
            "compare_attributes": False,
            "attribute_comparison": normalize_attribute_comparison(None, fill_default=True),
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
            values[field_name] = merge_attribute_comparison(values.get(field_name), local_value)
        else:
            values[field_name] = local_value

    values["attribute_comparison"] = normalize_attribute_comparison(
        values.get("attribute_comparison"),
        fill_default=True,
    )
    values["compare_attributes"] = attribute_comparison_may_compare(values["attribute_comparison"])

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
        children_by_parent_id.setdefault(_requirement_parent_id(requirement), []).append(
            requirement
        )

    effective_requirements: list[EffectiveQualityRequirement] = []

    def dfs(
        requirement: Any, inherited: EffectiveQualityRequirement | None, path: set[int]
    ) -> None:
        requirement_id = getattr(requirement, "id", None)
        if requirement_id is not None:
            if requirement_id in path:
                raise ValueError("Requirement parent cycle is not allowed")
            path = {*path, requirement_id}

        effective = _make_effective_requirement(requirement, inherited)
        effective_requirements.append(effective)

        children = sorted(children_by_parent_id.get(requirement_id, []), key=_requirement_sort_key)

        for child in children:
            dfs(child, effective, path)

    roots = [
        requirement
        for requirement in requirements
        if _requirement_parent_id(requirement) not in requirements_by_id
    ]
    for root in sorted(roots, key=_requirement_sort_key):
        dfs(root, None, set())

    return effective_requirements


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
        "source_requirement_id": "requirement_id",
        "target_metric": "metric",
        "target_metric_threshold": "required_score",
        "oks_sigma": "point_size",
        "compare_line_orientation": "match_orientation",
        "compare_groups": "match_groups",
    }.items():
        if public_name not in params and internal_name in params:
            params[public_name] = params[internal_name]

        params.pop(internal_name, None)

    for field in (
        "id",
        "settings",
        "settings_id",
        "compare_attributes",
        "created_date",
        "updated_date",
    ):
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
    target: ComparisonReportFrameComparisonSummary,
    other: ComparisonReportFrameComparisonSummary,
) -> None:
    target.conflicts = deduplicate_annotation_conflicts([*target.conflicts, *other.conflicts])
    merge_annotations_summary(target.annotations, other.annotations)


def _get_requirement_metric(requirement: Any) -> str:
    metric = _get_requirement_field(
        requirement,
        "target_metric",
        "metric",
        default=models.QualityTargetMetricType.ACCURACY,
    )
    return str(metric or models.QualityTargetMetricType.ACCURACY)


def build_requirement_comparison_summary(
    *,
    requirement: Any,
    annotations: ComparisonReportAnnotationsSummary,
    conflicts: list[AnnotationConflict],
) -> ComparisonReportRequirementComparisonSummary:
    metric = _get_requirement_metric(requirement)
    if (
        _get_requirement_field(requirement, "enabled", default=True)
        and annotations.total_count == 0
    ):
        score = 1.0
    else:
        score = getattr(annotations, metric, None)

    return ComparisonReportRequirementComparisonSummary(
        conflict_count=len(conflicts),
        error_count=len(conflicts),
        conflicts_by_type=Counter(c.type for c in conflicts),
        score=float(score) if score is not None else None,
        score_components=annotations.to_score_components(),
        confusion_matrix=annotations.confusion_matrix,
    )


def build_requirement_report(
    *,
    requirement: Any,
    frame_results: dict[int, ComparisonReportFrameComparisonSummary],
    include_frame_results: bool = True,
) -> ComparisonReportRequirementSummary:
    conflicts: list[AnnotationConflict] = []
    annotations_summary = ComparisonReportAnnotationsSummary.create_empty()

    for frame_result in frame_results.values():
        conflicts += frame_result.conflicts
        merge_annotations_summary(annotations_summary, frame_result.annotations)

    conflicts = deduplicate_annotation_conflicts(conflicts)

    return ComparisonReportRequirementSummary(
        parameters=serialize_requirement_parameters(requirement),
        comparison_summary=build_requirement_comparison_summary(
            requirement=requirement,
            annotations=annotations_summary,
            conflicts=conflicts,
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

        metric = _get_requirement_metric(requirement)
        required_score = _get_requirement_field(
            requirement, "target_metric_threshold", "required_score", default=0
        )
        actual_score = group_report.comparison_summary.score
        items.append(
            ComparisonReportRequirementSummaryItem(
                name=group_name,
                metric=str(metric),
                score=actual_score,
                score_components=group_report.comparison_summary.score_components,
                threshold=float(required_score),
                requirement_id=_get_requirement_field(
                    requirement, "source_requirement_id", "requirement_id"
                ),
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

        attribute_comparison = getattr(self.requirement, "attribute_comparison", None)
        params.compare_attributes = attribute_comparison_may_compare(attribute_comparison)

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
            models.QualityRequirementAnnotationType.MASK: [dm.AnnotationType.mask],
            models.QualityRequirementAnnotationType.POLYGON: [dm.AnnotationType.polygon],
            models.QualityRequirementAnnotationType.ELLIPSE: [dm.AnnotationType.ellipse],
        }
        return mapping.get(self.requirement.annotation_type, [])

    def _make_empty_frame_summary(self) -> ComparisonReportFrameComparisonSummary:
        return ComparisonReportFrameComparisonSummary(
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
            conflicts=[],
        )

    def _empty_result(self) -> RequirementFrameResult:
        return RequirementFrameResult(summary=self._make_empty_frame_summary())

    def _match_attrs(self, ann_a: dm.Annotation, ann_b: dm.Annotation):
        attribute_comparison = normalize_attribute_comparison(
            getattr(self.requirement, "attribute_comparison", None),
            fill_default=True,
        )
        default_rule = make_default_attribute_rule(attribute_comparison)
        rules_by_spec_id = {
            int(rule["spec_id"]): {**default_rule, **rule}
            for rule in attribute_comparison.get("rules", [])
            if rule.get("spec_id") is not None
        }
        attrs_a = ann_a.attributes
        attrs_b = ann_b.attributes
        keys_to_match = (attrs_a.keys() | attrs_b.keys()).difference(self._comparator.ignored_attrs)
        spec_ids_a = attrs_a.get(CVAT_ATTRIBUTE_SPEC_IDS_ATTR, {}) or {}
        spec_ids_b = attrs_b.get(CVAT_ATTRIBUTE_SPEC_IDS_ATTR, {}) or {}

        matches = []
        mismatches = []
        a_extra = []
        b_extra = []
        notfound = object()

        for attr_name in keys_to_match:
            attr_spec_id = spec_ids_a.get(attr_name, spec_ids_b.get(attr_name))
            if attr_spec_id is not None and int(attr_spec_id) in rules_by_spec_id:
                rule = rules_by_spec_id[int(attr_spec_id)]
            else:
                rule = default_rule

            if rule.get("enabled") is False:
                continue

            attr_a = attrs_a.get(attr_name, notfound)
            attr_b = attrs_b.get(attr_name, notfound)
            if attr_a is notfound:
                b_extra.append(attr_name)
            elif attr_b is notfound:
                a_extra.append(attr_name)
            elif match_attribute_values(attr_a, attr_b, rule=rule):
                matches.append(attr_name)
            else:
                mismatches.append(attr_name)

        return matches, mismatches, a_extra, b_extra

    def _dm_ann_to_ann_id(self, ann: dm.Annotation, dataset: dm.Dataset) -> AnnotationId:
        """Convert Datumaro annotation to AnnotationId"""
        return self.context.estimator._dm_ann_to_ann_id(ann, dataset)

    def _dm_item_to_frame_id(self, item: dm.DatasetItem, dataset: dm.Dataset) -> int:
        """Convert Datumaro item to frame ID"""
        return self.context.estimator._dm_item_to_frame_id(item, dataset)

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
            severity=AnnotationConflictSeverity.ERROR,
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

    def _prepare_item_for_requirement(
        self, item: dm.DatasetItem, data_provider: JobDataProvider
    ) -> dm.DatasetItem:
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
                wrapped_element = element.wrap(attributes=element_attrs)
                data_provider.remember_dm_ann_alias(element, wrapped_element)
                flattened_annotations.append(wrapped_element)

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

        return RequirementFrameResult(
            summary=ComparisonReportFrameComparisonSummary(
                annotations=self._generate_frame_annotations_summary(
                    confusion_matrix, confusion_matrix_labels
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
        gt_item = self._prepare_item_for_requirement(gt_item, self._gt_data_provider)
        ds_item = self._prepare_item_for_requirement(ds_item, self._ds_data_provider)
        gt_item = self._filter.filter_item(gt_item)
        ds_item = self._filter.filter_item(ds_item)

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
            _,
            _,
            shape_pairwise_distances,
        ) = all_shape_types_result

        def _get_similarity(gt_ann: dm.Annotation, ds_ann: dm.Annotation) -> float | None:
            return self._comparator.get_distance(shape_pairwise_distances, gt_ann, ds_ann)

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
                _, mismatching_attributes, missing_attributes, extra_attributes = self._match_attrs(
                    gt_ann, ds_ann
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

        return RequirementFrameResult(
            summary=ComparisonReportFrameComparisonSummary(
                annotations=self._generate_frame_annotations_summary(
                    confusion_matrix, confusion_matrix_labels
                ),
                conflicts=conflicts,
            ),
            matched_pairs=list(itertools.chain(shape_matches, shape_mismatches)),
        )


class DatasetQualityEstimator:
    def __init__(
        self,
        ds_data_provider: JobDataProvider,
        gt_data_provider: JobDataProvider,
        *,
        requirements: list[models.QualityRequirement],
        parameters: ComparisonParameters,
    ) -> None:
        self._requirements = resolve_effective_requirements(requirements)
        self._parameters = parameters

        self._ds_data_provider = ds_data_provider
        self._gt_data_provider = gt_data_provider
        self._ds_dataset = self._ds_data_provider.dm_dataset
        self._gt_dataset = self._gt_data_provider.dm_dataset

        self._results: dict[str, dict[int, ComparisonReportFrameComparisonSummary]] = {}

    @staticmethod
    def _merge_annotations_summary(
        target: ComparisonReportAnnotationsSummary, other: ComparisonReportAnnotationsSummary
    ) -> None:
        merge_annotations_summary(target, other)

    @classmethod
    def _merge_frame_summaries(
        cls,
        target: ComparisonReportFrameComparisonSummary,
        other: ComparisonReportFrameComparisonSummary,
    ) -> None:
        merge_frame_summaries(target, other)

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

        for requirement in self._requirements:
            if not getattr(requirement, "enabled", True):
                continue

            handler = RequirementHandler.for_requirement(
                requirement,
                context=MatchingContext(
                    frame_id=frame_id,
                    estimator=self,
                    categories=self._gt_dataset.categories(),
                ),
            )

            result = handler.match_annotations(ds_item=ds_item, gt_item=gt_item)
            self._results.setdefault(requirement.name, {})[frame_id] = result.summary

    def _aggregate_all_results(
        self,
    ) -> tuple[
        dict[int, ComparisonReportFrameSummary],
        list[int],
        list[AnnotationConflict],
    ]:
        all_frame_results: dict[int, ComparisonReportFrameSummary] = {}
        intersection_frames = []
        conflicts: list[AnnotationConflict] = []

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
                    all_frame_results[frame_id] = ComparisonReportFrameSummary(
                        conflicts=deepcopy(frame_result.conflicts)
                    )
                    intersection_frames.append(frame_id)
                else:
                    all_frame_results[frame_id].conflicts = deduplicate_annotation_conflicts(
                        [*all_frame_results[frame_id].conflicts, *frame_result.conflicts]
                    )

        for frame_result in all_frame_results.values():
            conflicts += frame_result.conflicts

        conflicts = deduplicate_annotation_conflicts(conflicts)

        return (
            all_frame_results,
            intersection_frames,
            conflicts,
        )

    def generate_report(self) -> ComparisonReport:
        self._compare_datasets()

        (
            all_frame_results,
            intersection_frames,
            conflicts,
        ) = self._aggregate_all_results()

        group_reports = {
            requirement.name: build_requirement_report(
                requirement=requirement,
                frame_results=self._results.get(requirement.name, {}),
            )
            for requirement in self._requirements
        }
        requirement_stats = build_requirements_summary(self._requirements, group_reports)
        return ComparisonReport(
            parameters=ComparisonReportParameters.from_comparison_parameters(self._parameters),
            comparison_summary=ComparisonReportSummary(
                frames=intersection_frames,
                total_frames=self._get_total_frames(),
                conflict_count=len(conflicts),
                error_count=len(conflicts),
                conflicts_by_type=Counter(c.type for c in conflicts),
                tasks=None,
                jobs=None,
                requirements=requirement_stats,
            ),
            frame_results=all_frame_results,
            groups=group_reports,
        )
