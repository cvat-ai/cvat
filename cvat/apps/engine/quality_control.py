# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations
from copy import deepcopy
from datetime import timedelta

import itertools
import json
from typing import Any, Callable, Dict, Hashable, List, Optional, Sequence, Union, cast

from attrs import asdict, define, has as is_attrs_type
import datumaro as dm
from django.conf import settings
from django.db import transaction
from django.utils import timezone
import django_rq
import numpy as np

from cvat.apps.dataset_manager.task import JobAnnotation
from cvat.apps.dataset_manager.bindings import (CommonData, CvatToDmAnnotationConverter,
    GetCVATDataExtractor, JobData)
from cvat.apps.dataset_manager.formats.registry import dm_env
from cvat.apps.engine import models
from cvat.apps.engine.models import AnnotationConflictType, ShapeType


class _Serializable:
    def _value_serializer(self, t, attr, v):
        if isinstance(v, _Serializable):
            return v.to_dict()
        elif is_attrs_type(type(v)):
            return asdict(v, value_serializer=self._value_serializer)
        elif not isinstance(self, type(t)) and isinstance(t, _Serializable):
            return t._value_serializer(t, attr, v)
        else:
            return v

    def to_dict(self) -> dict:
        return asdict(self, value_serializer=self._value_serializer)


@define(kw_only=True)
class AnnotationId(_Serializable):
    obj_id: int
    job_id: int
    type: ShapeType

    def _value_serializer(self, t, attr, v):
        if isinstance(v, ShapeType):
            return str(v)
        else:
            return super()._value_serializer(t, attr, v)

    @classmethod
    def from_dict(cls, d):
        return cls(
            obj_id=d['obj_id'],
            job_id=d['job_id'],
            type=ShapeType(d['type']),
        )

@define(kw_only=True)
class AnnotationConflict(_Serializable):
    frame_id: int
    type: AnnotationConflictType
    annotation_ids: List[AnnotationId]

    def _value_serializer(self, t, attr, v):
        if isinstance(v, AnnotationConflictType):
            return str(v)
        else:
            return super()._value_serializer(t, attr, v)

    @classmethod
    def from_dict(cls, d):
        return cls(
            frame_id=d['frame_id'],
            type=AnnotationConflictType(d['type']),
            annotation_ids=list(AnnotationId.from_dict(v) for v in d['annotation_ids'])
        )


@define(kw_only=True)
class ComparisonReportParameters(_Serializable):
    included_annotation_types: List[str]
    ignored_attributes: List[str]
    iou_threshold: float

    @classmethod
    def from_dict(cls, d):
        return cls(
            included_annotation_types=d['included_annotation_types'],
            ignored_attributes=d['ignored_attributes'],
            iou_threshold=d['iou_threshold'],
        )


@define(kw_only=True)
class ConfusionMatrix(_Serializable):
    labels: List[str]
    rows: np.array
    precision: np.array
    recall: np.array
    accuracy: np.array

    @property
    def axes(self):
        return dict(cols='gt', rows='ds')

    def _value_serializer(self, t, attr, v):
        if isinstance(v, np.ndarray):
            return v.tolist()
        else:
            return super()._value_serializer(t, attr, v)

    def to_dict(self) -> dict:
        result = super().to_dict()
        result.update(**{
            k: getattr(self, k) for k in ['axes']
        })
        return result

    @classmethod
    def from_dict(cls, d):
        return cls(
            labels=d['labels'],
            rows=np.asarray(d['rows']),
            precision=np.asarray(d['precision']),
            recall=np.asarray(d['recall']),
            accuracy=np.asarray(d['accuracy']),
        )


@define(kw_only=True)
class ComparisonReportAnnotationsSummary(_Serializable):
    valid_count: int
    missing_count: int
    extra_count: int
    total_count: int
    ds_count: int
    gt_count: int
    confusion_matrix: ConfusionMatrix

    @property
    def accuracy(self) -> float:
        return self.valid_count / (self.total_count or 1)

    @property
    def precision(self) -> float:
        return self.valid_count / (self.ds_count or 1)

    @property
    def recall(self) -> float:
        return self.valid_count / (self.gt_count or 1)

    def accumulate(self, other: ComparisonReportAnnotationsSummary):
        for field in [
            'valid_count', 'missing_count', 'extra_count', 'total_count', 'ds_count', 'gt_count'
        ]:
            setattr(self, field, getattr(self, field) + getattr(other, field))

    def to_dict(self) -> dict:
        result = super().to_dict()
        result.update(**{
            k: getattr(self, k) for k in ['accuracy', 'precision', 'recall']
        })
        return result

    @classmethod
    def from_dict(cls, d):
        return cls(
            valid_count=d['valid_count'],
            missing_count=d['missing_count'],
            extra_count=d['extra_count'],
            total_count=d['total_count'],
            ds_count=d['ds_count'],
            gt_count=d['gt_count'],
            confusion_matrix=ConfusionMatrix.from_dict(d['confusion_matrix'])
        )


@define(kw_only=True)
class ComparisonReportAnnotationShapeSummary(_Serializable):
    valid_count: int
    missing_count: int
    extra_count: int
    total_count: int
    ds_count: int
    gt_count: int
    mean_iou: float

    @property
    def accuracy(self) -> float:
        return self.valid_count / (self.total_count or 1)

    def accumulate(self, other: ComparisonReportAnnotationShapeSummary):
        for field in [
            'valid_count', 'missing_count', 'extra_count', 'total_count', 'ds_count', 'gt_count'
        ]:
            setattr(self, field, getattr(self, field) + getattr(other, field))

    def to_dict(self) -> dict:
        result = super().to_dict()
        result.update(**{
            k: getattr(self, k) for k in ['accuracy']
        })
        return result

    @classmethod
    def from_dict(cls, d):
        return cls(
            valid_count=d['valid_count'],
            missing_count=d['missing_count'],
            extra_count=d['extra_count'],
            total_count=d['total_count'],
            ds_count=d['ds_count'],
            gt_count=d['gt_count'],
            mean_iou=d['mean_iou'],
        )


@define(kw_only=True)
class ComparisonReportAnnotationLabelSummary(_Serializable):
    valid_count: int
    invalid_count: int
    total_count: int

    @property
    def accuracy(self) -> float:
        return self.valid_count / (self.total_count or 1)

    def accumulate(self, other: ComparisonReportAnnotationLabelSummary):
        for field in ['valid_count', 'total_count', 'invalid_count']:
            setattr(self, field, getattr(self, field) + getattr(other, field))

    def to_dict(self) -> dict:
        result = super().to_dict()
        result.update(**{
            k: getattr(self, k) for k in ['accuracy']
        })
        return result

    @classmethod
    def from_dict(cls, d):
        return cls(
            valid_count=d['valid_count'],
            invalid_count=d['invalid_count'],
            total_count=d['total_count'],
        )

@define(kw_only=True)
class ComparisonReportAnnotationComponentsSummary(_Serializable):
    shape: ComparisonReportAnnotationShapeSummary
    label: ComparisonReportAnnotationLabelSummary

    def accumulate(self, other: ComparisonReportAnnotationComponentsSummary):
        self.shape.accumulate(other.shape)
        self.label.accumulate(other.label)

    @classmethod
    def from_dict(cls, d):
        return cls(
            shape=ComparisonReportAnnotationShapeSummary.from_dict(d['shape']),
            label=ComparisonReportAnnotationLabelSummary.from_dict(d['label']),
        )


@define(kw_only=True)
class ComparisonReportComparisonSummary(_Serializable):
    frame_share_percent: float
    frames: List[str]

    conflict_count: int
    mean_conflict_count: float

    annotations: ComparisonReportAnnotationsSummary
    annotation_components: ComparisonReportAnnotationComponentsSummary

    @property
    def frame_count(self) -> int:
        return len(self.frames)

    def to_dict(self) -> dict:
        result = super().to_dict()
        result.update(**{
            k: getattr(self, k) for k in ['frame_count']
        })
        return result

    @classmethod
    def from_dict(cls, d):
        return cls(
            frame_share_percent=d['frame_share_percent'],
            frames=list(d['frames']),
            conflict_count=d['conflict_count'],
            mean_conflict_count=d['mean_conflict_count'],
            annotations=ComparisonReportAnnotationsSummary.from_dict(d['annotations']),
            annotation_components=ComparisonReportAnnotationComponentsSummary.from_dict(
                d['annotation_components']),
        )


@define(kw_only=True)
class ComparisonReportDatasetSummary(_Serializable):
    frame_count: int
    shape_count: int

    @classmethod
    def from_dict(cls, d):
        return cls(
            frame_count=d['frame_count'],
            shape_count=d['shape_count'],
        )


@define(kw_only=True)
class ComparisonReportFrameSummary(_Serializable):
    conflict_count: int
    conflicts: List[AnnotationConflict]

    annotations: ComparisonReportAnnotationsSummary
    annotation_components: ComparisonReportAnnotationComponentsSummary

    @classmethod
    def from_dict(cls, d):
        return cls(
            conflict_count=d['conflict_count'],
            conflicts=[AnnotationConflict.from_dict(v) for v in d['conflicts']],
            annotations=ComparisonReportAnnotationsSummary.from_dict(d['annotations']),
            annotation_components=ComparisonReportAnnotationComponentsSummary.from_dict(
                d['annotation_components']),
        )


@define(kw_only=True)
class ComparisonReport(_Serializable):
    parameters: ComparisonReportParameters
    comparison_summary: ComparisonReportComparisonSummary
    dataset_summary: ComparisonReportDatasetSummary
    frame_results: Dict[int, ComparisonReportFrameSummary]

    @property
    def conflicts(self) -> List[AnnotationConflict]:
        return list(itertools.chain.from_iterable(r.conflicts for r in self.frame_results.values()))

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> ComparisonReport:
        return cls(
            parameters=ComparisonReportParameters.from_dict(d['parameters']),
            comparison_summary=ComparisonReportComparisonSummary.from_dict(d['comparison_summary']),
            dataset_summary=ComparisonReportDatasetSummary.from_dict(d['dataset_summary']),
            frame_results={
                k: ComparisonReportFrameSummary.from_dict(v)
                for k, v in d['frame_results'].items()
            }
        )

    def to_json(self) -> str:
        class _JSONEncoder(json.JSONEncoder):
            def default(self, o: Any) -> Any:
                if isinstance(o, (np.ndarray, np.number)):
                    return o.tolist()
                else:
                    return super().default(o)

        return json.dumps(self.to_dict(), cls=_JSONEncoder, indent=2)

    @classmethod
    def from_json(cls, data: str) -> ComparisonReport:
        return cls.from_dict(json.loads(data))

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
        ann_type = ShapeType(source_ann.type)
        return AnnotationId(obj_id=source_ann.id, type=ann_type, job_id=self.job_id)


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


def _OKS(a, b, sigma=None, bbox=None, scale=None, visibility=None):
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
        return _OKS(
            a,
            b,
            sigma=self.sigma,
            bbox=bbox,
            visibility=[v == dm.Points.Visibility.visible for v in a.visibility],
        )


def _arr_div(a_arr: np.ndarray, b_arr: np.ndarray) -> np.ndarray:
    divisor = b_arr.copy()
    divisor[b_arr == 0] = 1
    return a_arr / divisor

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

    def _instance_bbox(self, instance_anns: Sequence[dm.Annotation]):
        return dm.ops.max_bbox(
            a.get_bbox() if isinstance(a, dm.Skeleton) else a
            for a in instance_anns
            if hasattr(a, 'get_bbox')
            and not a.attributes.get('outside', False)
        )

    @staticmethod
    def _get_ann_type(t, item):
        return [
            a for a in item.annotations
            if a.type == t
            and not a.attributes.get('outside', False)
        ]

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
                instance_bbox = self._instance_bbox(instance_group)

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

                if all(v == dm.Points.Visibility.absent for v in merged_points.visibility):
                    # The whole skeleton is outside, exclude it
                    skeleton_map[id(skeleton)] = None
                    continue

                points_map[id(merged_points)] = skeleton
                skeleton_map[id(skeleton)] = merged_points
                source_points.append(merged_points)

        instance_map = {}
        for source in [item_a.annotations, item_b.annotations]:
            for instance_group in dm.ops.find_instances(source):
                instance_bbox = self._instance_bbox(instance_group)

                instance_group = [
                    skeleton_map[id(a)] if isinstance(a, dm.Skeleton) else a
                    for a in instance_group
                    if not isinstance(a, dm.Skeleton) or skeleton_map[id(a)] is not None
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
            "rotation",  # should be handled by other means
            "outside",  # should be handled by other means
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
            categories, included_ann_types=self.included_ann_types, return_distances=True,
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


class _DatasetComparator:
    def __init__(self,
        ds_data_provider: JobDataProvider,
        gt_data_provider: JobDataProvider,
    ) -> None:
        self._ds_data_provider = ds_data_provider
        self._gt_data_provider = gt_data_provider
        self._ds_dataset = self._ds_data_provider.dm_dataset
        self._gt_dataset = self._gt_data_provider.dm_dataset

        self._frame_results: Dict[int, ComparisonReportFrameSummary] = {}

        self.comparator = _Comparator(self._gt_dataset.categories())
        self.comparator._annotation_comparator.iou_threshold = 0.2
        self.overlap_threshold = 0.8
        self.included_frames = gt_data_provider.job_data._db_job.segment.frame_set

    def _dm_item_to_frame_id(self, item: dm.DatasetItem) -> int:
        return self._gt_data_provider.dm_item_id_to_frame_id(item.id)

    def _dm_ann_to_ann_id(self, ann: dm.Annotation, dataset: dm.Dataset):
        if dataset is self._ds_dataset:
            source_data_provider = self._ds_data_provider
        elif dataset is self._gt_dataset:
            source_data_provider = self._gt_data_provider
        else:
            assert False

        return source_data_provider.dm_ann_to_ann_id(ann)

    def _find_gt_conflicts(self):
        ds_job_dataset = self._ds_dataset
        gt_job_dataset = self._gt_dataset

        for gt_item in gt_job_dataset:
            ds_item = ds_job_dataset.get(gt_item.id)
            if not ds_item:
                continue  # we need to compare only intersecting frames

            self._process_frame(ds_item, gt_item)

    def _process_frame(self, ds_item, gt_item):
        frame_id = self._dm_item_to_frame_id(ds_item)
        if self.included_frames is not None and frame_id not in self.included_frames:
            return

        frame_results = self.comparator.match_annotations(gt_item, ds_item)
        self._frame_results.setdefault(frame_id, {})

        self._generate_frame_annotation_conflicts(frame_id, frame_results)

    def _generate_frame_annotation_conflicts(
        self, frame_id: str, frame_results,
    ) -> List[AnnotationConflict]:
        conflicts = []

        merged_results = [[], [], [], [], {}]
        for shape_type in self.comparator.included_ann_types:
            for merged_field, field in zip(merged_results, frame_results[shape_type][:-1]):
                merged_field.extend(field)

            merged_results[-1].update(frame_results[shape_type][-1])

        matches, mismatches, gt_unmatched, ds_unmatched, pairwise_distances = merged_results

        def _get_overlap(gt_ann: dm.Annotation, ds_ann: dm.Annotation) -> Optional[float]:
            return pairwise_distances.get((id(gt_ann), id(ds_ann)))

        _matched_shapes = set(
            id(shape)
            for shape_pair in itertools.chain(matches, mismatches)
            for shape in shape_pair
        )

        def _find_closest_unmatched_shape(shape: dm.Annotation):
            this_shape_id = id(shape)

            this_shape_distances = []

            for (gt_shape_id, ds_shape_id), dist in pairwise_distances.items():
                if gt_shape_id == this_shape_id:
                    other_shape_id = ds_shape_id
                elif ds_shape_id == this_shape_id:
                    other_shape_id = gt_shape_id
                else:
                    continue

                this_shape_distances.append((other_shape_id, dist))

            matched_ann, distance = max(this_shape_distances, key=lambda v: v[1], default=(None, 0))
            return matched_ann, distance

        for gt_ann, ds_ann in list(matches + mismatches):
            overlap = _get_overlap(gt_ann, ds_ann)
            if overlap and overlap < self.overlap_threshold:
                conflicts.append(AnnotationConflict(
                    frame_id=frame_id,
                    type=AnnotationConflictType.LOW_OVERLAP,
                    annotation_ids=[
                        self._dm_ann_to_ann_id(ds_ann, self._ds_dataset),
                        self._dm_ann_to_ann_id(gt_ann, self._gt_dataset),
                    ]
                ))

        for unmatched_ann in gt_unmatched:
            conflicts.append(
                AnnotationConflict(
                    frame_id=frame_id,
                    type=AnnotationConflictType.MISSING_ANNOTATION,
                    annotation_ids=[
                        self._dm_ann_to_ann_id(unmatched_ann, self._gt_dataset)
                    ],
                )
            )

        for unmatched_ann in ds_unmatched:
            conflicts.append(
                AnnotationConflict(
                    frame_id=frame_id,
                    type=AnnotationConflictType.EXTRA_ANNOTATION,
                    annotation_ids=[
                        self._dm_ann_to_ann_id(unmatched_ann, self._ds_dataset)
                    ],
                )
            )

        for gt_ann, ds_ann in mismatches:
            conflicts.append(
                AnnotationConflict(
                    frame_id=frame_id,
                    type=AnnotationConflictType.MISMATCHING_LABEL,
                    annotation_ids=[
                        self._dm_ann_to_ann_id(ds_ann, self._ds_dataset),
                        self._dm_ann_to_ann_id(gt_ann, self._gt_dataset),
                    ]
                )
            )

        resulting_distances = [
            _get_overlap(gt_ann, ds_ann)
            for gt_ann, ds_ann in itertools.chain(matches, mismatches)
        ]

        for unmatched_ann in itertools.chain(gt_unmatched, ds_unmatched):
            matched_ann_id, overlap = _find_closest_unmatched_shape(unmatched_ann)
            if matched_ann_id is not None:
                _matched_shapes.add(matched_ann_id)
            resulting_distances.append(overlap)

        mean_iou = np.mean(resulting_distances)

        valid_shapes_count = len(matches) + len(mismatches)
        missing_shapes_count = len(gt_unmatched)
        extra_shapes_count = len(ds_unmatched)
        total_shapes_count = len(matches) + len(mismatches) + len(gt_unmatched) + len(ds_unmatched)
        ds_shapes_count = len(matches) + len(mismatches) + len(ds_unmatched)
        gt_shapes_count = len(matches) + len(mismatches) + len(gt_unmatched)

        valid_labels_count = len(matches)
        invalid_labels_count = len(mismatches)
        total_labels_count = valid_labels_count + invalid_labels_count

        confusion_matrix_labels = {
            i: label.name
            for i, label in enumerate(self._gt_dataset.categories()[dm.AnnotationType.label])
            if not label.parent
        }
        confusion_matrix_labels[None] = 'unmatched'
        confusion_matrix_labels_rmap = {
            k: i for i, k in enumerate(confusion_matrix_labels.keys())
        }
        confusion_matrix_label_count = len(confusion_matrix_labels)
        confusion_matrix = np.zeros(
            (confusion_matrix_label_count, confusion_matrix_label_count), dtype=int
        )
        for gt_ann, ds_ann in itertools.chain(
            # fully matched annotations - shape, label, attributes
            matches,
            mismatches,
            zip(itertools.repeat(None), ds_unmatched),
            zip(gt_unmatched, itertools.repeat(None)),
        ):
            ds_label_idx = confusion_matrix_labels_rmap[ds_ann.label if ds_ann else ds_ann]
            gt_label_idx = confusion_matrix_labels_rmap[gt_ann.label if gt_ann else gt_ann]
            confusion_matrix[ds_label_idx, gt_label_idx] += 1

        matched_ann_counts = np.diag(confusion_matrix)
        ds_ann_counts = np.sum(confusion_matrix, axis=1)
        gt_ann_counts = np.sum(confusion_matrix, axis=0)
        label_accuracies = _arr_div(matched_ann_counts, ds_ann_counts + gt_ann_counts - matched_ann_counts)
        label_precisions = _arr_div(matched_ann_counts, ds_ann_counts)
        label_recalls = _arr_div(matched_ann_counts, gt_ann_counts)

        valid_annotations_count = np.sum(matched_ann_counts)
        missing_annotations_count = np.sum(confusion_matrix[:, confusion_matrix_labels_rmap[None]])
        extra_annotations_count = np.sum(confusion_matrix[confusion_matrix_labels_rmap[None], :])
        total_annotations_count = np.sum(confusion_matrix)
        ds_annotations_count = np.sum(ds_ann_counts) - ds_ann_counts[confusion_matrix_labels_rmap[None]]
        gt_annotations_count = np.sum(gt_ann_counts) - gt_ann_counts[confusion_matrix_labels_rmap[None]]

        self._frame_results[frame_id] = ComparisonReportFrameSummary(
            conflict_count=len(conflicts),
            annotations=ComparisonReportAnnotationsSummary(
                valid_count=valid_annotations_count,
                missing_count=missing_annotations_count,
                extra_count=extra_annotations_count,
                total_count=total_annotations_count,
                ds_count=ds_annotations_count,
                gt_count=gt_annotations_count,
                confusion_matrix=ConfusionMatrix(
                    labels=list(confusion_matrix_labels.values()),
                    rows=confusion_matrix,
                    precision=label_precisions,
                    recall=label_recalls,
                    accuracy=label_accuracies,
                )
            ),
            annotation_components=ComparisonReportAnnotationComponentsSummary(
                shape=ComparisonReportAnnotationShapeSummary(
                    valid_count=valid_shapes_count,
                    missing_count=missing_shapes_count,
                    extra_count=extra_shapes_count,
                    total_count=total_shapes_count,
                    ds_count=ds_shapes_count,
                    gt_count=gt_shapes_count,
                    mean_iou=mean_iou,
                ),
                label=ComparisonReportAnnotationLabelSummary(
                    valid_count=valid_labels_count,
                    invalid_count=invalid_labels_count,
                    total_count=total_labels_count,
                ),
            ),
            conflicts=conflicts.copy(),
        )

        return conflicts

    def generate_report(self) -> ComparisonReport:
        self._find_gt_conflicts()

        full_ds_comparable_shapes_count = 0
        full_ds_comparable_attributes_count = 0
        for item in self._ds_dataset:
            for ann in item.annotations:
                if ann.type not in self.comparator.included_ann_types:
                    continue

                full_ds_comparable_attributes_count += len(
                    set(ann.attributes).difference(self.comparator.ignored_attrs)
                )
                full_ds_comparable_shapes_count += 1

        # accumulate stats
        intersection_frames = []
        conflict_count = 0
        annotations = None
        annotation_components = None
        mean_ious = []
        confusion_matrices = []
        for frame_id, frame_result in self._frame_results.items():
            intersection_frames.append(frame_id)
            conflict_count += frame_result.conflict_count

            if annotations is None:
                annotations = deepcopy(frame_result.annotations)
            else:
                annotations.accumulate(frame_result.annotations)
            confusion_matrices.append(frame_result.annotations.confusion_matrix.rows)

            if annotation_components is None:
                annotation_components = deepcopy(frame_result.annotation_components)
            else:
                annotation_components.accumulate(frame_result.annotation_components)
            mean_ious.append(frame_result.annotation_components.shape.mean_iou)

        confusion_matrix_labels = {
            i: label.name
            for i, label in enumerate(self._gt_dataset.categories()[dm.AnnotationType.label])
            if not label.parent
        }
        confusion_matrix_labels[None] = 'unmatched'
        confusion_matrix_labels_rmap = {
            k: i for i, k in enumerate(confusion_matrix_labels.keys())
        }
        if confusion_matrices:
            confusion_matrix = np.sum(confusion_matrices, axis=0)
        else:
            confusion_matrix = np.zeros(
                (len(confusion_matrix_labels), len(confusion_matrix_labels)), dtype=int
            )
        matched_ann_counts = np.diag(confusion_matrix)
        ds_ann_counts = np.sum(confusion_matrix, axis=1)
        gt_ann_counts = np.sum(confusion_matrix, axis=0)
        label_accuracies = _arr_div(matched_ann_counts, ds_ann_counts + gt_ann_counts - matched_ann_counts)
        label_precisions = _arr_div(matched_ann_counts, ds_ann_counts)
        label_recalls = _arr_div(matched_ann_counts, gt_ann_counts)

        valid_annotations_count = np.sum(matched_ann_counts)
        missing_annotations_count = np.sum(confusion_matrix[:, confusion_matrix_labels_rmap[None]])
        extra_annotations_count = np.sum(confusion_matrix[confusion_matrix_labels_rmap[None], :])
        total_annotations_count = np.sum(confusion_matrix)
        ds_annotations_count = np.sum(ds_ann_counts) - ds_ann_counts[confusion_matrix_labels_rmap[None]]
        gt_annotations_count = np.sum(gt_ann_counts) - gt_ann_counts[confusion_matrix_labels_rmap[None]]

        mean_conflict_count = conflict_count / (len(intersection_frames) or 1)

        return ComparisonReport(
            parameters=ComparisonReportParameters(
                included_annotation_types=[t.name for t in self.comparator.included_ann_types],
                iou_threshold=self.comparator._annotation_comparator.iou_threshold,
                ignored_attributes=self.comparator.ignored_attrs,
            ),

            comparison_summary=ComparisonReportComparisonSummary(
                frame_share_percent=len(intersection_frames) / (len(self._ds_dataset) or 1),
                frames=intersection_frames,

                conflict_count=conflict_count,
                mean_conflict_count=mean_conflict_count,

                annotations=ComparisonReportAnnotationsSummary(
                    valid_count=valid_annotations_count,
                    missing_count=missing_annotations_count,
                    extra_count=extra_annotations_count,
                    total_count=total_annotations_count,
                    ds_count=ds_annotations_count,
                    gt_count=gt_annotations_count,
                    confusion_matrix=ConfusionMatrix(
                        labels=list(confusion_matrix_labels.values()),
                        rows=confusion_matrix,
                        precision=label_precisions,
                        recall=label_recalls,
                        accuracy=label_accuracies,
                    )
                ),

                annotation_components=ComparisonReportAnnotationComponentsSummary(
                    shape=ComparisonReportAnnotationShapeSummary(
                        valid_count=annotation_components.shape.valid_count,
                        missing_count=annotation_components.shape.missing_count,
                        extra_count=annotation_components.shape.extra_count,
                        total_count=annotation_components.shape.total_count,
                        ds_count=annotation_components.shape.ds_count,
                        gt_count=annotation_components.shape.gt_count,
                        mean_iou=np.mean(mean_ious),
                    ),
                    label=ComparisonReportAnnotationLabelSummary(
                        valid_count=annotation_components.label.valid_count,
                        invalid_count=annotation_components.label.invalid_count,
                        total_count=annotation_components.label.total_count,
                    ),
                ),
            ),

            dataset_summary=ComparisonReportDatasetSummary(
                frame_count=len(self._ds_dataset),
                shape_count=full_ds_comparable_shapes_count,
            ),

            frame_results=self._frame_results
        )


class QueueJobManager:
    TASK_QUALITY_CHECK_JOB_DELAY = timedelta(seconds=5) # TODO: 1h
    _QUEUE_JOB_PREFIX = "update-quality-metrics-task-"

    def _get_scheduler(self):
        return django_rq.get_scheduler(settings.CVAT_QUEUES.QUALITY_REPORTS.value)

    def _make_initial_queue_job_id(self, task: models.Task) -> str:
        return f'{self._QUEUE_JOB_PREFIX}{task.id}-initial'

    def _make_regular_queue_job_id(self, task: models.Task, start_time: timezone.datetime) -> str:
        return f'{self._QUEUE_JOB_PREFIX}{task.id}-{start_time.timestamp()}'

    @classmethod
    def _get_last_report_time(cls, task: models.Task) -> Optional[timezone.datetime]:
        report = models.QualityReport.objects.filter(task=task).order_by('-created_date').first()
        if report:
            return report.created_date
        return None

    def schedule_quality_check_job(self, task: models.Task):
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
        else:
            # TODO: fix enqueuing if the job is just scheduled
            # Ensure there is an updating job in the queue
            next_update_time = last_update_time + self.TASK_QUALITY_CHECK_JOB_DELAY
            queue_job_id = self._make_regular_queue_job_id(task, next_update_time)

        scheduler = self._get_scheduler()
        if queue_job_id not in scheduler:
            scheduler.enqueue_at(
                task.updated_date + self.TASK_QUALITY_CHECK_JOB_DELAY,
                self._update_task_quality_metrics,
                task_id=task.id,
                job_id=queue_job_id,
            )

    @classmethod
    def _update_task_quality_metrics(cls, *, task_id: int):
        with transaction.atomic():
            # The task could have been deleted during scheduling
            try:
                task = models.Task.objects.prefetch_related('segment_set__job_set').get(id=task_id)
            except models.Task.DoesNotExist:
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

            jobs: List[models.Job] = [
                s.job_set.first()
                for s in task.segment_set.filter(job__type=models.JobType.NORMAL).all()
            ]
            job_data_providers = { job.id: JobDataProvider(job.id) for job in jobs }

        job_comparison_reports: Dict[int, ComparisonReport] = {}
        for job in jobs:
            job_data_provider = job_data_providers[job.id]
            comparator = _DatasetComparator(job_data_provider, gt_job_data_provider)
            job_comparison_reports[job.id] = comparator.generate_report()

        # The task dataset can be different from any jobs' dataset because of frame overlaps
        # between jobs, from which annotations are merged to get the task annotations.
        # Thus, a separate report could be computed for the task. Instead, here we only
        # compute combined summary for job reports.
        task_intersection_frames = set()
        task_conflicts = []
        task_shapes_count = 0
        task_annotations_summary = None
        task_ann_components_summary = None
        task_mean_shape_ious = []
        for r in job_comparison_reports.values():
            task_intersection_frames.update(r.comparison_summary.frames)
            task_conflicts.extend(r.conflicts)
            task_shapes_count += r.dataset_summary.shape_count

            if task_annotations_summary:
                task_annotations_summary.accumulate(r.comparison_summary.annotations)
            else:
                task_annotations_summary = deepcopy(r.comparison_summary.annotations)

            if task_ann_components_summary:
                task_ann_components_summary.accumulate(r.comparison_summary.annotation_components)
            else:
                task_ann_components_summary = deepcopy(r.comparison_summary.annotation_components)
            task_mean_shape_ious.append(task_ann_components_summary.shape.mean_iou)

        task_ann_components_summary.shape.mean_iou = np.mean(task_mean_shape_ious)

        task_report_data = ComparisonReport(
            parameters=next(iter(job_comparison_reports.values())).parameters,

            comparison_summary=ComparisonReportComparisonSummary(
                frame_share_percent=len(task_intersection_frames) / (task.data.size or 1),
                frames=sorted(task_intersection_frames),

                conflict_count=len(task_conflicts),
                mean_conflict_count=len(task_conflicts) / (task.data.size or 1),

                annotations=task_annotations_summary,
                annotation_components=task_ann_components_summary,
            ),

            dataset_summary=ComparisonReportDatasetSummary(
                frame_count=task.data.size,
                shape_count=task_shapes_count
            ),

            frame_results={},
        )

        with transaction.atomic():
            # The task could have been deleted during processing
            try:
                models.Task.objects.get(id=task_id)
            except models.Task.DoesNotExist:
                return

            last_report_time = cls._get_last_report_time(task)
            if (last_report_time
                and timezone.now() < last_report_time + cls.TASK_QUALITY_CHECK_JOB_DELAY
            ):
                # Discard this report as it has probably been computed in parallel
                # with another one
                return

            job_quality_reports = {}
            for job in jobs:
                job_comparison_report = job_comparison_reports[job.id]
                job_report = cls._save_report(
                    job=job,
                    target_last_updated=job.updated_date,
                    gt_last_updated=gt_job.updated_date,
                    data=job_comparison_report.to_json(),
                    conflicts=[c.to_dict() for c in job_comparison_report.conflicts],
                )

                job_quality_reports[job.id] = job_report

            cls._save_report(
                task=task,
                target_last_updated=task.updated_date,
                gt_last_updated=gt_job.updated_date,
                data=task_report_data.to_json(),
                conflicts=[], # the task doesn't have own conflicts
                children=list(job_quality_reports.values()),
            )

    @classmethod
    def _save_report(cls, **params) -> models.QualityReport:
        conflicts = params.pop('conflicts')
        children = params.pop('children', [])

        db_report = models.QualityReport(**params)
        db_report.save()

        for conflict in conflicts:
            db_conflict = db_report.conflicts.create(
                type=conflict['type'],
                frame=conflict['frame_id'],
            )

            for ann_id in conflict['annotation_ids']:
                db_ann_id = db_conflict.annotation_ids.create(
                    job_id=ann_id['job_id'],
                    obj_id=ann_id['obj_id'],
                    type=ann_id['type'],
                )
                db_ann_id.full_clean()

            db_conflict.full_clean()

        db_report.full_clean()

        for child in children:
            db_report.children.add(child)

        return db_report
