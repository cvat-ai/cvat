# Copyright (C) 2023-2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from datetime import datetime, timedelta
from typing import Union

import django_rq
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction
from django.utils import timezone

from cvat.apps.analytics_report.models import AnalyticsReport
from cvat.apps.analytics_report.report.derived_metrics import (
    DerivedMetricBase,
    JobAverageAnnotationSpeed,
    JobTotalObjectCount,
    ProjectAnnotationSpeed,
    ProjectAnnotationTime,
    ProjectAverageAnnotationSpeed,
    ProjectObjects,
    ProjectTotalObjectCount,
    TaskAnnotationSpeed,
    TaskAnnotationTime,
    TaskAverageAnnotationSpeed,
    TaskObjects,
    TaskTotalObjectCount,
)
from cvat.apps.analytics_report.report.primary_metrics import (
    JobAnnotationSpeed,
    JobAnnotationSpeedExtractor,
    JobAnnotationTime,
    JobAnnotationTimeExtractor,
    JobObjects,
    JobObjectsExtractor,
    PrimaryMetricBase,
)
from cvat.apps.engine.models import Job, JobType, Project, Task


def get_empty_report():
    metrics = [
        JobObjects(None),
        JobAnnotationSpeed(None),
        JobAnnotationTime(None),
        JobTotalObjectCount(None),
        JobAverageAnnotationSpeed(None),
    ]

    statistics = [AnalyticsReportUpdateManager._get_empty_statistics_entry(dm) for dm in metrics]

    db_report = AnalyticsReport(statistics=statistics, created_date=datetime.now(timezone.utc))
    return db_report


class AnalyticsReportUpdateManager:
    _QUEUE_JOB_PREFIX_TASK = "analytics:calculate-report-task-"
    _QUEUE_JOB_PREFIX_PROJECT = "analytics:calculate-report-project-"
    _QUEUE_JOB_PREFIX_JOB = "analytics:calculate-report-job-"

    def _get_queue(self):
        return django_rq.get_queue(settings.CVAT_QUEUES.ANALYTICS_REPORTS.value)

    def _make_queue_job_id_base(self, obj) -> str:
        if isinstance(obj, Task):
            return f"{self._QUEUE_JOB_PREFIX_TASK}{obj.id}"
        elif isinstance(obj, Project):
            return f"{self._QUEUE_JOB_PREFIX_PROJECT}{obj.id}"
        elif isinstance(obj, Job):
            return f"{self._QUEUE_JOB_PREFIX_JOB}{obj.id}"

    @classmethod
    def _get_last_report_time(cls, obj):
        try:
            report = obj.analytics_report
            if report:
                return report.created_date
        except ObjectDoesNotExist:
            return None

    def schedule_analytics_check_job(self, *, job=None, task=None, project=None, user_id):
        rq_id = self._make_queue_job_id_base(job or task or project)

        queue = self._get_queue()
        existing_job = self.get_analytics_check_job(rq_id)

        if existing_job:
            if existing_job.get_status() in ["queued", "started", "deferred", "scheduled"]:
                return rq_id
            existing_job.delete()

        queue.enqueue(
            self._check_analytics_report,
            cvat_job_id=job.id if job is not None else None,
            cvat_task_id=task.id if task is not None else None,
            cvat_project_id=project.id if project is not None else None,
            job_id=rq_id,
            meta={"user_id": user_id},
        )

        return rq_id

    def get_analytics_check_job(self, rq_id: str):
        queue = self._get_queue()
        rq_job = queue.fetch_job(rq_id)
        return rq_job

    @staticmethod
    def _get_analytics_report(db_obj: Union[Job, Task, Project]) -> AnalyticsReport:
        db_report = getattr(db_obj, "analytics_report", None)
        if db_report is None:
            db_report = AnalyticsReport(statistics=[])

            if isinstance(db_obj, Job):
                db_report.job = db_obj
            elif isinstance(db_obj, Task):
                db_report.task = db_obj
            elif isinstance(db_obj, Project):
                db_report.project = db_obj

            db_obj.analytics_report = db_report

        return db_report

    @classmethod
    def _check_analytics_report(
        cls, *, cvat_job_id: int = None, cvat_task_id: int = None, cvat_project_id: int = None
    ) -> bool:
        try:
            if cvat_job_id is not None:
                queryset = Job.objects.select_related("analytics_report")
                db_job = queryset.get(pk=cvat_job_id)

                start_timestamp = db_job.created_date
                end_timestamp = db_job.updated_date + timedelta(seconds=1)

                db_report = cls._get_analytics_report(db_job)
                primary_metric_extractors = dict(
                    (
                        (
                            JobObjects.key(),
                            JobObjectsExtractor(start_timestamp, end_timestamp, cvat_job_id),
                        ),
                        (
                            JobAnnotationSpeed.key(),
                            JobAnnotationSpeedExtractor(
                                start_timestamp, end_timestamp, cvat_job_id
                            ),
                        ),
                        (
                            JobAnnotationTime.key(),
                            JobAnnotationTimeExtractor(start_timestamp, end_timestamp, cvat_job_id),
                        ),
                    )
                )
                db_report = cls()._compute_report_for_job(
                    db_job, db_report, primary_metric_extractors
                )

                with transaction.atomic():
                    actual_job = queryset.get(pk=db_job.id)
                    actual_report = getattr(actual_job, "analytics_report", None)
                    actual_created_date = getattr(actual_report, "created_date", None)
                    # The report has been updated during processing
                    if db_report.created_date != actual_created_date:
                        return False
                    db_report.save()
                return True
            elif cvat_task_id is not None:
                queryset = Task.objects.select_related("analytics_report").prefetch_related(
                    "segment_set__job_set"
                )
                db_task = queryset.get(pk=cvat_task_id)
                db_report = cls._get_analytics_report(db_task)

                start_timestamp = db_task.created_date
                end_timestamp = db_task.updated_date + timedelta(seconds=1)

                primary_metric_extractors = dict(
                    (
                        (
                            JobObjects.key(),
                            JobObjectsExtractor(
                                start_timestamp, end_timestamp, task_ids=[cvat_task_id]
                            ),
                        ),
                        (
                            JobAnnotationSpeed.key(),
                            JobAnnotationSpeedExtractor(
                                start_timestamp, end_timestamp, task_ids=[cvat_task_id]
                            ),
                        ),
                        (
                            JobAnnotationTime.key(),
                            JobAnnotationTimeExtractor(
                                start_timestamp, end_timestamp, task_ids=[cvat_task_id]
                            ),
                        ),
                    )
                )
                db_report, job_reports = cls()._compute_report_for_task(
                    db_task, db_report, primary_metric_extractors
                )

                with transaction.atomic():
                    actual_task = queryset.get(pk=cvat_task_id)
                    actual_report = getattr(actual_task, "analytics_report", None)
                    actual_created_date = getattr(actual_report, "created_date", None)
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

                db_project = queryset.get(pk=cvat_project_id)
                db_report = cls._get_analytics_report(db_project)

                tasks_data = db_project.tasks.values("id", "created_date", "updated_date")
                start_timestamp = (
                    min(item["created_date"] for item in tasks_data)
                    if len(tasks_data)
                    else db_project.created_date
                )
                end_timestamp = (
                    max(item["updated_date"] for item in tasks_data)
                    if len(tasks_data)
                    else db_project.updated_date
                ) + timedelta(seconds=1)
                task_ids = [item["id"] for item in tasks_data]

                primary_metric_extractors = dict(
                    (
                        (
                            JobObjects.key(),
                            JobObjectsExtractor(start_timestamp, end_timestamp, task_ids=task_ids),
                        ),
                        (
                            JobAnnotationSpeed.key(),
                            JobAnnotationSpeedExtractor(
                                start_timestamp, end_timestamp, task_ids=task_ids
                            ),
                        ),
                        (
                            JobAnnotationTime.key(),
                            JobAnnotationTimeExtractor(
                                start_timestamp, end_timestamp, task_ids=task_ids
                            ),
                        ),
                    )
                )
                db_report, task_reports, job_reports = cls()._compute_report_for_project(
                    db_project, db_report, primary_metric_extractors
                )

                with transaction.atomic():
                    actual_project = queryset.get(pk=cvat_project_id)
                    actual_report = getattr(actual_project, "analytics_report", None)
                    actual_created_date = getattr(actual_report, "created_date", None)
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
        except ObjectDoesNotExist:
            # The resource may have been deleted while rq job was queued
            return False

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
    def _get_statistics_entry(statistics_object: PrimaryMetricBase | DerivedMetricBase):
        return {
            **AnalyticsReportUpdateManager._get_statistics_entry_props(statistics_object),
            **{"data_series": statistics_object.calculate()},
        }

    @staticmethod
    def _get_empty_statistics_entry(statistics_object: PrimaryMetricBase | DerivedMetricBase):
        return {
            **AnalyticsReportUpdateManager._get_statistics_entry_props(statistics_object),
            **{"data_series": statistics_object.get_empty()},
        }

    @staticmethod
    def _get_metric_by_key(key, statistics):
        return next(filter(lambda s: s["name"] == key, statistics))

    def _compute_report_for_job(
        self,
        db_job: Job,
        db_report: AnalyticsReport,
        data_extractors: dict,
    ) -> AnalyticsReport:
        # recalculate the report if there is no report or the existing one is outdated
        if db_report.created_date is None or db_report.created_date < db_job.updated_date:
            primary_metrics = [
                JobObjects(db_job, data_extractor=data_extractors.get(JobObjects.key())),
                JobAnnotationSpeed(
                    db_job, data_extractor=data_extractors.get(JobAnnotationSpeed.key())
                ),
                JobAnnotationTime(
                    db_job, data_extractor=data_extractors.get(JobAnnotationTime.key())
                ),
            ]

            primary_statistics = {
                pm.key(): self._get_statistics_entry(pm) for pm in primary_metrics
            }

            derived_metrics = [
                JobTotalObjectCount(
                    db_job,
                    data_extractor=None,
                    primary_statistics=primary_statistics[JobAnnotationSpeed.key()],
                ),
                JobAverageAnnotationSpeed(
                    db_job,
                    data_extractor=None,
                    primary_statistics=primary_statistics[JobAnnotationSpeed.key()],
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
        data_extractors: dict,
    ) -> tuple[AnalyticsReport, list[AnalyticsReport]]:
        job_reports = []

        for db_segment in db_task.segment_set.all():
            for db_job in db_segment.job_set.all():
                current_job_report = self._get_analytics_report(db_job)
                job_reports.append(
                    self._compute_report_for_job(db_job, current_job_report, data_extractors)
                )

        filtered_job_reports = list(filter(lambda x: x.job.type == JobType.ANNOTATION, job_reports))
        # recalculate the report if there is no report or the existing one is outdated
        if db_report.created_date is None or db_report.created_date < db_task.updated_date:
            derived_metrics = [
                TaskObjects(
                    db_task,
                    data_extractor=None,
                    primary_statistics=[
                        self._get_metric_by_key(JobObjects.key(), jr.statistics)
                        for jr in filtered_job_reports
                    ],
                ),
                TaskAnnotationSpeed(
                    db_task,
                    data_extractor=None,
                    primary_statistics=[
                        self._get_metric_by_key(JobAnnotationSpeed.key(), jr.statistics)
                        for jr in filtered_job_reports
                    ],
                ),
                TaskAnnotationTime(
                    db_task,
                    data_extractor=None,
                    primary_statistics=[
                        self._get_metric_by_key(JobAnnotationTime.key(), jr.statistics)
                        for jr in filtered_job_reports
                    ],
                ),
                TaskTotalObjectCount(
                    db_task,
                    data_extractor=None,
                    primary_statistics=[
                        self._get_metric_by_key(JobAnnotationSpeed.key(), jr.statistics)
                        for jr in filtered_job_reports
                    ],
                ),
                TaskAverageAnnotationSpeed(
                    db_task,
                    data_extractor=None,
                    primary_statistics=[
                        self._get_metric_by_key(JobAnnotationSpeed.key(), jr.statistics)
                        for jr in filtered_job_reports
                    ],
                ),
            ]

            statistics = [self._get_statistics_entry(dm) for dm in derived_metrics]
            db_report.statistics = statistics

        return db_report, job_reports

    def _compute_report_for_project(
        self,
        db_project: Project,
        db_report: AnalyticsReport,
        data_extractors: dict,
    ) -> tuple[AnalyticsReport, list[AnalyticsReport], list[AnalyticsReport]]:
        job_reports = []
        task_reports = []

        for db_task in db_project.tasks.all():
            current_task_report = self._get_analytics_report(db_task)
            _task_report, _job_reports = self._compute_report_for_task(
                db_task, current_task_report, data_extractors
            )
            task_reports.append(_task_report)
            job_reports.extend(_job_reports)

        filtered_job_reports = list(filter(lambda x: x.job.type == JobType.ANNOTATION, job_reports))
        # recalculate the report if there is no report or the existing one is outdated
        if db_report.created_date is None or db_report.created_date < db_project.updated_date:
            derived_metrics = [
                ProjectObjects(
                    db_project,
                    data_extractor=None,
                    primary_statistics=[
                        self._get_metric_by_key(JobObjects.key(), jr.statistics)
                        for jr in filtered_job_reports
                    ],
                ),
                ProjectAnnotationSpeed(
                    db_project,
                    data_extractor=None,
                    primary_statistics=[
                        self._get_metric_by_key(JobAnnotationSpeed.key(), jr.statistics)
                        for jr in filtered_job_reports
                    ],
                ),
                ProjectAnnotationTime(
                    db_project,
                    data_extractor=None,
                    primary_statistics=[
                        self._get_metric_by_key(JobAnnotationTime.key(), jr.statistics)
                        for jr in filtered_job_reports
                    ],
                ),
                ProjectTotalObjectCount(
                    db_project,
                    data_extractor=None,
                    primary_statistics=[
                        self._get_metric_by_key(JobAnnotationSpeed.key(), jr.statistics)
                        for jr in filtered_job_reports
                    ],
                ),
                ProjectAverageAnnotationSpeed(
                    db_project,
                    data_extractor=None,
                    primary_statistics=[
                        self._get_metric_by_key(JobAnnotationSpeed.key(), jr.statistics)
                        for jr in filtered_job_reports
                    ],
                ),
            ]

            statistics = [self._get_statistics_entry(dm) for dm in derived_metrics]
            db_report.statistics = statistics

        return db_report, task_reports, job_reports

    def _get_current_job(self):
        from rq import get_current_job

        return get_current_job()
