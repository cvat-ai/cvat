# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import csv
import json
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.test import RequestFactory
from rest_framework.parsers import JSONParser
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory

from cvat.apps.events.const import MAX_EVENT_DURATION, WORKING_TIME_RESOLUTION
from cvat.apps.events.event import record_server_event
from cvat.apps.events.export import EVENT_EXPORT_COLUMNS, _create_csv
from cvat.apps.events.serializers import ClientEventsSerializer
from cvat.apps.events.utils import compute_working_time_per_ids, is_contained
from cvat.apps.events.views import EventsViewSet
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


class RemoteAddrTestCase(unittest.TestCase):
    def test_server_event_stores_remote_addr_outside_payload(self):
        with patch("cvat.apps.events.event.vlogger.info") as mock_info:
            record_server_event(
                scope="create:task",
                request_info={
                    "id": "request-id",
                    "user_agent": "test-agent",
                    "remote_addr": "203.0.113.10",
                },
                payload={"request": {"method": "POST"}},
            )

        event = json.loads(mock_info.call_args.args[0])
        payload = json.loads(event["payload"])

        self.assertEqual(event["remote_addr"], "203.0.113.10")
        self.assertNotIn("remote_addr", payload["request"])
        self.assertEqual(payload["request"]["id"], "request-id")
        self.assertEqual(payload["request"]["user_agent"], "test-agent")
        self.assertEqual(payload["request"]["method"], "POST")

    def test_client_event_stores_remote_addr_outside_payload(self):
        request = APIRequestFactory().post(
            "/api/events",
            {
                "events": [
                    {
                        "scope": "click:element",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "payload": json.dumps({"request": {"id": "client-request-id"}}),
                    },
                ],
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
            format="json",
            REMOTE_ADDR="203.0.113.20",
        )
        drf_request = Request(request, parsers=[JSONParser()])
        drf_request.user = SimpleNamespace(
            id=100, username="testuser", email="testuser@example.org"
        )
        drf_request.iam_context = {
            "organization": Organization(id=101, slug="testorg", name="Test Organization"),
        }

        with (
            patch("cvat.apps.events.views.handle_client_events_push"),
            patch("cvat.apps.events.views.vlogger.info") as mock_info,
        ):
            response = EventsViewSet().create(drf_request)

        self.assertEqual(response.status_code, 201)
        event = json.loads(mock_info.call_args.args[0])
        payload = json.loads(event["payload"])

        self.assertEqual(event["remote_addr"], "203.0.113.20")
        self.assertNotIn("remote_addr", payload["request"])
        self.assertEqual(payload["request"]["id"], "client-request-id")

    def test_export_query_excludes_remote_addr_column(self):
        result = SimpleNamespace(
            column_names=EVENT_EXPORT_COLUMNS,
            result_rows=[
                (
                    "click:element",
                    None,
                    None,
                    None,
                    "client",
                    datetime.now(timezone.utc),
                    None,
                    0,
                    None,
                    None,
                    None,
                    100,
                    "testuser",
                    "testuser@example.org",
                    101,
                    "testorg",
                    json.dumps({"request": {"id": "client-request-id"}}),
                    None,
                )
            ],
        )
        client = MagicMock()
        client.query.return_value = result
        client_context = MagicMock()
        client_context.__enter__.return_value = client

        with (
            patch(
                "cvat.apps.events.export.clickhouse_connect.get_client",
                return_value=client_context,
            ),
            tempfile.NamedTemporaryFile() as output_file,
        ):
            _create_csv({"from": None, "to": None}, output_file.name)

            query = client.query.call_args.args[0]
            output_file.seek(0)
            rows = list(csv.reader(line.decode("UTF-8") for line in output_file.readlines()))

        self.assertNotIn("remote_addr", query)
        self.assertNotIn("remote_addr", rows[0])
        self.assertEqual(rows[0], EVENT_EXPORT_COLUMNS)
