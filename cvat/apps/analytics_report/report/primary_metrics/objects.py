# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from cvat.apps.analytics_report.report.primary_metrics.imetric import IPrimaryMetric

class JobObjects(IPrimaryMetric):
    _title = "Objects"
    _description = "Metric shows number of added/changed/deleted objects."
    _default_view = "histogram"
    _query = "SELECT toStartOfDay(timestamp) as day, sum(JSONLength(JSONExtractString(payload, {object_type:String}))) as s FROM events WHERE scope = {scope:String} AND job_id = {job_id:UInt64} GROUP BY day ORDER BY day ASC"
    _granularity = "day"

    def calculate(self):
        statistics = {}

        for action in ["create", "update", "delete"]:
            action_data = statistics.setdefault(f"{action}d", {})
            for obj_type in ["tracks", "shapes", "tags"]:
                result = self._make_clickhouse_query({
                    "scope": f"{action}:{obj_type}",
                    "object_type": obj_type,
                    "job_id": self._db_obj.id,
                })
                action_data[obj_type] = {entry[0]: entry[1] for entry in result.result_rows}

        objects_statistics = {
            "created": [],
            "updated": [],
            "deleted": [],
        }

        dates = set()
        for action in ["created", "updated", "deleted"]:
            for obj in ["tracks", "shapes", "tags"]:
                dates.update(statistics[action][obj].keys())

        for action in ["created", "updated", "deleted"]:
            for date in dates:
                objects_statistics[action].append({
                    "value": {
                        "tracks": statistics[action]["tracks"].get(date, 0),
                        "shapes": statistics[action]["shapes"].get(date, 0),
                        "tags":  statistics[action]["tags"].get(date, 0),
                    },
                    "datetime": date.isoformat()+'Z',
                })

        return objects_statistics
