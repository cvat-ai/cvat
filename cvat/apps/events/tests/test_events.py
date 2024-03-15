# Copyright (C) 2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
import unittest
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from django.contrib.auth import get_user_model
from django.test import RequestFactory

from cvat.apps.events.serializers import ClientEventsSerializer
from cvat.apps.organizations.models import Organization

class WorkingTimeTestCase(unittest.TestCase):
    _START_TIMESTAMP = datetime(2024, 1, 1, 12)
    _SHORT_GAP = ClientEventsSerializer._TIME_THRESHOLD - timedelta(milliseconds=1)
    _SHORT_GAP_INT = _SHORT_GAP / ClientEventsSerializer._WORKING_TIME_RESOLUTION
    _LONG_GAP = ClientEventsSerializer._TIME_THRESHOLD
    _LONG_GAP_INT = _LONG_GAP / ClientEventsSerializer._WORKING_TIME_RESOLUTION

    @staticmethod
    def _instant_event(timestamp: datetime) -> dict:
        return {
            "scope": "click:element",
            "timestamp": timestamp.isoformat(),
            "duration": 123,
        }

    @staticmethod
    def _compressed_event(timestamp: datetime, duration: timedelta) -> dict:
        return {
            "scope": "change:frame",
            "timestamp": timestamp.isoformat(),
            "duration": duration // ClientEventsSerializer._WORKING_TIME_RESOLUTION,
        }

    @staticmethod
    def _working_time(event: dict) -> int:
        payload = json.loads(event["payload"])
        return payload["working_time"]

    @staticmethod
    def _deserialize(events: List[dict], previous_event: Optional[dict] = None) -> List[dict]:
        request = RequestFactory().post("/api/events")
        request.user = get_user_model()(id=100, username="testuser", email="testuser@example.org")
        request.iam_context = {
            "organization": Organization(id=101, slug="testorg", name="Test Organization"),
        }

        s = ClientEventsSerializer(
            data={
                "events": events,
                "previous_event": previous_event,
                "timestamp": datetime.now(timezone.utc)
            },
            context={"request": request},
        )

        s.is_valid(raise_exception=True)

        return s.validated_data["events"]

    def test_instant(self):
        events = self._deserialize([
            self._instant_event(self._START_TIMESTAMP),
        ])
        self.assertEqual(self._working_time(events[0]), 0)

    def test_compressed(self):
        events = self._deserialize([
            self._compressed_event(self._START_TIMESTAMP, self._LONG_GAP),
        ])
        self.assertEqual(self._working_time(events[0]), self._LONG_GAP_INT)

    def test_instants_with_short_gap(self):
        events = self._deserialize([
            self._instant_event(self._START_TIMESTAMP),
            self._instant_event(self._START_TIMESTAMP + self._SHORT_GAP),
        ])
        self.assertEqual(self._working_time(events[0]), 0)
        self.assertEqual(self._working_time(events[1]), self._SHORT_GAP_INT)

    def test_instants_with_long_gap(self):
        events = self._deserialize([
            self._instant_event(self._START_TIMESTAMP),
            self._instant_event(self._START_TIMESTAMP + self._LONG_GAP),
        ])
        self.assertEqual(self._working_time(events[0]), 0)
        self.assertEqual(self._working_time(events[1]), 0)

    def test_compressed_with_short_gap(self):
        events = self._deserialize([
            self._compressed_event(self._START_TIMESTAMP, timedelta(seconds=1)),
            self._compressed_event(
                self._START_TIMESTAMP + timedelta(seconds=1) + self._SHORT_GAP,
                timedelta(seconds=5)
            ),
        ])
        self.assertEqual(self._working_time(events[0]), 1000)
        self.assertEqual(self._working_time(events[1]), self._SHORT_GAP_INT + 5000)

    def test_compressed_with_long_gap(self):
        events = self._deserialize([
            self._compressed_event(self._START_TIMESTAMP, timedelta(seconds=1)),
            self._compressed_event(
                self._START_TIMESTAMP + timedelta(seconds=1) + self._LONG_GAP,
                timedelta(seconds=5)
            ),
        ])
        self.assertEqual(self._working_time(events[0]), 1000)
        self.assertEqual(self._working_time(events[1]), 5000)

    def test_compressed_contained(self):
        events = self._deserialize([
            self._compressed_event(self._START_TIMESTAMP, timedelta(seconds=5)),
            self._compressed_event(
                self._START_TIMESTAMP + timedelta(seconds=3),
                timedelta(seconds=1)
            ),
        ])
        self.assertEqual(self._working_time(events[0]), 5000)
        self.assertEqual(self._working_time(events[1]), 0)

    def test_compressed_overlapping(self):
        events = self._deserialize([
            self._compressed_event(self._START_TIMESTAMP, timedelta(seconds=5)),
            self._compressed_event(
                self._START_TIMESTAMP + timedelta(seconds=3),
                timedelta(seconds=6)
            ),
        ])
        self.assertEqual(self._working_time(events[0]), 5000)
        self.assertEqual(self._working_time(events[1]), 4000)

    def test_instant_inside_compressed(self):
        events = self._deserialize([
            self._compressed_event(self._START_TIMESTAMP, timedelta(seconds=5)),
            self._instant_event(self._START_TIMESTAMP + timedelta(seconds=3)),
            self._instant_event(self._START_TIMESTAMP + timedelta(seconds=6)),
        ])
        self.assertEqual(self._working_time(events[0]), 5000)
        self.assertEqual(self._working_time(events[1]), 0)
        self.assertEqual(self._working_time(events[2]), 1000)

    def test_previous_instant_short_gap(self):
        events = self._deserialize(
            [self._instant_event(self._START_TIMESTAMP + self._SHORT_GAP)],
            previous_event=self._instant_event(self._START_TIMESTAMP),
        )

        self.assertEqual(self._working_time(events[0]), self._SHORT_GAP_INT)

    def test_previous_instant_long_gap(self):
        events = self._deserialize(
            [self._instant_event(self._START_TIMESTAMP + self._LONG_GAP)],
            previous_event=self._instant_event(self._START_TIMESTAMP),
        )

        self.assertEqual(self._working_time(events[0]), 0)

    def test_previous_compressed_short_gap(self):
        events = self._deserialize(
            [self._instant_event(self._START_TIMESTAMP + timedelta(seconds=1) + self._SHORT_GAP)],
            previous_event=self._compressed_event(self._START_TIMESTAMP, timedelta(seconds=1)),
        )

        self.assertEqual(self._working_time(events[0]), self._SHORT_GAP_INT)

    def test_previous_compressed_long_gap(self):
        events = self._deserialize(
            [self._instant_event(self._START_TIMESTAMP + timedelta(seconds=1) + self._LONG_GAP)],
            previous_event=self._compressed_event(self._START_TIMESTAMP, timedelta(seconds=1)),
        )

        self.assertEqual(self._working_time(events[0]), 0)
