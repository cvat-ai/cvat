# Copyright (C) 2022 Intel Corporation
# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import csv
import json
from datetime import datetime, timedelta, timezone
from http import HTTPStatus
from io import StringIO
from time import sleep

import pytest
from dateutil import parser as datetime_parser

from shared.utils.config import make_api_client, server_get
from shared.utils.helpers import generate_image_files

from .utils import _test_create_task


@pytest.mark.usefixtures("restore_db_per_class")
class TestGetAnalytics:
    endpoint = "analytics"

    def _test_can_see(self, user):
        response = server_get(user, self.endpoint)

        assert response.status_code == HTTPStatus.OK

    def _test_cannot_see(self, user):
        response = server_get(user, self.endpoint)

        assert response.status_code == HTTPStatus.FORBIDDEN

    @pytest.mark.parametrize(
        "privilege, is_allow",
        [("admin", True), ("business", True), ("worker", False), ("user", False)],
    )
    def test_can_see(self, privilege, is_allow, find_users):
        user = find_users(privilege=privilege)[0]["username"]

        if is_allow:
            self._test_can_see(user)
        else:
            self._test_cannot_see(user)


@pytest.mark.usefixtures("restore_db_per_class")
class TestGetAuditEvents:
    _USERNAME = "admin1"

    @staticmethod
    def _create_project(user, spec, **kwargs):
        with make_api_client(user) as api_client:
            (project, response) = api_client.projects_api.create(spec, **kwargs)
            assert response.status == HTTPStatus.CREATED
        return project.id

    @pytest.fixture(autouse=True)
    def setup(self):
        project_spec = {
            "name": f"Test project created by {self._USERNAME}",
            "labels": [
                {
                    "name": "car",
                    "color": "#ff00ff",
                    "attributes": [
                        {
                            "name": "a",
                            "mutable": True,
                            "input_type": "number",
                            "default_value": "5",
                            "values": ["4", "5", "6"],
                        }
                    ],
                }
            ],
        }
        self.project_id = TestGetAuditEvents._create_project(self._USERNAME, project_spec)
        task_spec = {
            "name": f"test {self._USERNAME} to create a task",
            "segment_size": 2,
            "project_id": self.project_id,
        }
        task_data = {
            "image_quality": 10,
            "client_files": generate_image_files(3),
        }
        self.task_ids = [
            _test_create_task(
                self._USERNAME, task_spec, task_data, content_type="multipart/form-data"
            ),
            _test_create_task(
                self._USERNAME, task_spec, task_data, content_type="multipart/form-data"
            ),
        ]
        # Wait some time to events be processed by Vector and Clickhouse
        # This will be improved when request tracking UUID is implemented.
        sleep(8)

    @staticmethod
    def _export_events(endpoint, *, max_retries: int = 20, interval: float = 0.1, **kwargs):
        query_id = ""
        for _ in range(max_retries):
            (_, response) = endpoint.call_with_http_info(
                **kwargs, query_id=query_id, _parse_response=False
            )
            if response.status == HTTPStatus.CREATED:
                break
            assert response.status == HTTPStatus.ACCEPTED
            if not query_id:
                response_json = json.loads(response.data)
                query_id = response_json["query_id"]
            sleep(interval)
        assert response.status == HTTPStatus.CREATED

        (_, response) = endpoint.call_with_http_info(
            **kwargs, query_id=query_id, action="download", _parse_response=False
        )
        assert response.status == HTTPStatus.OK

        return response.data

    @staticmethod
    def _csv_to_dict(csv_data):
        res = []
        with StringIO(csv_data.decode()) as f:
            reader = csv.DictReader(f)
            for row in reader:
                res.append(row)

        return res

    @staticmethod
    def _filter_events(events, filter_):
        res = []
        for event in events:
            if all(
                (event[filter_key] == filter_value for filter_key, filter_value in filter_.items())
            ):
                res.append(event)

        return res

    @staticmethod
    def _count_events_by_scopes(events, scopes):
        res = {scope: 0 for scope in scopes}

        for event in events:
            if event["scope"] in res:
                res[event["scope"]] += 1

        return res

    def _test_get_audit_logs_as_csv(self, **kwargs):
        with make_api_client(self._USERNAME) as api_client:
            return self._export_events(api_client.events_api.list_endpoint, **kwargs)

    def test_time_interval(self):
        now = datetime.now(timezone.utc)
        to_datetime = now
        from_datetime = now - timedelta(minutes=3)

        query_params = {
            "_from": from_datetime.isoformat(),
            "to": to_datetime.isoformat(),
        }

        data = self._test_get_audit_logs_as_csv(**query_params)
        events = self._csv_to_dict(data)

        for event in events:
            event_timestamp = datetime_parser.isoparse(event["timestamp"])
            assert from_datetime <= event_timestamp <= to_datetime

    def test_filter_by_project(self):
        query_params = {
            "project_id": self.project_id,
        }

        data = self._test_get_audit_logs_as_csv(**query_params)
        events = self._csv_to_dict(data)

        filtered_events = self._filter_events(events, {"project_id": str(self.project_id)})
        assert len(filtered_events)

        event_count = self._count_events_by_scopes(
            filtered_events, ["create:project", "create:task", "create:job"]
        )
        assert event_count["create:project"] == 1
        assert event_count["create:task"] == 2
        assert event_count["create:job"] == 4

    def test_filter_by_task(self):
        for task_id in self.task_ids:
            query_params = {
                "task_id": task_id,
            }

            data = self._test_get_audit_logs_as_csv(**query_params)
            events = self._csv_to_dict(data)

            filtered_events = self._filter_events(events, {"task_id": str(task_id)})
            assert len(filtered_events)

            event_count = self._count_events_by_scopes(
                filtered_events, ["create:project", "create:task", "create:job"]
            )
            assert event_count["create:task"] == 1
            assert event_count["create:job"] == 2

    def test_filter_by_non_existent_project(self):
        query_params = {
            "project_id": self.project_id + 100,
        }

        data = self._test_get_audit_logs_as_csv(**query_params)
        events = self._csv_to_dict(data)
        assert len(events) == 0
