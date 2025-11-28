# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import math

import datumaro as dm
from django.conf import settings
from django.db import transaction
from rest_framework import serializers

from cvat.apps.consensus.intersect_merge import IntersectMerge
from cvat.apps.consensus.models import ConsensusSettings
from cvat.apps.consensus.rq import ConsensusRequestId
from cvat.apps.dataset_manager.bindings import import_dm_annotations
from cvat.apps.dataset_manager.task import PatchAction, patch_job_data
from cvat.apps.engine.models import (
    DimensionType,
    Job,
    JobType,
    RequestTarget,
    StageChoice,
    StateChoice,
    Task,
    User,
    clear_annotations_in_jobs,
)
from cvat.apps.profiler import silk_profile
from cvat.apps.quality_control.quality_reports import ComparisonParameters, JobDataProvider
from cvat.apps.redis_handler.background import AbstractRequestManager


class _TaskMerger:
    _task: Task
    _jobs: dict[int, list[tuple[int, User]]]
    _parent_jobs: list[Job]
    _settings: ConsensusSettings

    def check_merging_available(self, *, parent_job_id: int | None = None):
        if not self._task.consensus_replicas:
            raise MergingNotAvailable("Consensus is not enabled in this task")

        if self._task.dimension != DimensionType.DIM_2D:
            raise MergingNotAvailable("Merging is only supported in 2d tasks")

        if self._jobs is None:
            self._init_jobs()

        if not self._jobs:
            raise MergingNotAvailable(
                f"No {JobType.ANNOTATION} jobs in the {StageChoice.ANNOTATION} stage or "
                f"no {JobType.CONSENSUS_REPLICA} jobs "
                f"not in the {StageChoice.ANNOTATION} - {StateChoice.NEW} state found"
            )

        if parent_job_id:
            parent_job_info = self._jobs.get(parent_job_id)
            if not parent_job_info:
                raise MergingNotAvailable(
                    f"No annotated consensus jobs found for parent job {parent_job_id}. "
                    f"Make sure at least one consensus job is not "
                    f"in the {StageChoice.ANNOTATION} - {StateChoice.NEW} state"
                )

    def __init__(self, task: int | Task) -> None:
        if not isinstance(task, Task):
            task = Task.objects.get(pk=task)
        self._task = task

        self._init_jobs()

        self._settings = ConsensusSettings.objects.get_or_create(task=task)[0]

    def _init_jobs(self) -> None:
        job_map = {}  # parent_job_id -> [(consensus_job_id, assignee)]
        parent_jobs: dict[int, Job] = {}
        for job in (
            Job.objects.prefetch_related("segment", "parent_job", "assignee")
            .filter(
                segment__task=self._task,
                type=JobType.CONSENSUS_REPLICA,
                parent_job__stage=StageChoice.ANNOTATION,
                parent_job__isnull=False,
            )
            .exclude(stage=StageChoice.ANNOTATION, state=StateChoice.NEW)
        ):
            job_map.setdefault(job.parent_job_id, []).append((job.id, job.assignee))
            parent_jobs.setdefault(job.parent_job_id, job.parent_job)

        self._jobs = job_map
        self._parent_jobs = list(parent_jobs.values())

    @staticmethod
    def _get_annotations(job_id: int) -> dm.Dataset:
        return JobDataProvider(job_id).dm_dataset

    def _merge_consensus_jobs(self, parent_job_id: int):
        self.check_merging_available(parent_job_id=parent_job_id)

        consensus_job_info = self._jobs[parent_job_id]

        consensus_job_ids = [consensus_job_id for consensus_job_id, _ in consensus_job_info]

        consensus_job_data_providers = list(map(JobDataProvider, consensus_job_ids))
        consensus_datasets = [
            consensus_job_data_provider.dm_dataset
            for consensus_job_data_provider in consensus_job_data_providers
        ]

        comparison_parameters = ComparisonParameters()
        merger = IntersectMerge(
            conf=IntersectMerge.Conf(
                pairwise_dist=self._settings.iou_threshold,
                quorum=math.ceil(self._settings.quorum * len(consensus_datasets)),
                sigma=comparison_parameters.oks_sigma,
                torso_r=comparison_parameters.line_thickness,
                included_annotation_types=comparison_parameters.included_annotation_types,
            )
        )
        merged_dataset = merger(*consensus_datasets)

        # Delete the existing annotations in the job.
        # If we don't delete existing annotations, the imported annotations
        # will be appended to the existing annotations, and thus updated annotation
        # would have both existing + imported annotations, but we only want the
        # imported annotations
        clear_annotations_in_jobs([parent_job_id])

        parent_job_data_provider = JobDataProvider(parent_job_id)

        # imports the annotations in the `parent_job.job_data` instance
        import_dm_annotations(merged_dataset, parent_job_data_provider.job_data)

        # updates the annotations in the job
        patch_job_data(
            parent_job_id, parent_job_data_provider.job_data.data.serialize(), PatchAction.UPDATE
        )

        for parent_job in self._parent_jobs:
            if parent_job.id == parent_job_id and parent_job.type == JobType.ANNOTATION.value:
                parent_job.state = StateChoice.COMPLETED.value
                parent_job.save()

    @transaction.atomic
    def merge_all_consensus_jobs(self) -> None:
        for parent_job_id in self._jobs.keys():
            self._merge_consensus_jobs(parent_job_id)

    @transaction.atomic
    def merge_single_consensus_job(self, parent_job_id: int) -> None:
        self._merge_consensus_jobs(parent_job_id)


class MergingNotAvailable(Exception):
    pass


class MergingManager(AbstractRequestManager):
    QUEUE_NAME = settings.CVAT_QUEUES.CONSENSUS.value
    SUPPORTED_TARGETS = {RequestTarget.TASK, RequestTarget.JOB}

    @property
    def job_result_ttl(self):
        return 300

    def build_request_id(self) -> str:
        return ConsensusRequestId(
            target=self.target,
            target_id=self.db_instance.pk,
        ).render()

    def init_callback_with_params(self):
        self.callback = self._merge
        self.callback_kwargs = {
            "target_type": type(self.db_instance),
            "target_id": self.db_instance.pk,
        }

    def validate_request(self):
        super().validate_request()
        # FUTURE-FIXME: check that there is no indirectly dependent RQ jobs:
        # e.g merge whole task and merge a particular job from the task
        task, job = self._split_to_task_and_job()

        try:
            _TaskMerger(task=task).check_merging_available(parent_job_id=job.pk if job else None)
        except MergingNotAvailable as ex:
            raise serializers.ValidationError(str(ex)) from ex

    def _split_to_task_and_job(self) -> tuple[Task, Job | None]:
        if isinstance(self.db_instance, Job):
            return self.db_instance.segment.task, self.db_instance

        return self.db_instance, None

    @classmethod
    @silk_profile()
    def _merge(cls, *, target_type: type[Task | Job], target_id: int) -> int:
        if issubclass(target_type, Task):
            return _TaskMerger(task=target_id).merge_all_consensus_jobs()
        elif issubclass(target_type, Job):
            job = Job.objects.get(pk=target_id)
            return _TaskMerger(task=job.get_task_id()).merge_single_consensus_job(target_id)
        else:
            assert False
