# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import unittest
from datetime import datetime, timedelta, timezone
from typing import Optional

from django.contrib.auth import get_user_model
from django.test import RequestFactory

from cvat.apps.events.const import MAX_EVENT_DURATION, WORKING_TIME_RESOLUTION
from cvat.apps.events.serializers import ClientEventsSerializer
from cvat.apps.events.utils import compute_working_time_per_ids, is_contained
from cvat.apps.organizations.models import Organization


class WorkingTimeTestCase(unittest.TestCase):
    _START_TIMESTAMP = datetime(2024, 1, 1, 12)
    _SHORT_GAP = MAX_EVENT_DURATION - timedelta(milliseconds=1)
    _SHORT_GAP_INT = _SHORT_GAP / WORKING_TIME_RESOLUTION
    _LONG_GAP = MAX_EVENT_DURATION
    _LONG_GAP_INT = _LONG_GAP / WORKING_TIME_RESOLUTION

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
            "duration": duration // WORKING_TIME_RESOLUTION,
        }

    @staticmethod
    def _get_actual_working_times(data: dict) -> list[int]:
        data_copy = data.copy()
        working_times = []
        for event in data["events"]:
            data_copy["events"] = [event]
            event_working_time = compute_working_time_per_ids(data_copy)
            for working_time in event_working_time.values():
                working_times.append((working_time["value"] // WORKING_TIME_RESOLUTION))
            if data_copy["previous_event"] and is_contained(event, data_copy["previous_event"]):
                continue
            data_copy["previous_event"] = event
        return working_times

    @staticmethod
    def _deserialize(events: list[dict], previous_event: Optional[dict] = None) -> dict:
        request = RequestFactory().post("/api/events")
        request.user = get_user_model()(id=100, username="testuser", email="testuser@example.org")
        request.iam_context = {
            "organization": Organization(id=101, slug="testorg", name="Test Organization"),
        }

        s = ClientEventsSerializer(
            data={
                "events": events,
                "previous_event": previous_event,
                "timestamp": datetime.now(timezone.utc),
            },
            context={"request": request},
        )

        s.is_valid(raise_exception=True)

        return s.validated_data

    def test_instant(self):
        data = self._deserialize(
            [
                self._instant_event(self._START_TIMESTAMP),
            ]
        )
        event_times = self._get_actual_working_times(data)
        self.assertEqual(event_times[0], 0)

    def test_compressed(self):
        data = self._deserialize(
            [
                self._compressed_event(self._START_TIMESTAMP, self._LONG_GAP),
            ]
        )
        event_times = self._get_actual_working_times(data)
        self.assertEqual(event_times[0], self._LONG_GAP_INT)

    def test_instants_with_short_gap(self):
        data = self._deserialize(
            [
                self._instant_event(self._START_TIMESTAMP),
                self._instant_event(self._START_TIMESTAMP + self._SHORT_GAP),
            ]
        )
        event_times = self._get_actual_working_times(data)
        self.assertEqual(event_times[0], 0)
        self.assertEqual(event_times[1], self._SHORT_GAP_INT)

    def test_instants_with_long_gap(self):
        data = self._deserialize(
            [
                self._instant_event(self._START_TIMESTAMP),
                self._instant_event(self._START_TIMESTAMP + self._LONG_GAP),
            ]
        )

        event_times = self._get_actual_working_times(data)
        self.assertEqual(event_times[0], 0)
        self.assertEqual(event_times[1], 0)

    def test_compressed_with_short_gap(self):
        data = self._deserialize(
            [
                self._compressed_event(self._START_TIMESTAMP, timedelta(seconds=1)),
                self._compressed_event(
                    self._START_TIMESTAMP + timedelta(seconds=1) + self._SHORT_GAP,
                    timedelta(seconds=5),
                ),
            ]
        )

        event_times = self._get_actual_working_times(data)
        self.assertEqual(event_times[0], 1000)
        self.assertEqual(event_times[1], self._SHORT_GAP_INT + 5000)

    def test_compressed_with_long_gap(self):
        data = self._deserialize(
            [
                self._compressed_event(self._START_TIMESTAMP, timedelta(seconds=1)),
                self._compressed_event(
                    self._START_TIMESTAMP + timedelta(seconds=1) + self._LONG_GAP,
                    timedelta(seconds=5),
                ),
            ]
        )

        event_times = self._get_actual_working_times(data)
        self.assertEqual(event_times[0], 1000)
        self.assertEqual(event_times[1], 5000)

    def test_compressed_contained(self):
        data = self._deserialize(
            [
                self._compressed_event(self._START_TIMESTAMP, timedelta(seconds=5)),
                self._compressed_event(
                    self._START_TIMESTAMP + timedelta(seconds=3), timedelta(seconds=1)
                ),
            ]
        )

        event_times = self._get_actual_working_times(data)
        self.assertEqual(event_times[0], 5000)
        self.assertEqual(event_times[1], 0)

    def test_compressed_overlapping(self):
        data = self._deserialize(
            [
                self._compressed_event(self._START_TIMESTAMP, timedelta(seconds=5)),
                self._compressed_event(
                    self._START_TIMESTAMP + timedelta(seconds=3), timedelta(seconds=6)
                ),
            ]
        )

        event_times = self._get_actual_working_times(data)
        self.assertEqual(event_times[0], 5000)
        self.assertEqual(event_times[1], 4000)

    def test_instant_inside_compressed(self):
        data = self._deserialize(
            [
                self._compressed_event(self._START_TIMESTAMP, timedelta(seconds=5)),
                self._instant_event(self._START_TIMESTAMP + timedelta(seconds=3)),
                self._instant_event(self._START_TIMESTAMP + timedelta(seconds=6)),
            ]
        )

        event_times = self._get_actual_working_times(data)
        self.assertEqual(event_times[0], 5000)
        self.assertEqual(event_times[1], 0)
        self.assertEqual(event_times[2], 1000)

    def test_previous_instant_short_gap(self):
        data = self._deserialize(
            [self._instant_event(self._START_TIMESTAMP + self._SHORT_GAP)],
            previous_event=self._instant_event(self._START_TIMESTAMP),
        )
        event_times = self._get_actual_working_times(data)
        self.assertEqual(event_times[0], self._SHORT_GAP_INT)

    def test_previous_instant_long_gap(self):
        data = self._deserialize(
            [self._instant_event(self._START_TIMESTAMP + self._LONG_GAP)],
            previous_event=self._instant_event(self._START_TIMESTAMP),
        )
        event_times = self._get_actual_working_times(data)
        self.assertEqual(event_times[0], 0)

    def test_previous_compressed_short_gap(self):
        data = self._deserialize(
            [self._instant_event(self._START_TIMESTAMP + timedelta(seconds=1) + self._SHORT_GAP)],
            previous_event=self._compressed_event(self._START_TIMESTAMP, timedelta(seconds=1)),
        )
        event_times = self._get_actual_working_times(data)
        self.assertEqual(event_times[0], self._SHORT_GAP_INT)

    def test_previous_compressed_long_gap(self):
        data = self._deserialize(
            [self._instant_event(self._START_TIMESTAMP + timedelta(seconds=1) + self._LONG_GAP)],
            previous_event=self._compressed_event(self._START_TIMESTAMP, timedelta(seconds=1)),
        )
        event_times = self._get_actual_working_times(data)
        self.assertEqual(event_times[0], 0)
