# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Updates API regression coverage for https://github.com/cvat-ai/cvat/pull/11436."""

import json
from datetime import datetime, timezone
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
    CVAT_NEWS_ENABLED=True,
    CVAT_NEWS_EDITION="community",
    CVAT_NEWS_SOURCE_URL="https://docs.example.com/",
    CVAT_NEWS_CACHE_TTL=900,
    CVAT_NEWS_ANNOUNCEMENT_PROVIDER=None,
)
class UpdatesApiTestBase(ApiTestBase):
    def setUp(self) -> None:
        super().setUp()
        self.user = User.objects.create_user(
            username="updates-user",
            password="password",
            date_joined=datetime(2000, 1, 2, 12, tzinfo=timezone.utc),
        )
        self.initial_announcements_cutoff = datetime(2000, 1, 1, 23, 59, 59, 999999, timezone.utc)
        self.client.force_authenticate(user=self.user)
        self.edition = settings.CVAT_NEWS_EDITION
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
            "announce": True,
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
    def test_unauthenticated_requests_do_not_load_or_create_growth_data(self) -> None:
        self.client.force_authenticate(user=None)

        with patch.object(UserGrowthData, "for_user") as for_user:
            response = self.client.get("/api/whats-new/summary")
            acknowledged = self.client.post("/api/whats-new/acknowledge", {}, format="json")

        self.assertEqual(response.status_code, HTTPStatus.UNAUTHORIZED)
        self.assertEqual(acknowledged.status_code, HTTPStatus.UNAUTHORIZED)
        for_user.assert_not_called()
        self.session.get.assert_not_called()

    def test_api_uses_snake_case_without_changing_the_hugo_feed(self) -> None:
        self.announcement.update(
            imageURL="https://docs.example.com/images/preview.png",
            videoURL="https://docs.example.com/videos/preview.mp4",
            imageAlt="Announcement preview",
        )

        response = self.client.get("/api/whats-new/summary")

        self.assertEqual(response.status_code, HTTPStatus.OK)
        release = response.data["latest_release"]
        announcement = response.data["announcements"][0]
        self.assertEqual(
            datetime.fromisoformat(release["published_at"]),
            datetime.fromisoformat(self.release["publishedAt"]),
        )
        self.assertEqual(release["markdown_url"], self.release["markdownURL"])
        self.assertTrue(release["has_edition_sections"])
        self.assertEqual(
            datetime.fromisoformat(announcement["published_at"]),
            datetime.fromisoformat(self.announcement["publishedAt"]),
        )
        self.assertEqual(announcement["markdown_url"], self.announcement["markdownURL"])
        self.assertEqual(announcement["image_url"], self.announcement["imageURL"])
        self.assertEqual(announcement["video_url"], self.announcement["videoURL"])
        self.assertEqual(announcement["image_alt"], self.announcement["imageAlt"])
        for key, path in (
            ("release_history_url", "release-notes/"),
            ("announcement_history_url", "announcements/"),
            ("updates_history_url", "updates/"),
        ):
            self.assertEqual(response.data[key], f"https://docs.example.com/{path}")
        for item in (response.data, response.data["state"], release, announcement):
            self.assertTrue(all(key == key.lower() for key in item), item)

    def test_new_user_starts_from_registration_day_and_has_empty_release_version(self) -> None:
        response = self.client.get("/api/whats-new/summary")

        self.assertEqual(response.status_code, HTTPStatus.OK)
        self.assertEqual(response.data["state"]["last_seen_release_notes_version"], "")
        self.assertEqual(
            datetime.fromisoformat(response.data["state"]["last_seen_announcements_date"]),
            self.initial_announcements_cutoff,
        )

    def test_registration_cutoff_keeps_older_announcement_previews_available(self) -> None:
        self.documents["https://docs.example.com/announcements/index.json"]["entries"].append(
            {
                **self.announcement,
                "id": "older",
                "publishedAt": "2000-01-01T12:00:00Z",
                "markdownURL": "https://docs.example.com/announcements/older/index.md",
            }
        )

        response = self.client.get("/api/whats-new/summary")

        self.assertEqual(response.status_code, HTTPStatus.OK)
        self.assertEqual(
            [item["id"] for item in response.data["announcements"]], ["guide", "older"]
        )
        self.assertEqual(
            datetime.fromisoformat(response.data["state"]["last_seen_announcements_date"]),
            self.initial_announcements_cutoff,
        )

    def test_can_filter_release_previews_by_edition_and_version(self) -> None:
        assert VERSION[:3] >= (2, 0, 0)
        entries = self.documents["https://docs.example.com/release-notes/index.json"]["entries"]
        entries.extend(
            [
                {**self.release, "version": "9999.0.0"},
                {**self.release, "version": "1.0.0", "editions": ["other-edition"]},
            ]
        )

        response = self.client.get("/api/whats-new/summary")

        self.assertEqual(response.status_code, HTTPStatus.OK)
        self.assertEqual(response.data["latest_release"]["version"], "2.0.0")
        self.assertEqual(response.data["latest_announced_release"]["version"], "2.0.0")
        self.assertEqual(response.data["latest_release"]["highlights"], ["Shared change"])
        self.assertEqual(response["Cache-Control"], "private, no-store")

    def test_summary_keeps_only_latest_and_latest_announced_releases(self) -> None:
        self.documents["https://docs.example.com/release-notes/index.json"]["entries"] = [
            {**self.release, "version": f"2.0.{patch}", "announce": patch == 1}
            for patch in range(1, 21)
        ]
        UserGrowthData.objects.filter(user=self.user).update(
            last_seen_release_notes_version="2.0.0"
        )

        response = self.client.get("/api/whats-new/summary")

        self.assertEqual(response.status_code, HTTPStatus.OK)
        self.assertNotIn("releases", response.data)
        self.assertEqual(response.data["latest_release"]["version"], "2.0.20")
        self.assertFalse(response.data["latest_release"]["announce"])
        self.assertEqual(response.data["latest_announced_release"]["version"], "2.0.1")
        self.assertTrue(response.data["latest_announced_release"]["announce"])
        self.assertEqual(response.data["state"]["last_seen_release_notes_version"], "2.0.0")
        self.assertNotIn("contentPath", response.data["latest_release"])
        self.assertNotIn("contentPath", response.data["latest_announced_release"])

        acknowledged = self.client.post(
            "/api/whats-new/acknowledge", {"release_version": "2.0.1"}, format="json"
        )

        self.assertEqual(acknowledged.status_code, HTTPStatus.OK)
        self.assertEqual(acknowledged.data["last_seen_release_notes_version"], "2.0.1")

    def test_summary_without_announced_release_keeps_latest_release_for_manual_opening(
        self,
    ) -> None:
        self.release["announce"] = False

        response = self.client.get("/api/whats-new/summary")

        self.assertEqual(response.status_code, HTTPStatus.OK)
        self.assertEqual(response.data["latest_release"]["version"], self.release["version"])
        self.assertIsNone(response.data["latest_announced_release"])
        self.assertEqual(response.data["unavailable_sources"], [])

    def test_summary_without_eligible_releases_keeps_announcements_available(self) -> None:
        self.release["editions"] = ["other-edition"]

        response = self.client.get("/api/whats-new/summary")

        self.assertEqual(response.status_code, HTTPStatus.OK)
        self.assertIsNone(response.data["latest_release"])
        self.assertIsNone(response.data["latest_announced_release"])
        self.assertEqual(response.data["announcements"][0]["id"], "guide")
        self.assertEqual(response.data["unavailable_sources"], [])

    def test_failed_release_source_keeps_announcements_available(self) -> None:
        self.documents["https://docs.example.com/release-notes/index.json"] = "invalid JSON"

        response = self.client.get("/api/whats-new/summary")

        self.assertEqual(response.status_code, HTTPStatus.OK)
        self.assertIsNone(response.data["latest_release"])
        self.assertIsNone(response.data["latest_announced_release"])
        self.assertEqual(response.data["announcements"][0]["id"], "guide")
        self.assertEqual(response.data["unavailable_sources"], ["hugo"])

    def test_failures_of_both_hugo_feeds_report_the_source_once(self) -> None:
        self.documents["https://docs.example.com/release-notes/index.json"] = "invalid JSON"
        self.documents["https://docs.example.com/announcements/index.json"] = "invalid JSON"

        response = self.client.get("/api/whats-new/summary")

        self.assertEqual(response.status_code, HTTPStatus.OK)
        self.assertEqual(response.data["unavailable_sources"], ["hugo"])
        self.assertNotIn("errors", response.data)

    @override_settings(
        CVAT_NEWS_ANNOUNCEMENT_PROVIDER="cvat.apps.growth.tests.test_updates.sample_provider"
    )
    def test_failed_hugo_announcements_keep_external_previews_available(self) -> None:
        self.documents["https://docs.example.com/announcements/index.json"] = "invalid JSON"
        preview = {**self.announcement, "id": "website", "url": "https://website.example.com/post/"}

        with patch(__name__ + ".sample_provider", return_value=[preview]):
            response = self.client.get("/api/whats-new/summary")

        self.assertEqual(response.status_code, HTTPStatus.OK)
        self.assertEqual(response.data["unavailable_sources"], ["hugo"])
        self.assertEqual(response.data["announcements"][0]["source"], "external")

    @override_settings(
        CVAT_NEWS_ANNOUNCEMENT_PROVIDER="cvat.apps.growth.tests.test_updates.sample_provider"
    )
    def test_failures_of_all_feeds_report_both_sources(self) -> None:
        self.documents["https://docs.example.com/release-notes/index.json"] = "invalid JSON"
        self.documents["https://docs.example.com/announcements/index.json"] = "invalid JSON"

        with patch(__name__ + ".sample_provider", side_effect=UpdatesUnavailable()):
            response = self.client.get("/api/whats-new/summary")

        self.assertEqual(response.status_code, HTTPStatus.OK)
        self.assertEqual(response.data["unavailable_sources"], ["external", "hugo"])

    def test_deployment_can_supply_its_own_edition_identifier(self) -> None:
        custom_edition = "custom-edition"
        self.release["editions"] = [custom_edition]
        self.release["highlights"][0]["editions"] = [custom_edition]
        self.announcement["editions"] = [custom_edition]

        with self.settings(CVAT_NEWS_EDITION=custom_edition):
            response = self.client.get("/api/whats-new/summary")

        self.assertEqual(response.status_code, HTTPStatus.OK)
        self.assertEqual(response.data["edition"], custom_edition)
        self.assertEqual(response.data["unavailable_sources"], [])
        self.assertEqual(response.data["latest_release"]["highlights"], ["Shared change"])
        self.assertEqual(response.data["announcements"][0]["id"], "guide")

    @override_settings(CVAT_NEWS_EDITION="invalid/edition")
    def test_invalid_edition_configuration_does_not_fetch_content(self) -> None:
        response = self.client.get("/api/whats-new/summary")

        self.assertEqual(response.status_code, HTTPStatus.SERVICE_UNAVAILABLE)
        self.session.get.assert_not_called()

    def test_invalid_content_edition_keeps_announcement_state_unread(self) -> None:
        self.announcement["editions"] = ["invalid/edition"]

        response = self.client.get("/api/whats-new/summary")

        self.assertEqual(response.status_code, HTTPStatus.OK)
        self.assertIn("hugo", response.data["unavailable_sources"])
        self.assertEqual(
            datetime.fromisoformat(response.data["state"]["last_seen_announcements_date"]),
            self.initial_announcements_cutoff,
        )

    @override_settings(CVAT_NEWS_ENABLED=False)
    def test_disabled_feature_does_not_fetch_content(self) -> None:
        response = self.client.get("/api/whats-new/summary")

        self.assertEqual(response.status_code, HTTPStatus.NOT_FOUND)
        self.session.get.assert_not_called()

    def test_invalid_preview_media_keeps_announcement_state_unread(self) -> None:
        self.announcement["imageURL"] = 0

        response = self.client.get("/api/whats-new/summary")

        self.assertEqual(response.status_code, HTTPStatus.OK)
        self.assertIn("hugo", response.data["unavailable_sources"])
        self.assertEqual(
            datetime.fromisoformat(response.data["state"]["last_seen_announcements_date"]),
            self.initial_announcements_cutoff,
        )

    def test_can_reuse_cached_source_documents(self) -> None:
        first = self.client.get("/api/whats-new/summary")
        self.assertEqual(first.status_code, HTTPStatus.OK)
        self.assertEqual(self.session.get.call_count, 2)
        self.session.get.side_effect = AssertionError("A fresh document must not be fetched again")

        second = self.client.get("/api/whats-new/summary")

        self.assertEqual(second.status_code, HTTPStatus.OK)
        self.assertEqual(second.data, first.data)

    def test_changing_source_updates_fetches_and_links_without_reusing_the_old_cache(self) -> None:
        initial = self.client.get("/api/whats-new/summary")
        self.assertEqual(initial.status_code, HTTPStatus.OK)
        self.session.get.reset_mock()
        source = "https://news.example.com/docs/"
        self.documents = {
            url.replace("https://docs.example.com/", source): json.loads(
                json.dumps(document).replace("https://docs.example.com/", source)
            )
            for url, document in self.documents.items()
        }

        with self.settings(CVAT_NEWS_SOURCE_URL=source):
            response = self.client.get("/api/whats-new/summary")

        self.assertEqual(response.status_code, HTTPStatus.OK)
        self.assertEqual(response.data["unavailable_sources"], [])
        self.assertEqual(self.session.get.call_count, 2)
        self.assertTrue(
            all(call.args[0].startswith(source) for call in self.session.get.call_args_list)
        )
        self.assertEqual(response.data["updates_history_url"], source + "updates/")
        self.assertEqual(response.data["latest_release"]["url"], source + "release-notes/2.0.0/")
        self.assertEqual(response.data["announcements"][0]["url"], source + "announcements/guide/")

    @override_settings(CVAT_NEWS_CACHE_TTL=0)
    def test_stale_release_notes_remain_available_and_report_hugo(
        self,
    ) -> None:
        initial = self.client.get("/api/whats-new/summary")
        self.assertEqual(initial.status_code, HTTPStatus.OK)

        def source_response(url: str, **kwargs: Any) -> requests.Response:
            if url.endswith("release-notes/index.json"):
                raise requests.ConnectionError("Release notes are unavailable")
            return self.source_response(url, **kwargs)

        self.session.get.side_effect = source_response

        response = self.client.get("/api/whats-new/summary")

        self.assertEqual(response.status_code, HTTPStatus.OK)
        self.assertEqual(response.data["unavailable_sources"], ["hugo"])
        self.assertEqual(response.data["latest_release"], initial.data["latest_release"])

    @override_settings(CVAT_NEWS_CACHE_TTL=0)
    def test_stale_announcements_remain_available_and_report_hugo(self) -> None:
        initial = self.client.get("/api/whats-new/summary")
        self.assertEqual(initial.status_code, HTTPStatus.OK)
        self.session.get.side_effect = requests.ConnectionError("Source is unavailable")

        stale = self.client.get("/api/whats-new/summary")
        self.assertEqual(stale.status_code, HTTPStatus.OK)
        self.assertEqual(stale.data["announcements"][0]["id"], "guide")
        self.assertEqual(stale.data["unavailable_sources"], ["hugo"])
        self.assertEqual(
            UserGrowthData.objects.get(user=self.user).last_seen_announcements_date,
            self.initial_announcements_cutoff,
        )

    def test_can_acknowledge_displayed_announcements_after_the_source_becomes_unavailable(
        self,
    ) -> None:
        initial = self.client.get("/api/whats-new/summary")
        self.session.get.reset_mock()
        self.session.get.side_effect = requests.ConnectionError("Source is unavailable")

        with patch(
            "cvat.apps.growth.updates.announcement_feed",
            side_effect=AssertionError("Acknowledgement must not reload the feed"),
        ):
            response = self.client.post(
                "/api/whats-new/acknowledge",
                {"announcements_seen_at": initial.data["announcements"][0]["published_at"]},
                format="json",
            )

        self.assertEqual(response.status_code, HTTPStatus.OK)
        self.assertEqual(
            UserGrowthData.objects.get(user=self.user).last_seen_announcements_date,
            datetime(2000, 1, 2, tzinfo=timezone.utc),
        )
        self.session.get.assert_not_called()

    def test_can_save_the_seen_timestamp_when_the_entry_is_no_longer_in_the_feed(self) -> None:
        self.documents["https://docs.example.com/announcements/index.json"]["entries"] = []

        response = self.client.post(
            "/api/whats-new/acknowledge",
            {"announcements_seen_at": self.announcement["publishedAt"]},
            format="json",
        )

        self.assertEqual(response.status_code, HTTPStatus.OK)
        self.assertEqual(
            UserGrowthData.objects.get(user=self.user).last_seen_announcements_date,
            datetime(2000, 1, 2, tzinfo=timezone.utc),
        )
        self.session.get.assert_not_called()

    def test_cannot_save_invalid_or_future_seen_timestamps(self) -> None:
        for timestamp in ("invalid", None, "9999-01-01T00:00:00Z"):
            with self.subTest(timestamp=timestamp):
                response = self.client.post(
                    "/api/whats-new/acknowledge",
                    {"announcements_seen_at": timestamp},
                    format="json",
                )

                self.assertEqual(response.status_code, HTTPStatus.BAD_REQUEST)
                self.assertIn("announcements_seen_at", response.data)
                self.assertEqual(
                    UserGrowthData.objects.get(user=self.user).last_seen_announcements_date,
                    self.initial_announcements_cutoff,
                )
        self.session.get.assert_not_called()

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
            "/api/whats-new/acknowledge",
            {
                "release_version": "2.0.0",
                "announcements_seen_at": self.announcement["publishedAt"],
            },
            format="json",
        )
        self.assertEqual(first.status_code, HTTPStatus.OK)

        older = self.client.post(
            "/api/whats-new/acknowledge",
            {
                "release_version": "1.0.0",
                "announcements_seen_at": "2000-01-01T00:00:00Z",
            },
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
        self.assertEqual(response.data["last_seen_release_notes_version"], "")
        self.assertFalse(response.data["promotion_notifications_allowed"])

    def test_cannot_acknowledge_an_unpublished_release(self) -> None:
        response = self.client.post(
            "/api/whats-new/acknowledge",
            {"release_version": "9999.0.0"},
            format="json",
        )

        self.assertEqual(response.status_code, HTTPStatus.BAD_REQUEST)
        self.assertEqual(
            UserGrowthData.objects.get(user=self.user).last_seen_release_notes_version,
            "",
        )

    def test_cannot_acknowledge_releases_for_a_newer_version_or_another_edition(self) -> None:
        self.documents["https://docs.example.com/release-notes/index.json"]["entries"].extend(
            [
                {**self.release, "version": "9999.0.0"},
                {**self.release, "version": "1.0.0", "editions": ["other-edition"]},
            ]
        )

        for version in ("9999.0.0", "1.0.0"):
            with self.subTest(version=version):
                response = self.client.post(
                    "/api/whats-new/acknowledge", {"release_version": version}, format="json"
                )

                self.assertEqual(response.status_code, HTTPStatus.BAD_REQUEST)
                self.assertEqual(
                    UserGrowthData.objects.get(user=self.user).last_seen_release_notes_version, ""
                )

    @override_settings(
        CVAT_NEWS_ANNOUNCEMENT_PROVIDER="cvat.apps.growth.tests.test_updates.sample_provider"
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
            response = self.client.get("/api/whats-new/summary")

        self.assertEqual(response.status_code, HTTPStatus.OK)
        self.assertEqual(
            [item["id"] for item in response.data["announcements"]],
            ["post-8", "post-7", "post-6", "post-5", "post-4"],
        )

    @override_settings(
        CVAT_NEWS_ANNOUNCEMENT_PROVIDER="cvat.apps.growth.tests.test_updates.sample_provider"
    )
    def test_duplicate_article_keeps_hugo_copy_and_latest_publication(self) -> None:
        self.announcement["announce"] = False
        preview = {
            **self.announcement,
            "id": "website-guide",
            "url": self.announcement["url"].rstrip("/") + "?campaign=website",
            "publishedAt": "2000-01-03T00:00:00Z",
            "announce": True,
        }

        with patch(__name__ + ".sample_provider", return_value=[preview]):
            response = self.client.get("/api/whats-new/summary")

        self.assertEqual(response.status_code, HTTPStatus.OK)
        self.assertEqual(len(response.data["announcements"]), 1)
        self.assertEqual(response.data["announcements"][0]["id"], "guide")
        self.assertEqual(response.data["announcements"][0]["source"], "hugo")
        self.assertEqual(response.data["announcements"][0]["published_at"], preview["publishedAt"])
        self.assertTrue(response.data["announcements"][0]["announce"])

    @override_settings(
        CVAT_NEWS_ANNOUNCEMENT_PROVIDER="cvat.apps.growth.tests.test_updates.sample_provider"
    )
    def test_failed_provider_keeps_hugo_announcements_available(self) -> None:
        with patch(__name__ + ".sample_provider", side_effect=UpdatesUnavailable()):
            response = self.client.get("/api/whats-new/summary")

        self.assertEqual(response.status_code, HTTPStatus.OK)
        self.assertEqual(response.data["unavailable_sources"], ["external"])
        self.assertEqual(response.data["announcements"][0]["id"], "guide")

    @override_settings(
        CVAT_NEWS_ANNOUNCEMENT_PROVIDER="cvat.apps.growth.tests.test_updates.sample_provider"
    )
    def test_displayed_announcements_can_be_acknowledged_when_another_source_is_unavailable(
        self,
    ) -> None:
        with patch(__name__ + ".sample_provider", side_effect=UpdatesUnavailable()):
            displayed = self.client.get("/api/whats-new/summary")
            self.assertEqual(displayed.status_code, HTTPStatus.OK)
            self.assertEqual(displayed.data["unavailable_sources"], ["external"])
            timestamp = displayed.data["announcements"][0]["published_at"]

            acknowledged = self.client.post(
                "/api/whats-new/acknowledge",
                {"announcements_seen_at": timestamp},
                format="json",
            )
            reloaded = self.client.get("/api/whats-new/summary")

        self.assertEqual(acknowledged.status_code, HTTPStatus.OK)
        self.assertEqual(reloaded.status_code, HTTPStatus.OK)
        self.assertEqual(reloaded.data["unavailable_sources"], ["external"])
        self.assertNotIn("can_acknowledge_announcements", reloaded.data)
        self.assertEqual(
            datetime.fromisoformat(reloaded.data["state"]["last_seen_announcements_date"]),
            datetime.fromisoformat(timestamp),
        )
        self.assertEqual(reloaded.data["announcements"], displayed.data["announcements"])
