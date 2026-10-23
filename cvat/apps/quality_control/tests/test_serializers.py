# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

from rest_framework import serializers

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


class TestQualityRequirementAttributeSpecIdValidation(unittest.TestCase):
    def _validate(self, instance, attribute_comparison) -> None:
        with patch.object(
            QualityRequirementSerializer, "_get_allowed_attribute_spec_ids", return_value={1, 2}
        ):
            QualityRequirementSerializer(instance)._validate_attribute_comparison_spec_ids(
                attribute_comparison, quality_settings=Mock()
            )

    def test_keeps_stored_rules_for_deleted_attributes(self) -> None:
        instance = SimpleNamespace(
            attribute_comparison={"rules": [{"spec_id": 4, "enabled": True}]},
        )

        self._validate(
            instance, {"rules": [{"spec_id": 4, "enabled": False}, {"spec_id": 1, "enabled": True}]}
        )

    def test_rejects_new_rules_for_unknown_attributes(self) -> None:
        instance = SimpleNamespace(
            attribute_comparison={"rules": [{"spec_id": 4, "enabled": True}]},
        )

        for owner in [None, instance]:
            with self.subTest(owner=owner):
                with self.assertRaises(serializers.ValidationError) as capture:
                    self._validate(owner, {"rules": [{"spec_id": 5, "enabled": True}]})

                self.assertEqual(
                    str(capture.exception.detail["attribute_comparison"]["rules"]),
                    "Unknown attribute spec id(s): 5.",
                )
