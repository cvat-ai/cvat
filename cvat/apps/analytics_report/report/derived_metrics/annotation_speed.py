# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from datetime import datetime, timezone

from dateutil import parser

from cvat.apps.analytics_report.report.primary_metrics import JobAnnotationSpeed

from .base import DerivedMetricBase


class TaskAnnotationSpeed(DerivedMetricBase, JobAnnotationSpeed):
    _description = "Metric shows annotation speed in the task as number of objects per hour."
    _query = None

    def calculate(self):
        combined_statistics = {}

        for job_report in self._primary_statistics:
            data_series = job_report["data_series"]
            for oc_entry, wt_entry in zip(data_series["object_count"], data_series["working_time"]):
                entry = combined_statistics.setdefault(
                    parser.parse(oc_entry["datetime"]).date(),
                    {
                        "object_count": 0,
                        "working_time": 0,
                    },
                )
                entry["object_count"] += oc_entry["value"]
                entry["working_time"] += wt_entry["value"]

        combined_data_series = {
            "object_count": [],
            "working_time": [],
        }

        for key in sorted(combined_statistics.keys()):
            timestamp_str = datetime.combine(
                key, datetime.min.time(), tzinfo=timezone.utc
            ).strftime("%Y-%m-%dT%H:%M:%SZ")
            for s_name in ("object_count", "working_time"):
                combined_data_series[s_name].append(
                    {
                        "value": combined_statistics[key][s_name],
                        "datetime": timestamp_str,
                    }
                )

        return combined_data_series


class ProjectAnnotationSpeed(TaskAnnotationSpeed):
    _description = "Metric shows annotation speed in the project as number of objects per hour."
