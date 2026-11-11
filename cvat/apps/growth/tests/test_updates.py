# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Updates API regression coverage for https://github.com/cvat-ai/cvat/pull/11436."""

import json
from http import HTTPStatus
from typing import Any
from unittest.mock import MagicMock, patch

import requests
from django.conf import settings
from django.test import override_settings

from cvat import VERSION
from cvat.apps.engine.tests.utils import ApiTestBase
from cvat.apps.growth.models import UserGrowthData
from cvat.apps.growth.types import AnnouncementPreview, OnStale
from cvat.apps.growth.updates import UpdatesUnavailable
from cvat.apps.iam.models import User


def sample_provider(
    *, edition: str, limit: int, on_stale: OnStale | None = None
) -> list[AnnouncementPreview]:
    return []


@override_settings(
    CVAT_UPDATES_ENABLED=True,
    CVAT_UPDATES_EDITION="community",
    CVAT_UPDATES_SOURCE_URL="https://docs.example.com/",
    CVAT_UPDATES_PUBLIC_URL="https://docs.example.com/",
    CVAT_UPDATES_CACHE_TTL=900,
    CVAT_UPDATES_ANNOUNCEMENT_PROVIDER=None,
)
class UpdatesApiTestBase(ApiTestBase):
    def setUp(self) -> None:
        super().setUp()
        self.user = User.objects.create_user(username="updates-user", password="password")
        self.client.force_authenticate(user=self.user)
        self.edition = settings.CVAT_UPDATES_EDITION
        self.release = {
            "version": "2.0.0",
            "title": "Release",
            "description": "Release overview",
            "publishedAt": "2000-01-01T00:00:00Z",
            "announce": True,
            "editions": [self.edition, "other-edition"],
            "hasEditionSections": True,
            "highlights": [
                {"text": "Shared change", "editions": [self.edition, "other-edition"]},
                {"text": "Other edition change", "editions": ["other-edition"]},
            ],
            "markdownURL": "https://docs.example.com/release-notes/2.0.0/index.md",
        }
        self.announcement = {
            "id": "guide",
            "title": "Guide",
            "description": "Guide preview",
            "publishedAt": "2000-01-02T00:00:00Z",
            "popup": True,
            "editions": [self.edition, "other-edition"],
            "url": "https://docs.example.com/announcements/guide/",
            "markdownURL": "https://docs.example.com/announcements/guide/index.md",
        }
        self.documents = {
            "https://docs.example.com/release-notes/index.json": {
                "schemaVersion": 1,
                "entries": [self.release],
            },
            "https://docs.example.com/announcements/index.json": {
                "schemaVersion": 1,
                "entries": [self.announcement],
            },
        }
        self.session = MagicMock(spec=requests.Session)
        self.session.headers = {}
        self.session.__enter__.return_value = self.session
        self.session.get.side_effect = self.source_response
        sessions = patch(
            "cvat.apps.growth.updates.make_requests_session", return_value=self.session
        )
        sessions.start()
        self.addCleanup(sessions.stop)

    def source_response(self, url: str, **kwargs: Any) -> requests.Response:
        body = self.documents[url]
        if not isinstance(body, str):
            body = json.dumps(body)
        response = MagicMock(spec=requests.Response)
        response.__enter__.return_value = response
        response.status_code = HTTPStatus.OK
        response.headers = {}
        response.iter_content.return_value = [body.encode()]
        return response


class UpdatesApiTestCase(UpdatesApiTestBase):
    def test_can_filter_release_previews_by_edition_and_version(self) -> None:
        assert VERSION[:3] >= (2, 0, 0)
        entries = self.documents["https://docs.example.com/release-notes/index.json"]["entries"]
        entries.extend(
            [
                {**self.release, "version": "9999.0.0"},
                {**self.release, "version": "1.0.0", "editions": ["other-edition"]},
            ]
        )

        response = self.client.get("/api/updates")

        self.assertEqual(response.status_code, HTTPStatus.OK)
        self.assertEqual([item["version"] for item in response.data["releases"]], ["2.0.0"])
        self.assertEqual(response.data["releases"][0]["highlights"], ["Shared change"])
        self.assertEqual(response["Cache-Control"], "private, no-store")

    def test_deployment_can_supply_its_own_edition_identifier(self) -> None:
        custom_edition = "custom-edition"
        self.release["editions"] = [custom_edition]
        self.release["highlights"][0]["editions"] = [custom_edition]
        self.announcement["editions"] = [custom_edition]
        self.documents[self.release["markdownURL"]] = (
            f'<section data-cvat-editions="{custom_edition}"><h2>Matching change</h2></section>'
            '<section data-cvat-editions="other-edition"><h2>Other change</h2></section>'
        )

        with self.settings(CVAT_UPDATES_EDITION=custom_edition):
            response = self.client.get("/api/updates")
            content = self.client.get(
                "/api/updates/content", {"kind": "release-notes", "id": "2.0.0"}
            )

        self.assertEqual(response.status_code, HTTPStatus.OK)
        self.assertEqual(response.data["edition"], custom_edition)
        self.assertEqual(response.data["errors"], [])
        self.assertEqual(response.data["releases"][0]["highlights"], ["Shared change"])
        self.assertEqual(response.data["announcements"][0]["id"], "guide")
        self.assertEqual(content.status_code, HTTPStatus.OK)
        self.assertIn("Matching change", content.data["body"])
        self.assertNotIn("Other change", content.data["body"])

    @override_settings(CVAT_UPDATES_EDITION="invalid/edition")
    def test_invalid_edition_configuration_does_not_fetch_content(self) -> None:
        response = self.client.get("/api/updates")

        self.assertEqual(response.status_code, HTTPStatus.SERVICE_UNAVAILABLE)
        self.session.get.assert_not_called()

    def test_invalid_content_edition_keeps_announcement_state_unread(self) -> None:
        self.announcement["editions"] = ["invalid/edition"]

        response = self.client.get("/api/updates")

        self.assertEqual(response.status_code, HTTPStatus.OK)
        self.assertIn("announcements", response.data["errors"])
        self.assertFalse(response.data["canAcknowledgeAnnouncements"])
        self.assertIsNone(response.data["state"]["last_seen_announcements_date"])

    @override_settings(CVAT_UPDATES_ENABLED=False)
    def test_disabled_feature_does_not_fetch_content(self) -> None:
        response = self.client.get("/api/updates")

        self.assertEqual(response.status_code, HTTPStatus.NOT_FOUND)
        self.session.get.assert_not_called()

    def test_content_request_validates_kind_before_fetching(self) -> None:
        response = self.client.get("/api/updates/content", {"kind": "unknown", "id": "guide"})

        self.assertEqual(response.status_code, HTTPStatus.BAD_REQUEST)
        self.assertIn("kind", response.data)
        self.session.get.assert_not_called()

    def test_invalid_preview_media_keeps_announcement_state_unread(self) -> None:
        self.announcement["imageURL"] = 0

        response = self.client.get("/api/updates")

        self.assertEqual(response.status_code, HTTPStatus.OK)
        self.assertIn("announcements", response.data["errors"])
        self.assertFalse(response.data["canAcknowledgeAnnouncements"])
        self.assertIsNone(response.data["state"]["last_seen_announcements_date"])

    def test_can_read_only_matching_release_sections(self) -> None:
        self.documents[self.release["markdownURL"]] = (
            f'<section data-cvat-editions="{self.edition}"><h2>Current edition change</h2>'
            '<p data-cvat-availability="true">Available in: Current edition</p><p>Details</p></section>'
            '<section data-cvat-editions="other-edition"><h2>Other edition change</h2></section>'
        )

        response = self.client.get("/api/updates/content", {"kind": "release-notes", "id": "2.0.0"})

        self.assertEqual(response.status_code, HTTPStatus.OK)
        self.assertIn("Current edition change", response.data["body"])
        self.assertNotIn("Other edition change", response.data["body"])
        self.assertNotIn("Available in", response.data["body"])

    def test_can_reuse_cached_source_documents(self) -> None:
        first = self.client.get("/api/updates")
        self.assertEqual(first.status_code, HTTPStatus.OK)
        self.assertEqual(self.session.get.call_count, 2)
        self.session.get.side_effect = AssertionError("A fresh document must not be fetched again")

        second = self.client.get("/api/updates")

        self.assertEqual(second.status_code, HTTPStatus.OK)
        self.assertEqual(second.data, first.data)

    @override_settings(CVAT_UPDATES_CACHE_TTL=0)
    def test_stale_announcements_cannot_advance_seen_marker(self) -> None:
        initial = self.client.get("/api/updates")
        self.assertTrue(initial.data["canAcknowledgeAnnouncements"])
        self.session.get.side_effect = requests.ConnectionError("Source is unavailable")

        stale = self.client.get("/api/updates")
        acknowledged = self.client.post(
            "/api/updates/acknowledge",
            {"announcements_seen_at": self.announcement["publishedAt"]},
            format="json",
        )

        self.assertEqual(stale.status_code, HTTPStatus.OK)
        self.assertEqual(stale.data["announcements"][0]["id"], "guide")
        self.assertFalse(stale.data["canAcknowledgeAnnouncements"])
        self.assertEqual(acknowledged.status_code, HTTPStatus.SERVICE_UNAVAILABLE)
        self.assertIsNone(UserGrowthData.objects.get(user=self.user).last_seen_announcements_date)

    def test_seen_markers_cannot_move_backwards(self) -> None:
        entries = self.documents["https://docs.example.com/release-notes/index.json"]["entries"]
        entries.append({**self.release, "version": "1.0.0"})
        announcements = self.documents["https://docs.example.com/announcements/index.json"][
            "entries"
        ]
        announcements.append(
            {
                **self.announcement,
                "id": "older",
                "publishedAt": "2000-01-01T00:00:00Z",
                "markdownURL": "https://docs.example.com/announcements/older/index.md",
                "url": "https://docs.example.com/announcements/older/",
            }
        )
        first = self.client.post(
            "/api/updates/acknowledge",
            {"release_version": "2.0.0", "announcements_seen_at": self.announcement["publishedAt"]},
            format="json",
        )
        self.assertEqual(first.status_code, HTTPStatus.OK)

        older = self.client.post(
            "/api/updates/acknowledge",
            {"release_version": "1.0.0", "announcements_seen_at": "2000-01-01T00:00:00Z"},
            format="json",
        )

        self.assertEqual(older.status_code, HTTPStatus.OK)
        self.assertEqual(older.data, first.data)

    def test_growth_patch_cannot_change_seen_markers(self) -> None:
        growth = self.client.get("/api/growth", {"user_id": self.user.id}).data["results"][0]

        response = self.client.patch(
            f"/api/growth/{growth['id']}",
            {
                "last_seen_release_notes_version": "9999.0.0",
                "promotion_notifications_allowed": False,
            },
            format="json",
        )

        self.assertEqual(response.status_code, HTTPStatus.OK)
        self.assertIsNone(response.data["last_seen_release_notes_version"])
        self.assertFalse(response.data["promotion_notifications_allowed"])

    def test_cannot_acknowledge_an_unpublished_release(self) -> None:
        response = self.client.post(
            "/api/updates/acknowledge", {"release_version": "9999.0.0"}, format="json"
        )

        self.assertEqual(response.status_code, HTTPStatus.BAD_REQUEST)
        self.assertIsNone(
            UserGrowthData.objects.get(user=self.user).last_seen_release_notes_version
        )

    @override_settings(
        CVAT_UPDATES_ANNOUNCEMENT_PROVIDER="cvat.apps.growth.tests.test_updates.sample_provider"
    )
    def test_latest_five_announcements_are_sorted_by_publication(self) -> None:
        previews = [
            {
                **self.announcement,
                "id": f"post-{day}",
                "url": f"https://website.example.com/{day}/",
                "publishedAt": f"2000-01-{day:02d}T00:00:00Z",
            }
            for day in range(3, 9)
        ]

        with patch(__name__ + ".sample_provider", return_value=previews):
            response = self.client.get("/api/updates")

        self.assertEqual(response.status_code, HTTPStatus.OK)
        self.assertEqual(
            [item["id"] for item in response.data["announcements"]],
            ["post-8", "post-7", "post-6", "post-5", "post-4"],
        )

    @override_settings(
        CVAT_UPDATES_ANNOUNCEMENT_PROVIDER="cvat.apps.growth.tests.test_updates.sample_provider"
    )
    def test_duplicate_article_keeps_hugo_copy_and_latest_publication(self) -> None:
        preview = {
            **self.announcement,
            "id": "website-guide",
            "url": self.announcement["url"].rstrip("/") + "?campaign=website",
            "publishedAt": "2000-01-03T00:00:00Z",
        }

        with patch(__name__ + ".sample_provider", return_value=[preview]):
            response = self.client.get("/api/updates")

        self.assertEqual(response.status_code, HTTPStatus.OK)
        self.assertEqual(len(response.data["announcements"]), 1)
        self.assertEqual(response.data["announcements"][0]["id"], "guide")
        self.assertEqual(response.data["announcements"][0]["source"], "hugo")
        self.assertEqual(response.data["announcements"][0]["publishedAt"], preview["publishedAt"])

    @override_settings(
        CVAT_UPDATES_ANNOUNCEMENT_PROVIDER="cvat.apps.growth.tests.test_updates.sample_provider"
    )
    def test_failed_provider_keeps_hugo_announcements_available(self) -> None:
        with patch(__name__ + ".sample_provider", side_effect=UpdatesUnavailable()):
            response = self.client.get("/api/updates")

        self.assertEqual(response.status_code, HTTPStatus.OK)
        self.assertEqual(response.data["errors"], ["external-announcements"])
        self.assertEqual(response.data["announcements"][0]["id"], "guide")
        self.assertFalse(response.data["canAcknowledgeAnnouncements"])
