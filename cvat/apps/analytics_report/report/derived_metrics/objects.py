# Copyright (C) 2023 CVAT.ai Corporation
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
                        "created": {"tags": 0, "shapes": 0, "tracks": 0},
                        "updated": {"tags": 0, "shapes": 0, "tracks": 0},
                        "deleted": {"tags": 0, "shapes": 0, "tracks": 0},
                    },
                )
                for t in ("tags", "shapes", "tracks"):
                    entry["created"][t] += c_entry["value"][t]
                    entry["updated"][t] += u_entry["value"][t]
                    entry["deleted"][t] += d_entry["value"][t]

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
                        "value": {
                            "tracks": combined_statistics[key][action]["tracks"],
                            "shapes": combined_statistics[key][action]["shapes"],
                            "tags": combined_statistics[key][action]["tags"],
                        },
                        "datetime": timestamp_str,
                    }
                )

        return combined_data_series


class ProjectObjects(TaskObjects):
    _description = "Metric shows number of added/changed/deleted objects for the Project."
