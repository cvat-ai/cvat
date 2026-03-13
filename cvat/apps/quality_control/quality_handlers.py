# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from abc import ABC, abstractmethod
import itertools
from collections import Counter
from typing import TYPE_CHECKING

import attrs
import datumaro as dm
import numpy as np

from cvat.apps.quality_control.annotation_matching import Comparator, LineMatcher, MatchingResults
from cvat.apps.quality_control.comparison_report import (
    AnnotationConflict,
    AnnotationId,
    ComparisonReport,
    ComparisonParameters,
    ComparisonReportAnnotationComponentsSummary,
    ComparisonReportAnnotationLabelSummary,
    ComparisonReportAnnotationShapeSummary,
    ComparisonReportAnnotationsSummary,
    ComparisonReportFrameSummary,
    ComparisonReportSummary,
    ConfusionMatrix,
)
from cvat.apps.quality_control.models import AnnotationConflictSeverity, AnnotationConflictType
from cvat.apps.quality_control.utils import array_safe_divide
from cvat.apps.quality_control import models

if TYPE_CHECKING:
    from cvat.apps.quality_control.quality_reports import JobDataProvider


@attrs.define
class MatchingContext:
    frame_id: int
    estimator: "DatasetQualityEstimator"
    categories: dm.Categories
    annotation_requirements: dict[int, set]  # ann_id -> set of requirement names
    parent_results: dict[str, dict] | None = None  # for attribute requirements


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

    def _create_comparison_parameters(self) -> ComparisonParameters:
        """Create ComparisonParameters from requirement settings"""
        # Start with default parameters
        params = ComparisonParameters()
        
        # Map requirement fields to ComparisonParameters fields
        # TODO: Refactor it

        items = [
            'iou_threshold',
            'oks_sigma',
            'line_thickness',
            'low_overlap_threshold',
            'point_size_base',
            'compare_line_orientation',
            'line_orientation_threshold',
            'compare_attributes',
            'compare_groups',
            'group_match_threshold',
            'check_covered_annotations',
            'object_visibility_threshold',
            'panoptic_comparison',
            'empty_is_annotated',
        ]
        field_mapping = {i: i for i in items}  # direct mapping for all fields
        
        for req_field, param_field in field_mapping.items():
            if hasattr(self.requirement, req_field):
                value = getattr(self.requirement, req_field)
                if value is not None:
                    setattr(params, param_field, value)
        
        return params

    def _dm_ann_to_ann_id(self, ann: dm.Annotation, dataset: dm.Dataset) -> AnnotationId:
        """Convert Datumaro annotation to AnnotationId"""
        return self.context.estimator._dm_ann_to_ann_id(ann, dataset)
    
    def _dm_item_to_frame_id(self, item: dm.DatasetItem, dataset: dm.Dataset) -> int:
        """Convert Datumaro item to frame ID"""
        return self.context.estimator._dm_item_to_frame_id(item, dataset)

    @classmethod
    def for_requirement(cls, requirement: models.QualityRequirement, *, context: MatchingContext) -> RequirementHandler:
        """Factory method to create appropriate handler based on requirement type"""
        from cvat.apps.quality_control.models import QualityRequirementAnnotationType
        
        ann_type = requirement.annotation_type
        
        # Map annotation types to handlers
        if ann_type == QualityRequirementAnnotationType.TAG:
            return TagRequirementHandler(requirement=requirement, context=context)
        elif ann_type == QualityRequirementAnnotationType.ATTRIBUTE:
            return AttributeRequirementHandler(requirement=requirement, context=context)
        else:
            # All shape types use ShapeRequirementHandler
            return ShapeRequirementHandler(requirement=requirement, context=context)

    @abstractmethod
    def match_annotations(self, *, ds_item: dm.DatasetItem, gt_item: dm.DatasetItem) -> dict:
        """Match annotations between dataset and ground truth items. Must be implemented in subclasses."""
        raise NotImplementedError("Subclasses must implement match_annotations()")

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
        from copy import deepcopy
        
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


class TagRequirementHandler(RequirementHandler):
    def match_annotations(
        self,
        *,
        gt_item: dm.DatasetItem,
        ds_item: dm.DatasetItem,
    ):
        conflicts = []
        frame_id = self.context.frame_id

        # Call comparator to match annotations
        matching_results: MatchingResults = self._comparator.match_annotations(gt_item, ds_item)

        # Unpack results for all annotation types (tags are in here)
        all_ann_types_result = matching_results["all_ann_types"][0]
        matches, mismatches, gt_unmatched, ds_unmatched, _ = all_ann_types_result

        # Generate conflicts for mismatches
        for gt_ann, ds_ann in mismatches:
            if gt_ann is not None and ds_ann is not None:
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

        # Generate conflicts for unmatched GT annotations (missing)
        for unmatched_ann in gt_unmatched:
            conflicts.append(
                AnnotationConflict(
                    frame_id=frame_id,
                    type=AnnotationConflictType.MISSING_ANNOTATION,
                    annotation_ids=[self._dm_ann_to_ann_id(unmatched_ann, self._gt_dataset)],
                )
            )

        # Generate conflicts for unmatched DS annotations (extra)
        for unmatched_ann in ds_unmatched:
            conflicts.append(
                AnnotationConflict(
                    frame_id=frame_id,
                    type=AnnotationConflictType.EXTRA_ANNOTATION,
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

        return ComparisonReportFrameSummary(
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
        )


class ShapeRequirementHandler(RequirementHandler):
    def match_annotations(
        self,
        *,
        gt_item: dm.DatasetItem,
        ds_item: dm.DatasetItem,
    ):
        conflicts = []
        frame_id = self.context.frame_id

        # Call comparator to match annotations
        matching_results: MatchingResults = self._comparator.match_annotations(gt_item, ds_item)

        # Unpack results for all annotation types
        all_ann_types_result = matching_results["all_ann_types"][0]
        matches, mismatches, gt_unmatched, ds_unmatched, _ = all_ann_types_result
        
        # Unpack results for shape annotation types
        all_shape_types_result = matching_results["all_shape_ann_types"][0]
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
            ds_covered_anns = self._comparator.find_covered(ds_item)

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
                attribute_results = self._comparator.match_attrs(gt_ann, ds_ann)
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

        return ComparisonReportFrameSummary(
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


class AttributeRequirementHandler(RequirementHandler):
    def match_annotations(
        self,
        *,
        gt_item: dm.DatasetItem,
        ds_item: dm.DatasetItem,
    ):
        conflicts = []
        frame_id = self.context.frame_id

        # Attributes are only checked on matched shapes from parent requirement
        # Get parent requirement results if available
        if not self.context.parent_results or not self.requirement.parent:
            # No parent requirement - cannot match attributes
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

        # Get parent requirement name
        parent_req_name = self.requirement.parent.name if self.requirement.parent else None

        if not parent_req_name or parent_req_name not in self.context.parent_results:
            # Parent results not available
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

        parent_matching_results = self.context.parent_results[parent_req_name]
        
        # Extract matched shapes from parent results
        if "all_ann_types" in parent_matching_results:
            matches, mismatches, _, _, _ = parent_matching_results["all_ann_types"][0]
        else:
            matches = []
            mismatches = []
        
        # Check attributes on matched shapes only
        valid_attributes = 0
        invalid_attributes = 0
        
        for gt_ann, ds_ann in itertools.chain(matches, mismatches):
            if gt_ann and ds_ann and self.settings.compare_attributes:
                # Compare attributes
                attribute_results = self._comparator.match_attrs(gt_ann, ds_ann)
                if any(attribute_results[1:]):  # If there are any mismatches
                    invalid_attributes += 1
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
                else:
                    valid_attributes += 1

        total_attributes = valid_attributes + invalid_attributes

        # Simple summary for attributes (no detailed confusion matrix yet)
        return ComparisonReportFrameSummary(
            annotations=ComparisonReportAnnotationsSummary(
                valid_count=valid_attributes,
                missing_count=0,
                extra_count=0,
                total_count=total_attributes,
                ds_count=total_attributes,
                gt_count=total_attributes,
                confusion_matrix=ConfusionMatrix(
                    labels=["matched", "mismatched"],
                    rows=np.array([[valid_attributes, invalid_attributes]]),
                    precision=np.array([1.0 if total_attributes > 0 else 0.0]),
                    recall=np.array([1.0 if total_attributes > 0 else 0.0]),
                    accuracy=np.array([valid_attributes / total_attributes if total_attributes > 0 else 0.0]),
                    jaccard_index=np.array([valid_attributes / total_attributes if total_attributes > 0 else 0.0]),
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
                    valid_count=valid_attributes,
                    invalid_count=invalid_attributes,
                    total_count=total_attributes,
                ),
            ),
            conflicts=conflicts,
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
        self._requirements = requirements

        self._ds_data_provider = ds_data_provider
        self._gt_data_provider = gt_data_provider
        self._ds_dataset = self._ds_data_provider.dm_dataset
        self._gt_dataset = self._gt_data_provider.dm_dataset

        self._results: dict[str, dict[int, ComparisonReportFrameSummary]] = {}

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

        shape_reqs = [
            req
            for req in self._requirements
            if req.annotation_type != models.QualityRequirementAnnotationType.ATTRIBUTE
        ]
        attribute_reqs = [
            req
            for req in self._requirements
            if req.annotation_type == models.QualityRequirementAnnotationType.ATTRIBUTE
        ]

        per_requirement_results = {}
        annotation_requirements: dict[int, set] = {}

        for requirement in shape_reqs:
            handler = RequirementHandler.for_requirement(
                requirement,
                context=MatchingContext(
                    frame_id=frame_id,
                    estimator=self,
                    categories=self._gt_dataset.categories(),
                    annotation_requirements=annotation_requirements,
                    parent_results=None,
                ),
            )

            result = handler.match_annotations(ds_item=ds_item, gt_item=gt_item)
            per_requirement_results[requirement.name] = result
            self._results.setdefault(requirement.name, {})[frame_id] = result

        for requirement in attribute_reqs:
            handler = RequirementHandler.for_requirement(
                requirement,
                context=MatchingContext(
                    frame_id=frame_id,
                    estimator=self,
                    categories=self._gt_dataset.categories(),
                    annotation_requirements=annotation_requirements,
                    parent_results=per_requirement_results,
                ),
            )

            result = handler.match_annotations(ds_item=ds_item, gt_item=gt_item)
            per_requirement_results[requirement.name] = result
            self._results.setdefault(requirement.name, {})[frame_id] = result

    def _aggregate_all_results(
        self,
    ) -> tuple[
        dict[int, ComparisonReportFrameSummary],
        list[int],
        list[AnnotationConflict],
        ComparisonReportAnnotationsSummary,
        ComparisonReportAnnotationComponentsSummary,
    ]:
        all_frame_results = {}
        intersection_frames = []
        conflicts = []

        confusion_matrix = None
        confusion_matrix_labels = None
        mean_ious = []
        total_annotation_components = None

        for requirement_metrics in self._results.values():
            for frame_id, frame_result in requirement_metrics.items():
                if frame_id in all_frame_results:
                    continue

                all_frame_results[frame_id] = frame_result
                intersection_frames.append(frame_id)
                conflicts += frame_result.conflicts

                if confusion_matrix is None:
                    confusion_matrix_labels = frame_result.annotations.confusion_matrix.labels
                    confusion_matrix = frame_result.annotations.confusion_matrix.rows.copy()
                else:
                    confusion_matrix += frame_result.annotations.confusion_matrix.rows

                mean_ious.append(frame_result.annotation_components.shape.mean_iou)

                if total_annotation_components is None:
                    total_annotation_components = ComparisonReportAnnotationComponentsSummary(
                        shape=ComparisonReportAnnotationShapeSummary(
                            valid_count=frame_result.annotation_components.shape.valid_count,
                            missing_count=frame_result.annotation_components.shape.missing_count,
                            extra_count=frame_result.annotation_components.shape.extra_count,
                            total_count=frame_result.annotation_components.shape.total_count,
                            ds_count=frame_result.annotation_components.shape.ds_count,
                            gt_count=frame_result.annotation_components.shape.gt_count,
                            mean_iou=0,
                        ),
                        label=ComparisonReportAnnotationLabelSummary(
                            valid_count=frame_result.annotation_components.label.valid_count,
                            invalid_count=frame_result.annotation_components.label.invalid_count,
                            total_count=frame_result.annotation_components.label.total_count,
                        ),
                    )
                else:
                    total_annotation_components.accumulate(frame_result.annotation_components)

        if total_annotation_components:
            total_annotation_components.shape.mean_iou = np.mean(mean_ious or [])

        if confusion_matrix is not None:
            total_annotations_summary = self._compute_summary_from_confusion_matrix(
                confusion_matrix, confusion_matrix_labels
            )
        else:
            total_annotations_summary = ComparisonReportAnnotationsSummary(
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
            )

        if total_annotation_components is None:
            total_annotation_components = ComparisonReportAnnotationComponentsSummary.create_empty()

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
            ),
            frame_results=all_frame_results,
        )

