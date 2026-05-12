# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
import unittest
from datetime import datetime, timedelta, timezone
from unittest import mock

from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import RequestFactory, override_settings

from cvat.apps.events.const import MAX_EVENT_DURATION, WORKING_TIME_RESOLUTION
from cvat.apps.events.event import add_remote_addr_to_payload, get_remote_addr
from cvat.apps.events.handlers import request_info
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
                working_times.append(working_time["value"] // WORKING_TIME_RESOLUTION)
            if data_copy["previous_event"] and is_contained(event, data_copy["previous_event"]):
                continue
            data_copy["previous_event"] = event
        return working_times

    @staticmethod
    def _deserialize(events: list[dict], previous_event: dict | None = None) -> dict:
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


def _rest_framework_settings(*, num_proxies):
    return {
        **settings.REST_FRAMEWORK,
        "NUM_PROXIES": num_proxies,
    }


class EventRemoteAddrTestCase(unittest.TestCase):
    def setUp(self):
        self.factory = RequestFactory()

    def _request(self, *, x_forwarded_for=None, remote_addr="203.0.113.10"):
        extra = {"REMOTE_ADDR": remote_addr}
        if x_forwarded_for is not None:
            extra["HTTP_X_FORWARDED_FOR"] = x_forwarded_for
        return self.factory.post("/api/events", **extra)

    @override_settings(REST_FRAMEWORK=_rest_framework_settings(num_proxies=None))
    def test_get_remote_addr_uses_remote_addr_without_forwarded_for(self):
        request = self._request(remote_addr="203.0.113.10")

        self.assertEqual(get_remote_addr(request), "203.0.113.10")

    @override_settings(REST_FRAMEWORK=_rest_framework_settings(num_proxies=0))
    def test_get_remote_addr_ignores_forwarded_for_when_num_proxies_is_zero(self):
        request = self._request(
            x_forwarded_for="198.51.100.1, 198.51.100.2",
            remote_addr="203.0.113.10",
        )

        self.assertEqual(get_remote_addr(request), "203.0.113.10")

    @override_settings(REST_FRAMEWORK=_rest_framework_settings(num_proxies=2))
    def test_get_remote_addr_uses_base_throttle_ident_for_forwarded_for(self):
        request = self._request(
            x_forwarded_for="198.51.100.1, 198.51.100.2, 198.51.100.3",
            remote_addr="203.0.113.10",
        )

        self.assertEqual(get_remote_addr(request), "198.51.100.2")

    @override_settings(REST_FRAMEWORK=_rest_framework_settings(num_proxies=1))
    def test_request_info_includes_remote_addr(self):
        request = self._request(
            x_forwarded_for="198.51.100.1",
            remote_addr="203.0.113.10",
        )

        with mock.patch("cvat.apps.events.handlers.get_request", return_value=request):
            self.assertEqual(request_info()["remote_addr"], "198.51.100.1")

    def test_add_remote_addr_to_payload_preserves_existing_request_info(self):
        payload = add_remote_addr_to_payload(
            json.dumps({"request": {"id": "request-id"}, "message": "test"}),
            "198.51.100.1",
        )

        data = json.loads(payload)
        self.assertEqual(data["request"]["id"], "request-id")
        self.assertEqual(data["request"]["remote_addr"], "198.51.100.1")

    def test_add_remote_addr_to_payload_keeps_invalid_or_non_object_payload_unchanged(self):
        self.assertEqual(add_remote_addr_to_payload("[1, 2, 3]", "198.51.100.1"), "[1, 2, 3]")
        self.assertEqual(add_remote_addr_to_payload("{invalid", "198.51.100.1"), "{invalid")
