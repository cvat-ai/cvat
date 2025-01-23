# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from cvat.apps.analytics_report.models import ViewChoice

from .base import DerivedMetricBase


class JobAverageAnnotationSpeed(DerivedMetricBase):
    _title = "Average Annotation Speed (objects per hour)"
    _description = "Metric shows average annotation speed in the Job."
    _default_view = ViewChoice.NUMERIC
    _key = "average_annotation_speed"
    _is_filterable_by_date = False

    def calculate(self):
        total_count = 0
        total_wt = 0
        data_series = self._primary_statistics["data_series"]
        for ds in zip(data_series["object_count"], data_series["working_time"]):
            total_count += ds[0]["value"]
            total_wt += ds[1]["value"]

        metric = self.get_empty()
        metric[self._key][0]["value"] = total_count / total_wt if total_wt != 0 else 0
        return metric

    def get_empty(self):
        return {
            self._key: [
                {
                    "value": 0,
                    "datetime": self._get_utc_now().strftime("%Y-%m-%dT%H:%M:%SZ"),
                },
            ]
        }


class TaskAverageAnnotationSpeed(JobAverageAnnotationSpeed):
    _description = "Metric shows average annotation speed in the Task."

    def calculate(self):
        total_count = 0
        total_wt = 0

        for job_report in self._primary_statistics:
            data_series = job_report["data_series"]
            for oc_entry, wt_entry in zip(data_series["object_count"], data_series["working_time"]):
                total_count += oc_entry["value"]
                total_wt += wt_entry["value"]

        return {
            self._key: [
                {
                    "value": total_count / total_wt if total_wt != 0 else 0,
                    "datetime": self._get_utc_now().strftime("%Y-%m-%dT%H:%M:%SZ"),
                },
            ]
        }


class ProjectAverageAnnotationSpeed(TaskAverageAnnotationSpeed):
    _description = "Metric shows average annotation speed in the Project."
