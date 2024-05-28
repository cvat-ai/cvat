# Copyright (C) 2023-2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from datetime import datetime

from cvat.apps.analytics_report.models import GranularityChoice, ViewChoice
from cvat.apps.analytics_report.report.primary_metrics.base import (
    DataExtractorBase,
    PrimaryMetricBase,
)


class JobObjectsExtractor(DataExtractorBase):
    def __init__(
        self,
        start_datetime: datetime,
        end_datetime: datetime,
        job_id: int = None,
        task_ids: list[int] = None,
    ):
        super().__init__(start_datetime, end_datetime, job_id, task_ids)

        SELECT = ["job_id", "toStartOfDay(timestamp) as day", "scope", "sum(count)"]
        WHERE = []

        if task_ids is not None:
            WHERE.append("task_id IN ({task_ids:Array(UInt64)})")
        elif job_id is not None:
            WHERE.append("job_id={job_id:UInt64}")

        WHERE.extend(
            [
                "scope IN ({scopes:Array(String)})",
                "timestamp >= {start_datetime:DateTime64}",
                "timestamp < {end_datetime:DateTime64}",
            ]
        )

        GROUP_BY = ["scope", "day", "job_id"]

        # bandit false alarm
        self._query = f"SELECT {', '.join(SELECT)} FROM events WHERE {' AND '.join(WHERE)} GROUP BY {', '.join(GROUP_BY)} ORDER BY day ASC"  # nosec B608


class JobObjects(PrimaryMetricBase):
    _key = "objects"
    _title = "Objects"
    _description = "Metric shows number of added/changed/deleted objects for the Job."
    _default_view = ViewChoice.HISTOGRAM
    _granularity = GranularityChoice.DAY

    def calculate(self):
        statistics = {}
        actions = ("create", "update", "delete")
        obj_types = ("tracks", "shapes", "tags")
        scopes = [f"{action}:{obj_type}" for action in actions for obj_type in obj_types]
        for action in actions:
            statistics[action] = {}
            for obj_type in obj_types:
                statistics[action][obj_type] = {}

        rows = self._data_extractor.extract_for_job(self._db_obj.id, {"scopes": scopes})
        for day, scope, count in rows:
            action, obj_type = scope.split(":")
            statistics[action][obj_type][day] = count
        objects_statistics = self.get_empty()

        dates = set()
        for action in actions:
            for obj in obj_types:
                dates.update(statistics[action][obj].keys())

        for action in actions:
            for date in sorted(dates):
                objects_statistics[f"{action}d"].append(
                    {
                        "value": sum(statistics[action][t].get(date, 0) for t in obj_types),
                        "datetime": date.strftime("%Y-%m-%dT%H:%M:%SZ"),
                    }
                )

        return objects_statistics

    def get_empty(self):
        return {
            "created": [],
            "updated": [],
            "deleted": [],
        }
