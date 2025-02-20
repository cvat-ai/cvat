# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from cvat.apps.analytics_report.report.primary_metrics import JobAnnotationTime

from .base import DerivedMetricBase


class TaskAnnotationTime(DerivedMetricBase, JobAnnotationTime):
    _description = "Metric shows how long the Task is in progress state."
    _query = None

    def calculate(self):
        entry = {"value": 0, "datetime": self._get_utc_now().strftime("%Y-%m-%dT%H:%M:%SZ")}
        for job_report in self._primary_statistics:
            data_series = job_report["data_series"]
            for at_entry in data_series["total_annotating_time"]:
                if at_entry["value"] > entry["value"]:
                    entry["value"] = at_entry["value"]
                    entry["datetime"] = at_entry["datetime"]

        combined_data_series = {
            "total_annotating_time": [entry],
        }

        return combined_data_series


class ProjectAnnotationTime(TaskAnnotationTime):
    _description = "Metric shows how long the Project is in progress state."
