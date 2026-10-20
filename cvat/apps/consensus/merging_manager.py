# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

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
    clear_annotations_in_jobs,
)
from cvat.apps.iam.models import User
from cvat.apps.profiler import silk_profile
from cvat.apps.quality_control.comparison_report import ComparisonParameters
from cvat.apps.quality_control.datumaro_data_provider import DatumaroJobDataProvider
from cvat.apps.redis_handler.background import AbstractRequestManager


class _TaskMerger:
    _task: Task
    _jobs: dict[int, list[tuple[int, User]]]
    _parent_jobs: dict[int, Job]
    _settings: ConsensusSettings

    def check_merging_available(self, *, parent_job_id: int | None = None):
        if self._task.dimension != DimensionType.DIM_2D:
            raise MergingNotAvailable("Merging is only supported in 2d tasks")

        if parent_job_id is not None:
            if parent_job_id not in self._parent_jobs:
                raise MergingNotAvailable(
                    f"Job {parent_job_id} is not an {JobType.ANNOTATION} job "
                    f"in the {StageChoice.ANNOTATION} stage"
                )

            if parent_job_id not in self._jobs:
                raise MergingNotAvailable(
                    f"No annotated {JobType.REPLICA} jobs found for parent job {parent_job_id}. "
                    f"Make sure at least one {JobType.REPLICA} job is not "
                    f"in the {StageChoice.ANNOTATION} - {StateChoice.NEW} state"
                )

            parent_job_ids = [parent_job_id]
        else:
            if not self._jobs:
                raise MergingNotAvailable(
                    f"No {JobType.ANNOTATION} jobs in the {StageChoice.ANNOTATION} stage or "
                    f"no {JobType.REPLICA} jobs "
                    f"not in the {StageChoice.ANNOTATION} - {StateChoice.NEW} state found"
                )

            parent_job_ids = list(self._jobs)

        for job_id in parent_job_ids:
            replicas_count = len(self._jobs[job_id])
            if replicas_count > settings.MAX_CONSENSUS_REPLICAS:
                raise MergingNotAvailable(
                    f"Job {job_id} has {replicas_count} replica jobs to merge, "
                    f"the maximum supported is {settings.MAX_CONSENSUS_REPLICAS}"
                )

    def __init__(self, task: int | Task) -> None:
        if not isinstance(task, Task):
            task = Task.objects.get(pk=task)
        self._task = task

        self._init_jobs()

        self._settings = ConsensusSettings.objects.get_or_create(task=task)[0]

    def _init_jobs(self) -> None:
        self._parent_jobs: dict[int, Job] = {
            job.id: job
            for job in Job.objects.filter(
                segment__task=self._task,
                type=JobType.ANNOTATION,
                stage=StageChoice.ANNOTATION,
            )
        }

        # parent_job_id -> [(replica_job_id, assignee)], only the parent jobs with replicas to merge
        job_map: dict[int, list[tuple[int, User]]] = {}
        for job in (
            Job.objects.select_related("assignee")
            .filter(
                segment__task=self._task,
                type=JobType.REPLICA,
                parent_job_id__in=list(self._parent_jobs),
            )
            .exclude(stage=StageChoice.ANNOTATION, state=StateChoice.NEW)
        ):
            job_map.setdefault(job.parent_job_id, []).append((job.id, job.assignee))

        self._jobs = job_map

    @staticmethod
    def _get_annotations(job_id: int) -> dm.Dataset:
        return DatumaroJobDataProvider(job_id).dm_dataset

    def _merge_consensus_jobs(self, parent_job_id: int):
        self.check_merging_available(parent_job_id=parent_job_id)

        replica_job_ids = [replica_job_id for replica_job_id, _ in self._jobs[parent_job_id]]

        replica_job_data_providers = list(map(DatumaroJobDataProvider, replica_job_ids))
        replica_datasets = [
            replica_job_data_provider.dm_dataset
            for replica_job_data_provider in replica_job_data_providers
        ]

        comparison_parameters = ComparisonParameters()
        merger = IntersectMerge(
            conf=IntersectMerge.Conf(
                pairwise_dist=self._settings.iou_threshold,
                sigma=comparison_parameters.oks_sigma,
                torso_r=comparison_parameters.line_thickness,
                included_annotation_types=comparison_parameters.included_annotation_types,
            )
        )
        merged_dataset = merger(*replica_datasets)

        # Delete the existing annotations in the job.
        # If we don't delete existing annotations, the imported annotations
        # will be appended to the existing annotations, and thus updated annotation
        # would have both existing + imported annotations, but we only want the
        # imported annotations
        clear_annotations_in_jobs([parent_job_id])

        parent_job_data_provider = DatumaroJobDataProvider(parent_job_id)

        # imports the annotations in the `parent_job.job_data` instance
        import_dm_annotations(merged_dataset, parent_job_data_provider.job_data)

        # updates the annotations in the job
        patch_job_data(
            parent_job_id,
            parent_job_data_provider.job_data.data.serialize(),
            PatchAction.UPDATE,
        )

        parent_job = self._parent_jobs[parent_job_id]
        parent_job.state = StateChoice.COMPLETED.value
        parent_job.save(update_fields=["state", "updated_date"])

    @transaction.atomic
    def merge_all_consensus_jobs(self) -> None:
        for parent_job_id in self._jobs:
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
