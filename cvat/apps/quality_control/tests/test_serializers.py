# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import math
import unittest
from types import SimpleNamespace
from unittest.mock import Mock

from rest_framework import serializers

from cvat.apps.quality_control import models
from cvat.apps.quality_control.attribute_comparators import (
    AttributeComparisonRule,
    format_attribute_comparator_names,
    get_attribute_comparator_names,
    match_attribute_values,
)
from cvat.apps.quality_control.attribute_comparison import make_default_attribute_rule
from cvat.apps.quality_control.comparison_report import ComparisonReportRequirementCalculation
from cvat.apps.quality_control.serializers import (
    AttributeComparisonSerializer,
    IoUThresholdField,
    QualityReportRequirementCalculationSerializer,
    QualityRequirementSerializer,
    QualitySettingsRequirementsSerializer,
    QualitySettingsSerializer,
)


class TestQualityReportRequirementCalculationSerializer(unittest.TestCase):
    def test_returns_compact_calculation(self) -> None:
        self.assertEqual(
            QualityReportRequirementCalculationSerializer(
                ComparisonReportRequirementCalculation.create_computed()
            ).data,
            {"status": "computed"},
        )
        self.assertEqual(
            QualityReportRequirementCalculationSerializer(
                ComparisonReportRequirementCalculation(
                    status="not_computed",
                    reason="filter_no_matches",
                )
            ).data,
            {
                "status": "not_computed",
                "reason": "filter_no_matches",
            },
        )


class TestAttributeComparatorPresentation(unittest.TestCase):
    def test_comparator_names_are_sorted_for_api_presentation(self) -> None:
        names = get_attribute_comparator_names()

        self.assertEqual(names, tuple(sorted(names)))
        self.assertEqual(format_attribute_comparator_names(), "'exact' or 'levenshtein'")


class TestAttributeComparisonRule(unittest.TestCase):
    def test_builds_typed_default_and_override_rules(self) -> None:
        default_rule = make_default_attribute_rule(
            {
                "default": {
                    "enabled": True,
                    "comparator": "levenshtein",
                    "threshold": 0.75,
                }
            }
        )
        override_rule = AttributeComparisonRule.from_mapping(
            {"spec_id": 7, "enabled": False},
            defaults=default_rule,
        )

        self.assertEqual(
            default_rule,
            AttributeComparisonRule(
                enabled=True,
                comparator="levenshtein",
                threshold=0.75,
            ),
        )
        self.assertEqual(
            override_rule,
            AttributeComparisonRule(
                enabled=False,
                comparator="levenshtein",
                threshold=0.75,
                spec_id=7,
            ),
        )
        self.assertTrue(match_attribute_values("abcd", "abce", rule=default_rule))
        self.assertFalse(match_attribute_values("abcd", "abxy", rule=default_rule))


class TestAttributeComparisonSerializer(unittest.TestCase):
    def test_representation_preserves_sparse_settings(self) -> None:
        settings = {
            "default": {"enabled": True},
            "rules": [{"spec_id": 1, "enabled": False}],
        }

        self.assertEqual(AttributeComparisonSerializer(settings).data, settings)

    def test_validates_and_normalizes_partial_settings(self) -> None:
        serializer = AttributeComparisonSerializer(
            data={
                "default": {"enabled": None, "comparator": "exact", "threshold": None},
                "rules": [
                    {
                        "spec_id": "1",
                        "enabled": True,
                        "comparator": "levenshtein",
                        "threshold": 0.5,
                    }
                ],
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(
            serializer.validated_data,
            {
                "default": {"comparator": "exact", "threshold": None},
                "rules": [
                    {
                        "spec_id": 1,
                        "enabled": True,
                        "comparator": "levenshtein",
                        "threshold": 0.5,
                    }
                ],
            },
        )

    def test_ignores_unknown_fields(self) -> None:
        serializer = AttributeComparisonSerializer(
            data={
                "unknown": True,
                "default": {"enabled": True, "unknown": True},
                "rules": [{"spec_id": 1, "enabled": False, "unknown": True}],
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(
            serializer.validated_data,
            {
                "default": {"enabled": True},
                "rules": [{"spec_id": 1, "enabled": False}],
            },
        )


class TestQualitySettingsRequirementsSerializer(unittest.TestCase):
    def test_rejects_empty_requirement_list(self) -> None:
        serializer = QualitySettingsRequirementsSerializer(data=[])

        self.assertFalse(serializer.is_valid())
        self.assertEqual(
            [str(error) for error in serializer.errors["non_field_errors"]],
            ["At least one quality requirement must be specified."],
        )

    def test_reports_base_deletion_before_missing_parent(self) -> None:
        base_requirement = SimpleNamespace(id=1, name="Base rectangle", is_base=True)
        settings = Mock()
        settings.requirements.select_related.return_value.all.return_value = [base_requirement]

        with self.assertRaises(serializers.ValidationError) as capture:
            QualitySettingsSerializer()._sync_requirements(
                settings,
                [{"name": "Custom rectangle", "parent_requirement": base_requirement.id}],
            )

        self.assertEqual(
            str(capture.exception.detail["requirements"]),
            "Base quality requirements cannot be deleted.",
        )


class TestIoUThresholdSerializer(unittest.TestCase):
    def test_field_rejects_invalid_scalar_values(self):
        field = IoUThresholdField()
        for value in [True, "0.4", -1, 2, math.nan, math.inf, 10**500]:
            with self.subTest(value=value), self.assertRaises(serializers.ValidationError):
                field.run_validation(value)


class TestQualityRequirementSimilarityMetricValidation(unittest.TestCase):
    def test_accepts_the_supported_metrics(self) -> None:
        for (
            annotation_type,
            metrics,
        ) in models.QualityRequirement.get_supported_similarity_metrics().items():
            for metric in metrics:
                with self.subTest(annotation_type=annotation_type, metric=metric):
                    QualityRequirementSerializer._validate_similarity_metric(
                        metric, annotation_type
                    )

    def test_accepts_inherited_metric(self) -> None:
        QualityRequirementSerializer._validate_similarity_metric(
            None, models.QualityRequirementAnnotationType.TAG
        )

    def test_field_rejects_unknown_metric(self) -> None:
        with self.assertRaises(serializers.ValidationError) as error:
            QualityRequirementSerializer().fields["similarity_metric"].run_validation("unknown")

        self.assertEqual(
            [str(message) for message in error.exception.detail],
            ['"unknown" is not a valid choice.'],
        )

    def test_supported_metrics_cover_all_annotation_types(self) -> None:
        self.assertEqual(
            set(models.QualityRequirement.get_supported_similarity_metrics()),
            set(models.QualityRequirementAnnotationType),
        )

    def test_rejects_the_unsupported_metrics(self) -> None:
        for (
            annotation_type,
            metrics,
        ) in models.QualityRequirement.get_supported_similarity_metrics().items():
            for metric in set(models.ShapeSimilarityMetricType).difference(metrics):
                with self.subTest(annotation_type=annotation_type, metric=metric):
                    with self.assertRaises(serializers.ValidationError) as error:
                        QualityRequirementSerializer._validate_similarity_metric(
                            metric, annotation_type
                        )

                    self.assertIn("similarity_metric", error.exception.detail)
