# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from datetime import datetime, timedelta
from typing import Hashable, Iterator, List, Optional, Union

from attrs import asdict, define
import datumaro as dm
from django.conf import settings
import django_rq
from django.db import transaction

from cvat.apps.dataset_manager.task import JobAnnotation
from cvat.apps.dataset_manager.bindings import (CommonData, CvatToDmAnnotationConverter,
    GetCVATDataExtractor, JobData)
from cvat.apps.dataset_manager.formats.registry import dm_env
from cvat.apps.profiler import silk_profile

from .models import (JobType, QualityReport, AnnotationConflict,
    AnnotationConflictType, Job, MismatchingAnnotationKind, Task)


@define(kw_only=True)
class AnnotationId:
    # TODO: think if uuids can be provided
    type: str
    id: int
    job_id: int

    def to_dict(self) -> dict:
        return asdict(self)


class _JobDataProvider:
    @transaction.atomic
    def __init__(self, job_id: int) -> None:
        self.job_id = job_id
        self.job_annotation = JobAnnotation(job_id)
        self.job_annotation.init_from_db()
        self.job_data = JobData(
            annotation_ir=self.job_annotation.ir_data,
            db_job=self.job_annotation.db_job
        )

        self._annotation_memo = _MemoizingAnnotationConverterFactory()
        extractor = GetCVATDataExtractor(self.job_data,
            convert_annotations=self._annotation_memo)
        self.dm_dataset = dm.Dataset.from_extractors(extractor, env=dm_env)

    def dm_item_id_to_frame_id(self, item_id: str) -> int:
        return self.job_data.match_frame(item_id)

    def dm_ann_to_ann_id(self, ann: dm.Annotation) -> AnnotationId:
        source_ann = self._annotation_memo.get_source_ann(ann)
        ann_type = 'tag' if isinstance(ann, CommonData.Tag) else source_ann.type
        return AnnotationId(id=source_ann.id, type=ann_type, job_id=self.job_id)


class _MemoizingAnnotationConverterFactory:
    def __init__(self):
        self._annotation_mapping = {} # dm annotation -> cvat annotation

    def remember_conversion(self, cvat_ann, dm_anns):
        for dm_ann in dm_anns:
            self._annotation_mapping[self._make_key(dm_ann)] = cvat_ann

    def _make_key(self, dm_ann: dm.Annotation) -> Hashable:
        return id(dm_ann)

    def get_source_ann(
        self, dm_ann: dm.Annotation
    ) -> Union[CommonData.Tag, CommonData.LabeledShape]:
        return self._annotation_mapping[self._make_key(dm_ann)]

    def clear(self):
        self._annotation_mapping.clear()

    def __call__(self, *args, **kwargs) -> List[dm.Annotation]:
        converter = _MemoizingAnnotationConverter(*args, factory=self, **kwargs)
        return converter.convert()

class _MemoizingAnnotationConverter(CvatToDmAnnotationConverter):
    def __init__(self,
        *args,
        factory: _MemoizingAnnotationConverterFactory,
        **kwargs
    ) -> None:
        super().__init__(*args, **kwargs)
        self._factory = factory

    def _convert_tag(self, tag):
        converted = list(super()._convert_tag(tag))
        self._factory.remember_conversion(tag, converted)
        return converted

    def _convert_shape(self, shape, *, index):
        converted = list(super()._convert_shape(shape, index=index))
        self._factory.remember_conversion(shape, converted)
        return converted


@transaction.atomic
def _save_report_to_db(
    report: QualityReport, conflicts: List[AnnotationConflict]
)-> QualityReport:
    report.full_clean()
    report.save()

    for c in conflicts:
        c.report = report

        if annotation_ids := c.data.get('annotation_ids'):
            c.data['annotation_ids'] = [a.to_dict() for a in annotation_ids]
        c.full_clean()

    AnnotationConflict.objects.bulk_create(conflicts)

    return report


class _DistanceComparator(dm.ops.DistanceComparator):
    def match_attrs(self, ann_a: dm.Annotation, ann_b: dm.Annotation):
        a_attrs = ann_a.attributes
        b_attrs = ann_b.attributes

        matches = []
        mismatches = []
        a_extra = []
        b_extra = []

        notfound = object()

        for k in a_attrs.keys() | b_attrs.keys():
            a_attr = a_attrs.get(k, notfound)
            b_attr = b_attrs.get(k, notfound)

            if a_attr is notfound:
                b_extra.append(k)
            elif b_attr is notfound:
                a_extra.append(k)
            elif a_attr == b_attr:
                matches.append(k)
            else:
                mismatches.append(k)

        return matches, mismatches, a_extra, b_extra

    def match_annotations(self, item_a, item_b):
        return {t: self._match_ann_type(t, item_a, item_b) for t in dm.AnnotationType}

    def _match_ann_type(self, t, *args):
        # pylint: disable=no-value-for-parameter
        if t == dm.AnnotationType.label:
            return self.match_labels(*args)
        elif t == dm.AnnotationType.bbox:
            return self.match_boxes(*args)
        elif t == dm.AnnotationType.polygon:
            return self.match_polygons(*args)
        elif t == dm.AnnotationType.mask:
            return self.match_masks(*args)
        elif t == dm.AnnotationType.points:
            # TODO: test and fix point comparison
            a_points = self._get_ann_type(dm.AnnotationType.points, args[0])
            b_points = self._get_ann_type(dm.AnnotationType.points, args[1])
            if not a_points and not b_points:
                return [], [], [], []
            return self.match_points(*args)
        elif t == dm.AnnotationType.polyline:
            return self.match_lines(*args)
        # pylint: enable=no-value-for-parameter
        else:
            return None

class DatasetComparator:
    def __init__(self,
        this_job_data_provider: _JobDataProvider,
        gt_job_data_provider: _JobDataProvider
    ) -> None:
        self._this_job_data_provider = this_job_data_provider
        self._gt_job_data_provider = gt_job_data_provider
        self._comparator = _DistanceComparator()

    def _iterate_datasets(self) -> Iterator:
        this_job_dataset = self._this_job_data_provider.dm_dataset
        gt_job_dataset = self._gt_job_data_provider.dm_dataset

        for gt_item in gt_job_dataset:
            this_item = this_job_dataset.get(gt_item.id)
            if not this_item:
                continue # we need to compare only intersecting frames

            yield this_item, gt_item

    def find_gt_conflicts(self) -> List[AnnotationConflict]:
        conflicts = []

        for this_item, gt_item in self._iterate_datasets():
            frame_id = self._gt_job_data_provider.dm_item_id_to_frame_id(this_item.id)
            frame_results = self._comparator.match_annotations(gt_item, this_item)

            conflicts.extend(self._generate_frame_annotation_conflicts(frame_id, frame_results))

        return conflicts

    def find_frame_gt_conflicts(self, frame_id: int) -> List[AnnotationConflict]:
        conflicts = []

        for this_item, gt_item in self._iterate_datasets():
            _frame_id = self._gt_job_data_provider.dm_item_id_to_frame_id(this_item.id)
            if frame_id != _frame_id:
                # TODO: find more optimal way
                continue

            frame_results = self._comparator.match_annotations(gt_item, this_item)

            conflicts.extend(self._generate_frame_annotation_conflicts(_frame_id, frame_results))

            break

        return conflicts

    def _generate_frame_annotation_conflicts(
        self, frame_id: int, frame_results
    ) -> List[AnnotationConflict]:
        conflicts = []

        merged_results = [[], [], [], []]
        for shape_type in [
            dm.AnnotationType.bbox, dm.AnnotationType.mask,
            dm.AnnotationType.points, dm.AnnotationType.polygon, dm.AnnotationType.polyline
        ]:
            for merged_field, field in zip(merged_results, frame_results[shape_type]):
                merged_field.extend(field)

        matches, mismatches, gt_unmatched, this_unmatched = merged_results

        for unmatched_ann in gt_unmatched:
            conflicts.append(AnnotationConflict(
                frame_id=frame_id,
                type=AnnotationConflictType.MISSING_ANNOTATION,
                data={
                    'annotation_ids': [
                        self._gt_job_data_provider.dm_ann_to_ann_id(unmatched_ann)
                    ]
                },
            ))

        for unmatched_ann in this_unmatched:
            conflicts.append(AnnotationConflict(
                frame_id=frame_id,
                type=AnnotationConflictType.EXTRA_ANNOTATION,
                data={
                    'annotation_ids': [
                        self._this_job_data_provider.dm_ann_to_ann_id(unmatched_ann)
                    ]
                },
            ))

        for gt_ann, this_ann in mismatches:
            conflicts.append(AnnotationConflict(
                frame_id=frame_id,
                type=AnnotationConflictType.MISMATCHING_ANNOTATION,
                data={
                    'annotation_ids': [
                        self._this_job_data_provider.dm_ann_to_ann_id(this_ann),
                        self._gt_job_data_provider.dm_ann_to_ann_id(gt_ann),
                    ],
                    'kind': MismatchingAnnotationKind.LABEL,
                    'expected': gt_ann.label,
                    'actual': this_ann.label,
                },
            ))

        for gt_ann, this_ann in matches:
            # Datumaro wont match attributes
            _, attr_mismatches, attr_gt_extra, attr_this_extra = \
                self._comparator.match_attrs(gt_ann, this_ann)

            for mismatched_attr in attr_mismatches:
                conflicts.append(AnnotationConflict(
                    frame_id=frame_id,
                    type=AnnotationConflictType.MISMATCHING_ANNOTATION,
                    data={
                        'annotation_ids': [
                            self._this_job_data_provider.dm_ann_to_ann_id(this_ann),
                            self._gt_job_data_provider.dm_ann_to_ann_id(gt_ann),
                        ],
                        'kind': MismatchingAnnotationKind.ATTRIBUTE,
                        'attribute': mismatched_attr,
                        'expected': gt_ann.attributes[mismatched_attr],
                        'actual': this_ann.attributes[mismatched_attr],
                    },
                ))

            for extra_attr in attr_gt_extra:
                conflicts.append(AnnotationConflict(
                    frame_id=frame_id,
                    type=AnnotationConflictType.MISMATCHING_ANNOTATION,
                    data={
                        'annotation_ids': [
                            self._this_job_data_provider.dm_ann_to_ann_id(this_ann),
                            self._gt_job_data_provider.dm_ann_to_ann_id(gt_ann),
                        ],
                        'kind': MismatchingAnnotationKind.ATTRIBUTE,
                        'attribute': mismatched_attr,
                        'expected': gt_ann.attributes[extra_attr],
                        'actual': None,
                    },
                ))

            for extra_attr in attr_this_extra:
                conflicts.append(AnnotationConflict(
                    frame_id=frame_id,
                    type=AnnotationConflictType.MISMATCHING_ANNOTATION,
                    data={
                        'annotation_ids': [
                            self._this_job_data_provider.dm_ann_to_ann_id(this_ann),
                            self._gt_job_data_provider.dm_ann_to_ann_id(gt_ann),
                        ],
                        'kind': MismatchingAnnotationKind.ATTRIBUTE,
                        'attribute': mismatched_attr,
                        'expected': None,
                        'actual': this_ann.attributes[extra_attr],
                    },
                ))

        return conflicts


@silk_profile()
def find_gt_conflicts(
    this_job: Job, gt_job: Job, *, frame_id: Optional[int] = None
) -> QualityReport:
    this_job_data_provider = _JobDataProvider(this_job.pk)
    gt_job_data_provider = _JobDataProvider(gt_job.pk)

    comparator = DatasetComparator(this_job_data_provider, gt_job_data_provider)
    if frame_id is not None:
        conflicts = comparator.find_frame_gt_conflicts(frame_id=frame_id)
    else:
        conflicts = comparator.find_gt_conflicts()

    report = QualityReport(
        job=this_job,
        job_last_updated=this_job.updated_date,
        gt_job_last_updated=gt_job.updated_date,
    )
    return _save_report_to_db(report, conflicts)


class QueueJobManager:
    TASK_QUALITY_CHECK_JOB_DELAY = timedelta(hours=1)
    _QUEUE_JOB_PREFIX = "update-quality-stats-task-"

    def _get_scheduler(self):
        return django_rq.get_scheduler(settings.CVAT_QUEUES.QUALITY_REPORTS.value)

    def _make_initial_queue_job_id(self, task: Task) -> str:
        return f'{self._QUEUE_JOB_PREFIX}{task.id}-initial'

    def _make_regular_queue_job_id(self, task: Task, start_time: datetime) -> str:
        return f'{self._QUEUE_JOB_PREFIX}{task.id}-{start_time.timestamp()}'

    def _get_last_report_time(self, task: Task) -> Optional[datetime]:
        report = QualityReport.objects.filter(task=task).order_by('-created_date').first()
        if report:
            return report.created_date
        return None

    def schedule_quality_check_job(self, task: Task):
        # This function schedules a report computing job in the queue
        # The queue work algorithm is lock-free. It has and should keep the following properties:
        # - job names are stable between potential writers
        # - if multiple simultaneous writes can happen, the objects written must be the same
        # - once a job is created, it can only be updated by the scheduler and the handling worker

        if not task.gt_job:
            # Nothing to compute
            return

        last_update_time = self._get_last_report_time(task)
        if last_update_time is None:
            # Report has never been computed
            queue_job_id = self._make_initial_queue_job_id(task)
        elif (
            next_update_time := last_update_time + self.TASK_QUALITY_CHECK_JOB_DELAY
        ) <= task.updated_date:
            queue_job_id = self._make_regular_queue_job_id(task, next_update_time)
        else:
            queue_job_id = None

        scheduler = self._get_scheduler()
        if queue_job_id not in scheduler:
            scheduler.enqueue_at(
                task.updated_date + self.TASK_QUALITY_CHECK_JOB_DELAY,
                self._update_task_quality_metrics_callback,
                kwargs=dict(task_id=task.id),
                job_id=queue_job_id,
            )

    @classmethod
    def _update_task_quality_metrics_callback(cls, task_id: int):
        with transaction.atomic():
            # The task could have been deleted during scheduling
            try:
                task = Task.objects.prefetch_related('segment__job').get(id=task_id)
            except Task.DoesNotExist:
                return

            # The GT job could have been removed during scheduling
            if not task.gt_job:
                return

            # TODO: Decide if all the task and job metrics must be updated here
            # Probably, need to have this:
            # task updated (the gt job, frame set or labels changed) -> everything is computed
            # job updated -> job report is computed

            # Preload all the data for computations
            gt_job = task.gt_job
            gt_job_data_provider = _JobDataProvider(gt_job)

            jobs = task.segment_set.job_set.filter(type=JobType.NORMAL).all()
            job_data_providers = { job.id: _JobDataProvider(job) for job in jobs }

        job_reports = {}
        for job in jobs:
            job_data_provider = job_data_providers[job.id]
            comparator = DatasetComparator(job_data_provider, gt_job_data_provider)
            conflicts = comparator.find_gt_conflicts()
            report = QualityReport(
                job=job,
                job_last_updated=job.updated_date,
                gt_job_last_updated=gt_job.updated_date,
            )
            job_reports[job.id] = (report, conflicts)

        # TODO: is it a separate report (the task dataset can be different from any jobs' dataset
        # because of frame overlaps) or a combined summary report?
        task_report = QualityReport()
        task_conflicts = [AnnotationConflict()]

        with transaction.atomic():
            # The task could have been deleted
            try:
                Task.objects.get(id=task_id)
            except Task.DoesNotExist:
                return

            for job_report, job_conflicts in job_reports.values():
                _save_report_to_db(job_report, job_conflicts)

            _save_report_to_db(task_report, task_conflicts)
