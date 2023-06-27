# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os
from datetime import datetime, timedelta
from dateutil import parser
import uuid

from django.utils import timezone

from typing import Sequence, Optional

import django_rq
from django.conf import settings
import clickhouse_connect

from uuid import uuid4

from rest_framework import serializers, status
from rest_framework.response import Response
from django_sendfile import sendfile

from cvat.apps.dataset_manager.views import clear_export_cache, log_exception
from cvat.apps.engine.log import slogger

from cvat.apps.engine.models import Job
from cvat.apps.analytics_report import models
import cvat.apps.dataset_manager as dm

from cvat.apps.analytics_report.models import AnalyticsReport

def make_clickhouse_query(query, parameters):
    clickhouse_settings = settings.CLICKHOUSE['events']

    with clickhouse_connect.get_client(
        host=clickhouse_settings['HOST'],
        database=clickhouse_settings['NAME'],
        port=clickhouse_settings['PORT'],
        username=clickhouse_settings['USER'],
        password=clickhouse_settings['PASSWORD'],
    ) as client:
        result = client.query(query, parameters=parameters)

    return result

class JobAnalyticsReportUpdateManager():
    _QUEUE_JOB_PREFIX = "update-analytics-metrics-job-"
    _RQ_CUSTOM_ANALYTICS_CHECK_JOB_TYPE = "custom_analytics_check"
    _JOB_RESULT_TTL = 120

    @classmethod
    def _get_analytics_check_job_delay(cls) -> timedelta:
        return timedelta(seconds=settings.QUALITY_CHECK_JOB_DELAY)

    def _get_scheduler(self):
        return django_rq.get_scheduler(settings.CVAT_QUEUES.QUALITY_REPORTS.value)

    def _get_queue(self):
        return django_rq.get_queue(settings.CVAT_QUEUES.QUALITY_REPORTS.value)

    def _make_queue_job_prefix(self, job: Job) -> str:
        return f"{self._QUEUE_JOB_PREFIX}{job.id}-"

    def _make_custom_analytics_check_job_id(self) -> str:
        return uuid4().hex

    def _make_initial_queue_job_id(self, job: Job) -> str:
        return f"{self._make_queue_job_prefix(job)}initial"

    def _make_regular_queue_job_id(self, job: Job, start_time: timezone.datetime) -> str:
        return f"{self._make_queue_job_prefix(job)}{start_time.timestamp()}"

    @classmethod
    def _get_last_report_time(cls, job: Job) :
        report = models.AnalyticsReport.objects.get(pk=job.id)
        if report:
            return report.created_date
        return None

    def _find_next_job_id(
        self, existing_job_ids: Sequence[str], job: Job, *, now: timezone.datetime
    ) -> str:
        job_id_prefix = self._make_queue_job_prefix(job)

        def _get_timestamp(job_id: str) -> timezone.datetime:
            job_timestamp = job_id.split(job_id_prefix, maxsplit=1)[-1]
            if job_timestamp == "initial":
                return timezone.datetime.min.replace(tzinfo=timezone.utc)
            else:
                return timezone.datetime.fromtimestamp(float(job_timestamp), tz=timezone.utc)

        max_job_id = max(
            (j for j in existing_job_ids if j.startswith(job_id_prefix)),
            key=_get_timestamp,
            default=None,
        )
        max_timestamp = _get_timestamp(max_job_id) if max_job_id else None

        last_update_time = self._get_last_report_time(job)
        if last_update_time is None:
            # Report has never been computed, is queued, or is being computed
            queue_job_id = self._make_initial_queue_job_id(job)
        elif max_timestamp is not None and now < max_timestamp:
            # Reuse the existing next job
            queue_job_id = max_job_id
        else:
            # Add an updating job in the queue in the next time frame
            delay = self._get_analytics_check_job_delay()
            intervals = max(1, 1 + (now - last_update_time) // delay)
            next_update_time = last_update_time + delay * intervals
            queue_job_id = self._make_regular_queue_job_id(job, next_update_time)

        return queue_job_id

    class AnalyticsReportsNotAvailable(Exception):
        pass

    def _should_update(self, task: Job) -> bool:
        try:
            self._check_analytics_reporting_available(task)
            return True
        except self.AnalyticsReportsNotAvailable:
            return False

    # def schedule_quality_autoupdate_job(self, task: Task):
    #     """
    #     This function schedules a quality report autoupdate job
    #     """

    #     # The algorithm is lock-free. It should keep the following properties:
    #     # - job names are stable between potential writers
    #     # - if multiple simultaneous writes can happen, the objects written must be the same
    #     # - once a job is created, it can only be updated by the scheduler and the handling worker

    #     if not self._should_update(task):
    #         return

    #     now = timezone.now()
    #     delay = self._get_quality_check_job_delay()
    #     next_job_time = now.utcnow() + delay

    #     scheduler = self._get_scheduler()
    #     existing_job_ids = set(j.id for j in scheduler.get_jobs(until=next_job_time))

    #     queue_job_id = self._find_next_job_id(existing_job_ids, task, now=now)
    #     if queue_job_id not in existing_job_ids:
    #         scheduler.enqueue_at(
    #             next_job_time,
    #             self._check_job_analytics,
    #             task_id=task.id,
    #             job_id=queue_job_id,
    #         )

    def schedule_analytics_check_job(self, job: Job, *, user_id: int) -> str:
        """
        Schedules a analytics report computation job, supposed for updates by a request.
        """

        # self._check_analytics_reporting_available(job)

        rq_id = self._make_custom_analytics_check_job_id()

        queue = self._get_queue()
        queue.enqueue(
            self._check_job_analytics,
            cvat_job_id=job.id,
            job_id=rq_id,
            meta={"user_id": user_id, "job_type": self._RQ_CUSTOM_ANALYTICS_CHECK_JOB_TYPE},
            result_ttl=self._JOB_RESULT_TTL,
            failure_ttl=self._JOB_RESULT_TTL,
        )

        return rq_id

    def get_analytics_check_job(self, rq_id: str):
        queue = self._get_queue()
        rq_job = queue.fetch_job(rq_id)

        if rq_job and not self.is_custom_analytics_check_job(rq_job):
            rq_job = None

        return rq_job

    def is_custom_analytics_check_job(self, rq_job) -> bool:
        return rq_job.meta.get("job_type") == self._RQ_CUSTOM_ANALYTICS_CHECK_JOB_TYPE

    @classmethod
    # @silk_profile()
    def _check_job_analytics(cls, *, cvat_job_id: int) -> int:
        return cls()._compute_reports(job_id=cvat_job_id)

    def _compute_reports(self, job_id: int) -> int:
        statistics = {
            "objects": {
                "title": "Objects",
                "description": "Metric shows number of added/changed/deleted objects.",
                "granularity": "day",
                "default_view": "histogram",
                "dataseries": self._compute_objects_report(job_id),
            },
            "working_time": {
                "title": "Working time",
                "description": "Metric shows the annotation speed in objects per hour.",
                "granularity": "day",
                "default_view": "histogram",
                "dataseries": self._compute_working_time_report(job_id),
            },
            "annotation_time": {
                "title": "Annotation time",
                "description": "Metric shows how long the task is in progress state.",
                "default_view": "numeric",
                "dataseries": self._compute_annotation_time_report(job_id),
            },
        }

        report, _ = AnalyticsReport.objects.get_or_create(pk=job_id)
        report.statistics = statistics
        report.save()

        return job_id

    def _get_current_job(self):
        from rq import get_current_job

        return get_current_job()

    @staticmethod
    def _compute_objects_report(job_id: int):
        def _get_clickhouse_data(scope, job_id):
            object_type = scope.split(':')[1]
            query = "SELECT toStartOfDay(timestamp) as day, sum(JSONLength(JSONExtractString(payload, {object_type:String}))) as s FROM events WHERE scope = {scope:String} AND job_id = {job_id:UInt64} GROUP BY day ORDER BY day ASC"
            parameters = {
                "scope": scope,
                "object_type": object_type,
                "job_id": job_id,
            }

            result = make_clickhouse_query(query, parameters)
            return {entry[0]: entry[1] for entry in result.result_rows}

        statistics = {
            "created": {
                "tracks": _get_clickhouse_data("create:tracks", job_id),
                "shapes": _get_clickhouse_data("create:shapes", job_id),
                "tags": _get_clickhouse_data("create:tags", job_id),
            },
            "updated": {
                "tracks": _get_clickhouse_data("update:tracks", job_id),
                "shapes": _get_clickhouse_data("update:shapes", job_id),
                "tags": _get_clickhouse_data("update:tags", job_id),
            },
            "deleted": {
                "tracks": _get_clickhouse_data("delete:tracks", job_id),
                "shapes": _get_clickhouse_data("delete:shapes", job_id),
                "tags": _get_clickhouse_data("delete:tags", job_id),
            },
        }

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

    @staticmethod
    def _compute_working_time_report(job_id: int):
        def get_tags_count(annotations):
            return len(annotations["tags"])

        def get_shapes_count(annotations):
            return len(annotations["shapes"])

        def get_track_count(annotations):
            db_job = Job.objects.select_related("segment").get(pk=job_id)

            count = 0
            for track in annotations["tracks"]:
                if len(track["shapes"]) == 1:
                    count += db_job.segment.stop_frame - track["shapes"][0]["frame"] + 1
                for prev_shape, cur_shape in zip(track["shapes"], track["shapes"][1:]):
                    if prev_shape["outside"] is not True:
                        count += cur_shape["frame"] - prev_shape["frame"]

            return count

        # Calculate object count

        annotations = dm.task.get_job_data(job_id)
        object_count = 0
        object_count += get_tags_count(annotations)
        object_count += get_shapes_count(annotations)
        object_count += get_track_count(annotations)

        timestamp = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        timestamp_str = timestamp.strftime('%Y-%m-%dT%H:%M:%SZ')

        report, _ = AnalyticsReport.objects.get_or_create(pk=job_id, statistics={})
        wt_statistics = report.statistics.get("working_time", {})
        if not wt_statistics:
            dataseries = {
                "object_count": [],
                "working_time": [],
            }
        else:
            dataseries = wt_statistics["dataseries"]

        if dataseries["object_count"]:
            last_entry = dataseries["object_count"][-1]
            last_entry_timestamp = parser.parse(last_entry["datetime"])
            if last_entry_timestamp.date() == timestamp.date():
                dataseries["object_count"] = dataseries["object_count"][:-1]

        dataseries["object_count"].append({
            "value": object_count,
            "datetime": timestamp_str,
        })

        dates = [parser.isoparse(ds_entry["datetime"]).date() for ds_entry in dataseries["object_count"]]

        # Calculate working time

        query = "SELECT toStartOfDay(timestamp) as day, sum(JSONExtractUInt(payload, 'working_time')) / 1000 as wt from cvat.events WHERE job_id={job_id:UInt64} GROUP BY day ORDER BY day"
        parameters = {
            "job_id": job_id,
        }

        result = make_clickhouse_query(query, parameters)

        wt_data = {r[0].date(): r[1] for r in result.result_rows}

        working_time = []
        for date in dates:
            working_time.append({
                "value": wt_data.get(date, 0),
                "datetime": datetime.combine(date, datetime.min.time()).isoformat()+"Z"
            })

        return {
            "object_count": dataseries["object_count"],
            "working_time": working_time,
        }

    @staticmethod
    def _compute_annotation_time_report(job_id: int):
        query = "SELECT timestamp, obj_val  FROM cvat.events WHERE scope='update:job' AND job_id={job_id:UInt64} AND obj_name='state' ORDER BY timestamp ASC"
        parameters = {
            "job_id": job_id,
        }
        result = make_clickhouse_query(query, parameters)
        total_annotating_time = 0
        last_change = None
        for prev_row, cur_row in zip(result.result_rows, result.result_rows[1:]):
            if prev_row[1] == "in progress":
                total_annotating_time += int((cur_row[0] - prev_row[0]).total_seconds())
                last_change = cur_row[0]
        if result.result_rows[-1][1] == "in progress":
            total_annotating_time += int((datetime.now(timezone.utc) - result.result_rows[-1][0]).total_seconds())

        if last_change:
            last_change = last_change.isoformat().replace("+00:00", "Z")
        else:
            last_change = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
        return {
            "total_annotating_time": [
                {
                    "value": total_annotating_time,
                    "datetime": last_change,
                },
            ]
        }
