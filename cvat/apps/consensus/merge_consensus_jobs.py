# Copyright (C) 2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from typing import Dict, List, Tuple, Union
from uuid import uuid4

import datumaro as dm
import django_rq
from django.conf import settings
from django.db import transaction
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from cvat.apps.consensus.consensus_reports import (
    ComparisonReport,
    generate_assignee_consensus_report,
    generate_job_consensus_report,
    generate_task_consensus_report,
    save_report,
)
from cvat.apps.consensus.models import AssigneeConsensusReport, ConsensusReport, ConsensusSettings
from cvat.apps.consensus.new_intersect_merge import IntersectMerge
from cvat.apps.dataset_manager.bindings import import_dm_annotations
from cvat.apps.dataset_manager.task import PatchAction, patch_job_data
from cvat.apps.engine.models import Job, JobType, StageChoice, StateChoice, Task, User
from cvat.apps.engine.serializers import RqIdSerializer
from cvat.apps.engine.utils import (
    define_dependent_job,
    get_rq_job_meta,
    get_rq_lock_by_user,
    process_failed_job,
)
from cvat.apps.quality_control.quality_reports import JobDataProvider


class MergeConsensusJobs:
    def __init__(self, task_id: int) -> None:
        self.jobs: Dict[int, List[Tuple[int, User]]]
        self.parent_jobs: List[Job]
        self.merger: IntersectMerge
        self.consensus_settings: ConsensusSettings
        self.assignee_jobs_count: Dict[User, int]
        self.task_id = task_id
        self._get_consensus_jobs(task_id)
        self._get_assignee_jobs_count()
        self.consensus_settings = ConsensusSettings.objects.filter(task=task_id).first()
        self.merger = IntersectMerge(
            conf=IntersectMerge.Conf(
                pairwise_dist=self.consensus_settings.iou_threshold,
                output_conf_thresh=self.consensus_settings.agreement_score_threshold,
                quorum=self.consensus_settings.quorum,
                sigma=self.consensus_settings.sigma,
                torso_r=self.consensus_settings.line_thickness,
            )
        )
        if not self.jobs:
            raise ValidationError(
                "No annotated consensus jobs found or no regular jobs in annotation stage"
            )

    def _get_consensus_jobs(self, task_id: int) -> None:
        job_map = {}  # parent_job_id -> [(consensus_job_id, assignee)]
        parent_jobs: dict[int, Job] = {}
        for job in (
            Job.objects.prefetch_related("segment", "parent_job", "assignee")
            .filter(
                segment__task_id=task_id,
                type=JobType.CONSENSUS.value,
                parent_job__stage=StageChoice.ANNOTATION.value,
                parent_job__isnull=False,
            )
            .exclude(state=StateChoice.NEW.value)
        ):
            job_map.setdefault(job.parent_job_id, []).append((job.id, job.assignee))
            parent_jobs.setdefault(job.parent_job_id, job.parent_job)

        self.jobs = job_map
        self.parent_jobs = list(parent_jobs.values())

    def _get_assignee_jobs_count(self) -> None:
        assignee_jobs_count = {}
        for assignees in self.jobs.values():
            for _, assignee in assignees:
                if assignee not in assignee_jobs_count:
                    assignee_jobs_count[assignee] = 1
                else:
                    assignee_jobs_count[assignee] += 1
        self.assignee_jobs_count = assignee_jobs_count

    @staticmethod
    def _get_annotations(job_id: int) -> dm.Dataset:
        return JobDataProvider(job_id).dm_dataset

    def _merge_consensus_jobs(self, parent_job_id: int):
        consensus_job_info = self.jobs.get(parent_job_id)
        if not consensus_job_info:
            raise ValidationError(f"No consensus jobs found for parent job {parent_job_id}")

        consensus_job_ids = [consensus_job_id for consensus_job_id, _ in consensus_job_info]
        assignees = [assignee for _, assignee in consensus_job_info]

        consensus_job_data_providers = list(map(JobDataProvider, consensus_job_ids))
        consensus_datasets = [
            consensus_job_data_provider.dm_dataset
            for consensus_job_data_provider in consensus_job_data_providers
        ]

        merged_dataset = self.merger(consensus_datasets)

        assignee_report_data = generate_assignee_consensus_report(
            consensus_job_ids,
            assignees,
            consensus_datasets,
            self.merger.dataset_mean_consensus_score,
        )

        # delete the existing annotations in the job
        patch_job_data(parent_job_id, None, PatchAction.DELETE)
        # if we don't delete exising annotations, the imported annotations
        # will be appended to the existing annotations, and thus updated annotation
        # would have both existing + imported annotations, but we only want the
        # imported annotations

        parent_job_data_provider = JobDataProvider(parent_job_id)

        # imports the annotations in the `parent_job.job_data` instance
        import_dm_annotations(merged_dataset, parent_job_data_provider.job_data)

        # updates the annotations in the job
        patch_job_data(
            parent_job_id, parent_job_data_provider.job_data.data.serialize(), PatchAction.UPDATE
        )

        job_comparison_report, assignee_report_data = generate_job_consensus_report(
            consensus_settings=self.consensus_settings,
            errors=self.merger.errors,
            consensus_job_data_providers=consensus_job_data_providers,
            merged_dataset=merged_dataset,
            merger=self.merger,
            assignees=assignees,
            assignee_report_data=assignee_report_data,
        )

        for parent_job_id in self.parent_jobs:
            if parent_job_id.id == parent_job_id and parent_job_id.type == JobType.ANNOTATION.value:
                parent_job_id.state = StateChoice.COMPLETED.value
                parent_job_id.save()

        return job_comparison_report, assignee_report_data

    @transaction.atomic
    def merge_all_consensus_jobs(self, task_id: int) -> None:
        job_comparison_reports: Dict[int, ComparisonReport] = {}
        assignee_reports: Dict[User, Dict[str, float]] = {}

        for parent_job_id in self.jobs.keys():
            job_comparison_report, assignee_report_data = self._merge_consensus_jobs(parent_job_id)
            job_comparison_reports[parent_job_id] = job_comparison_report

            for assignee in assignee_report_data:
                if assignee not in assignee_reports:
                    assignee_reports[assignee] = assignee_report_data[assignee]
                else:
                    assignee_reports[assignee]["conflict_count"] += assignee_report_data[assignee][
                        "conflict_count"
                    ]
                    assignee_reports[assignee]["consensus_score"] += assignee_report_data[assignee][
                        "consensus_score"
                    ]

        for assignee in assignee_reports:
            assignee_reports[assignee]["consensus_score"] /= self.assignee_jobs_count[assignee]

        task_report_data, task_mean_consensus_score = generate_task_consensus_report(
            list(job_comparison_reports.values())
        )
        return save_report(
            self.task_id,
            self.parent_jobs,
            task_report_data,
            job_comparison_reports,
            assignee_reports,
            task_mean_consensus_score,
        )

    @transaction.atomic
    def merge_single_consensus_job(self, parent_job_id: int) -> None:
        job_comparison_reports: Dict[int, ComparisonReport] = {}
        assignee_reports: Dict[User, Dict[str, float]] = {}

        job_comparison_report, assignee_report_data = self._merge_consensus_jobs(parent_job_id)

        job_comparison_reports[parent_job_id] = job_comparison_report

        for assignee in self.assignee_jobs_count:
            assignee_report = (
                AssigneeConsensusReport.objects.filter(assignee=assignee).order_by("-id").first()
            )
            assignee_reports[assignee] = (
                assignee_report.to_dict()
                if assignee_report
                else {"conflict_count": 0, "consensus_score": 0}
            )

        for assignee in assignee_report_data:
            if assignee not in assignee_reports:
                assignee_reports[assignee] = assignee_report_data[assignee]
            else:
                assignee_reports[assignee]["conflict_count"] += assignee_report_data[assignee][
                    "conflict_count"
                ]
                assignee_reports[assignee]["consensus_score"] += assignee_report_data[assignee][
                    "consensus_score"
                ]

        for assignee in assignee_reports:
            assignee_reports[assignee]["consensus_score"] /= self.assignee_jobs_count[assignee]

        for parent_job in self.parent_jobs:
            if parent_job.id == parent_job_id:
                continue

            job_comparison_report = (
                ConsensusReport.objects.filter(job_id=parent_job_id).order_by("-id").first()
            )
            job_comparison_reports[parent_job_id] = ComparisonReport.from_dict(
                job_comparison_report
            )

        task_report_data, task_mean_consensus_score = generate_task_consensus_report(
            list(job_comparison_reports.values())
        )
        return save_report(
            self.task_id,
            self.parent_jobs,
            task_report_data,
            job_comparison_reports,
            assignee_reports,
            task_mean_consensus_score,
        )


def scehdule_consensus_merging(instance: Union[Job, Task], request) -> Response:
    queue_name = settings.CVAT_QUEUES.CONSENSUS.value
    queue = django_rq.get_queue(queue_name)
    rq_id = request.query_params.get("rq_id", uuid4().hex)
    rq_job = queue.fetch_job(rq_id)
    user_id = request.user.id
    serializer = RqIdSerializer({"rq_id": rq_id})

    if rq_job:
        if rq_job.is_finished:
            rq_job.delete()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        elif rq_job.is_failed:
            exc_info = process_failed_job(rq_job)
            return Response(data=exc_info, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            # rq_job is in queued stage or might be running
            return Response(serializer.data, status=status.HTTP_202_ACCEPTED)

    if isinstance(instance, Task):
        consensus_job_merger = MergeConsensusJobs(task_id=instance.id)
        func = consensus_job_merger.merge_all_consensus_jobs
    else:
        consensus_job_merger = MergeConsensusJobs(task_id=instance.get_task_id())
        func = consensus_job_merger.merge_single_consensus_job

    func_args = [instance.id]

    with get_rq_lock_by_user(queue, user_id):
        queue.enqueue_call(
            func=func,
            args=func_args,
            job_id=rq_id,
            meta=get_rq_job_meta(request=request, db_obj=instance),
            depends_on=define_dependent_job(queue, user_id),
        )

    return Response(serializer.data, status=status.HTTP_202_ACCEPTED)
