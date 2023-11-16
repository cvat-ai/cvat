# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from copy import deepcopy

from dateutil import parser

import cvat.apps.dataset_manager as dm
from cvat.apps.analytics_report.models import (
    BinaryOperatorType,
    GranularityChoice,
    TransformOperationType,
    ViewChoice,
)
from cvat.apps.analytics_report.report.primary_metrics.base import PrimaryMetricBase
from cvat.apps.engine.models import SourceType


class JobAnnotationSpeed(PrimaryMetricBase):
    _title = "Annotation speed (objects per hour)"
    _description = "Metric shows the annotation speed in objects per hour."
    _default_view = ViewChoice.HISTOGRAM
    _key = "annotation_speed"
    # Raw SQL queries are used to execute ClickHouse queries, as there is no ORM available here
    _query = "SELECT sum(JSONExtractUInt(payload, 'working_time')) / 1000 / 3600 as wt FROM events WHERE job_id={job_id:UInt64} AND timestamp >= {start_datetime:DateTime64} AND timestamp < {end_datetime:DateTime64}"
    _granularity = GranularityChoice.DAY
    _is_filterable_by_date = False
    _transformations = [
        {
            "name": "annotation_speed",
            TransformOperationType.BINARY: {
                "left": "object_count",
                "operator": BinaryOperatorType.DIVISION,
                "right": "working_time",
            },
        },
    ]

    def calculate(self):
        def get_tags_count(annotations):
            return sum(1 for t in annotations["tags"] if t["source"] != SourceType.FILE)

        def get_shapes_count(annotations):
            return sum(1 for s in annotations["shapes"] if s["source"] != SourceType.FILE)

        def get_track_count(annotations):
            count = 0
            for track in annotations["tracks"]:
                if track["source"] == SourceType.FILE:
                    continue
                if len(track["shapes"]) == 1:
                    count += self._db_obj.segment.stop_frame - track["shapes"][0]["frame"] + 1
                for prev_shape, cur_shape in zip(track["shapes"], track["shapes"][1:]):
                    if prev_shape["outside"] is not True:
                        count += cur_shape["frame"] - prev_shape["frame"]

            return count

        # Calculate object count

        annotations = dm.task.get_job_data(self._db_obj.id)
        object_count = 0
        object_count += get_tags_count(annotations)
        object_count += get_shapes_count(annotations)
        object_count += get_track_count(annotations)

        timestamp = self._get_utc_now()
        timestamp_str = timestamp.strftime("%Y-%m-%dT%H:%M:%SZ")

        report = self._db_obj.analytics_report
        data_series = self.get_empty()
        if report is not None:
            statistics = next(
                filter(lambda s: s["name"] == "annotation_speed", report.statistics), None
            )
            if statistics is not None:
                data_series = deepcopy(statistics["data_series"])

        previous_count = 0
        start_datetime = self._db_obj.created_date
        if data_series["object_count"]:
            last_entry_timestamp = parser.parse(data_series["object_count"][-1]["datetime"])

            if last_entry_timestamp.date() == timestamp.date():
                data_series["object_count"] = data_series["object_count"][:-1]
                data_series["working_time"] = data_series["working_time"][:-1]

            for entry in data_series["object_count"]:
                previous_count += entry["value"]

            if len(data_series["object_count"]):
                start_datetime = parser.parse(data_series["object_count"][-1]["datetime"])

        data_series["object_count"].append(
            {
                "value": object_count - previous_count,
                "datetime": timestamp_str,
            }
        )

        # Calculate working time

        parameters = {
            "job_id": self._db_obj.id,
            "start_datetime": start_datetime,
            "end_datetime": timestamp,
        }

        result = self._make_clickhouse_query(parameters)
        value = 0
        if (wt := next(iter(result.result_rows))[0]) is not None:
            value = wt
        data_series["working_time"].append(
            {
                "value": value,
                "datetime": timestamp_str,
            }
        )

        return data_series

    def get_empty(self):
        return {
            "object_count": [],
            "working_time": [],
        }
