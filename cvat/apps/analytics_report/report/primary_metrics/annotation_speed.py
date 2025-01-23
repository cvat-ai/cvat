# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from copy import deepcopy
from datetime import datetime

from dateutil import parser

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
from cvat.apps.dataset_manager.task import merge_table_rows
from cvat.apps.engine.models import ShapeType, SourceType


class JobAnnotationSpeedExtractor(DataExtractorBase):
    def __init__(
        self,
        start_datetime: datetime,
        end_datetime: datetime,
        job_id: int = None,
        task_ids: list[int] = None,
    ):
        super().__init__(start_datetime, end_datetime, job_id, task_ids)

        SELECT = ["job_id", "JSONExtractUInt(payload, 'working_time') as wt", "timestamp"]
        WHERE = []

        if task_ids is not None:
            WHERE.append("task_id IN ({task_ids:Array(UInt64)})")
        elif job_id is not None:
            WHERE.append("job_id={job_id:UInt64}")

        WHERE.extend(
            [
                "wt > 0",
                "timestamp >= {start_datetime:DateTime64}",
                "timestamp < {end_datetime:DateTime64}",
            ]
        )

        # bandit false alarm
        self._query = f"SELECT {', '.join(SELECT)} FROM events WHERE {' AND '.join(WHERE)} ORDER BY timestamp"  # nosec B608


class JobAnnotationSpeed(PrimaryMetricBase):
    _key = "annotation_speed"
    _title = "Annotation speed (objects per hour)"
    _description = "Metric shows annotation speed in the job as number of objects per hour."
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
        def get_tags_count():
            return self._db_obj.labeledimage_set.exclude(source=SourceType.FILE).count()

        def get_shapes_count():
            return (
                self._db_obj.labeledshape_set.exclude(source=SourceType.FILE)
                .exclude(
                    type=ShapeType.SKELETON
                )  # skeleton's points are already counted as objects
                .count()
            )

        def get_track_count():
            db_tracks = (
                self._db_obj.labeledtrack_set.exclude(source=SourceType.FILE)
                .values(
                    "id",
                    "shape__id",
                    "shape__frame",
                    "shape__type",
                    "shape__outside",
                )
                .order_by("id", "shape__frame")
                .iterator(chunk_size=2000)
            )

            db_tracks = merge_table_rows(
                rows=db_tracks,
                keys_for_merge={
                    "shapes": [
                        "shape__id",
                        "shape__frame",
                        "shape__type",
                        "shape__outside",
                    ],
                },
                field_id="id",
            )

            count = 0
            for track in db_tracks:
                # Skip processing if no shapes are associated with the track
                if not track["shapes"]:
                    continue

                # Skip skeleton shapes as their points are already counted
                if track["shapes"] and track["shapes"][0]["type"] == ShapeType.SKELETON:
                    continue

                # If only one shape exists, calculate the frames from the first frame to the stop frame of the segment
                if len(track["shapes"]) == 1:
                    count += self._db_obj.segment.stop_frame - track["shapes"][0]["frame"] + 1
                    continue

                # Add the initial frame count and then iterate through shapes to count non-outside frames
                count += 1
                for prev_shape, cur_shape in zip(track["shapes"], track["shapes"][1:]):
                    if not prev_shape["outside"]:
                        count += cur_shape["frame"] - prev_shape["frame"]

                # Add frames until the end of segment if the latest shape was not outside
                if (
                    not cur_shape["outside"]
                    and cur_shape["frame"] < self._db_obj.segment.stop_frame
                ):
                    count += self._db_obj.segment.stop_frame - cur_shape["frame"]

            return count

        # Calculate object count
        object_count = 0
        object_count += get_tags_count()
        object_count += get_shapes_count()
        object_count += get_track_count()

        start_datetime = self._db_obj.created_date
        timestamp = self._db_obj.updated_date
        timestamp_str = timestamp.strftime("%Y-%m-%dT%H:%M:%SZ")

        report = getattr(self._db_obj, "analytics_report", None)
        data_series = self.get_empty()
        if report is not None:
            statistics = next(
                filter(lambda s: s["name"] == "annotation_speed", report.statistics), None
            )
            if statistics is not None:
                data_series = deepcopy(statistics["data_series"])

        previous_count = 0
        if data_series["object_count"]:
            last_entry_timestamp = parser.parse(data_series["object_count"][-1]["datetime"])

            if last_entry_timestamp.date() == timestamp.date():
                # remove last entry, it will be re-calculated below, because of the same date
                data_series["object_count"] = data_series["object_count"][:-1]
                data_series["working_time"] = data_series["working_time"][:-1]

            for entry in data_series["object_count"]:
                previous_count += entry["value"]

            if data_series["object_count"]:
                start_datetime = parser.parse(data_series["object_count"][-1]["datetime"])

        data_series["object_count"].append(
            {
                "value": object_count - previous_count,
                "datetime": timestamp_str,
            }
        )

        rows = list(
            self._data_extractor.extract_for_job(
                self._db_obj.id,
            )
        )

        working_time = 0
        for row in rows:
            wt, datetime = row
            if start_datetime <= datetime < timestamp:
                working_time += wt

        data_series["working_time"].append(
            {
                "value": working_time / (1000 * 3600),
                "datetime": timestamp_str,
            }
        )

        return data_series

    def get_empty(self):
        return {
            "object_count": [],
            "working_time": [],
        }
