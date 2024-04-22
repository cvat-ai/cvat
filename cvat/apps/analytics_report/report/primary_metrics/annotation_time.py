# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from cvat.apps.analytics_report.models import ViewChoice
from cvat.apps.analytics_report.report.primary_metrics.base import PrimaryMetricBase


class JobAnnotationTime(PrimaryMetricBase):
    _title = "Annotation time (hours)"
    _description = "Metric shows how long the Job is in progress state."
    _default_view = ViewChoice.NUMERIC
    _key = "annotation_time"
    # Raw SQL queries are used to execute ClickHouse queries, as there is no ORM available here
    _query = "SELECT timestamp, obj_val  FROM cvat.events WHERE scope='update:job' AND job_id={job_id:UInt64} AND obj_name='state' ORDER BY timestamp ASC"
    _is_filterable_by_date = False

    def calculate(self):
        results = self._make_clickhouse_query(
            {
                "job_id": self._db_obj.id,
            }
        )
        total_annotating_time = 0
        last_change = None
        for prev_row, cur_row in zip(results.result_rows, results.result_rows[1:]):
            if prev_row[1] == "in progress":
                total_annotating_time += int((cur_row[0] - prev_row[0]).total_seconds())
                last_change = cur_row[0]

        if results.result_rows and results.result_rows[-1][1] == "in progress":
            total_annotating_time += int(
                (self._db_obj.updated_date - results.result_rows[-1][0]).total_seconds()
            )

        if not last_change:
            last_change = self._get_utc_now()

        metric = self.get_empty()
        metric["total_annotating_time"][0]["value"] = (
            total_annotating_time / 3600
        )  # convert to hours
        metric["total_annotating_time"][0]["datetime"] = last_change.strftime("%Y-%m-%dT%H:%M:%SZ")
        return metric

    def get_empty(self):
        return {
            "total_annotating_time": [
                {
                    "value": 0,
                    "datetime": self._get_utc_now().strftime("%Y-%m-%dT%H:%M:%SZ"),
                },
            ]
        }
