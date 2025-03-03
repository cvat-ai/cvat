# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import math
from typing import Type

import datumaro as dm
import django_rq
from django.conf import settings
from django.db import transaction
from django_rq.queues import DjangoRQ as RqQueue
from rq.job import Job as RqJob
from rq.job import JobStatus as RqJobStatus

from cvat.apps.consensus.intersect_merge import IntersectMerge
from cvat.apps.consensus.models import ConsensusSettings
from cvat.apps.dataset_manager.bindings import import_dm_annotations
from cvat.apps.dataset_manager.task import PatchAction, patch_job_data
from cvat.apps.engine.log import ServerLogManager
from cvat.apps.engine.models import (
    DimensionType,
    Job,
    JobType,
    StageChoice,
    StateChoice,
    Task,
    User,
    clear_annotations_in_jobs,
)
from cvat.apps.engine.types import ExtendedRequest
from cvat.apps.engine.utils import define_dependent_job, get_rq_job_meta, get_rq_lock_by_user
from cvat.apps.profiler import silk_profile
from cvat.apps.quality_control.quality_reports import ComparisonParameters, JobDataProvider

slogger = ServerLogManager(__name__)


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

        def compute_agreement(merged_dataset: dm.Dataset) -> tuple[int, int]:
            agreed_annotations = sum(
                a.attributes.get("score", 1) for item in merged_dataset for a in item.annotations
            )
            clusters_for_frames = merger.get_clusters_for_frames(
                set((item.id, item.subset) for item in merged_dataset)
            )
            return agreed_annotations, len(clusters_for_frames)

        def compute_agreement_per_label(
            merged_dataset: dm.Dataset,
        ) -> dict[tuple[str, str], tuple[int, int]]:
            merged_cat = merged_dataset.categories()
            merged_label_cat: dm.LabelCategories = merged_cat[dm.AnnotationType.label]

            counts_per_label = {}  # merged_label_id -> (agreed, total)

            dataset_frames = set((item.id, item.subset) for item in merged_dataset)
            for cluster in merger.get_clusters_for_frames(dataset_frames):
                label_id = cluster[0].label
                label_counts = counts_per_label.setdefault(label_id, [0, 0])
                label_counts[1] += 1

                cluster_label = merged_label_cat[label_id]
                for sublabel_id, sublabel in enumerate(merged_label_cat.items):
                    if sublabel.parent == cluster_label.name:
                        label_counts = counts_per_label.setdefault(sublabel_id, [0, 0])
                        label_counts[1] += 1

            for item in merged_dataset:
                for a in item.annotations:
                    ann_score = a.attributes.get("score", 1)
                    label_counts = counts_per_label.setdefault(a.label, [0, 0])
                    label_counts[0] += ann_score

                    for element in getattr(a, "elements", []):
                        label_counts = counts_per_label.setdefault(element.label, [0, 0])
                        label_counts[0] += element.attributes.get("score", 1)

            return {
                (merged_label_cat[label_id].parent, merged_label_cat[label_id].name): v
                for label_id, v in counts_per_label.items()
            }

        def compute_agreement_per_frame(
            merged_dataset: dm.Dataset,
        ) -> dict[tuple[str, str], tuple[int, int]]:
            agreement_per_frame = {}
            for item in merged_dataset:
                frame_id = (item.id, item.subset)
                frame_dataset = dm.Dataset.from_iterable(
                    [item], categories=merged_dataset.categories()
                )
                frame_agreement = compute_agreement(frame_dataset)
                agreement_per_frame[frame_id] = frame_agreement

            return agreement_per_frame

        def compute_agreement_per_frame_per_label(merged_dataset: dm.Dataset) -> dict[
            tuple[str, str],
            dict[tuple[str, str], tuple[int, int]],
        ]:
            agreement_per_frame = {}
            for item in merged_dataset:
                frame_id = (item.id, item.subset)
                frame_dataset = dm.Dataset.from_iterable(
                    [item], categories=merged_dataset.categories()
                )
                frame_agreement = compute_agreement_per_label(frame_dataset)
                agreement_per_frame[frame_id] = frame_agreement

            return agreement_per_frame

        def compute_agreement_per_source(merged_dataset: dm.Dataset) -> dict[int, tuple[int, int]]:
            # compute quality report for merged and each source
            # we don't output exactly the source annotations in some algorithms
            raise NotImplementedError

        agreement = compute_agreement(merged_dataset)
        agreement_per_label = compute_agreement_per_label(merged_dataset)

        agreement_per_frame = compute_agreement_per_frame(merged_dataset)
        agreement_per_frame_per_label = compute_agreement_per_frame_per_label(merged_dataset)

        agreement_per_source = {}  # { source job id -> float [0; 1] }
        agreement_per_source_per_label = {}  # { source job id -> { label name -> float [0; 1] } }

        slogger.task[self._task.id].info(
            f"Consensus scores for task {self._task.id} job {parent_job_id}: "
        )

        slogger.task[self._task.id].info(
            f"Agreement overall: {agreement[0] / agreement[1] * 100:.2f}"
        )

        slogger.task[self._task.id].info(
            f"Agreement per label: \n  " +
            "\n  ".join(
                f"{label}: {matched / total * 100:.2f}"
                for label, (matched, total) in agreement_per_label.items()
            )
        )

        slogger.task[self._task.id].info(
            f"Agreement per frame: \n  " +
            "\n  ".join(
                f"{frame} (#{frame_idx}): {matched / total * 100:.2f}"
                for frame_idx, (frame, (matched, total)) in enumerate(agreement_per_frame.items())
            )
        )

        slogger.task[self._task.id].info(
            f"\n  Agreement per frame per label: \n" +
            "\n".join(
                f"  frame {frame_id} (#{frame_idx}):\n    "
                + "\n    ".join(
                    f"{label}: {matched / total * 100:.2f}"
                    for label, (matched, total) in frame_agreement_per_label.items()
                )
                for frame_idx, (frame_id, frame_agreement_per_label) in enumerate(
                    agreement_per_frame_per_label.items()
                )
            )
        )

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


class JobAlreadyExists(MergingNotAvailable):
    def __init__(self, instance: Task | Job):
        super().__init__()
        self.instance = instance

    def __str__(self):
        return f"Merging for this {type(self.instance).__name__.lower()} already enqueued"


class MergingManager:
    _QUEUE_CUSTOM_JOB_PREFIX = "consensus-merge-"
    _JOB_RESULT_TTL = 300

    def _get_queue(self) -> RqQueue:
        return django_rq.get_queue(settings.CVAT_QUEUES.CONSENSUS.value)

    def _make_job_id(self, task_id: int, job_id: int | None, user_id: int) -> str:
        key = f"{self._QUEUE_CUSTOM_JOB_PREFIX}task-{task_id}"
        if job_id:
            key += f"-job-{job_id}"
        key += f"-user-{user_id}"  # TODO: remove user id, add support for non owners to get status
        return key

    def _check_merging_available(self, task: Task, job: Job | None):
        _TaskMerger(task=task).check_merging_available(parent_job_id=job.id if job else None)

    def schedule_merge(self, target: Task | Job, *, request: ExtendedRequest) -> str:
        if isinstance(target, Job):
            target_task = target.segment.task
            target_job = target
        else:
            target_task = target
            target_job = None

        self._check_merging_available(target_task, target_job)

        queue = self._get_queue()

        user_id = request.user.id
        with get_rq_lock_by_user(queue, user_id=user_id):
            rq_id = self._make_job_id(
                task_id=target_task.id,
                job_id=target_job.id if target_job else None,
                user_id=user_id,
            )
            rq_job = queue.fetch_job(rq_id)
            if rq_job:
                if rq_job.get_status(refresh=False) in (
                    RqJobStatus.QUEUED,
                    RqJobStatus.STARTED,
                    RqJobStatus.SCHEDULED,
                    RqJobStatus.DEFERRED,
                ):
                    raise JobAlreadyExists(target)

                rq_job.delete()

            dependency = define_dependent_job(
                queue, user_id=user_id, rq_id=rq_id, should_be_dependent=True
            )

            queue.enqueue(
                self._merge,
                target_type=type(target),
                target_id=target.id,
                job_id=rq_id,
                meta=get_rq_job_meta(request=request, db_obj=target),
                result_ttl=self._JOB_RESULT_TTL,
                failure_ttl=self._JOB_RESULT_TTL,
                depends_on=dependency,
            )

        return rq_id

    def get_job(self, rq_id: str) -> RqJob | None:
        queue = self._get_queue()
        return queue.fetch_job(rq_id)

    @classmethod
    @silk_profile()
    def _merge(cls, *, target_type: Type[Task | Job], target_id: int) -> int:
        if issubclass(target_type, Task):
            return _TaskMerger(task=target_id).merge_all_consensus_jobs()
        elif issubclass(target_type, Job):
            job = Job.objects.get(pk=target_id)
            return _TaskMerger(task=job.get_task_id()).merge_single_consensus_job(target_id)
        else:
            assert False
