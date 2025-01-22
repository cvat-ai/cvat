# Copyright (C) 2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import itertools
from abc import ABCMeta, abstractmethod
from collections.abc import Collection
from typing import Callable, Iterable, Optional, Sequence, Union

import attrs
import datumaro as dm
import numpy as np
from attrs import define, field
from datumaro.components.annotation import AnnotationType
from datumaro.components.errors import FailedLabelVotingError
from datumaro.util.annotation_util import find_instances, max_bbox, mean_bbox
from datumaro.util.attrs_util import ensure_cls

from cvat.apps.engine.models import Label
from cvat.apps.quality_control.quality_reports import (
    ComparisonParameters,
    DistanceComparator,
    KeypointsMatcher,
)
from cvat.apps.quality_control.quality_reports import LineMatcher as LineMatcherQualityReports
from cvat.apps.quality_control.quality_reports import match_segments, oks, segment_iou, to_rle


@define(kw_only=True, slots=False)
class IntersectMerge(dm.ops.IntersectMerge):
    @define(kw_only=True, slots=False)
    class Conf:
        pairwise_dist: float = 0.5
        sigma: float = 0.1

        output_conf_thresh: float = 0
        quorum: int = 1
        ignored_attributes: Collection[str] = field(factory=tuple)
        torso_r: float = 0.01

        groups: Collection[Collection[str]] = field(factory=tuple)
        close_distance: float = 0.75

        included_annotation_types: Collection[dm.AnnotationType] = None

        def __attrs_post_init__(self):
            if self.included_annotation_types is None:
                self.included_annotation_types = ComparisonParameters.included_annotation_types

    conf = field(converter=ensure_cls(Conf), factory=Conf)

    dataset_mean_consensus_score: dict[int, float] = field(
        init=False
    )  # id(dataset) -> mean consensus score

    def __call__(self, datasets):
        self.dataset_mean_consensus_score = {id(d): [] for d in datasets}

        merged = super().__call__(datasets)

        for item in merged:
            merged.put(
                item.wrap(
                    annotations=[
                        a.wrap(attributes=dict(**a.attributes, source="consensus"))
                        for a in item.annotations
                    ]
                )
            )

        # now we have consensus score for all annotations in the input datasets
        for dataset_id in self.dataset_mean_consensus_score:
            self.dataset_mean_consensus_score[dataset_id] = np.mean(
                self.dataset_mean_consensus_score[dataset_id]
            )

        return merged

    def get_ann_dataset_id(self, ann_id: int) -> int:
        return self._dataset_map[self.get_ann_source(ann_id)][1]

    def get_item_media_dims(self, ann_id: int) -> tuple[int, int]:
        return self._item_map[self._ann_map[ann_id][1]][0].image.size

    def get_label_id(self, label):
        return self._get_label_id(label)

    def get_src_label_name(self, ann, label_id):
        return self._get_src_label_name(ann, label_id)

    def get_dataset_source_id(self, dataset_id: int):
        return self._dataset_map[dataset_id][1]

    def dataset_count(self) -> int:
        return len(self._dataset_map)

    def _make_mergers(self, sources):
        def _make(c, **kwargs):
            kwargs.update(attrs.asdict(self.conf))
            fields = attrs.fields_dict(c)
            return c(**{k: v for k, v in kwargs.items() if k in fields}, context=self)

        def _for_type(t: AnnotationType, **kwargs) -> AnnotationMatcher:
            if t is AnnotationType.label:
                return _make(LabelMerger, **kwargs)
            elif t is AnnotationType.bbox:
                return _make(BboxMerger, **kwargs)
            elif t is AnnotationType.mask:
                return _make(MaskMerger, **kwargs)
            elif t is AnnotationType.polygon or t is AnnotationType.mask:
                return _make(PolygonMerger, **kwargs)
            elif t is AnnotationType.polyline:
                return _make(LineMerger, **kwargs)
            elif t is AnnotationType.points:
                return _make(PointsMerger, **kwargs)
            elif t is AnnotationType.skeleton:
                return _make(SkeletonMerger, **kwargs)
            else:
                raise AssertionError(f"Annotation type {t} is not supported")

        instance_map = {}
        for s in sources:
            s_instances = find_instances(s)
            for inst in s_instances:
                inst_bbox = max_bbox(
                    [
                        a
                        for a in inst
                        if a.type
                        in {
                            AnnotationType.polygon,
                            AnnotationType.mask,
                            AnnotationType.bbox,
                        }
                    ]
                )
                for ann in inst:
                    instance_map[id(ann)] = [inst, inst_bbox]

        self._mergers = {
            t: _for_type(t, instance_map=instance_map, categories=self._categories)
            for t in self.conf.included_annotation_types
        }

    def get_any_label_name(self, ann: dm.Annotation, label_id: int) -> str:
        return self._get_any_label_name(ann, label_id)


@define(kw_only=True, slots=False)
class AnnotationMatcher(metaclass=ABCMeta):
    _context: IntersectMerge

    @abstractmethod
    def match_annotations(
        self, sources: Sequence[Sequence[dm.Annotation]]
    ) -> Sequence[Sequence[dm.Annotation]]:
        "Matches annotations from different sources and produces annotation groups"

    @abstractmethod
    def distance(self, a: dm.Annotation, b: dm.Annotation) -> float:
        """
        Computes distance (actually similarity) between 2 annotations.
        The output value is in the range [0; 1].

        distance(a, b) == 0 => annotations are different

        distance(a, b) == 1 => annotations are same
        """


@define(kw_only=True, slots=False)
class LabelMatcher(AnnotationMatcher):
    def distance(self, a: dm.Label, b: dm.Label) -> bool:
        a_label = self._context.get_any_label_name(a, a.label)
        b_label = self._context.get_any_label_name(b, b.label)
        return a_label == b_label

    def match_annotations(self, sources):
        return [sum(sources, [])]


CacheKey = tuple[int, int]
SimilarityFunction = Callable[[dm.Annotation, dm.Annotation], float]


@define
class CachedSimilarityFunction:
    sim_fn: SimilarityFunction
    cache: dict[CacheKey, float] = field(factory=dict, kw_only=True)

    def __call__(self, a_ann: dm.Annotation, b_ann: dm.Annotation) -> float:
        a_ann_id = id(a_ann)
        b_ann_id = id(b_ann)

        if a_ann_id == b_ann_id:
            return 1

        key = (
            a_ann_id,
            b_ann_id,
        )  # make sure the annotations have stable ids before calling this
        key = self._sort_key(key)
        cached_value = self.cache.get(key)

        if cached_value is None:
            cached_value = self.sim_fn(a_ann, b_ann)
            self.cache[key] = cached_value

        return cached_value

    @staticmethod
    def _sort_key(key: CacheKey) -> CacheKey:
        return tuple(sorted(key))

    def pop(self, key: CacheKey) -> float:
        return self.cache.pop(self._sort_key(key), None)

    def set(self, key: CacheKey, value: float):
        self.cache[self._sort_key(key)] = value

    def keys(self) -> Iterable[CacheKey]:
        return self.cache.keys()

    def clear_cache(self):
        self.cache.clear()


@define(kw_only=True, slots=False)
class ShapeMatcher(AnnotationMatcher, metaclass=ABCMeta):
    pairwise_dist: float = 0.9
    cluster_dist: float = -1.0
    categories: dm.CategoriesInfo
    _distance_comparator: DistanceComparator = field(init=False)
    _distance: CachedSimilarityFunction = field(init=False)

    def __attrs_post_init__(self):
        self._distance_comparator = DistanceComparator(
            categories=self.categories,
            iou_threshold=self._context.conf.pairwise_dist,
            oks_sigma=self._context.conf.sigma,
            line_torso_radius=self._context.conf.torso_r,
        )

        self._distance = CachedSimilarityFunction(self._distance_func)

    def _distance_func(self, item_a: dm.DatasetItem, item_b: dm.DatasetItem) -> float:
        return dm.ops.segment_iou(item_a, item_b)

    def distance(self, a, b):
        return self._distance(a, b)

    def label_matcher(self, a: dm.Annotation, b: dm.Annotation) -> bool:
        a_label = self._context.get_any_label_name(a, a.label)
        b_label = self._context.get_any_label_name(b, b.label)
        return a_label == b_label

    @staticmethod
    def _get_ann_type(t, annotations: Sequence[dm.Annotation]) -> Sequence[dm.Annotation]:
        return [a for a in annotations if a.type == t and not a.attributes.get("outside", False)]

    def _match_segments(
        self,
        t,
        item_a: list[dm.Annotation],
        item_b: list[dm.Annotation],
        *,
        distance: SimilarityFunction | None = None,
        label_matcher: Callable[[dm.Annotation, dm.Annotation], bool] | None = None,
        a_objs: Sequence[dm.Annotation] | None = None,
        b_objs: Sequence[dm.Annotation] | None = None,
        dist_thresh: float | None = None,
    ):
        if distance is None:
            distance = self.distance

        if label_matcher is None:
            label_matcher = self.label_matcher

        if dist_thresh is None:
            dist_thresh = self.pairwise_dist

        item_a = dm.DatasetItem(id=1, annotations=item_a)
        item_b = dm.DatasetItem(id=2, annotations=item_b)
        return self._distance_comparator.match_segments(
            t=t,
            item_a=item_a,
            item_b=item_b,
            distance=distance,
            label_matcher=label_matcher,
            a_objs=a_objs,
            b_objs=b_objs,
            dist_thresh=dist_thresh,
        )

    @abstractmethod
    def match_annotations_two_sources(
        self, source_a: list[dm.Annotation], source_b: list[dm.Annotation]
    ) -> list[dm.Annotation]: ...

    def match_annotations(self, sources):
        distance = self.distance
        pairwise_dist = self.pairwise_dist
        cluster_dist = self.cluster_dist

        if cluster_dist < 0:
            cluster_dist = pairwise_dist

        id_segm = {id(a): (a, id(s)) for s in sources for a in s}

        def _is_close_enough(cluster, extra_id):
            # check if whole cluster IoU will not be broken
            # when this segment is added
            b = id_segm[extra_id][0]
            for a_id in cluster:
                a = id_segm[a_id][0]
                if distance(a, b) < cluster_dist:
                    return False
            return True

        def _has_same_source(cluster, extra_id):
            b = id_segm[extra_id][1]
            for a_id in cluster:
                a = id_segm[a_id][1]
                if a == b:
                    return True
            return False

        # match segments in sources, pairwise
        adjacent = {i: [] for i in id_segm}  # id(sgm) -> [id(adj_sgm1), ...]
        for a_idx, src_a in enumerate(sources):
            # matches further sources of same frame for matching annotations
            for src_b in sources[a_idx + 1 :]:
                # an annotation can be adjacent to multiple annotations
                matches = self.match_annotations_two_sources(src_a, src_b)
                for a, b in matches:
                    adjacent[id(a)].append(id(b))

        # join all segments into matching clusters
        clusters = []
        visited = set()
        for cluster_idx in adjacent:
            if cluster_idx in visited:
                continue

            cluster = set()
            to_visit = {cluster_idx}
            while to_visit:
                c = to_visit.pop()
                cluster.add(c)
                visited.add(c)

                for i in adjacent[c]:
                    if i in visited:
                        continue

                    if _has_same_source(cluster, i):
                        continue

                    if 0 < cluster_dist and not _is_close_enough(cluster, i):
                        # if positive, cluster_dist and this annotation isn't close enough
                        # with other annotations in the cluster
                        continue

                    to_visit.add(i)  # check annotations adjacent to the new one in the cluster

            clusters.append([id_segm[i][0] for i in cluster])

        return clusters


@define(kw_only=True, slots=False)
class BboxMatcher(ShapeMatcher):
    def _distance_func(self, a: dm.Bbox, b: dm.Bbox):
        def _bbox_iou(a: dm.Bbox, b: dm.Bbox, *, img_w: int, img_h: int) -> float:
            if a.attributes.get("rotation", 0) == b.attributes.get("rotation", 0):
                return dm.ops.bbox_iou(a, b)
            else:
                return segment_iou(
                    self._distance_comparator.to_polygon(a),
                    self._distance_comparator.to_polygon(b),
                    img_h=img_h,
                    img_w=img_w,
                )

        img_h, img_w = self._context.get_item_media_dims(id(a))
        return _bbox_iou(a, b, img_h=img_h, img_w=img_w)

    def match_annotations_two_sources(self, source_a: list[dm.Bbox], source_b: list[dm.Bbox]):
        return self._match_segments(dm.AnnotationType.bbox, source_a, source_b)[0]


@define(kw_only=True, slots=False)
class PolygonMatcher(ShapeMatcher):
    def _distance_func(self, a: dm.Polygon | dm.Mask, b: dm.Polygon | dm.Mask):
        from pycocotools import mask as mask_utils

        def _get_segment(item):
            img_h, img_w = self._context.get_item_media_dims(id(item))
            object_rle_groups = [to_rle(item, img_h=img_h, img_w=img_w)]
            rle = mask_utils.merge(list(itertools.chain.from_iterable(object_rle_groups)))
            return rle

        a_segm = _get_segment(a)
        b_segm = _get_segment(b)
        return float(mask_utils.iou([b_segm], [a_segm], [0])[0])

    def match_annotations_two_sources(
        self, item_a: list[Union[dm.Polygon, dm.Mask]], item_b: list[Union[dm.Polygon, dm.Mask]]
    ):
        def _get_segments(annotations):
            return self._get_ann_type(dm.AnnotationType.polygon, annotations) + self._get_ann_type(
                dm.AnnotationType.mask, annotations
            )

        img_h, img_w = self._context.get_item_media_dims(id(item_a[0]))

        def _find_instances(annotations):
            # Group instance annotations by label.
            # Annotations with the same label and group will be merged,
            # and considered item_a single object in comparison
            instances = []
            instance_map = {}  # ann id -> instance id
            for ann_group in dm.ops.find_instances(annotations):
                ann_group = sorted(ann_group, key=lambda a: a.label)
                for _, label_group in itertools.groupby(ann_group, key=lambda a: a.label):
                    label_group = list(label_group)
                    instance_id = len(instances)
                    instances.append(label_group)
                    for ann in label_group:
                        instance_map[id(ann)] = instance_id

            return instances, instance_map

        a_instances, _ = _find_instances(_get_segments(item_a))
        b_instances, _ = _find_instances(_get_segments(item_b))

        a_compiled_mask = None
        b_compiled_mask = None

        segment_cache = {}

        def _get_segment(
            obj_id: int, *, compiled_mask: Optional[dm.CompiledMask] = None, instances
        ):
            key = (id(instances), obj_id)
            rle = segment_cache.get(key)

            if rle is None:
                from pycocotools import mask as mask_utils

                if compiled_mask is not None:
                    mask = compiled_mask.extract(obj_id + 1)

                    rle = mask_utils.encode(mask)
                else:
                    # Create merged RLE for the instance shapes
                    object_anns = instances[obj_id]
                    object_rle_groups = [
                        to_rle(ann, img_h=img_h, img_w=img_w) for ann in object_anns
                    ]
                    rle = mask_utils.merge(list(itertools.chain.from_iterable(object_rle_groups)))

                segment_cache[key] = rle

            return rle

        def _segment_comparator(a_inst_id: int, b_inst_id: int) -> float:
            a_segm = _get_segment(a_inst_id, compiled_mask=a_compiled_mask, instances=a_instances)
            b_segm = _get_segment(b_inst_id, compiled_mask=b_compiled_mask, instances=b_instances)

            from pycocotools import mask as mask_utils

            return float(mask_utils.iou([b_segm], [a_segm], [0])[0])

        def _label_matcher(a_inst_id: int, b_inst_id: int) -> bool:
            # labels are the same in the instance annotations
            # instances are required to have the same labels in all shapes
            a = a_instances[a_inst_id][0]
            b = b_instances[b_inst_id][0]
            return a.label == b.label

        results = self._match_segments(
            dm.AnnotationType.polygon,
            item_a,
            item_b,
            a_objs=range(len(a_instances)),
            b_objs=range(len(b_instances)),
            distance=_segment_comparator,
            label_matcher=_label_matcher,
        )

        # restore results for original annotations
        matched = results[0]

        # i_x ~ instance idx in _x
        # ia_x ~ instance annotation in _x
        matched = [
            (ia_a, ia_b)
            for (i_a, i_b) in matched
            for (ia_a, ia_b) in itertools.product(a_instances[i_a], b_instances[i_b])
        ]

        return matched


@define(kw_only=True, slots=False)
class MaskMatcher(PolygonMatcher):
    pass


@define(kw_only=True, slots=False)
class PointsMatcher(ShapeMatcher):
    sigma: Optional[list] = field(default=None)
    instance_map = field(converter=dict)

    def _distance_func(self, a, b):
        for instance_group in [[a], [b]]:
            instance_bbox = self._distance_comparator.instance_bbox(instance_group)

            for ann in instance_group:
                if ann.type == dm.AnnotationType.points:
                    self.instance_map[id(ann)] = [instance_group, instance_bbox]

        img_h, img_w = self._context.get_item_media_dims(id(a))
        a_bbox = self.instance_map[id(a)][1]
        b_bbox = self.instance_map[id(b)][1]
        a_area = a_bbox[2] * a_bbox[3]
        b_area = b_bbox[2] * b_bbox[3]

        if a_area == 0 and b_area == 0:
            # Simple case: singular points without bbox
            # match them in the image space
            return oks(a, b, sigma=self.sigma, scale=img_h * img_w)

        else:
            # Complex case: multiple points, grouped points, points with item_a bbox
            # Try to align points and then return the metric
            # match them in their bbox space

            if dm.ops.bbox_iou(a_bbox, b_bbox) <= 0:
                return 0

            bbox = dm.ops.mean_bbox([a_bbox, b_bbox])
            scale = bbox[2] * bbox[3]

            a_points = np.reshape(a.points, (-1, 2))
            b_points = np.reshape(b.points, (-1, 2))

            matches, mismatches, a_extra, b_extra = match_segments(
                range(len(a_points)),
                range(len(b_points)),
                distance=lambda ai, bi: oks(
                    dm.Points(a_points[ai]),
                    dm.Points(b_points[bi]),
                    sigma=self.sigma,
                    scale=scale,
                ),
                dist_thresh=self._distance_comparator.iou_threshold,
                label_matcher=lambda ai, bi: True,
            )

            # the exact array is determined by the label matcher
            # all the points will have the same match status,
            # because there is only 1 shared label for all the points
            matched_points = matches + mismatches

            a_sorting_indices = [ai for ai, _ in matched_points]
            a_points = a_points[a_sorting_indices]

            b_sorting_indices = [bi for _, bi in matched_points]
            b_points = b_points[b_sorting_indices]

            # Compute oks for 2 groups of points, matching points aligned
            dists = np.linalg.norm(a_points - b_points, axis=1)
            return np.sum(np.exp(-(dists**2) / (2 * scale * (2 * self.sigma) ** 2))) / (
                len(matched_points) + len(a_extra) + len(b_extra)
            )

    def match_annotations_two_sources(self, item_a: list[dm.Points], item_b: list[dm.Points]):
        a_points = self._get_ann_type(dm.AnnotationType.points, item_a)
        b_points = self._get_ann_type(dm.AnnotationType.points, item_b)

        return self._match_segments(
            dm.AnnotationType.points,
            item_a,
            item_b,
            a_objs=a_points,
            b_objs=b_points,
            distance=self.distance,
        )[0]


@define(kw_only=True, slots=False)
class SkeletonMatcher(ShapeMatcher):
    return_distances: bool = True
    sigma: float = 0.1
    instance_map = field(factory=dict)
    skeleton_map = field(factory=dict)

    def _distance_func(self, a, b):
        matcher = KeypointsMatcher(instance_map=self.instance_map, sigma=self.sigma)
        if isinstance(a, dm.Skeleton) and isinstance(b, dm.Skeleton):
            return self.distance(a, b)
        return matcher.distance(a, b)

    def match_annotations_two_sources(
        self, a_skeletons: list[dm.Skeleton], b_skeletons: list[dm.Skeleton]
    ):
        if not a_skeletons and not b_skeletons:
            return []

        # Convert skeletons to point lists for comparison
        # This is required to compute correct per-instance distance
        # It is assumed that labels are the same in the datasets
        skeleton_infos = {}
        points_map = {}
        a_points = []
        b_points = []
        for source, source_points in [(a_skeletons, a_points), (b_skeletons, b_points)]:
            for skeleton in source:
                skeleton_info = skeleton_infos.setdefault(
                    skeleton.label, self._distance_comparator._get_skeleton_info(skeleton.label)
                )

                # Merge skeleton points into item_a single list
                # The list is ordered by skeleton_info
                skeleton_points = [
                    next((p for p in skeleton.elements if p.label == sub_label), None)
                    for sub_label in skeleton_info
                ]

                # Build item_a single Points object for further comparisons
                merged_points = dm.Points()
                merged_points.points = np.ravel(
                    [p.points if p else [0, 0] for p in skeleton_points]
                )
                merged_points.visibility = np.ravel(
                    [p.visibility if p else [dm.Points.Visibility.absent] for p in skeleton_points]
                )
                merged_points.label = skeleton.label
                # no per-point attributes currently in CVAT

                if all(v == dm.Points.Visibility.absent for v in merged_points.visibility):
                    # The whole skeleton is outside, exclude it
                    self.skeleton_map[id(skeleton)] = None
                    continue

                points_map[id(merged_points)] = skeleton
                self.skeleton_map[id(skeleton)] = merged_points
                source_points.append(merged_points)

        for source in [a_skeletons, b_skeletons]:
            for instance_group in dm.ops.find_instances(source):
                instance_bbox = self._distance_comparator.instance_bbox(instance_group)

                instance_group = [
                    self.skeleton_map[id(a)] if isinstance(a, dm.Skeleton) else a
                    for a in instance_group
                    if not isinstance(a, dm.Skeleton) or self.skeleton_map[id(a)] is not None
                ]
                for ann in instance_group:
                    self.instance_map[id(ann)] = [instance_group, instance_bbox]

        results = self._match_segments(
            dm.AnnotationType.points,
            a_skeletons,
            b_skeletons,
            a_objs=a_points,
            b_objs=b_points,
            distance=self.distance,
        )

        # Map points back to skeletons
        if self.return_distances:
            distances = self._distance
            for p_a_id, p_b_id in distances.keys():
                if p_a_id in points_map and p_b_id in points_map:
                    dist = distances.pop((p_a_id, p_b_id))
                    distances.set((id(points_map[p_a_id]), id(points_map[p_b_id])), dist)

        return [(points_map[id(p_a)], points_map[id(p_b)]) for (p_a, p_b) in results[0]]


@define(kw_only=True, slots=False)
class LineMatcher(ShapeMatcher):
    def _distance_func(self, item_a, item_b):
        img_h, img_w = self._context.get_item_media_dims(id(item_a))
        matcher = LineMatcherQualityReports(
            torso_r=self._distance_comparator.line_torso_radius,
            scale=np.prod([img_h, img_w]),
        )
        return matcher.distance(item_a, item_b)

    def match_annotations_two_sources(self, item_a: list[dm.PolyLine], item_b: list[dm.PolyLine]):
        return self._match_segments(
            dm.AnnotationType.polyline, item_a, item_b, distance=self.distance
        )[0]


@define(kw_only=True, slots=False)
class AnnotationMerger(AnnotationMatcher, metaclass=ABCMeta):
    @abstractmethod
    def merge_clusters(
        self, clusters: Sequence[Sequence[dm.Annotation]]
    ) -> Sequence[dm.Annotation]:
        "Merges annotations in each cluster into a single annotation"


@define(kw_only=True, slots=False)
class LabelMerger(AnnotationMerger, LabelMatcher):
    quorum: int = 0

    def merge_clusters(self, clusters):
        assert len(clusters) <= 1
        if len(clusters) == 0:
            return []

        votes = {}  # label -> score
        for ann in clusters[0]:
            label = self._context.get_src_label_name(ann, ann.label)
            votes[label] = 1 + votes.get(label, 0)

        merged = []
        for label, count in votes.items():
            if count < self.quorum:
                sources = set(
                    self._context.get_ann_source(id(a))
                    for a in clusters[0]
                    if label not in [self._context.get_src_label_name(l, l.label) for l in a]
                )
                sources = [self._context.get_dataset_source_id(s) for s in sources]
                self._context.add_item_error(FailedLabelVotingError, votes, sources=sources)
                continue

            merged.append(
                Label(
                    self._context.get_label_id(label),
                    attributes={"score": count / self._context.dataset_count()},
                )
            )

        return merged


@define(kw_only=True, slots=False)
class ShapeMerger(AnnotationMerger, ShapeMatcher):
    quorum = field(converter=int, default=0)

    def merge_clusters(self, clusters):
        return list(filter(lambda x: x is not None, map(self.merge_cluster, clusters)))

    def find_cluster_label(self, cluster: Sequence[dm.Annotation]) -> tuple[int, float]:
        votes = {}
        for s in cluster:
            label = self._context.get_src_label_name(s, s.label)
            state = votes.setdefault(label, [0, 0])
            state[0] += s.attributes.get("score", 1.0)
            state[1] += 1

        label, (score, count) = max(votes.items(), key=lambda e: e[1][0])
        if count < self.quorum:
            self._context.add_item_error(FailedLabelVotingError, votes)
            label = None
        score = score / self._context.dataset_count()
        label = self._context.get_label_id(label)
        return label, score

    def _merge_cluster_shape_mean_box_nearest(self, cluster):
        mbbox = dm.Bbox(*mean_bbox(cluster))
        a = cluster[0]
        img_h, img_w = self._context.get_item_media_dims(id(a))
        dist = []
        for s in cluster:
            if isinstance(s, dm.Points) or isinstance(s, dm.PolyLine):
                s = self._distance_comparator.to_polygon(dm.Bbox(*s.get_bbox()))
            elif isinstance(s, dm.Bbox):
                s = self._distance_comparator.to_polygon(s)
            dist.append(
                segment_iou(
                    self._distance_comparator.to_polygon(mbbox), s, img_h=img_h, img_w=img_w
                )
            )
        nearest_pos, _ = max(enumerate(dist), key=lambda e: e[1])
        return cluster[nearest_pos]

    def merge_cluster_shape(self, cluster: Sequence[dm.Annotation]) -> tuple[dm.Annotation, float]:
        shape = self._merge_cluster_shape_mean_box_nearest(cluster)
        for ann in cluster:
            dataset_id = self._context.get_ann_source(id(ann))
            self._context.dataset_mean_consensus_score.setdefault(dataset_id, []).append(
                max(0, self.distance(ann, shape))
            )
        shape_score = sum(max(0, self.distance(shape, s)) for s in cluster) / len(cluster)
        return shape, shape_score

    def merge_cluster(self, cluster):
        label, label_score = self.find_cluster_label(cluster)

        # when the merged annotation is rejected due to quorum constraint
        if label is None:
            return None

        shape, shape_score = self.merge_cluster_shape(cluster)
        shape.z_order = max(cluster, key=lambda a: a.z_order).z_order
        shape.label = label
        shape.attributes["score"] = label_score * shape_score

        return shape


@define(kw_only=True, slots=False)
class BboxMerger(ShapeMerger, BboxMatcher):
    pass


@define(kw_only=True, slots=False)
class PolygonMerger(ShapeMerger, PolygonMatcher):
    pass


@define(kw_only=True, slots=False)
class MaskMerger(ShapeMerger, MaskMatcher):
    pass


@define(kw_only=True, slots=False)
class PointsMerger(ShapeMerger, PointsMatcher):
    pass


@define(kw_only=True, slots=False)
class LineMerger(ShapeMerger, LineMatcher):
    pass


@define(kw_only=True, slots=False)
class SkeletonMerger(ShapeMerger, SkeletonMatcher):
    def _merge_cluster_shape_nearest(self, cluster):
        dist = {}
        for idx, skeleton1 in enumerate(cluster):
            skeleton_distance = 0
            for skeleton2 in cluster:
                skeleton_distance += self.distance(skeleton1, skeleton2)

            dist[idx] = skeleton_distance / len(cluster)

        return cluster[min(dist, key=dist.get)]

    def merge_cluster_shape(self, cluster):
        shape = self._merge_cluster_shape_nearest(cluster)
        shape_score = sum(max(0, self.distance(shape, s)) for s in cluster) / len(cluster)
        return shape, shape_score
