# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from datetime import timedelta
from django.utils import timezone

from typing import Sequence, Optional

import django_rq
from django.conf import settings

from uuid import uuid4

from cvat.apps.engine.models import Job
from cvat.apps.analytics_report import models

from cvat.apps.analytics_report.models import AnalyticsReport
from cvat.apps.analytics_report.report.primary_metrics import AnnotationSpeed, AnnotationTime, Objects
from cvat.apps.analytics_report.report.derived_metrics import TotalAnnotationSpeed, TotalObjectCount

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
        report = models.AnalyticsReport.objects.get(job_id=job.id)
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
        def get_statistics_entry(statistics_object):
            return {
                "title": statistics_object.title,
                "description": statistics_object.description,
                "granularity": statistics_object.granularity,
                "default_view": statistics_object.default_view,
                "dataseries": statistics_object.calculate(),
            }
        annotation_speed = AnnotationSpeed(job_id=job_id)
        objects = Objects(job_id=job_id)
        annotation_time = AnnotationTime(job_id=job_id)

        statistics = {
            "objects": get_statistics_entry(objects),
            "annotation_speed": get_statistics_entry(annotation_speed),
            "annotation_time": get_statistics_entry(annotation_time),
        }

        total_annotation_speed = TotalAnnotationSpeed(job_id=job_id, primary_statistics=statistics["annotation_speed"])
        total_object_count = TotalObjectCount(job_id=job_id, primary_statistics=statistics["annotation_speed"])

        statistics["total_annotation_speed"] = get_statistics_entry(total_annotation_speed)
        statistics["total_object_count"] = get_statistics_entry(total_object_count)

        report, _ = AnalyticsReport.objects.get_or_create(job_id=job_id, defaults={"statistics": {}})
        report.statistics = statistics
        report.save()

        return job_id

    def _get_current_job(self):
        from rq import get_current_job

        return get_current_job()
