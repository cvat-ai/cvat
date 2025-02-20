# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from cvat.apps.analytics_report.models import ViewChoice

from .base import DerivedMetricBase


class JobTotalObjectCount(DerivedMetricBase):
    _title = "Total Object Count"
    _description = "Metric shows total object count in the Job."
    _default_view = ViewChoice.NUMERIC
    _key = "total_object_count"
    _is_filterable_by_date = False

    def calculate(self):
        count = 0
        data_series = self._primary_statistics["data_series"]
        for ds in data_series["object_count"]:
            count += ds["value"]

        metric = self.get_empty()
        metric["total_object_count"][0]["value"] = count
        return metric

    def get_empty(self):
        return {
            "total_object_count": [
                {
                    "value": 0,
                    "datetime": self._get_utc_now().strftime("%Y-%m-%dT%H:%M:%SZ"),
                },
            ]
        }


class TaskTotalObjectCount(JobTotalObjectCount):
    _description = "Metric shows total object count in the Task."

    def calculate(self):
        total_count = 0
        for job_report in self._primary_statistics:
            data_series = job_report["data_series"]
            for oc_entry in data_series["object_count"]:
                total_count += oc_entry["value"]

        return {
            "total_object_count": [
                {
                    "value": total_count,
                    "datetime": self._get_utc_now().strftime("%Y-%m-%dT%H:%M:%SZ"),
                },
            ]
        }


class ProjectTotalObjectCount(TaskTotalObjectCount):
    _description = "Metric shows total object count in the Project."
