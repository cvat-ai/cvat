# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from datetime import datetime, timedelta, timezone

from django.test import TestCase

from cvat.apps.growth.models import UserGrowthData
from cvat.apps.iam.models import User


class UserGrowthDataTestCase(TestCase):
    def setUp(self) -> None:
        self.user = User.objects.create_user(
            username="growth-user",
            date_joined=datetime(2026, 11, 19, 15, 30, tzinfo=timezone.utc),
        )
        self.cutoff = datetime(2026, 11, 18, 23, 59, 59, 999999, timezone.utc)

    def test_registration_initializes_announcement_cutoff(self) -> None:
        growth = UserGrowthData.objects.get(user=self.user)

        self.assertEqual(growth.last_seen_announcements_date, self.cutoff)
        self.assertEqual(growth.last_seen_release_notes_version, "")
        self.assertEqual(growth.github_prompt_shown_at, self.user.date_joined)

    def test_registration_day_is_computed_in_utc(self) -> None:
        user = User.objects.create_user(
            username="offset-user",
            date_joined=datetime(2026, 11, 19, 0, 30, tzinfo=timezone(timedelta(hours=4))),
        )

        self.assertEqual(
            UserGrowthData.objects.get(user=user).last_seen_announcements_date,
            datetime(2026, 11, 17, 23, 59, 59, 999999, timezone.utc),
        )

    def test_missing_growth_record_uses_registration_day(self) -> None:
        UserGrowthData.objects.filter(user=self.user).delete()

        growth = UserGrowthData.for_user(self.user)

        self.assertEqual(growth.last_seen_announcements_date, self.cutoff)

    def test_existing_seen_markers_are_preserved(self) -> None:
        for seen_at in (None, datetime(2026, 11, 19, 16, tzinfo=timezone.utc)):
            with self.subTest(seen_at=seen_at):
                UserGrowthData.objects.filter(user=self.user).update(
                    last_seen_announcements_date=seen_at, last_seen_release_notes_version="2.0.0"
                )

                growth = UserGrowthData.for_user(self.user)

                self.assertEqual(growth.last_seen_announcements_date, seen_at)
                self.assertEqual(growth.last_seen_release_notes_version, "2.0.0")
