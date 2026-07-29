# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import unittest

from cvat.apps.quality_control import models
from cvat.apps.quality_control.comparison_report import (
    ComparisonReportAnnotationsSummary,
    ComparisonReportRequirementCalculation,
    ComparisonReportRequirementCalculationSide,
)
from cvat.apps.quality_control.quality_handlers import (
    build_requirement_comparison_summary,
    build_requirement_report,
    build_requirements_summary,
    select_requirement_calculation,
)


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
        self.assertEqual(requirements_summary.completed, 1)
        self.assertEqual(requirements_summary.not_computed, 1)
        self.assertIsNone(requirements_summary.items[0].score)
        self.assertTrue(requirements_summary.items[0].not_computed)
        self.assertNotIn("calculation", requirements_summary.items[0].to_dict())

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
