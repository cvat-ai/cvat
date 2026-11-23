# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from unittest.mock import patch

from django.test import SimpleTestCase, override_settings

from cvat.apps.growth import updates
from cvat.apps.growth.types import ContentKind


class UpdatesServiceTestCase(SimpleTestCase):
    @override_settings(CVAT_NEWS_EDITION="community")
    def test_hugo_announcements_are_limited_after_filtering_and_sorting(self) -> None:
        source = [
            {
                "id": f"post-{day}",
                "publishedAt": f"2000-01-{day:02d}T00:00:00Z",
                "editions": ["community"],
            }
            for day in range(1, 9)
        ]
        source.extend(
            [
                {"id": "future", "publishedAt": "9999-01-01T00:00:00Z", "editions": ["community"]},
                {"id": "other", "publishedAt": "2000-01-30T00:00:00Z", "editions": ["enterprise"]},
            ]
        )

        for limit in (2, 5):
            with (
                self.subTest(limit=limit),
                patch.object(updates, "_document", return_value=source),
                patch.object(updates, "ANNOUNCEMENT_LIMIT", limit),
            ):
                result = updates.entries(ContentKind.ANNOUNCEMENTS)

                self.assertEqual(
                    [item["id"] for item in result],
                    [f"post-{day}" for day in range(8, 8 - limit, -1)],
                )

    @override_settings(CVAT_NEWS_SOURCE_URL="http://docs.cvat.test:1313/docs/")
    def test_docs_urls_use_the_configured_source_and_subpath(self) -> None:
        markdown_url = "http://docs.cvat.test:1313/docs/release-notes/2.0.0/index.md"

        self.assertEqual(updates._docs_url("release-notes/2.0.0/index.md"), markdown_url)
        self.assertEqual(
            updates._content_path(markdown_url, ContentKind.RELEASE_NOTES),
            "release-notes/2.0.0/index.md",
        )
        self.assertEqual(
            updates._content_path("release-notes/2.0.0/index.md", ContentKind.RELEASE_NOTES),
            "release-notes/2.0.0/index.md",
        )
        self.assertEqual(
            updates._preview_media("images/preview.png"),
            "http://docs.cvat.test:1313/docs/images/preview.png",
        )
        self.assertEqual(
            updates._preview_media("https://cdn.example.com/preview.png"),
            "https://cdn.example.com/preview.png",
        )

    @override_settings(CVAT_NEWS_SOURCE_URL="http://docs.cvat.test:1313/docs/")
    def test_content_and_media_urls_keep_existing_validation(self) -> None:
        for value in (
            "http://other.example.com/docs/release-notes/2.0.0/index.md",
            "http://docs.cvat.test:1313/other/release-notes/2.0.0/index.md",
            "http://user:password@docs.cvat.test:1313/docs/release-notes/2.0.0/index.md",
            "release-notes/../2.0.0/index.md",
            "release-notes/2.0.0/index.md?token=example",
            "release-notes/2.0.0/index.md#heading",
        ):
            with self.subTest(value=value), self.assertRaises(ValueError):
                updates._content_path(value, ContentKind.RELEASE_NOTES)

        for value in (
            "http://other.example.com/preview.png",
            "https://user:password@cdn.example.com/preview.png",
            "javascript:alert(1)",
        ):
            with self.subTest(value=value), self.assertRaises(ValueError):
                updates._preview_media(value)

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
