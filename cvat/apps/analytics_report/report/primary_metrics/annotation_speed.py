# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from cvat.apps.analytics_report.report.primary_metrics.imetric import IPrimaryMetric
import cvat.apps.dataset_manager as dm
from dateutil import parser

class JobAnnotationSpeed(IPrimaryMetric):
    _title = "Annotation speed"
    _description = "Metric shows the annotation speed in objects per hour."
    _default_view = "histogram"
    _query = "SELECT sum(JSONExtractUInt(payload, 'working_time')) / 1000 as wt FROM events WHERE job_id={job_id:UInt64} AND timestamp >= {start_datetime:DateTime64} AND timestamp < {end_datetime:DateTime64}"
    _granularity = "day"
    _transformations = [
        {
            "name": "annotation_speed",
            "binary": {
                "left": "object_count",
                "operator": "/",
                "right": "annotation_time",
            },
        },
    ]

    def calculate(self):
        def get_tags_count(annotations):
            return len(annotations["tags"])

        def get_shapes_count(annotations):
            return len(annotations["shapes"])

        def get_track_count(annotations):
            count = 0
            for track in annotations["tracks"]:
                if len(track["shapes"]) == 1:
                    count += self._db_obj.segment.stop_frame - track["shapes"][0]["frame"] + 1
                for prev_shape, cur_shape in zip(track["shapes"], track["shapes"][1:]):
                    if prev_shape["outside"] is not True:
                        count += cur_shape["frame"] - prev_shape["frame"]

            return count

        def get_default():
            return {
                "dataseries": {
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
        timestamp_str = timestamp.strftime('%Y-%m-%dT%H:%M:%SZ')

        report = self._db_obj.analytics_report
        if report is None:
            statistics = get_default()
        else:
            statistics = report.statistics.get("annotation_speed",  get_default())

        dataseries = statistics["dataseries"]

        last_entry_count = 0
        start_datetime = self._db_obj.created_date
        if dataseries["object_count"]:
            last_entry = dataseries["object_count"][-1]
            last_entry_timestamp = parser.parse(last_entry["datetime"])

            if last_entry_timestamp.date() == timestamp.date():
                dataseries["object_count"] = dataseries["object_count"][:-1]
                dataseries["working_time"] = dataseries["working_time"][:-1]
                if len(dataseries["object_count"]):
                    last_last_entry = dataseries["object_count"][-1]
                    start_datetime = parser.parse(last_last_entry["datetime"])
                    last_entry_count = last_last_entry["value"]
            else:
                last_entry_count = last_entry["value"]
                start_datetime = parser.parse(last_entry["datetime"])


        dataseries["object_count"].append({
            "value": object_count - last_entry_count,
            "datetime": timestamp_str,
        })

        # Calculate working time

        parameters = {
            "job_id": self._db_obj.id,
            "start_datetime": start_datetime,
            "end_datetime": self._get_utc_now(),
        }

        result = self._make_clickhouse_query(parameters)

        dataseries["working_time"].append({
            "value": next(iter(result.result_rows))[0],
            "datetime": timestamp_str
        })

        return dataseries
