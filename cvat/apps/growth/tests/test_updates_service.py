# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from unittest.mock import patch

from django.test import SimpleTestCase, override_settings

from cvat.apps.growth import updates
from cvat.apps.growth.types import ContentKind


class UpdatesServiceTestCase(SimpleTestCase):
    def test_version_parts_returns_three_integers_and_rejects_invalid_versions(self) -> None:
        self.assertEqual(updates.version_parts("2.81.0"), (2, 81, 0))
        for value in (None, 281, "2.81", "2.81.0.1", "2.81.x", "2.81.0-dev"):
            with self.subTest(value=value), self.assertRaises(ValueError):
                updates.version_parts(value)

    @override_settings(CVAT_NEWS_EDITION="community")
    def test_filtered_entries_do_not_share_nested_data_with_the_cached_document(self) -> None:
        source = {
            "version": "2.0.0",
            "title": "Release",
            "description": "Release overview",
            "publishedAt": "2000-01-01T00:00:00Z",
            "editions": ["community"],
            "highlights": [{"text": "Shared change", "editions": ["community"]}],
        }
        with patch.object(updates, "_document", return_value=[source]):
            result = updates.entries(ContentKind.RELEASE_NOTES)

        result[0]["editions"].append("another-edition")
        result[0]["highlights"].append("Another change")
        self.assertEqual(source["editions"], ["community"])
        self.assertEqual(
            source["highlights"], [{"text": "Shared change", "editions": ["community"]}]
        )
