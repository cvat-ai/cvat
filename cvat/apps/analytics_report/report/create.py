# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from datetime import datetime, timedelta
from typing import Union
from uuid import uuid4

import django_rq
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction
from django.utils import timezone

from cvat.apps.analytics_report.models import AnalyticsReport
from cvat.apps.analytics_report.report.derived_metrics import (
    JobTotalAnnotationSpeed,
    JobTotalObjectCount,
    ProjectAnnotationSpeed,
    ProjectAnnotationTime,
    ProjectObjects,
    ProjectTotalAnnotationSpeed,
    ProjectTotalObjectCount,
    TaskAnnotationSpeed,
    TaskAnnotationTime,
    TaskObjects,
    TaskTotalAnnotationSpeed,
    TaskTotalObjectCount,
)
from cvat.apps.analytics_report.report.primary_metrics import (
    JobAnnotationSpeed,
    JobAnnotationTime,
    JobObjects,
)
from cvat.apps.engine.models import Job, Project, Task


def get_empty_report():
    metrics = [
        JobObjects(None),
        JobAnnotationSpeed(None),
        JobAnnotationTime(None),
        JobTotalObjectCount(None, []),
        JobTotalAnnotationSpeed(None, []),
    ]

    statistics = [AnalyticsReportUpdateManager._get_empty_statistics_entry(dm) for dm in metrics]

    db_report = AnalyticsReport(statistics=statistics, created_date=datetime.now(timezone.utc))
    return db_report


class AnalyticsReportUpdateManager:
    _QUEUE_JOB_PREFIX_TASK = "update-analytics-report-task-"
    _QUEUE_JOB_PREFIX_PROJECT = "update-analytics-report-project-"
    _RQ_CUSTOM_ANALYTICS_CHECK_JOB_TYPE = "custom_analytics_check"
    _JOB_RESULT_TTL = 120

    @classmethod
    def _get_analytics_check_job_delay(cls) -> timedelta:
        return timedelta(seconds=settings.ANALYTICS_CHECK_JOB_DELAY)

    def _get_scheduler(self):
        return django_rq.get_scheduler(settings.CVAT_QUEUES.ANALYTICS_REPORTS.value)

    def _get_queue(self):
        return django_rq.get_queue(settings.CVAT_QUEUES.ANALYTICS_REPORTS.value)

    def _make_queue_job_id_base(self, obj) -> str:
        if isinstance(obj, Task):
            return f"{self._QUEUE_JOB_PREFIX_TASK}{obj.id}"
        else:
            return f"{self._QUEUE_JOB_PREFIX_PROJECT}{obj.id}"

    def _make_custom_analytics_check_job_id(self) -> str:
        return uuid4().hex

    def _make_queue_job_id(self, obj, start_time: timezone.datetime) -> str:
        return f"{self._make_queue_job_id_base(obj)}-{start_time.timestamp()}"

    def _make_autoupdate_blocker_key(self, obj) -> str:
        return f"cvat:analytics:autoupdate-blocker:{self._make_queue_job_id_base(obj)}"

    @classmethod
    def _get_last_report_time(cls, obj):
        try:
            report = obj.analytics_report
            if report:
                return report.created_date
        except ObjectDoesNotExist:
            return None

    class AnalyticsReportsNotAvailable(Exception):
        pass

    def schedule_analytics_report_autoupdate_job(self, *, job=None, task=None, project=None):
        assert sum(map(bool, (job, task, project))) == 1, "Expected only 1 argument"

        now = timezone.now()
        delay = self._get_analytics_check_job_delay()
        next_job_time = now.utcnow() + delay

        target_obj = None
        cvat_project_id = None
        cvat_task_id = None
        if job is not None:
            if job.segment.task.project:
                target_obj = job.segment.task.project
                cvat_project_id = target_obj.id
            else:
                target_obj = job.segment.task
                cvat_task_id = target_obj.id
        elif task is not None:
            if task.project:
                target_obj = task.project
                cvat_project_id = target_obj.id
            else:
                target_obj = task
                cvat_task_id = target_obj.id
        elif project is not None:
            target_obj = project
            cvat_project_id = project.id

        with django_rq.get_connection(settings.CVAT_QUEUES.ANALYTICS_REPORTS.value) as connection:
            # The blocker key is used to avoid scheduling a report update job
            # for every single change. The first time this method is called
            # for a given object, we schedule the job and create a blocker
            # that expires at the same time as the job is supposed to start.
            # Until the blocker expires, we don't schedule any more jobs.
            blocker_key = self._make_autoupdate_blocker_key(target_obj)
            if connection.exists(blocker_key):
                return

            queue_job_id = self._make_queue_job_id(target_obj, next_job_time)

            self._get_scheduler().enqueue_at(
                next_job_time,
                self._check_analytics_report,
                cvat_task_id=cvat_task_id,
                cvat_project_id=cvat_project_id,
                job_id=queue_job_id,
            )

            connection.set(blocker_key, queue_job_id, exat=next_job_time)

    def schedule_analytics_check_job(self, *, job=None, task=None, project=None, user_id):
        rq_id = self._make_custom_analytics_check_job_id()

        queue = self._get_queue()
        queue.enqueue(
            self._check_analytics_report,
            cvat_job_id=job.id if job is not None else None,
            cvat_task_id=task.id if task is not None else None,
            cvat_project_id=project.id if project is not None else None,
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

    @staticmethod
    def _get_analytics_report(db_obj: Union[Job, Task, Project]) -> AnalyticsReport:
        db_report = getattr(db_obj, "analytics_report", None)
        if db_report is None:
            db_report = AnalyticsReport(statistics=[])

            if isinstance(db_obj, Job):
                db_report.job_id = db_obj.id
            elif isinstance(db_obj, Task):
                db_report.task_id = db_obj.id
            elif isinstance(db_obj, Project):
                db_report.project_id = db_obj.id

            db_obj.analytics_report = db_report

        return db_report

    @classmethod
    def _check_analytics_report(
        cls, *, cvat_job_id: int = None, cvat_task_id: int = None, cvat_project_id: int = None
    ) -> bool:
        if cvat_job_id is not None:
            queryset = Job.objects.select_related("analytics_report")
            with transaction.atomic():
                # The Job could have been deleted during scheduling
                try:
                    db_job = queryset.get(pk=cvat_job_id)
                except Job.DoesNotExist:
                    return False

                db_report = cls._get_analytics_report(db_job)

            db_report = cls()._compute_report_for_job(db_job=db_job, db_report=db_report)

            with transaction.atomic():
                # The job could have been deleted during processing
                try:
                    actual_job = queryset.get(pk=db_job.id)
                except Job.DoesNotExist:
                    return False

                actual_report = getattr(actual_job, "analytics_report", None)
                actual_created_date = (
                    getattr(actual_report, "created_date", None)
                    if actual_report is not None
                    else None
                )
                # The report has been updated during processing
                if db_report.created_date != actual_created_date:
                    return False

                db_report.save()
            return True

        elif cvat_task_id is not None:
            queryset = Task.objects.select_related("analytics_report").prefetch_related(
                "segment_set__job_set"
            )
            with transaction.atomic():
                try:
                    db_task = queryset.get(pk=cvat_task_id)
                except Task.DoesNotExist:
                    return False

            db_report = cls._get_analytics_report(db_task)
            db_report, job_reports = cls()._compute_report_for_task(
                db_task=db_task, db_report=db_report
            )

            with transaction.atomic():
                # The task could have been deleted during processing
                try:
                    actual_task = queryset.get(pk=cvat_task_id)
                except Task.DoesNotExist:
                    return False

                actual_report = getattr(actual_task, "analytics_report", None)
                actual_created_date = (
                    actual_report.created_date if actual_report is not None else None
                )
                # The report has been updated during processing
                if db_report.created_date != actual_created_date:
                    return False

                actual_job_report_created_dates = {}
                for db_segment in db_task.segment_set.all():
                    for db_job in db_segment.job_set.all():
                        ar = getattr(db_job, "analytics_report", None)
                        acd = ar.created_date if ar is not None else None
                        actual_job_report_created_dates[db_job.id] = acd

                for jr in job_reports:
                    if jr.created_date != actual_job_report_created_dates[jr.job_id]:
                        return False

                db_report.save()
                for jr in job_reports:
                    jr.save()
            return True

        elif cvat_project_id is not None:
            queryset = Project.objects.select_related("analytics_report").prefetch_related(
                "tasks__segment_set__job_set"
            )
            with transaction.atomic():
                try:
                    db_project = queryset.get(pk=cvat_project_id)
                except Project.DoesNotExist:
                    return False

            db_report = cls._get_analytics_report(db_project)
            db_report, task_reports, job_reports = cls()._compute_report_for_project(
                db_project=db_project, db_report=db_report
            )

            with transaction.atomic():
                # The Project could have been deleted during processing
                try:
                    actual_project = queryset.get(pk=cvat_project_id)
                except Project.DoesNotExist:
                    return False

                actual_report = getattr(actual_project, "analytics_report", None)
                actual_created_date = (
                    actual_report.created_date if actual_report is not None else None
                )
                # The report has been updated during processing
                if db_report.created_date != actual_created_date:
                    return False

                actual_job_report_created_dates = {}
                actual_tasks_report_created_dates = {}
                for db_task in db_project.tasks.all():
                    task_ar = getattr(db_task, "analytics_report", None)
                    task_ar_created_date = task_ar.created_date if task_ar else None
                    actual_tasks_report_created_dates[db_task.id] = task_ar_created_date
                    for db_segment in db_task.segment_set.all():
                        for db_job in db_segment.job_set.all():
                            ar = getattr(db_job, "analytics_report", None)
                            acd = ar.created_date if ar is not None else None
                            actual_job_report_created_dates[db_job.id] = acd

                for tr in task_reports:
                    if tr.created_date != actual_tasks_report_created_dates[tr.task_id]:
                        return False

                for jr in job_reports:
                    if jr.created_date != actual_job_report_created_dates[jr.job_id]:
                        return False

                db_report.save()
                for tr in task_reports:
                    tr.save()

                for jr in job_reports:
                    jr.save()
            return True

    @staticmethod
    def _get_statistics_entry_props(statistics_object):
        return {
            "name": statistics_object.key(),
            "title": statistics_object.title(),
            "description": statistics_object.description(),
            "granularity": statistics_object.granularity(),
            "default_view": statistics_object.default_view(),
            "transformations": statistics_object.transformations(),
            "is_filterable_by_date": statistics_object.is_filterable_by_date(),
        }

    @staticmethod
    def _get_statistics_entry(statistics_object):
        return {
            **AnalyticsReportUpdateManager._get_statistics_entry_props(statistics_object),
            **{"data_series": statistics_object.calculate()},
        }

    @staticmethod
    def _get_empty_statistics_entry(statistics_object):
        return {
            **AnalyticsReportUpdateManager._get_statistics_entry_props(statistics_object),
            **{"data_series": statistics_object.get_empty()},
        }

    @staticmethod
    def _get_metric_by_key(key, statistics):
        return next(filter(lambda s: s["name"] == key, statistics))

    def _compute_report_for_job(self, db_job: Job, db_report: AnalyticsReport) -> AnalyticsReport:
        # recalculate the report if there is no report or the existing one is outdated
        if db_report.created_date is None or db_report.created_date < db_job.updated_date:
            primary_metrics = [
                JobObjects(db_job),
                JobAnnotationSpeed(db_job),
                JobAnnotationTime(db_job),
            ]

            primary_statistics = {
                pm.key(): self._get_statistics_entry(pm) for pm in primary_metrics
            }

            derived_metrics = [
                JobTotalObjectCount(
                    db_job, primary_statistics=primary_statistics[JobAnnotationSpeed.key()]
                ),
                JobTotalAnnotationSpeed(
                    db_job, primary_statistics=primary_statistics[JobAnnotationSpeed.key()]
                ),
            ]

            derived_statistics = {
                dm.key(): self._get_statistics_entry(dm) for dm in derived_metrics
            }

            db_report.statistics = [primary_statistics[pm.key()] for pm in primary_metrics]
            db_report.statistics.extend(derived_statistics[dm.key()] for dm in derived_metrics)

        return db_report

    def _compute_report_for_task(
        self,
        db_task: Task,
        db_report: AnalyticsReport,
    ) -> tuple[AnalyticsReport, list[AnalyticsReport]]:
        job_reports = []
        for db_segment in db_task.segment_set.all():
            for db_job in db_segment.job_set.all():
                job_report = self._get_analytics_report(db_job)
                job_reports.append(
                    self._compute_report_for_job(db_job=db_job, db_report=job_report)
                )
        # recalculate the report if there is no report or the existing one is outdated
        if db_report.created_date is None or db_report.created_date < db_task.updated_date:
            derived_metrics = [
                TaskObjects(
                    db_task,
                    [
                        self._get_metric_by_key(JobObjects.key(), jr.statistics)
                        for jr in job_reports
                    ],
                ),
                TaskAnnotationSpeed(
                    db_task,
                    [
                        self._get_metric_by_key(JobAnnotationSpeed.key(), jr.statistics)
                        for jr in job_reports
                    ],
                ),
                TaskAnnotationTime(
                    db_task,
                    [
                        self._get_metric_by_key(JobAnnotationTime.key(), jr.statistics)
                        for jr in job_reports
                    ],
                ),
                TaskTotalObjectCount(
                    db_task,
                    [
                        self._get_metric_by_key(JobAnnotationSpeed.key(), jr.statistics)
                        for jr in job_reports
                    ],
                ),
                TaskTotalAnnotationSpeed(
                    db_task,
                    [
                        self._get_metric_by_key(JobAnnotationSpeed.key(), jr.statistics)
                        for jr in job_reports
                    ],
                ),
            ]

            statistics = [self._get_statistics_entry(dm) for dm in derived_metrics]
            db_report.statistics = statistics

        return db_report, job_reports

    def _compute_report_for_project(
        self, db_project: Project, db_report: AnalyticsReport
    ) -> tuple[AnalyticsReport, list[AnalyticsReport], list[AnalyticsReport]]:
        job_reports = []
        task_reports = []
        for db_task in db_project.tasks.all():
            db_task_report = self._get_analytics_report(db_task)
            tr, jrs = self._compute_report_for_task(db_task, db_task_report)
            task_reports.append(tr)
            job_reports.extend(jrs)
        # recalculate the report if there is no report or the existing one is outdated
        if db_report.created_date is None or db_report.created_date < db_project.updated_date:
            derived_metrics = [
                ProjectObjects(
                    db_project,
                    [
                        self._get_metric_by_key(JobObjects.key(), jr.statistics)
                        for jr in job_reports
                    ],
                ),
                ProjectAnnotationSpeed(
                    db_project,
                    [
                        self._get_metric_by_key(JobAnnotationSpeed.key(), jr.statistics)
                        for jr in job_reports
                    ],
                ),
                ProjectAnnotationTime(
                    db_project,
                    [
                        self._get_metric_by_key(JobAnnotationTime.key(), jr.statistics)
                        for jr in job_reports
                    ],
                ),
                ProjectTotalObjectCount(
                    db_project,
                    [
                        self._get_metric_by_key(JobAnnotationSpeed.key(), jr.statistics)
                        for jr in job_reports
                    ],
                ),
                ProjectTotalAnnotationSpeed(
                    db_project,
                    [
                        self._get_metric_by_key(JobAnnotationSpeed.key(), jr.statistics)
                        for jr in job_reports
                    ],
                ),
            ]

            statistics = [self._get_statistics_entry(dm) for dm in derived_metrics]
            db_report.statistics = statistics

        return db_report, task_reports, job_reports

    def _get_current_job(self):
        from rq import get_current_job

        return get_current_job()
