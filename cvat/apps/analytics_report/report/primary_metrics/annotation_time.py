# Copyright (C) 2023-2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from datetime import datetime

from cvat.apps.analytics_report.models import ViewChoice
from cvat.apps.analytics_report.report.primary_metrics.base import (
    DataExtractorBase,
    PrimaryMetricBase,
)


class JobAnnotationTimeExtractor(DataExtractorBase):
    def __init__(
        self,
        start_datetime: datetime,
        end_datetime: datetime,
        job_id: int = None,
        task_ids: list[int] = None,
    ):
        super().__init__(start_datetime, end_datetime, job_id, task_ids)

        SELECT = ["job_id", "timestamp", "obj_val"]
        WHERE = []

        if task_ids is not None:
            WHERE.append("task_id IN ({task_ids:Array(UInt64)})")
        elif job_id is not None:
            WHERE.append("job_id={job_id:UInt64}")

        WHERE.extend(
            [
                "scope='update:job'",
                "obj_name='state'",
                "timestamp >= {start_datetime:DateTime64}",
                "timestamp < {end_datetime:DateTime64}",
            ]
        )

        # bandit false alarm
        self._query = f"SELECT {', '.join(SELECT)} FROM events WHERE {' AND '.join(WHERE)} ORDER BY timestamp ASC"  # nosec B608


class JobAnnotationTime(PrimaryMetricBase):
    _key = "annotation_time"
    _title = "Annotation time (hours)"
    _description = "Metric shows how long the Job is in progress state."
    _default_view = ViewChoice.NUMERIC
    _is_filterable_by_date = False

    def calculate(self):
        rows = list(self._data_extractor.extract_for_job(self._db_obj.id))
        total_annotating_time = 0
        last_change = None
        for prev_row, cur_row in zip(rows, rows[1:]):
            if prev_row[1] == "in progress":
                total_annotating_time += int((cur_row[0] - prev_row[0]).total_seconds())
                last_change = cur_row[0]

        if rows and rows[-1][1] == "in progress":
            total_annotating_time += int((self._db_obj.updated_date - rows[-1][0]).total_seconds())

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
