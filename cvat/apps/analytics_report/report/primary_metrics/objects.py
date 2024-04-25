# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from cvat.apps.analytics_report.models import GranularityChoice, ViewChoice
from cvat.apps.analytics_report.report.primary_metrics.base import PrimaryMetricBase


class JobObjects(PrimaryMetricBase):
    _title = "Objects"
    _description = "Metric shows number of added/changed/deleted objects for the Job."
    _default_view = ViewChoice.HISTOGRAM
    _key = "objects"
    # Raw SQL queries are used to execute ClickHouse queries, as there is no ORM available here
    _query = "SELECT toStartOfDay(timestamp) as day, scope, sum(count) FROM events WHERE scope IN ({scopes:Array(String)}) AND job_id = {job_id:UInt64} GROUP BY scope, day ORDER BY day ASC"
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

        result = self._make_clickhouse_query(
            {
                "scopes": scopes,
                "job_id": self._db_obj.id,
            }
        )

        for day, scope, count in result.result_rows:
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
