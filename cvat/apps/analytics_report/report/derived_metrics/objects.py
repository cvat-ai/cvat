# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from datetime import datetime, timezone

from dateutil import parser

from cvat.apps.analytics_report.report.primary_metrics import JobObjects

from .base import DerivedMetricBase


class TaskObjects(DerivedMetricBase, JobObjects):
    _description = "Metric shows number of added/changed/deleted objects for the Task."
    _query = None

    def calculate(self):
        combined_statistics = {}

        for job_report in self._primary_statistics:
            data_series = job_report["data_series"]
            for c_entry, u_entry, d_entry in zip(
                data_series["created"], data_series["updated"], data_series["deleted"]
            ):
                entry = combined_statistics.setdefault(
                    parser.parse(c_entry["datetime"]).date(),
                    {
                        "created": 0,
                        "updated": 0,
                        "deleted": 0,
                    },
                )
                entry["created"] += c_entry["value"]
                entry["updated"] += u_entry["value"]
                entry["deleted"] += d_entry["value"]

        combined_data_series = {
            "created": [],
            "updated": [],
            "deleted": [],
        }

        for key in sorted(combined_statistics.keys()):
            timestamp_str = datetime.combine(
                key, datetime.min.time(), tzinfo=timezone.utc
            ).strftime("%Y-%m-%dT%H:%M:%SZ")

            for action in ("created", "updated", "deleted"):
                combined_data_series[action].append(
                    {
                        "value": combined_statistics[key][action],
                        "datetime": timestamp_str,
                    }
                )

        return combined_data_series


class ProjectObjects(TaskObjects):
    _description = "Metric shows number of added/changed/deleted objects for the Project."
