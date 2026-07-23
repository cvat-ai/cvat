# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import unittest

from cvat.apps.quality_control.attribute_comparators import (
    format_attribute_comparator_names,
    get_attribute_comparator_names,
)
from cvat.apps.quality_control.serializers import AttributeComparisonSerializer


class TestAttributeComparatorPresentation(unittest.TestCase):
    def test_comparator_names_are_sorted_for_api_presentation(self) -> None:
        names = get_attribute_comparator_names()

        self.assertEqual(names, tuple(sorted(names)))
        self.assertEqual(format_attribute_comparator_names(), "'exact' or 'levenshtein'")


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
