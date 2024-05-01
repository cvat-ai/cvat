# Copyright (C) 2023-2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from dateutil import parser

import cvat.apps.dataset_manager as dm
from cvat.apps.analytics_report.models import (
    BinaryOperatorType,
    GranularityChoice,
    TransformOperationType,
    ViewChoice,
)
from cvat.apps.analytics_report.report.primary_metrics.base import (
    DataExtractorBase,
    PrimaryMetricBase,
)
from cvat.apps.engine.models import SourceType


class JobAnnotationSpeedExtractor(DataExtractorBase):
    def __init__(self, job_id: int = None, task_ids: list[int] = None):
        super().__init__(job_id, task_ids)

        if task_ids is not None:
            self._query = "SELECT job_id, sum(JSONExtractUInt(payload, 'working_time')) as wt FROM events WHERE task_id IN ({task_ids:Array(UInt64)}) AND timestamp >= {start_datetime:DateTime64} AND timestamp < {end_datetime:DateTime64} GROUP BY job_id"
        elif job_id is not None:
            self._query = "SELECT job_id, sum(JSONExtractUInt(payload, 'working_time')) as wt FROM events WHERE job_id={job_id:UInt64} AND timestamp >= {start_datetime:DateTime64} AND timestamp < {end_datetime:DateTime64} GROUP BY job_id"


class JobAnnotationSpeed(PrimaryMetricBase):
    _key = "annotation_speed"
    _title = "Annotation speed (objects per hour)"
    _description = "Metric shows the annotation speed in objects per hour."
    _default_view = ViewChoice.HISTOGRAM
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

        def get_default():
            return {
                "data_series": {
                    "object_count": [],
                    "working_time": [],
                }
            }

        # Calculate object count
        annotations = dm.task.get_job_data(self._db_obj.id)
        object_count = 0
        object_count += get_tags_count(annotations)
        object_count += get_shapes_count(annotations)
        object_count += get_track_count(annotations)

        timestamp = self._get_utc_now()
        timestamp_str = timestamp.strftime("%Y-%m-%dT%H:%M:%SZ")

        report = self._db_obj.analytics_report
        if report is None:
            statistics = get_default()
        else:
            statistics = next(
                filter(lambda s: s["name"] == "annotation_speed", report.statistics), get_default()
            )

        data_series = statistics["data_series"]

        last_entry_count = 0
        start_datetime = self._db_obj.created_date
        if data_series["object_count"]:
            last_entry = data_series["object_count"][-1]
            last_entry_timestamp = parser.parse(last_entry["datetime"])

            if last_entry_timestamp.date() == timestamp.date():
                data_series["object_count"] = data_series["object_count"][:-1]
                data_series["working_time"] = data_series["working_time"][:-1]
                if len(data_series["object_count"]):
                    last_last_entry = data_series["object_count"][-1]
                    start_datetime = parser.parse(last_last_entry["datetime"])
                    last_entry_count = last_last_entry["value"]
            else:
                last_entry_count = last_entry["value"]
                start_datetime = parser.parse(last_entry["datetime"])

        data_series["object_count"].append(
            {
                "value": object_count - last_entry_count,
                "datetime": timestamp_str,
            }
        )

        # Calculate working time
        rows = list(
            self._data_extractor.extract_for_job(
                self._db_obj.id,
                {
                    "start_datetime": start_datetime,
                    "end_datetime": self._get_utc_now(),
                },
            )
        )

        value = (rows[0][0] if len(rows) else 0) / (1000 * 3600)
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
