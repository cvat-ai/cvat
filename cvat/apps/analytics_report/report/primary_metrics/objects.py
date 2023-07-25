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
    _query = "SELECT toStartOfDay(timestamp) as day, sum(JSONLength(JSONExtractString(payload, {object_type:String}))) as s FROM events WHERE scope = {scope:String} AND job_id = {job_id:UInt64} GROUP BY day ORDER BY day ASC"
    _granularity = GranularityChoice.DAY

    def calculate(self):
        statistics = {}

        for action in ["create", "update", "delete"]:
            action_data = statistics.setdefault(f"{action}d", {})
            for obj_type in ["tracks", "shapes", "tags"]:
                result = self._make_clickhouse_query(
                    {
                        "scope": f"{action}:{obj_type}",
                        "object_type": obj_type,
                        "job_id": self._db_obj.id,
                    }
                )
                action_data[obj_type] = {entry[0]: entry[1] for entry in result.result_rows}

        objects_statistics = self.get_empty()

        dates = set()
        for action in ["created", "updated", "deleted"]:
            for obj in ["tracks", "shapes", "tags"]:
                dates.update(statistics[action][obj].keys())

        for action in ["created", "updated", "deleted"]:
            for date in sorted(dates):
                objects_statistics[action].append(
                    {
                        "value": sum(
                            statistics[action][t].get(date, 0) for t in ["tracks", "shapes", "tags"]
                        ),
                        "datetime": date.isoformat() + "Z",
                    }
                )

        return objects_statistics

    def get_empty(self):
        return {
            "created": [],
            "updated": [],
            "deleted": [],
        }
