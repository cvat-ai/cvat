# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import unittest
from types import SimpleNamespace
from unittest import mock

import datumaro as dm
import numpy as np

from cvat.apps.quality_control import models
from cvat.apps.quality_control.comparison_report import (
    AnnotationConflict,
    ComparisonReport,
    ComparisonReportAnnotationsSummary,
    ComparisonReportFrameComparisonSummary,
    ComparisonReportParameters,
    ComparisonReportRequirementCalculation,
    ComparisonReportRequirementCalculationSide,
    ComparisonReportRequirementComparisonSummary,
    ComparisonReportRequirementsSummary,
    ComparisonReportRequirementSummary,
    ComparisonReportScoreComponents,
    ComparisonReportSummary,
    ConfusionMatrix,
)
from cvat.apps.quality_control.quality_handlers import (
    ShapeRequirementHandler,
    build_requirement_comparison_summary,
    build_requirement_report,
    build_requirements_summary,
    merge_annotations_summary,
    resolve_effective_requirement,
    resolve_effective_requirements,
    select_requirement_calculation,
)


class TestShapeRequirementHandler(unittest.TestCase):
    @staticmethod
    def _make_handler() -> ShapeRequirementHandler:
        handler = ShapeRequirementHandler.__new__(ShapeRequirementHandler)
        handler.requirement = SimpleNamespace(
            annotation_type=models.QualityRequirementAnnotationType.SKELETON_KEYPOINT
        )
        handler._filter = mock.Mock()
        return handler

    def test_ungrouped_skeleton_keypoints_get_virtual_group_without_used_groups(self) -> None:
        elements = [
            dm.Points([10, 10], label=1),
            dm.Points([20, 20], label=2),
        ]
        item = dm.DatasetItem(
            id="frame",
            annotations=[dm.Skeleton(elements, label=0)],
        )

        prepared_item = self._make_handler()._prepare_item_for_requirement(item, mock.Mock())

        self.assertEqual([ann.group for ann in prepared_item.annotations], [1, 1])

    def test_skeleton_keypoints_inherit_parent_or_virtual_group(self) -> None:
        first_ungrouped_elements = [
            dm.Points([10, 10], label=1),
            dm.Points([20, 20], label=2),
        ]
        grouped_elements = [
            dm.Points([30, 30], label=1),
            dm.Points([40, 40], label=2),
        ]
        second_ungrouped_elements = [dm.Points([50, 50], label=1)]
        item = dm.DatasetItem(
            id="frame",
            annotations=[
                dm.Skeleton(first_ungrouped_elements, label=0),
                dm.Skeleton(grouped_elements, label=0, group=3),
                dm.Skeleton(second_ungrouped_elements, label=0),
            ],
        )
        data_provider = mock.Mock()

        prepared_item = self._make_handler()._prepare_item_for_requirement(item, data_provider)

        self.assertEqual([ann.group for ann in prepared_item.annotations], [4, 4, 3, 3, 5])
        self.assertTrue(
            all(
                element.group == 0
                for element in [
                    *first_ungrouped_elements,
                    *grouped_elements,
                    *second_ungrouped_elements,
                ]
            )
        )
        self.assertEqual(data_provider.remember_dm_ann_alias.call_count, 5)


class TestComparisonReportAccumulation(unittest.TestCase):
    def test_confusion_matrix_accumulate_resets_cached_metrics(self) -> None:
        target = ConfusionMatrix(
            labels=["car", "unmatched"],
            rows=np.asarray([[1, 0], [0, 0]]),
        )
        other = ConfusionMatrix(
            labels=["car", "unmatched"],
            rows=np.asarray([[0, 1], [0, 0]]),
        )

        np.testing.assert_allclose(target.precision, [1, np.nan])
        np.testing.assert_allclose(target.recall, [1, np.nan])
        np.testing.assert_allclose(target.accuracy, [1, np.nan])
        np.testing.assert_allclose(target.jaccard_index, [1, np.nan])

        target.accumulate(other)

        np.testing.assert_array_equal(target.rows, [[1, 1], [0, 0]])
        np.testing.assert_allclose(target.precision, [0.5, np.nan])
        np.testing.assert_allclose(target.recall, [1, np.nan])
        np.testing.assert_allclose(target.accuracy, [0.5, np.nan])
        np.testing.assert_allclose(target.jaccard_index, [0.5, np.nan])

    def test_merge_annotations_summary_accumulates_confusion_matrix(self) -> None:
        target = ComparisonReportAnnotationsSummary.create_empty()
        other_matrix = ConfusionMatrix(
            labels=["car", "unmatched"],
            rows=np.asarray([[1, 1], [1, 0]]),
        )
        other = ComparisonReportAnnotationsSummary.from_confusion_matrix(other_matrix)

        merge_annotations_summary(target, other)

        self.assertEqual(target.valid_count, 1)
        self.assertEqual(target.missing_count, 1)
        self.assertEqual(target.extra_count, 1)
        self.assertEqual(target.total_count, 3)
        self.assertEqual(target.ds_count, 2)
        self.assertEqual(target.gt_count, 2)
        target_matrix = target.confusion_matrix
        self.assertIsNotNone(target_matrix)
        assert target_matrix is not None
        np.testing.assert_array_equal(target_matrix.rows, other_matrix.rows)

    def test_comparison_report_does_not_serialize_root_conflicts(self) -> None:
        conflict = AnnotationConflict(
            frame_id=0,
            type=models.AnnotationConflictType.EXTRA_ANNOTATION,
            annotation_ids=[],
        )
        report = ComparisonReport(
            parameters=ComparisonReportParameters(inherited=False, job_filter=""),
            comparison_summary=ComparisonReportSummary(
                frames=[0],
                total_frames=1,
                conflict_count=1,
                error_count=1,
                conflicts_by_type={models.AnnotationConflictType.EXTRA_ANNOTATION: 1},
                tasks=None,
                jobs=None,
                requirements=ComparisonReportRequirementsSummary.create_empty(),
            ),
            groups={
                "cars": ComparisonReportRequirementSummary(
                    parameters={},
                    comparison_summary=ComparisonReportRequirementComparisonSummary(
                        conflict_count=1,
                        error_count=1,
                        conflicts_by_type={models.AnnotationConflictType.EXTRA_ANNOTATION: 1},
                        score=0.0,
                        score_components=ComparisonReportScoreComponents(
                            valid_count=0,
                            missing_count=0,
                            extra_count=1,
                        ),
                        calculation=ComparisonReportRequirementCalculation.create_computed(),
                        confusion_matrix=None,
                    ),
                    frame_results={
                        0: ComparisonReportFrameComparisonSummary(
                            conflicts=[conflict],
                            score=0.0,
                            score_components=ComparisonReportScoreComponents(
                                valid_count=0,
                                missing_count=0,
                                extra_count=1,
                            ),
                            calculation=ComparisonReportRequirementCalculation.create_computed(),
                            confusion_matrix=None,
                            annotation_summary=ComparisonReportAnnotationsSummary(
                                valid_count=0,
                                missing_count=0,
                                extra_count=1,
                                total_count=1,
                                ds_count=1,
                                gt_count=0,
                                confusion_matrix=None,
                            ),
                            metric=models.QualityTargetMetricType.ACCURACY,
                        )
                    },
                )
            },
        )

        serialized_report = report.to_dict()

        self.assertEqual(report.get_conflicts(), [conflict])
        self.assertNotIn("conflicts", serialized_report)
        self.assertEqual(
            serialized_report["groups"]["cars"]["frame_results"][0]["conflicts"],
            [conflict.to_dict()],
        )


class TestEffectiveQualityRequirements(unittest.TestCase):
    @staticmethod
    def _make_root(**overrides) -> models.QualityRequirement:
        values = {
            **models.QualityRequirement.get_base_defaults(),
            "id": 1,
            "name": "root",
            "annotation_type": models.QualityRequirementAnnotationType.RECTANGLE,
            "enabled": True,
            **overrides,
        }
        return models.QualityRequirement(**values)

    def test_model_does_not_fill_inherited_fields_for_child(self) -> None:
        root = self._make_root()

        child = models.QualityRequirement(id=2, name="child", parent=root)

        self.assertIsNone(child.annotation_type)
        self.assertIsNone(child.target_metric)
        self.assertIsNone(child.target_metric_threshold)
        self.assertIsNone(child.iou_threshold)
        self.assertIsNone(child.point_size_base)

    def test_requirement_inherits_from_each_effective_parent(self) -> None:
        root = self._make_root(iou_threshold=0.4, line_thickness=0.01)
        parent = models.QualityRequirement(
            id=2,
            name="parent",
            parent=root,
            iou_threshold=0.6,
        )
        child = models.QualityRequirement(
            id=3,
            name="child",
            parent=parent,
            line_thickness=0.2,
        )

        effective_requirements = [
            resolve_effective_requirement(child),
            {
                requirement.name: requirement
                for requirement in resolve_effective_requirements([child, root, parent])
            }[child.name],
        ]

        for effective in effective_requirements:
            self.assertEqual(effective.annotation_type, root.annotation_type)
            self.assertEqual(effective.iou_threshold, parent.iou_threshold)
            self.assertEqual(effective.line_thickness, child.line_thickness)

    def test_batch_resolution_rejects_requirement_without_its_parent(self) -> None:
        root = self._make_root()
        child = models.QualityRequirement(id=2, name="child", parent=root)

        with self.assertRaisesRegex(ValueError, "Parent quality requirements must be included"):
            resolve_effective_requirements([child])

    def test_resolution_rejects_incomplete_root(self) -> None:
        root = self._make_root(iou_threshold=None)

        with self.assertRaisesRegex(ValueError, "iou_threshold"):
            resolve_effective_requirement(root)


class TestRequirementCompletion(unittest.TestCase):
    def test_calculation_selection_does_not_merge_details(self) -> None:
        first = ComparisonReportRequirementCalculation(
            status="not_computed",
            reason="filter_no_matches",
            annotations=ComparisonReportRequirementCalculationSide(
                candidate_count=1,
                selected_count=0,
            ),
            ground_truth=ComparisonReportRequirementCalculationSide(
                candidate_count=1,
                selected_count=0,
            ),
        )
        second = ComparisonReportRequirementCalculation(
            status="not_computed",
            reason="filter_no_matches",
            annotations=ComparisonReportRequirementCalculationSide(
                candidate_count=2,
                selected_count=0,
            ),
            ground_truth=ComparisonReportRequirementCalculationSide(
                candidate_count=2,
                selected_count=0,
            ),
        )

        self.assertIs(select_requirement_calculation(first, second), first)
        computed = ComparisonReportRequirementCalculation.create_computed()
        self.assertIs(select_requirement_calculation(first, computed), computed)
        self.assertEqual(computed.to_dict(), {"status": "computed"})
        self.assertEqual(
            ComparisonReportRequirementCalculation.from_dict(first.to_dict()).to_dict(),
            first.to_dict(),
        )

    def test_disabled_requirement_without_annotations_keeps_zero_score(self) -> None:
        requirement = models.QualityRequirement(
            id=1,
            name="disabled",
            enabled=False,
            target_metric=models.QualityTargetMetricType.ACCURACY,
            target_metric_threshold=1.0,
        )

        group_report = build_requirement_report(requirement=requirement, frame_results={})

        self.assertEqual(group_report.comparison_summary.score, 0.0)
        self.assertEqual(
            group_report.comparison_summary.calculation.to_dict(),
            {"status": "computed"},
        )

    def test_enabled_requirement_without_annotations_is_completed_without_score(self) -> None:
        requirement = models.QualityRequirement(
            id=1,
            name="empty-filter-result",
            enabled=True,
            target_metric=models.QualityTargetMetricType.ACCURACY,
            target_metric_threshold=1.0,
        )
        group_report = build_requirement_report(requirement=requirement, frame_results={})

        requirements_summary = build_requirements_summary(
            [requirement],
            {requirement.name: group_report},
        )

        self.assertIsNone(group_report.comparison_summary.score)
        self.assertEqual(
            group_report.comparison_summary.calculation.to_dict(),
            {
                "status": "not_computed",
                "reason": "no_annotations",
                "annotations": {
                    "candidate_count": 0,
                    "selected_count": 0,
                    "missing_attributes": [],
                },
                "ground_truth": {
                    "candidate_count": 0,
                    "selected_count": 0,
                    "missing_attributes": [],
                },
            },
        )
        self.assertEqual(group_report.comparison_summary.score_components.valid_count, 0)
        self.assertEqual(requirements_summary.completed_count, 1)
        self.assertEqual(requirements_summary.not_computed_count, 1)
        self.assertIsNone(requirements_summary.items[0].score)
        self.assertEqual(
            requirements_summary.items[0].calculation.to_dict(),
            {
                "status": "not_computed",
                "reason": "no_annotations",
            },
        )

    def test_requirement_with_annotations_on_only_one_side_is_computed(self) -> None:
        requirement = models.QualityRequirement(
            id=1,
            name="mismatched-labels",
            enabled=True,
            target_metric=models.QualityTargetMetricType.ACCURACY,
            target_metric_threshold=1.0,
        )
        annotations = ComparisonReportAnnotationsSummary(
            valid_count=0,
            missing_count=0,
            extra_count=1,
            total_count=1,
            ds_count=1,
            gt_count=0,
            confusion_matrix=None,
        )

        comparison_summary = build_requirement_comparison_summary(
            requirement=requirement,
            annotations=annotations,
            conflicts=[],
        )

        self.assertEqual(comparison_summary.score, 0.0)
        self.assertEqual(
            comparison_summary.calculation.to_dict(),
            {
                "status": "computed",
            },
        )
