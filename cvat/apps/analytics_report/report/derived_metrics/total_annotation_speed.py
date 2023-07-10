# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from .imetric import DerivedMetricBase
from cvat.apps.analytics_report.models import ViewChoice

class JobTotalAnnotationSpeed(DerivedMetricBase):
    _title = "Total Annotation Speed (objects per hour)"
    _description = "Metric shows total annotation speed in the Job."
    _default_view = ViewChoice.NUMERIC
    _key = "total_annotation_speed"

    def calculate(self):
        total_count = 0
        total_wt = 0
        dataseries = self._primary_statistics["dataseries"]
        for ds in zip(dataseries["object_count"], dataseries["working_time"]):
            total_count += ds[0]["value"]
            total_wt += ds[1]["value"]

        return {
            "total_annotation_speed": [
                {
                    "value": total_count / total_wt if total_wt != 0 else 0,
                    "datetime": self._get_utc_now().strftime('%Y-%m-%dT%H:%M:%SZ'),
                },
            ]
        }

class TaskTotalAnnotationSpeed(JobTotalAnnotationSpeed):
    _description = "Metric shows total annotation speed in the Task."

    def calculate(self):
        total_count = 0
        total_wt = 0

        for job_report in self._primary_statistics:
            dataseries = job_report["dataseries"]
            for oc_entry, wt_entry in zip(dataseries["object_count"], dataseries["working_time"]):
                total_count += oc_entry["value"]
                total_wt += wt_entry["value"]

        return {
            "total_annotation_speed": [
                {
                    "value": total_count / total_wt if total_wt != 0 else 0,
                    "datetime": self._get_utc_now().strftime('%Y-%m-%dT%H:%M:%SZ'),
                },
            ]
        }

class ProjectTotalAnnotationSpeed(TaskTotalAnnotationSpeed):
    _description = "Metric shows total annotation speed in the Project."
