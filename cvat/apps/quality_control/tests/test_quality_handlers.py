# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import unittest

from cvat.apps.quality_control import models
from cvat.apps.quality_control.comparison_report import ComparisonReportAnnotationsSummary
from cvat.apps.quality_control.quality_handlers import (
    build_requirement_comparison_summary,
    build_requirement_report,
    build_requirements_summary,
)


class TestRequirementCompletion(unittest.TestCase):
    def test_enabled_requirement_without_annotations_is_completed(self) -> None:
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

        self.assertEqual(group_report.comparison_summary.score, 1.0)
        self.assertEqual(group_report.comparison_summary.score_components.valid_count, 0)
        self.assertEqual(requirements_summary.completed, 1)
        self.assertEqual(requirements_summary.items[0].score, 1.0)

    def test_nonempty_requirement_without_valid_annotations_is_not_completed(self) -> None:
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
            extra_count=0,
            total_count=1,
            ds_count=1,
            gt_count=1,
            confusion_matrix=None,
        )

        comparison_summary = build_requirement_comparison_summary(
            requirement=requirement,
            annotations=annotations,
            conflicts=[],
        )

        self.assertEqual(comparison_summary.score, 0.0)
