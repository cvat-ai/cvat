# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from datetime import datetime, timedelta
import itertools
from typing import Callable, Hashable, Iterator, List, Optional, Union, cast

from attrs import asdict, define
import datumaro as dm
from django.conf import settings
import django_rq
from django.db import transaction
import numpy as np

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


class JobDataProvider:
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


def OKS(a, b, sigma=None, bbox=None, scale=None, visibility=None):
    """
    Object Keypoint Similarity metric.
    https://cocodataset.org/#keypoints-eval
    """

    p1 = np.array(a.points).reshape((-1, 2))
    p2 = np.array(b.points).reshape((-1, 2))
    if len(p1) != len(p2):
        return 0

    if visibility is None:
        visibility = np.ones(len(p1))
    else:
        visibility = np.asarray(visibility, dtype=float)

    if not sigma:
        sigma = 0.1
    else:
        assert len(sigma) == len(p1)

    if not scale:
        if bbox is None:
            bbox = dm.ops.mean_bbox([a, b])
        scale = bbox[2] * bbox[3]

    dists = np.linalg.norm(p1 - p2, axis=1)
    return np.sum(
        visibility * np.exp(-(dists**2) / (2 * scale * (2 * sigma) ** 2))
    ) / np.sum(visibility)


@define(kw_only=True)
class _PointsMatcher(dm.ops.PointsMatcher):
    def distance(self, a, b):
        a_bbox = self.instance_map[id(a)][1]
        b_bbox = self.instance_map[id(b)][1]
        if dm.ops.bbox_iou(a_bbox, b_bbox) <= 0:
            return 0
        bbox = dm.ops.mean_bbox([a_bbox, b_bbox])
        return OKS(
            a,
            b,
            sigma=self.sigma,
            bbox=bbox,
            visibility=[v == dm.Points.Visibility.visible for v in a.visibility],
        )


class _DistanceComparator(dm.ops.DistanceComparator):
    def __init__(
        self,
        categories: dm.CategoriesInfo,
        *,
        included_ann_types: Optional[List[dm.AnnotationType]] = None,
        return_distances: bool = False,
        **kwargs,
    ):
        super().__init__(**kwargs)
        self.categories = categories
        self._skeleton_info = {}
        self.included_ann_types = included_ann_types
        self.return_distances = return_distances

    def _match_ann_type(self, t, *args):
        if t not in self.included_ann_types:
            return None

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
            return self.match_points(*args)
        elif t == dm.AnnotationType.skeleton:
            return self.match_skeletons(*args)
        elif t == dm.AnnotationType.polyline:
            return self.match_lines(*args)
        # pylint: enable=no-value-for-parameter
        else:
            return None

    def _match_segments(self, t, item_a, item_b, *,
        distance: Callable = dm.ops.segment_iou
    ):
        a_objs = self._get_ann_type(t, item_a)
        b_objs = self._get_ann_type(t, item_b)
        if not a_objs and not b_objs:
            return [], [], [], []

        if self.return_distances:
            distance, distances = self._make_memoizing_distance(distance)

        returned_values = dm.ops.match_segments(a_objs, b_objs,
            distance=distance, dist_thresh=self.iou_threshold)

        if self.return_distances:
            returned_values = returned_values + (distances, )

        return returned_values

    def match_boxes(self, item_a, item_b):
        return self._match_segments(dm.AnnotationType.bbox, item_a, item_b)

    def match_polygons(self, item_a, item_b):
        return self._match_segments(dm.AnnotationType.polygon, item_a, item_b)

    def match_masks(self, item_a, item_b):
        return self._match_segments(dm.AnnotationType.mask, item_a, item_b)

    def match_lines(self, item_a, item_b):
        matcher = dm.ops.LineMatcher()
        return self._match_segments(dm.AnnotationType.polyline, item_a, item_b,
            distance=matcher.distance)

    def match_points(self, item_a, item_b):
        a_points = self._get_ann_type(dm.AnnotationType.points, item_a)
        b_points = self._get_ann_type(dm.AnnotationType.points, item_b)
        if not a_points and not b_points:
            return [], [], [], []

        instance_map = {}
        for s in [item_a.annotations, item_b.annotations]:
            s_instances = dm.ops.find_instances(s)
            for instance_group in s_instances:
                instance_bbox = dm.ops.max_bbox(
                    a.get_bbox() if isinstance(a, dm.Skeleton) else a
                    for a in instance_group
                    if hasattr(a, 'get_bbox')
                )

                for ann in instance_group:
                    instance_map[id(ann)] = [instance_group, instance_bbox]
        matcher = _PointsMatcher(instance_map=instance_map)

        distance = matcher.distance

        if self.return_distances:
            distance, distances = self._make_memoizing_distance(distance)

        returned_values = dm.ops.match_segments(
            a_points,
            b_points,
            dist_thresh=self.iou_threshold,
            distance=distance,
        )

        if self.return_distances:
            returned_values = returned_values + (distances, )

        return returned_values

    def _get_skeleton_info(self, skeleton_label_id: int):
        label_cat = cast(dm.LabelCategories, self.categories[dm.AnnotationType.label])
        skeleton_info = self._skeleton_info.get(skeleton_label_id)

        if skeleton_info is None:
            skeleton_label_name = label_cat[skeleton_label_id].name

            # Build a sorted list of sublabels to arrange skeleton points during comparison
            skeleton_info = sorted(
                idx
                for idx, label in enumerate(label_cat)
                if label.parent == skeleton_label_name
            )
            self._skeleton_info[skeleton_label_id] = skeleton_info

        return skeleton_info

    def match_skeletons(self, item_a, item_b):
        a_skeletons = self._get_ann_type(dm.AnnotationType.skeleton, item_a)
        b_skeletons = self._get_ann_type(dm.AnnotationType.skeleton, item_b)
        if not a_skeletons and not b_skeletons:
            return [], [], [], []

        # Convert skeletons to point lists for comparison
        # This is required to compute correct per-instance distance
        # It is assumed that labels are the same in the datasets
        skeleton_infos = {}
        points_map = {}
        skeleton_map = {}
        a_points = []
        b_points = []
        for source, source_points in [(a_skeletons, a_points), (b_skeletons, b_points)]:
            for skeleton in source:
                skeleton_info = skeleton_infos.setdefault(
                    skeleton.label, self._get_skeleton_info(skeleton.label)
                )

                # Merge skeleton points into a single list
                # The list is ordered by skeleton_info
                skeleton_points = [
                    next((p for p in skeleton.elements if p.label == sublabel), None)
                    for sublabel in skeleton_info
                ]

                # Build a single Points object for further comparisons
                merged_points = dm.Points(
                    points=list(
                        itertools.chain.from_iterable(
                            p.points if p else [0, 0] for p in skeleton_points
                        )
                    ),
                    visibility=list(
                        itertools.chain.from_iterable(
                            p.visibility if p else [dm.Points.Visibility.absent]
                            for p in skeleton_points
                        )
                    ),
                    label=skeleton.label
                    # no per-point attributes currently in CVAT
                )

                points_map[id(merged_points)] = skeleton
                skeleton_map[id(skeleton)] = merged_points
                source_points.append(merged_points)

        instance_map = {}
        for source in [item_a.annotations, item_b.annotations]:
            for instance_group in dm.ops.find_instances(source):
                instance_bbox = dm.ops.max_bbox(
                    a.get_bbox() if isinstance(a, dm.Skeleton) else a
                    for a in instance_group
                    if hasattr(a, 'get_bbox')
                )

                instance_group = [
                    skeleton_map[id(a)] if isinstance(a, dm.Skeleton) else a
                    for a in instance_group
                ]
                for ann in instance_group:
                    instance_map[id(ann)] = [instance_group, instance_bbox]

        matcher = _PointsMatcher(instance_map=instance_map)

        distance = matcher.distance

        if self.return_distances:
            distance, distances = self._make_memoizing_distance(distance)

        matched, mismatched, a_extra, b_extra = dm.ops.match_segments(
            a_points,
            b_points,
            dist_thresh=self.iou_threshold,
            distance=distance,
        )

        matched = [(points_map[id(p_a)], points_map[id(p_b)]) for (p_a, p_b) in matched]
        mismatched = [
            (points_map[id(p_a)], points_map[id(p_b)]) for (p_a, p_b) in mismatched
        ]
        a_extra = [points_map[id(p_a)] for p_a in a_extra]
        b_extra = [points_map[id(p_b)] for p_b in b_extra]

        # Map points back to skeletons
        if self.return_distances:
            for (p_a_id, p_b_id) in list(distances.keys()):
                dist = distances.pop((p_a_id, p_b_id))
                distances[(
                    id(points_map[p_a_id]),
                    id(points_map[p_b_id])
                )] = dist

        returned_values = (matched, mismatched, a_extra, b_extra)

        if self.return_distances:
            returned_values = returned_values + (distances, )

        return returned_values

    @classmethod
    def _make_memoizing_distance(cls, distance_function):
        distances = {}
        notfound = object()

        def memoizing_distance(a, b):
            key = (id(a), id(b))
            dist = distances.get(key, notfound)

            if dist is notfound:
                dist = distance_function(a, b)
                distances[key] = dist

            return dist

        return memoizing_distance, distances

class _Comparator:
    def __init__(self, categories: dm.CategoriesInfo):
        self.ignored_attrs = [
            "track_id",  # changes from task to task, can't be defined manually with the same name
            "keyframe",  # indicates the way annotation obtained, meaningless to compare
            "z_order",  # TODO: compare relative or 'visible' z_order
            "group",  # TODO: changes from task to task. But must be compared for existence
        ]
        self.included_ann_types = [
            dm.AnnotationType.bbox,
            dm.AnnotationType.mask,
            dm.AnnotationType.points,
            dm.AnnotationType.polygon,
            dm.AnnotationType.polyline,
            dm.AnnotationType.skeleton,
        ]
        self._annotation_comparator = _DistanceComparator(
            categories, included_ann_types=self.included_ann_types, return_distances=False,
        )

    def match_attrs(self, ann_a: dm.Annotation, ann_b: dm.Annotation):
        a_attrs = ann_a.attributes
        b_attrs = ann_b.attributes

        keys_to_match = (a_attrs.keys() | b_attrs.keys()).difference(self.ignored_attrs)

        matches = []
        mismatches = []
        a_extra = []
        b_extra = []

        notfound = object()

        for k in keys_to_match:
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
        return self._annotation_comparator.match_annotations(item_a, item_b)

class DatasetComparator:
    def __init__(self,
        this_job_data_provider: JobDataProvider,
        gt_job_data_provider: JobDataProvider
    ) -> None:
        self._this_job_data_provider = this_job_data_provider
        self._gt_job_data_provider = gt_job_data_provider
        self._this_job_dataset = self._this_job_data_provider.dm_dataset
        self._gt_job_dataset = self._gt_job_data_provider.dm_dataset
        self._comparator = _Comparator(self._gt_job_dataset.categories())

    def _iterate_datasets(self) -> Iterator:
        for gt_item in self._gt_job_dataset:
            this_item = self._this_job_dataset.get(gt_item.id)
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


def _create_report(this_job: Job, gt_job: Job, conflicts: List[AnnotationConflict]):
    report = QualityReport(
        job=this_job,
        target_last_updated=this_job.updated_date,
        gt_last_updated=gt_job.updated_date,

        # TODO: refactor, add real data
        data=dict(
            parameters=dict(),

            intersection_results=dict(
                frame_count=0,
                frame_share_percent=0,
                frames=[],

                error_count=len(conflicts),
                mean_error_count=0,
                mean_accuracy=0,
            )
        )
    )

    return report


@silk_profile()
def find_gt_conflicts(
    this_job: Job, gt_job: Job, *, frame_id: Optional[int] = None
) -> QualityReport:
    this_job_data_provider = JobDataProvider(this_job.pk)
    gt_job_data_provider = JobDataProvider(gt_job.pk)

    comparator = DatasetComparator(this_job_data_provider, gt_job_data_provider)
    if frame_id is not None:
        conflicts = comparator.find_frame_gt_conflicts(frame_id=frame_id)
    else:
        conflicts = comparator.find_gt_conflicts()

    report = _create_report(this_job, gt_job, conflicts)
    return _save_report_to_db(report, conflicts)


class QueueJobManager:
    TASK_QUALITY_CHECK_JOB_DELAY = timedelta(seconds=5) # TODO: 1h
    _QUEUE_JOB_PREFIX = "update-quality-metrics-task-"

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
                task_id=task.id,
                job_id=queue_job_id,
            )

    @classmethod
    def _update_task_quality_metrics_callback(cls, *, task_id: int):
        with transaction.atomic():
            # The task could have been deleted during scheduling
            try:
                task = Task.objects.prefetch_related('segment_set__job_set').get(id=task_id)
            except Task.DoesNotExist:
                return

            # The GT job could have been removed during scheduling
            if not task.gt_job:
                return

            # TODO: Probably, can be optimized to this:
            # - task updated (the gt job, frame set or labels changed) -> everything is computed
            # - job updated -> job report is computed
            #   old reports can be reused in this case (need to add M-1 relationship in reports)

            # Preload all the data for the computations
            gt_job = task.gt_job
            gt_job_data_provider = JobDataProvider(gt_job.id)

            jobs = [
                s.job_set.first()
                for s in task.segment_set.filter(job__type=JobType.NORMAL).all()
            ]
            job_data_providers = { job.id: JobDataProvider(job.id) for job in jobs }

        job_reports = {}
        for job in jobs:
            job_data_provider = job_data_providers[job.id]
            comparator = DatasetComparator(job_data_provider, gt_job_data_provider)
            conflicts = comparator.find_gt_conflicts()
            report = _create_report(job, gt_job, conflicts)
            job_reports[job.id] = (report, conflicts)

        # TODO: is it a separate report (the task dataset can be different from any jobs' dataset
        # because of frame overlaps) or a combined summary report?
        task_report = QualityReport(
            task=task,
            target_last_updated=task.updated_date,
            gt_last_updated=gt_job.updated_date,

            # TODO: refactor, add real data
            data=dict(
                parameters=dict(),

                intersection_results=dict(
                    frame_count=0,
                    frame_share_percent=0,
                    frames=[],

                    error_count=len(conflicts),
                    mean_error_count=0,
                    mean_accuracy=0,
                )
            )
        )
        task_conflicts = []

        with transaction.atomic():
            # The task could have been deleted during processing
            try:
                Task.objects.get(id=task_id)
            except Task.DoesNotExist:
                return

            for job_report, job_conflicts in job_reports.values():
                _save_report_to_db(job_report, job_conflicts)

            _save_report_to_db(task_report, task_conflicts)
