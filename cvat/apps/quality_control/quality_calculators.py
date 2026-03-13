# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import itertools
from collections import Counter
from contextlib import suppress
from copy import deepcopy

import numpy as np
from django.db import transaction
from django.db.models import OuterRef, Subquery, prefetch_related_objects

from cvat.apps.engine.filters import JsonLogicFilter
from cvat.apps.engine.frame_provider import TaskFrameProvider
from cvat.apps.engine.model_utils import bulk_create
from cvat.apps.engine.models import (
    Image,
    Job,
    JobType,
    Project,
    StageChoice,
    StateChoice,
    Task,
    ValidationMode,
)
from cvat.apps.engine.utils import take_by, transaction_with_repeatable_read
from cvat.apps.quality_control import models
from cvat.apps.quality_control.comparison_report import (
    AnnotationConflict,
    ComparisonParameters,
    ComparisonReport,
    ComparisonReportAnnotationComponentsSummary,
    ComparisonReportAnnotationsSummary,
    ComparisonReportFrameSummary,
    ComparisonReportJobStats,
    ComparisonReportSummary,
    ComparisonReportTaskStats,
)
from cvat.apps.quality_control.models import AnnotationConflictSeverity
from cvat.apps.quality_control.quality_handlers import DatasetQualityEstimator
from cvat.apps.quality_control.quality_reports import JobDataProvider, QualitySettingsManager


_DEFAULT_FETCH_CHUNK_SIZE = 1000


class TaskQualityCalculator:
    # JSON filter lookups
    JOB_FILTER_LOOKUPS = {
        "id": "id",
        "type": "type",
        "state": "state",
        "stage": "stage",
        "assignee": "assignee__username",
        "task_id": "segment__task__id",
        "task_name": "segment__task__name",
    }

    def compute_report(self, task: Task | int) -> models.QualityReport | None:
        with transaction_with_repeatable_read():
            if isinstance(task, int):
                task = Task.objects.select_related("data").get(id=task)

            # The GT job could have been removed or marked incomplete during scheduling,
            # so we need to check it
            gt_job_id = (
                Job.objects.filter(
                    segment__task=task,
                    type=JobType.GROUND_TRUTH,
                    state=StateChoice.COMPLETED,
                    stage=StageChoice.ACCEPTANCE,
                )
                .values_list("id", flat=True)
                .first()
            )
            if not gt_job_id:
                return None

            quality_settings = QualitySettingsManager().get_task_settings(task)

            all_job_ids: set[int] = set(
                Job.objects.filter(segment__task=task)
                .exclude(type=JobType.GROUND_TRUTH)
                .values_list("id", flat=True)
            )

            job_filter = JsonLogicFilter()
            if job_filter_rules := job_filter.parse_query(
                quality_settings.job_filter or "[]", raise_on_empty=False
            ):
                job_queryset = job_filter.apply_filter(
                    Job.objects,
                    parsed_rules=job_filter_rules,
                    lookup_fields=self.JOB_FILTER_LOOKUPS,
                )
                filtered_job_ids: set[int] = set(
                    job_id
                    for ids_chunk in take_by(all_job_ids, chunk_size=_DEFAULT_FETCH_CHUNK_SIZE)
                    for job_id in job_queryset.filter(id__in=ids_chunk).values_list("id", flat=True)
                )
            else:
                filtered_job_ids = set(all_job_ids)

            # TODO: Probably, can be optimized to this:
            # - task updated (the gt job, frame set or labels changed) -> everything is computed
            # - job updated -> job report is computed
            #   old reports can be reused in this case

            # Try to use a shared queryset to minimize DB requests
            job_queryset = Job.objects.select_related("segment").filter(segment__task=task)

            # Add prefetch data to the shared queryset
            # All the jobs / segments share the same task, so we can load it just once.
            # We reuse the same object for better memory use (OOM is possible otherwise).
            # Perform manual "join", since django can't do this.
            gt_job = JobDataProvider.add_prefetch_info(job_queryset).get(id=gt_job_id)

            jobs: dict[int, Job] = [j for j in job_queryset if j.id in filtered_job_ids]
            for job in job_queryset:
                job.segment.task = gt_job.segment.task  # put the prefetched object

            gt_job_data_provider = JobDataProvider(gt_job.id, queryset=job_queryset)
            active_validation_frames = self.get_active_validation_frames(task, gt_job_data_provider)

            job_data_providers = {
                job.id: JobDataProvider(
                    job.id,
                    queryset=job_queryset,
                    included_frames=active_validation_frames,
                )
                for job in jobs
            }

            quality_requirements = list(quality_settings.requirements.all())
            
            # FALLBACK: If no requirements defined, use old monolithic behavior
            # This happens after migration from old DatasetComparator to new requirements system
            if not quality_requirements:
                # Create a temporary in-memory requirement for shape annotations
                # This mimics the old DatasetComparator behavior
                from cvat.apps.quality_control.models import QualityRequirement, QualityRequirementAnnotationType, QualityTargetMetricType
                
                # Use default ComparisonParameters settings
                default_requirement = QualityRequirement(
                    name="Default Shape Requirement (Auto-created)",
                    annotation_type=QualityRequirementAnnotationType.RECTANGLE,  # Will match all shapes
                    target_metric=QualityTargetMetricType.ACCURACY,
                    target_metric_threshold=0.5,
                    parent=None,
                )
                # The __init__ of QualityRequirement will set defaults from ComparisonParameters
                
                # Don't save to settings, just use as temporary requirement
                quality_requirements = [default_requirement]
            
            job_comparison_reports: dict[int, ComparisonReport] = {}
            for job in jobs:
                if job.id not in filtered_job_ids:
                    continue

                job_data_provider = job_data_providers[job.id]
                comparator = DatasetQualityEstimator(
                    job_data_provider,
                    gt_job_data_provider,
                    requirements=quality_requirements,
                )
                job_comparison_reports[job.id] = comparator.generate_report()

                # Release resources
                del job_data_provider.dm_dataset

        task_comparison_report = self._compute_task_report(
            job_comparison_reports,
            settings=quality_settings,
            all_job_ids=all_job_ids,
        )

        with transaction.atomic():
            job_quality_reports = {}
            for job in jobs:
                job_comparison_report = job_comparison_reports[job.id]
                job_report = dict(
                    job=job,
                    target_last_updated=job.updated_date,
                    gt_last_updated=gt_job.updated_date,
                    assignee_id=job.assignee_id,
                    assignee_last_updated=job.assignee_updated_date,
                    data=job_comparison_report.to_json(),
                    conflicts=[c.to_dict() for c in job_comparison_report.conflicts],
                )

                job_quality_reports[job.id] = job_report

            task_report = self._save_reports(
                task_report=dict(
                    task=task,
                    target_last_updated=task.updated_date,
                    gt_last_updated=gt_job.updated_date,
                    assignee_id=task.assignee_id,
                    assignee_last_updated=task.assignee_updated_date,
                    data=task_comparison_report.to_json(),
                    conflicts=[],  # the task doesn't have own conflicts
                ),
                job_reports=list(job_quality_reports.values()),
            )

        return task_report

    def get_active_validation_frames(self, task: Task, gt_job_data_provider: JobDataProvider):
        active_validation_frames = gt_job_data_provider.job_data.get_included_frames()

        validation_layout = task.data.validation_layout
        if validation_layout.mode == ValidationMode.GT_POOL:
            task_frame_provider = TaskFrameProvider(task)
            active_validation_frames = set(
                task_frame_provider.get_rel_frame_number(abs_frame)
                for abs_frame, abs_real_frame in (
                    Image.objects.filter(data=task.data, is_placeholder=True)
                    .values_list("frame", "real_frame")
                    .iterator(chunk_size=_DEFAULT_FETCH_CHUNK_SIZE)
                )
                if task_frame_provider.get_rel_frame_number(abs_real_frame)
                in active_validation_frames
            )

        return active_validation_frames

    def _compute_task_report(
        self,
        job_reports: dict[int, ComparisonReport],
        settings: models.QualitySettings,
        *,
        all_job_ids: set[int],
    ) -> ComparisonReport:
        # Accumulate job stats
        job_stats = ComparisonReportJobStats.create_empty()
        job_stats.all.update(all_job_ids)
        job_stats.excluded.update(all_job_ids - job_reports.keys())
        job_stats.not_checkable.update(
            jid for jid, r in job_reports.items() if not r.comparison_summary.frame_count
        )

        # The task dataset can be different from any jobs' dataset because of frame overlaps
        # between jobs, from which annotations are merged to get the task annotations.
        # Thus, a separate report could be computed for the task. Instead, here we only
        # compute the combined summary of the job reports.
        # It's possible that overlapped frames checked more than once, ignore extra checks
        # in this statistics and results.
        task_validated_frames = set()
        task_validation_frames_count = 0  # in included and non-checkable jobs
        task_total_frames = 0  # in included and non-checkable jobs
        task_conflicts: list[AnnotationConflict] = []
        task_annotations_summary = ComparisonReportAnnotationsSummary.create_empty()
        task_ann_components_summary = ComparisonReportAnnotationComponentsSummary.create_empty()
        task_mean_shape_ious = []
        task_frame_results: dict[int, ComparisonReportFrameSummary] = {}
        task_frame_results_counts = {}
        for r in job_reports.values():
            task_validated_frames.update(r.comparison_summary.frames)
            task_validation_frames_count += r.comparison_summary.frame_count
            task_total_frames += r.comparison_summary.total_frames
            task_conflicts.extend(r.conflicts)

            task_annotations_summary.accumulate(r.comparison_summary.annotations)
            task_ann_components_summary.accumulate(r.comparison_summary.annotation_components)
            task_mean_shape_ious.append(task_ann_components_summary.shape.mean_iou)

            for frame_id, job_frame_result in r.frame_results.items():
                task_frame_result = task_frame_results.get(frame_id)
                frame_results_count = task_frame_results_counts.get(frame_id, 0)

                if task_frame_result is None:
                    task_frame_result = deepcopy(job_frame_result)
                else:
                    task_frame_result.conflicts += job_frame_result.conflicts

                    task_frame_result.annotations.accumulate(job_frame_result.annotations)
                    task_frame_result.annotation_components.accumulate(
                        job_frame_result.annotation_components
                    )

                    task_frame_result.annotation_components.shape.mean_iou = (
                        task_frame_result.annotation_components.shape.mean_iou * frame_results_count
                        + job_frame_result.annotation_components.shape.mean_iou
                    ) / (frame_results_count + 1)

                task_frame_results_counts[frame_id] = 1 + frame_results_count
                task_frame_results[frame_id] = task_frame_result

        task_ann_components_summary.shape.mean_iou = np.mean(
            task_mean_shape_ious or []
        )  # TODO: maybe remove

        conflicts_by_severity = Counter(c.severity for c in task_conflicts)
        task_report_data = ComparisonReport(
            parameters=ComparisonParameters(),  # TODO: return settings
            # TODO: add requirements
            comparison_summary=ComparisonReportSummary(
                frame_count=task_validation_frames_count,
                total_frames=task_total_frames,
                frames=sorted(task_validated_frames),
                conflict_count=len(task_conflicts),
                warning_count=conflicts_by_severity.get(AnnotationConflictSeverity.WARNING, 0),
                error_count=conflicts_by_severity.get(AnnotationConflictSeverity.ERROR, 0),
                conflicts_by_type=Counter(c.type for c in task_conflicts),
                annotations=task_annotations_summary,
                annotation_components=task_ann_components_summary,
                tasks=None,
                jobs=job_stats,
            ),
            frame_results=task_frame_results,
        )

        return task_report_data

    def _save_reports(self, *, task_report: dict, job_reports: list[dict]) -> models.QualityReport:
        db_task_report = models.QualityReport(
            task=task_report["task"],
            target_last_updated=task_report["target_last_updated"],
            gt_last_updated=task_report["gt_last_updated"],
            assignee_id=task_report["assignee_id"],
            assignee_last_updated=task_report["assignee_last_updated"],
            data=task_report["data"],
        )
        db_task_report.save()

        db_job_reports = []
        for job_report in job_reports:
            db_job_report = models.QualityReport(
                job=job_report["job"],
                target_last_updated=job_report["target_last_updated"],
                gt_last_updated=job_report["gt_last_updated"],
                assignee_id=job_report["assignee_id"],
                assignee_last_updated=job_report["assignee_last_updated"],
                data=job_report["data"],
            )
            db_job_reports.append(db_job_report)

        db_job_reports = bulk_create(models.QualityReport, db_job_reports)
        db_task_report.children.add(*db_job_reports)

        db_conflicts = []
        db_report_iter = itertools.chain([db_task_report], db_job_reports)
        report_iter = itertools.chain([task_report], job_reports)
        for report, db_report in zip(report_iter, db_report_iter):
            for conflict in report["conflicts"]:
                db_conflict = models.AnnotationConflict(
                    report=db_report,
                    type=conflict["type"],
                    frame=conflict["frame_id"],
                    severity=conflict["severity"],
                )
                db_conflicts.append(db_conflict)

        db_conflicts = bulk_create(models.AnnotationConflict, db_conflicts)

        db_ann_ids = []
        db_conflicts_iter = iter(db_conflicts)
        for report in itertools.chain([task_report], job_reports):
            for conflict, db_conflict in zip(report["conflicts"], db_conflicts_iter):
                for ann_id in conflict["annotation_ids"]:
                    db_ann_id = models.AnnotationId(
                        conflict=db_conflict,
                        job_id=ann_id["job_id"],
                        obj_id=ann_id["obj_id"],
                        type=ann_id["type"],
                        shape_type=ann_id["shape_type"],
                    )
                    db_ann_ids.append(db_ann_id)

        bulk_create(models.AnnotationId, db_ann_ids)

        return db_task_report

    def get_quality_params(self, task: Task) -> ComparisonParameters:
        quality_settings_manager = QualitySettingsManager()
        task_own_settings = quality_settings_manager.get_task_settings(task, inherit=False)
        task_effective_settings = quality_settings_manager.get_task_settings(task)
        return ComparisonParameters.from_settings(
            task_effective_settings, inherited=task_own_settings.id != task_effective_settings.id
        )


class ProjectQualityCalculator:
    def is_task_report_relevant(self, quality_report: models.QualityReport) -> bool:
        assert quality_report.target == models.QualityReportTarget.TASK

        task = quality_report.task
        quality_settings = QualitySettingsManager().get_task_settings(task)

        return (quality_report.target_last_updated >= task.updated_date) and (
            quality_report.target_last_updated >= quality_settings.updated_date
        )

    def compute_report(self, project: Project | int) -> models.QualityReport:
        with transaction.atomic():
            # Preload the required data for computations.
            # Ideally, we would lock the task to fetch all the data and produce
            # consistent report. However, data fetching can also take long time.
            # For this reason, we don't guarantee absolute consistency.
            if isinstance(project, int):
                project = Project.objects.get(id=project)

            project_quality_params = self.get_quality_params(project)

            # Tasks could be added or removed in the project after initial report fetching
            # Fix working the set of tasks by requesting ids first.
            all_task_ids: set[int] = set(
                Task.objects.filter(project=project).values_list("id", flat=True)
            )

            configured_task_ids: set[int] = set(
                task_id
                for ids_chunk in take_by(all_task_ids, chunk_size=_DEFAULT_FETCH_CHUNK_SIZE)
                for task_id in Job.objects.filter(
                    type=JobType.GROUND_TRUTH,
                    stage=StageChoice.ACCEPTANCE,
                    state=StateChoice.COMPLETED,
                    segment__task__in=ids_chunk,
                ).values_list("segment__task__id", flat=True)
            )

            # Prefetch in batches
            configured_tasks = {}
            for ids_batch in take_by(configured_task_ids, chunk_size=_DEFAULT_FETCH_CHUNK_SIZE):
                tasks_batch = (
                    project.tasks.filter(id__in=ids_batch)
                    .annotate(
                        latest_quality_report_id=Subquery(
                            models.QualityReport.objects.filter(
                                created_date__isnull=False,
                                task_id=OuterRef("id"),
                            )
                            .order_by("-created_date")
                            .values("id")[:1]
                        )
                    )
                    .all()
                )
                configured_tasks.update((t.id, t) for t in tasks_batch)

                prefetch_related_objects(tasks_batch, "quality_settings")

        latest_quality_report_ids = set(
            t.latest_quality_report_id for t in configured_tasks.values()
        )
        latest_quality_reports = {
            r.id: r
            for ids_chunk in take_by(
                latest_quality_report_ids, chunk_size=_DEFAULT_FETCH_CHUNK_SIZE
            )
            for r in models.QualityReport.objects.filter(id__in=ids_chunk)
        }

        task_quality_reports: dict[int, models.QualityReport] = {}
        for task in configured_tasks.values():
            latest_task_quality_report_id = getattr(task, "latest_quality_report_id", None)
            latest_task_quality_report = latest_quality_reports.get(latest_task_quality_report_id)
            if not latest_task_quality_report:
                continue

            latest_task_quality_report.task = task  # put the prefetched object
            if not self.is_task_report_relevant(latest_task_quality_report):
                continue

            task_quality_reports[task.id] = latest_task_quality_report

        # Compute required task reports
        # This loop can take long time, maybe use RQ dependencies for each task instead
        tasks_without_reports = configured_tasks.keys() - task_quality_reports.keys()
        for ids_batch in take_by(tasks_without_reports, chunk_size=_DEFAULT_FETCH_CHUNK_SIZE):
            tasks_batch = [configured_tasks[task_id] for task_id in ids_batch]

            prefetch_related_objects(
                tasks_batch,
                "data",
                "data__validation_layout",
            )

            for task in tasks_batch:
                if task.id in task_quality_reports:
                    continue

                # Tasks could have been deleted during report computations, ignore them.
                # Tasks could be moved between projects. It can't be
                # reliably checked and it is quite rare, so we ignore it.
                with suppress(Task.DoesNotExist):
                    task_report_calculator = TaskQualityCalculator()
                    task_report = task_report_calculator.compute_report(task)
                    if task_report:
                        task_quality_reports[task.id] = task_report

        task_comparison_reports: dict[int, ComparisonReport] = {
            task_id: ComparisonReport.from_json(r.get_report_data())
            for task_id, r in task_quality_reports.items()
        }

        project_comparison_report = self._compute_project_report(
            task_reports=task_comparison_reports,
            quality_params=project_quality_params,
            all_task_ids=all_task_ids,
        )

        with transaction.atomic():
            project_report = self._save_report(
                models.QualityReport(
                    project=project,
                    target_last_updated=project.updated_date,
                    gt_last_updated=None,
                    data=project_comparison_report.to_json(),
                    # project reports don't include conflicts
                ),
                child_reports=[
                    r for r in task_quality_reports.values() if r.task.id in task_comparison_reports
                ],
            )

        return project_report

    def _compute_project_report(
        self,
        task_reports: dict[int, ComparisonReport],
        *,
        quality_params: ComparisonParameters,
        all_task_ids: set[int],
    ) -> ComparisonReport:
        # Aggregate nested reports. It's possible that there are no child reports,
        # but we still need to return a meaningful report.

        # Compute task stats
        task_stats = ComparisonReportTaskStats.create_empty()
        task_stats.all.update(all_task_ids)
        task_stats.not_configured.update(all_task_ids - task_reports.keys())
        task_stats.custom.update(
            tid for tid, r in task_reports.items() if not r.parameters.inherited
        )
        task_stats.excluded.update(
            task_stats.all
            - task_stats.not_configured
            - task_stats.custom
            - (
                task_reports.keys()
                - {
                    # Consider tasks excluded if no jobs were included
                    task_id
                    for task_id, r in task_reports.items()
                    if not r.comparison_summary.jobs.included_count
                }
            )
        )

        included_tasks: set[int] = (
            task_reports.keys()
            - task_stats.custom
            - task_stats.not_configured
            - task_stats.excluded
        )

        # Accumulate job stats
        job_stats = ComparisonReportJobStats.create_empty()
        for task_id in included_tasks:
            task_report_summary = task_reports[task_id].comparison_summary
            if not task_report_summary.jobs:
                continue

            job_stats.all.update(task_report_summary.jobs.all)
            job_stats.excluded.update(task_report_summary.jobs.excluded)
            job_stats.not_checkable.update(task_report_summary.jobs.not_checkable)

        total_frames = 0
        total_validated_frames = 0
        project_annotations_summary = ComparisonReportAnnotationsSummary.create_empty()
        project_ann_components_summary = ComparisonReportAnnotationComponentsSummary.create_empty()
        project_conflicts: list[AnnotationConflict] = []
        for task_id, r in task_reports.items():
            if task_id not in included_tasks:
                continue

            total_frames += r.comparison_summary.total_frames
            total_validated_frames += r.comparison_summary.frame_count

            # Compute the combined weighted summary of the task reports.
            # Task summary counts are extrapolated to the whole task size
            # This way, we get averages for the whole project (micro average)
            weight = 1 / (r.comparison_summary.frame_share or 1)
            project_annotations_summary.accumulate(r.comparison_summary.annotations, weight=weight)
            project_ann_components_summary.accumulate(
                r.comparison_summary.annotation_components, weight=weight
            )
            project_conflicts.extend(r.conflicts)

        conflicts_by_severity = Counter(c.severity for c in project_conflicts)
        project_report_data = ComparisonReport(
            parameters=quality_params,
            comparison_summary=ComparisonReportSummary(
                total_frames=total_frames,
                frame_count=total_validated_frames,
                frames=None,  # project reports do not provide this info
                conflict_count=len(project_conflicts),
                warning_count=conflicts_by_severity.get(AnnotationConflictSeverity.WARNING, 0),
                error_count=conflicts_by_severity.get(AnnotationConflictSeverity.ERROR, 0),
                conflicts_by_type=Counter(c.type for c in project_conflicts),
                annotations=project_annotations_summary,
                annotation_components=project_ann_components_summary,
                tasks=task_stats,
                jobs=job_stats,
            ),
            frame_results=None,  # this is too detailed for a project report
        )

        return project_report_data

    def _save_report(
        self, project_report: models.QualityReport, child_reports: list[models.QualityReport]
    ) -> models.QualityReport:
        project_report.save()
        project_report.children.add(*child_reports)

        return project_report

    def get_quality_params(self, project: Project) -> ComparisonParameters:
        quality_settings = QualitySettingsManager().get_project_settings(project)
        return ComparisonParameters.from_settings(quality_settings, inherited=False)
