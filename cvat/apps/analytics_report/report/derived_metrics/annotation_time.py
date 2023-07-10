# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from cvat.apps.analytics_report.report.primary_metrics import JobAnnotationTime

from .imetric import DerivedMetricBase


class TaskAnnotationTime(DerivedMetricBase, JobAnnotationTime):
    _description = "Metric shows how long the Task is in progress state."
    _query = None

    def calculate(self):
        entry = {"value": 0, "datetime": self._get_utc_now().strftime("%Y-%m-%dT%H:%M:%SZ")}
        for job_report in self._primary_statistics:
            dataseries = job_report["dataseries"]
            for at_entry in dataseries["total_annotating_time"]:
                if at_entry["value"] > entry["value"]:
                    entry["value"] = at_entry["value"]
                    entry["datetime"] = at_entry["datetime"]

        combined_dataseries = {
            "total_annotating_time": [entry],
        }

        return combined_dataseries


class ProjectAnnotationTime(TaskAnnotationTime):
    _description = "Metric shows how long the Project is in progress state."
