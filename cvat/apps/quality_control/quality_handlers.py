# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import itertools
import json
from abc import ABC, abstractmethod
from collections import Counter
from collections.abc import Sequence
from copy import deepcopy
from typing import TYPE_CHECKING, Any, cast

import attrs
import datumaro as dm
import numpy as np

from cvat.apps.engine.models import LabelType
from cvat.apps.quality_control import models
from cvat.apps.quality_control.annotation_matching import (
    AttributeMatchingResult,
    Comparator,
    MatchingResults,
)
from cvat.apps.quality_control.attribute_comparators import (
    AttributeComparisonRule,
    match_attribute_values,
)
from cvat.apps.quality_control.attribute_comparison import (
    CVAT_ATTRIBUTE_SPEC_IDS_ATTR,
    attribute_comparison_may_compare,
    make_default_attribute_rule,
    merge_attribute_comparison,
    normalize_attribute_comparison,
)
from cvat.apps.quality_control.comparison_report import (
    UNMATCHED_LABEL_NAME,
    AnnotationConflict,
    AnnotationId,
    ComparisonParameters,
    ComparisonReport,
    ComparisonReportAnnotationsSummary,
    ComparisonReportFrameComparisonSummary,
    ComparisonReportParameters,
    ComparisonReportRequirementCalculation,
    ComparisonReportRequirementCalculationSide,
    ComparisonReportRequirementComparisonSummary,
    ComparisonReportRequirementsSummary,
    ComparisonReportRequirementSummary,
    ComparisonReportRequirementSummaryItem,
    ComparisonReportSummary,
    ConfusionMatrix,
    RequirementCalculationReason,
    RequirementCalculationStatus,
    deduplicate_annotation_conflicts,
)
from cvat.apps.quality_control.filters import RequirementJsonLogicFilter
from cvat.apps.quality_control.models import AnnotationConflictSeverity, AnnotationConflictType

if TYPE_CHECKING:
    from cvat.apps.quality_control.data_providers import JobDataProvider


@attrs.define
class RequirementFrameResult:
    summary: ComparisonReportFrameComparisonSummary
    calculation: ComparisonReportRequirementCalculation
    matched_pairs: list[tuple[dm.Annotation, dm.Annotation]] = attrs.Factory(list)


@attrs.define
class MatchingContext:
    frame_id: int
    estimator: DatasetQualityEstimator
    categories: dm.CategoriesInfo


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
    "attribute_comparison",
)

_REQUIRED_ROOT_REQUIREMENT_FIELDS = tuple(
    field_name
    for field_name in _INHERITED_REQUIREMENT_FIELDS
    if field_name != "attribute_comparison"
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


def _requirement_sort_key(requirement: models.QualityRequirement) -> tuple[int, int]:
    return (
        requirement.sort_order or 0,
        requirement.id or 0,
    )


def _make_effective_requirement(
    requirement: models.QualityRequirement,
    inherited: EffectiveQualityRequirement | None,
) -> EffectiveQualityRequirement:
    if inherited is None:
        if requirement.parent_id is not None:
            raise ValueError("Parent effective requirement is required")

        values = {
            field_name: deepcopy(getattr(requirement, field_name))
            for field_name in _INHERITED_REQUIREMENT_FIELDS
        }

        missing_fields = [
            field_name
            for field_name in _REQUIRED_ROOT_REQUIREMENT_FIELDS
            if values[field_name] is None
        ]
        if missing_fields:
            raise ValueError(
                "Root quality requirement must define inherited fields: "
                + ", ".join(missing_fields)
            )
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
        inherited.filter if inherited else "",
        requirement.filter or "",
    )

    return EffectiveQualityRequirement(
        name=requirement.name,
        enabled=requirement.enabled,
        filter=effective_filter,
        source_requirement_id=requirement.id,
        parent_requirement=requirement.parent_id,
        sort_order=requirement.sort_order or 0,
        **values,
    )


def resolve_effective_requirement(
    requirement: models.QualityRequirement | EffectiveQualityRequirement,
) -> EffectiveQualityRequirement:
    if isinstance(requirement, EffectiveQualityRequirement):
        return requirement

    chain: list[models.QualityRequirement] = []
    current = requirement
    visited_ids: set[int] = set()
    while current is not None:
        current_id = current.id
        if current_id is not None:
            if current_id in visited_ids:
                raise ValueError("Requirement parent cycle is not allowed")
            visited_ids.add(current_id)

        chain.append(current)
        current = current.parent

    effective: EffectiveQualityRequirement | None = None
    for chain_requirement in reversed(chain):
        effective = _make_effective_requirement(chain_requirement, effective)

    assert effective is not None
    return effective


def resolve_effective_requirements(
    requirements: Sequence[models.QualityRequirement] | Sequence[EffectiveQualityRequirement],
) -> list[EffectiveQualityRequirement]:
    if all(isinstance(requirement, EffectiveQualityRequirement) for requirement in requirements):
        return list(cast(Sequence[EffectiveQualityRequirement], requirements))

    db_requirements = cast(Sequence[models.QualityRequirement], requirements)

    requirements_by_id = {
        requirement.id: requirement for requirement in db_requirements if requirement.id is not None
    }
    missing_parent_ids = {
        requirement.parent_id
        for requirement in db_requirements
        if requirement.parent_id is not None and requirement.parent_id not in requirements_by_id
    }
    if missing_parent_ids:
        raise ValueError(
            f"Parent quality requirements must be included: {sorted(missing_parent_ids)}"
        )

    children_by_parent_id: dict[int | None, list[models.QualityRequirement]] = {}
    for requirement in db_requirements:
        children_by_parent_id.setdefault(requirement.parent_id, []).append(requirement)

    effective_requirements: list[EffectiveQualityRequirement] = []

    def dfs(
        requirement: models.QualityRequirement,
        inherited: EffectiveQualityRequirement | None,
        visited: set[int],
    ) -> None:
        requirement_id = requirement.id
        if requirement_id is not None:
            if requirement_id in visited:
                raise ValueError("Requirement parent cycle is not allowed")
            visited = {*visited, requirement_id}

        effective = _make_effective_requirement(requirement, inherited)
        effective_requirements.append(effective)

        children = sorted(children_by_parent_id.get(requirement_id, []), key=_requirement_sort_key)

        for child in children:
            dfs(child, effective, visited)

    roots = [requirement for requirement in db_requirements if requirement.parent_id is None]
    for root in sorted(roots, key=_requirement_sort_key):
        dfs(root, None, set())

    if len(effective_requirements) != len(db_requirements):
        raise ValueError("Requirement parent cycle is not allowed")

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
    target.accumulate(other)


def merge_frame_summaries(
    target: ComparisonReportFrameComparisonSummary,
    other: ComparisonReportFrameComparisonSummary,
) -> None:
    target.conflicts = deduplicate_annotation_conflicts([*target.conflicts, *other.conflicts])
    merge_annotations_summary(target.annotation_summary, other.annotation_summary)
    target.calculation = select_requirement_calculation(target.calculation, other.calculation)
    target.refresh_comparison_fields()


def _make_requirement_calculation(
    *,
    annotations: ComparisonReportRequirementCalculationSide,
    ground_truth: ComparisonReportRequirementCalculationSide,
) -> ComparisonReportRequirementCalculation:
    common_missing_attributes = set(annotations.missing_attributes) & set(
        ground_truth.missing_attributes
    )
    if not annotations.candidate_count and not ground_truth.candidate_count:
        status = RequirementCalculationStatus.NOT_COMPUTED
        reason = RequirementCalculationReason.NO_ANNOTATIONS
    elif not annotations.selected_count and not ground_truth.selected_count:
        status = RequirementCalculationStatus.NOT_COMPUTED
        reason = (
            RequirementCalculationReason.REQUIRED_ATTRIBUTES_MISSING
            if common_missing_attributes
            else RequirementCalculationReason.FILTER_NO_MATCHES
        )
    elif annotations.selected_count and ground_truth.selected_count and common_missing_attributes:
        status = RequirementCalculationStatus.NOT_COMPUTED
        reason = RequirementCalculationReason.REQUIRED_ATTRIBUTES_MISSING
    else:
        status = RequirementCalculationStatus.COMPUTED
        reason = None

    return (
        ComparisonReportRequirementCalculation.create_computed()
        if status == RequirementCalculationStatus.COMPUTED
        else ComparisonReportRequirementCalculation(
            status=status,
            reason=reason,
            annotations=annotations,
            ground_truth=ground_truth,
        )
    )


def select_requirement_calculation(
    current: ComparisonReportRequirementCalculation | None,
    candidate: ComparisonReportRequirementCalculation,
) -> ComparisonReportRequirementCalculation:
    if current is None:
        return candidate

    priority = {
        RequirementCalculationReason.NO_ANNOTATIONS: 0,
        RequirementCalculationReason.FILTER_NO_MATCHES: 1,
        RequirementCalculationReason.REQUIRED_ATTRIBUTES_MISSING: 2,
        None: 3,
    }
    return candidate if priority[candidate.reason] > priority[current.reason] else current


def make_empty_requirement_calculation() -> ComparisonReportRequirementCalculation:
    return _make_requirement_calculation(
        annotations=ComparisonReportRequirementCalculationSide.create_empty(),
        ground_truth=ComparisonReportRequirementCalculationSide.create_empty(),
    )


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
    calculation: ComparisonReportRequirementCalculation | None = None,
) -> ComparisonReportRequirementComparisonSummary:
    metric = _get_requirement_metric(requirement)
    if not _get_requirement_field(requirement, "enabled", default=True):
        calculation = ComparisonReportRequirementCalculation.create_computed()
    elif calculation is None:
        calculation = (
            ComparisonReportRequirementCalculation.create_computed()
            if annotations.total_count
            else make_empty_requirement_calculation()
        )

    score = (
        None
        if calculation.status == RequirementCalculationStatus.NOT_COMPUTED
        else getattr(annotations, metric, None)
    )

    return ComparisonReportRequirementComparisonSummary(
        conflict_count=len(conflicts),
        error_count=len(conflicts),
        conflicts_by_type=Counter(c.type for c in conflicts),
        score=float(score) if score is not None else None,
        score_components=annotations.to_score_components(),
        calculation=calculation,
        confusion_matrix=annotations.confusion_matrix,
    )


def build_requirement_report(
    *,
    requirement: Any,
    frame_results: dict[int, ComparisonReportFrameComparisonSummary],
    calculation: ComparisonReportRequirementCalculation | None = None,
    include_frame_results: bool = True,
) -> ComparisonReportRequirementSummary:
    conflicts: list[AnnotationConflict] = []
    annotations_summary = ComparisonReportAnnotationsSummary.create_empty()

    for frame_result in frame_results.values():
        conflicts += frame_result.conflicts
        merge_annotations_summary(annotations_summary, frame_result.annotation_summary)

    conflicts = deduplicate_annotation_conflicts(conflicts)

    return ComparisonReportRequirementSummary(
        parameters=serialize_requirement_parameters(requirement),
        comparison_summary=build_requirement_comparison_summary(
            requirement=requirement,
            annotations=annotations_summary,
            conflicts=conflicts,
            calculation=calculation,
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
    not_computed_count = 0
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
        calculation = group_report.comparison_summary.calculation
        items.append(
            ComparisonReportRequirementSummaryItem(
                name=group_name,
                metric=str(metric),
                score=actual_score,
                score_components=group_report.comparison_summary.score_components,
                calculation=calculation.without_details(),
                threshold=float(required_score),
                requirement_id=_get_requirement_field(
                    requirement, "source_requirement_id", "requirement_id"
                ),
            )
        )
        if calculation.status == RequirementCalculationStatus.NOT_COMPUTED:
            # An empty selection on both sides is a vacuous success, but it has no metric value.
            not_computed_count += 1
            completed_count += 1
        elif actual_score is not None and required_score <= actual_score:
            completed_count += 1

    return ComparisonReportRequirementsSummary(
        total_count=len(requirements),
        enabled_count=len(enabled_requirements),
        completed_count=completed_count,
        not_computed_count=not_computed_count,
        items=items,
    )


class RequirementHandler(ABC):
    def __init__(self, *, requirement: EffectiveQualityRequirement, context: MatchingContext):
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
        self._comparator = Comparator(
            self.context.categories,
            settings=self.settings,
            attribute_matcher=self._match_attrs,
        )
        self._filter = RequirementJsonLogicFilter(
            expression=self.requirement.filter,
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
        ]
        field_mapping = {i: i for i in items}  # direct mapping for all fields

        for req_field, param_field in field_mapping.items():
            value = getattr(self.requirement, req_field)
            if value is not None:
                setattr(params, param_field, value)

        attribute_comparison = self.requirement.attribute_comparison
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

    def _get_explicit_comparison_attribute_names(
        self,
        annotations: list[dm.Annotation],
    ) -> set[str]:
        attribute_comparison = normalize_attribute_comparison(
            self.requirement.attribute_comparison,
            fill_default=True,
        )
        default_rule = make_default_attribute_rule(attribute_comparison)
        required_spec_ids = {
            int(rule["spec_id"])
            for rule in attribute_comparison.get("rules", [])
            if rule.get("spec_id") is not None
            and AttributeComparisonRule.from_mapping(
                rule,
                defaults=default_rule,
            ).enabled
        }
        if not required_spec_ids:
            return set()

        names_by_spec_id: dict[int, str] = {}
        for annotation in annotations:
            spec_ids = annotation.attributes.get(CVAT_ATTRIBUTE_SPEC_IDS_ATTR, {}) or {}
            names_by_spec_id.update(
                (int(spec_id), name)
                for name, spec_id in spec_ids.items()
                if int(spec_id) in required_spec_ids
            )

        return {names_by_spec_id.get(spec_id, f"#{spec_id}") for spec_id in required_spec_ids}

    @staticmethod
    def _get_available_attribute_names(
        annotations: list[dm.Annotation],
    ) -> set[str]:
        return {
            name
            for annotation in annotations
            for name in (annotation.attributes or {})
            if not name.startswith("__")
        }

    def _make_calculation_side(
        self,
        *,
        candidates: list[dm.Annotation],
        selected: list[dm.Annotation],
        required_comparison_attributes: set[str],
    ) -> ComparisonReportRequirementCalculationSide:
        selected_attributes = self._get_available_attribute_names(selected)
        missing_attributes = (
            required_comparison_attributes - selected_attributes if selected else set()
        )

        return ComparisonReportRequirementCalculationSide(
            candidate_count=len(candidates),
            selected_count=len(selected),
            missing_attributes=sorted(missing_attributes),
        )

    def _filter_items(
        self,
        *,
        ds_item: dm.DatasetItem,
        gt_item: dm.DatasetItem,
    ) -> tuple[
        dm.DatasetItem,
        dm.DatasetItem,
        ComparisonReportRequirementCalculation,
    ]:
        ds_candidates = [
            annotation
            for annotation in ds_item.annotations
            if annotation.type in self.settings.included_annotation_types
        ]
        gt_candidates = [
            annotation
            for annotation in gt_item.annotations
            if annotation.type in self.settings.included_annotation_types
        ]
        ds_item = self._filter.filter_item(ds_item)
        gt_item = self._filter.filter_item(gt_item)
        ds_selected = list(ds_item.annotations)
        gt_selected = list(gt_item.annotations)

        required_comparison_attributes = self._get_explicit_comparison_attribute_names(
            [*ds_candidates, *gt_candidates]
        )
        calculation = _make_requirement_calculation(
            annotations=self._make_calculation_side(
                candidates=ds_candidates,
                selected=ds_selected,
                required_comparison_attributes=required_comparison_attributes,
            ),
            ground_truth=self._make_calculation_side(
                candidates=gt_candidates,
                selected=gt_selected,
                required_comparison_attributes=required_comparison_attributes,
            ),
        )

        return ds_item, gt_item, calculation

    def _match_attrs(
        self,
        ann_a: dm.Annotation,
        ann_b: dm.Annotation,
    ) -> AttributeMatchingResult:
        attribute_comparison = normalize_attribute_comparison(
            self.requirement.attribute_comparison,
            fill_default=True,
        )
        default_rule = make_default_attribute_rule(attribute_comparison)
        rules_by_spec_id = {
            int(rule["spec_id"]): AttributeComparisonRule.from_mapping(
                rule,
                defaults=default_rule,
            )
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

            if not rule.enabled:
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

        return AttributeMatchingResult(
            matches=tuple(matches),
            mismatches=tuple(mismatches),
            a_only=tuple(a_extra),
            b_only=tuple(b_extra),
        )

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

    def _make_frame_summary(
        self,
        *,
        annotation_summary: ComparisonReportAnnotationsSummary,
        conflicts: list[AnnotationConflict],
        calculation: ComparisonReportRequirementCalculation,
    ) -> ComparisonReportFrameComparisonSummary:
        return ComparisonReportFrameComparisonSummary.from_annotation_summary(
            annotation_summary=annotation_summary,
            conflicts=conflicts,
            calculation=calculation,
            metric=_get_requirement_metric(self.requirement),
        )

    @classmethod
    def for_requirement(
        cls, requirement: EffectiveQualityRequirement, *, context: MatchingContext
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
        self,
        *,
        ds_item: dm.DatasetItem,
        gt_item: dm.DatasetItem,
    ) -> RequirementFrameResult:
        """Match annotations between dataset and ground truth items.

        Must be implemented in subclasses.
        """
        raise NotImplementedError("Subclasses must implement match_annotations()")

    # row/column index in the confusion matrix corresponding to unmatched annotations
    _UNMATCHED_IDX = -1

    def _is_label_compatible_with_requirement(self, label: dm.LabelCategories.Category) -> bool:
        if (
            self.requirement.annotation_type
            == models.QualityRequirementAnnotationType.SKELETON_KEYPOINT
        ):
            return bool(label.parent) and self._gt_data_provider.get_label_type(
                label.parent
            ) == str(LabelType.SKELETON)

        if label.parent:
            return False

        label_type = self._gt_data_provider.get_label_type(label.name)
        if self.requirement.annotation_type == models.QualityRequirementAnnotationType.SKELETON:
            return label_type == str(LabelType.SKELETON)

        return label_type in {
            str(LabelType.ANY),
            self.requirement.annotation_type,
        }

    def _make_zero_confusion_matrix(self) -> tuple[list[str], np.ndarray, dict[int, int]]:
        label_id_idx_map = {}
        label_names = []
        for label_id, label in enumerate(self._gt_dataset.categories()[dm.AnnotationType.label]):
            if not self._is_label_compatible_with_requirement(label):
                continue

            label_id_idx_map[label_id] = len(label_names)
            label_names.append(f"{label.parent}.{label.name}" if label.parent else label.name)

        label_names.append(UNMATCHED_LABEL_NAME)

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
            ),
        )


class TagRequirementHandler(RequirementHandler):
    def match_annotations(
        self,
        *,
        gt_item: dm.DatasetItem,
        ds_item: dm.DatasetItem,
    ) -> RequirementFrameResult:
        conflicts = []
        frame_id = self.context.frame_id
        ds_item, gt_item, calculation = self._filter_items(
            ds_item=ds_item,
            gt_item=gt_item,
        )

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
            summary=self._make_frame_summary(
                annotation_summary=self._compute_annotations_summary(
                    confusion_matrix, confusion_matrix_labels
                ),
                conflicts=conflicts,
                calculation=calculation,
            ),
            calculation=calculation,
            matched_pairs=list(itertools.chain(matches, mismatches)),
        )


class ShapeRequirementHandler(RequirementHandler):
    def _prepare_item_for_requirement(
        self, item: dm.DatasetItem, data_provider: JobDataProvider
    ) -> dm.DatasetItem:
        if (
            self.requirement.annotation_type
            != models.QualityRequirementAnnotationType.SKELETON_KEYPOINT
        ):
            return item

        used_group_ids = {ann.group for ann in item.annotations if ann.group}
        virtual_group_ids = itertools.count(max({0, *used_group_ids}) + 1)
        flattened_annotations: list[dm.Annotation] = []
        for ann in item.annotations:
            if ann.type != dm.AnnotationType.skeleton:
                continue

            skeleton_group = ann.group or next(virtual_group_ids)
            parent_skeleton_context = self._filter.build_shape_context_for_annotation(ann)
            parent_attrs = dict(ann.attributes or {})
            for element in ann.elements:
                element_attrs = dict(element.attributes or {})
                if "source" not in element_attrs and "source" in parent_attrs:
                    element_attrs["source"] = parent_attrs["source"]
                if "track_id" not in element_attrs and "track_id" in parent_attrs:
                    element_attrs["track_id"] = parent_attrs["track_id"]
                if "keyframe" not in element_attrs and "keyframe" in parent_attrs:
                    element_attrs["keyframe"] = parent_attrs["keyframe"]

                visibility = list(element.visibility or [])
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
                wrapped_element = element.wrap(attributes=element_attrs, group=skeleton_group)
                data_provider.remember_dm_ann_alias(element, wrapped_element)
                flattened_annotations.append(wrapped_element)

        return item.wrap(annotations=flattened_annotations)

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
        ds_item, gt_item, calculation = self._filter_items(
            ds_item=ds_item,
            gt_item=gt_item,
        )

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
            shape_pairwise_comparisons,
        ) = all_shape_types_result

        def _get_comparison(gt_ann: dm.Annotation, ds_ann: dm.Annotation) -> Any:
            return self._comparator.get_comparison(
                shape_pairwise_comparisons,
                gt_ann,
                ds_ann,
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

        # NOTE @grigorii: Direction mismatches prevent annotations from matching with the
        # current single-stage matcher. Keep this handling for a future multi-stage matcher.
        if (
            self.settings.compare_line_orientation
            and dm.AnnotationType.polyline in self._comparator.included_ann_types
        ):
            for gt_ann, ds_ann in itertools.chain(matches, mismatches):
                if gt_ann.type != ds_ann.type or gt_ann.type != dm.AnnotationType.polyline:
                    continue

                comparison = _get_comparison(gt_ann, ds_ann)
                if comparison and comparison.direction_mismatch:
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

        # NOTE @grigorii: Attribute mismatches prevent annotations from matching with the
        # current single-stage matcher. Keep this handling for a future multi-stage matcher.
        if self.settings.compare_attributes:
            for gt_ann, ds_ann in matches:
                comparison = _get_comparison(gt_ann, ds_ann)
                conflicting_attribute_names = (
                    comparison.conflicting_attribute_names if comparison else ()
                )
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
            summary=self._make_frame_summary(
                annotation_summary=self._compute_annotations_summary(
                    confusion_matrix, confusion_matrix_labels
                ),
                conflicts=conflicts,
                calculation=calculation,
            ),
            calculation=calculation,
            matched_pairs=list(itertools.chain(shape_matches, shape_mismatches)),
        )


class DatasetQualityEstimator:
    def __init__(
        self,
        ds_data_provider: JobDataProvider,
        gt_data_provider: JobDataProvider,
        *,
        requirements: list[EffectiveQualityRequirement],
        report_parameters: ComparisonReportParameters,
    ) -> None:
        self._requirements = resolve_effective_requirements(requirements)
        self._report_parameters = report_parameters

        self._ds_data_provider = ds_data_provider
        self._gt_data_provider = gt_data_provider
        self._ds_dataset = self._ds_data_provider.dm_dataset
        self._gt_dataset = self._gt_data_provider.dm_dataset

        self._results: dict[str, dict[int, ComparisonReportFrameComparisonSummary]] = {}
        self._calculations: dict[str, ComparisonReportRequirementCalculation] = {}

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
            if not requirement.enabled:
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
            self._calculations[requirement.name] = select_requirement_calculation(
                self._calculations.get(requirement.name),
                result.calculation,
            )

    def _aggregate_all_results(
        self,
    ) -> tuple[list[int], list[AnnotationConflict]]:
        intersection_frames: set[int] = set()
        conflicts: list[AnnotationConflict] = []

        enabled_requirement_names = {
            requirement.name for requirement in self._requirements if requirement.enabled
        }

        for requirement_name, requirement_metrics in self._results.items():
            if requirement_name not in enabled_requirement_names:
                continue

            for frame_id, frame_result in requirement_metrics.items():
                intersection_frames.add(frame_id)
                conflicts.extend(frame_result.conflicts)

        return (
            sorted(intersection_frames),
            deduplicate_annotation_conflicts(conflicts),
        )

    def generate_report(self) -> ComparisonReport:
        self._compare_datasets()

        (
            intersection_frames,
            conflicts,
        ) = self._aggregate_all_results()

        group_reports = {
            requirement.name: build_requirement_report(
                requirement=requirement,
                frame_results=self._results.get(requirement.name, {}),
                calculation=(
                    self._calculations.get(requirement.name) or make_empty_requirement_calculation()
                ),
            )
            for requirement in self._requirements
        }
        requirement_stats = build_requirements_summary(self._requirements, group_reports)
        return ComparisonReport(
            parameters=self._report_parameters,
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
            groups=group_reports,
        )
