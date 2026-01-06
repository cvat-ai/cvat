# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import itertools
from abc import ABCMeta, abstractmethod
from collections.abc import Collection, Iterable, Sequence
from typing import ClassVar, TypeAlias

import attrs
import datumaro as dm
import datumaro.components.merge.intersect_merge
from datumaro.components.errors import FailedLabelVotingError
from datumaro.util.annotation_util import mean_bbox
from datumaro.util.attrs_util import ensure_cls

from cvat.apps.quality_control.quality_reports import (
    ComparisonParameters,
    DistanceComparator,
    segment_iou,
)


@attrs.define(kw_only=True, slots=False)
class IntersectMerge(datumaro.components.merge.intersect_merge.IntersectMerge):
    @attrs.define(kw_only=True, slots=False)
    class Conf:
        pairwise_dist: float = 0.5
        sigma: float = 0.1

        output_conf_thresh: float = 0
        quorum: int = 1
        ignored_attributes: Collection[str] = attrs.field(factory=tuple)
        torso_r: float = 0.01

        groups: Collection[Collection[str]] = attrs.field(factory=tuple)
        close_distance: float = 0  # disabled

        included_annotation_types: Collection[dm.AnnotationType] = None

        def __attrs_post_init__(self):
            if self.included_annotation_types is None:
                self.included_annotation_types = ComparisonParameters.included_annotation_types

    conf: Conf = attrs.field(converter=ensure_cls(Conf), factory=Conf)

    def __call__(self, *datasets):
        return dm.Dataset(super().__call__(*datasets))

    def _find_cluster_attrs(self, cluster, ann):
        merged_attributes = super()._find_cluster_attrs(cluster, ann)
        merged_attributes["source"] = "consensus"
        return merged_attributes

    def _check_annotation_distance(self, t, merged_clusters):
        return  # disabled, need to clarify how to compare merged instances correctly

    def get_ann_dataset_id(self, ann_id: int) -> int:
        return self._dataset_map[self.get_ann_source(ann_id)][1]

    def get_ann_source_item(self, ann_id: int) -> dm.DatasetItem:
        return self._item_map[self._ann_map[ann_id][1]][0]

    def get_item_media_dims(self, ann_id: int) -> tuple[int, int]:
        return self.get_ann_source_item(ann_id).media_as(dm.Image).size

    def get_label_id(self, label: str) -> int:
        return self._get_label_id(label)

    def get_src_label_name(self, ann: dm.Annotation, label_id: int) -> str:
        return self._get_src_label_name(ann, label_id)

    def get_dataset_source_id(self, dataset_id: int) -> int:
        return self._dataset_map[dataset_id][1]

    def dataset_count(self) -> int:
        return len(self._dataset_map)

    def _make_mergers(self, sources):
        def _make(c, **kwargs):
            kwargs.update(attrs.asdict(self.conf))
            fields = attrs.fields_dict(c)
            return c(**{k: v for k, v in kwargs.items() if k in fields}, context=self)

        def _for_type(t: dm.AnnotationType, **kwargs) -> AnnotationMatcher:
            if t is dm.AnnotationType.label:
                return _make(LabelMerger, **kwargs)
            elif t is dm.AnnotationType.bbox:
                return _make(BboxMerger, **kwargs)
            elif t is dm.AnnotationType.mask:
                return _make(MaskMerger, **kwargs)
            elif t is dm.AnnotationType.polygon or t is dm.AnnotationType.mask:
                return _make(PolygonMerger, **kwargs)
            elif t is dm.AnnotationType.polyline:
                return _make(LineMerger, **kwargs)
            elif t is dm.AnnotationType.points:
                return _make(PointsMerger, **kwargs)
            elif t is dm.AnnotationType.skeleton:
                return _make(SkeletonMerger, **kwargs)
            elif t is dm.AnnotationType.ellipse:
                return _make(EllipseMerger, **kwargs)
            else:
                raise AssertionError(f"Annotation type {t} is not supported")

        self._mergers = {
            t: _for_type(t, categories=self._categories)
            for t in self.conf.included_annotation_types
        }


@attrs.define(kw_only=True, slots=False)
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


@attrs.define(kw_only=True, slots=False)
class LabelMatcher(AnnotationMatcher):
    def distance(self, a: dm.Label, b: dm.Label) -> bool:
        a_label = self._context.get_any_label_name(a, a.label)
        b_label = self._context.get_any_label_name(b, b.label)
        return a_label == b_label

    def match_annotations(self, sources):
        return [list(itertools.chain.from_iterable(sources))]


CacheKey: TypeAlias = tuple[int, int]


@attrs.define
class CachedSimilarityFunction:
    cache: dict[CacheKey, float] = attrs.field(factory=dict, kw_only=True)

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
        return self.cache[key]

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


@attrs.define(kw_only=True, slots=False)
class ShapeMatcher(AnnotationMatcher, metaclass=ABCMeta):
    pairwise_dist: float = 0.9
    cluster_dist: float | None = None
    categories: dm.CategoriesInfo
    _comparator: DistanceComparator = attrs.field(init=False)
    _distance: CachedSimilarityFunction = attrs.field(init=False)

    def __attrs_post_init__(self):
        if self.cluster_dist is None:
            self.cluster_dist = self.pairwise_dist

        self._comparator = DistanceComparator(
            categories=self.categories,
            return_distances=True,
            iou_threshold=self.pairwise_dist,
            oks_sigma=self._context.conf.sigma,
            line_torso_radius=self._context.conf.torso_r,
            panoptic_comparison=False,
            # allow_groups=True is not supported. Requires significant logic changes in
            # the whole merging algorithm, as it's likely to produce clusters with annotations
            # from the same source or some new annotations (instances).
            allow_groups=False,
        )

        self._distance = CachedSimilarityFunction()

    def distance(self, a, b):
        return self._distance(a, b)

    def _match_annotations_between_two_sources(
        self, source_a: list[dm.Annotation], source_b: list[dm.Annotation]
    ) -> list[tuple[dm.Annotation, dm.Annotation]]:
        if not source_a and not source_b:
            return []

        item_a = self._context.get_ann_source_item(id(source_a[0]))
        item_b = self._context.get_ann_source_item(id(source_b[0]))
        return self._match_annotations_between_two_items(item_a, item_b)

    def _match_annotations_between_two_items(
        self, item_a: dm.DatasetItem, item_b: dm.DatasetItem
    ) -> list[tuple[dm.Annotation, dm.Annotation]]:
        matches, distances = self.match_annotations_between_two_items(item_a, item_b)

        # Remember distances
        for (p_a_id, p_b_id), dist in distances.items():
            self._distance.set((p_a_id, p_b_id), dist)

        return matches

    @abstractmethod
    def match_annotations_between_two_items(
        self, item_a: dm.DatasetItem, item_b: dm.DatasetItem
    ) -> tuple[list[tuple[dm.Annotation, dm.Annotation]], dict[CacheKey, float]]: ...

    def match_annotations(self, sources):
        distance = self.distance
        cluster_dist = self.cluster_dist

        id_segm = {id(ann): (ann, id(source)) for source in sources for ann in source}

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
                matches = self._match_annotations_between_two_sources(src_a, src_b)
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


@attrs.define(kw_only=True, slots=False)
class BboxMatcher(ShapeMatcher):
    def match_annotations_between_two_items(self, item_a, item_b):
        matches, _, _, _, distances = self._comparator.match_boxes(item_a, item_b)
        return matches, distances


@attrs.define(kw_only=True, slots=False)
class PolygonMatcher(ShapeMatcher):
    _annotation_type: ClassVar[dm.AnnotationType] = dm.AnnotationType.polygon

    def match_annotations_between_two_items(self, item_a, item_b):
        item_a = item_a.wrap(
            annotations=[a for a in item_a.annotations if a.type == self._annotation_type]
        )
        item_b = item_b.wrap(
            annotations=[a for a in item_b.annotations if a.type == self._annotation_type]
        )
        matches, _, _, _, distances = self._comparator.match_segmentations(item_a, item_b)
        return matches, distances


@attrs.define(kw_only=True, slots=False)
class MaskMatcher(PolygonMatcher):
    _annotation_type: ClassVar[dm.AnnotationType] = dm.AnnotationType.mask


@attrs.define(kw_only=True, slots=False)
class PointsMatcher(ShapeMatcher):
    def match_annotations_between_two_items(self, item_a, item_b):
        matches, _, _, _, distances = self._comparator.match_points(item_a, item_b)
        return matches, distances


@attrs.define(kw_only=True, slots=False)
class SkeletonMatcher(ShapeMatcher):
    def match_annotations_between_two_items(self, item_a, item_b):
        matches, _, _, _, distances = self._comparator.match_skeletons(item_a, item_b)
        return matches, distances


@attrs.define(kw_only=True, slots=False)
class LineMatcher(ShapeMatcher):
    def match_annotations_between_two_items(self, item_a, item_b):
        matches, _, _, _, distances = self._comparator.match_lines(item_a, item_b)
        return matches, distances


@attrs.define(kw_only=True, slots=False)
class EllipseMatcher(ShapeMatcher):
    def match_annotations_between_two_items(self, item_a, item_b):
        matches, _, _, _, distances = self._comparator.match_ellipses(item_a, item_b)
        return matches, distances


@attrs.define(kw_only=True, slots=False)
class AnnotationMerger(AnnotationMatcher, metaclass=ABCMeta):
    @abstractmethod
    def merge_clusters(
        self, clusters: Sequence[Sequence[dm.Annotation]]
    ) -> Sequence[dm.Annotation]:
        "Merges annotations in each cluster into a single annotation"


@attrs.define(kw_only=True, slots=False)
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
                self._context.add_item_error(FailedLabelVotingError, {label: count})
                continue

            merged.append(
                dm.Label(
                    self._context.get_label_id(label),
                    attributes={"score": count / self._context.dataset_count()},
                )
            )

        return merged


@attrs.define(kw_only=True, slots=False)
class ShapeMerger(AnnotationMerger, ShapeMatcher):
    quorum = attrs.field(converter=int, default=0)

    def merge_clusters(self, clusters):
        return list(filter(lambda x: x is not None, map(self.merge_cluster, clusters)))

    def find_cluster_label(self, cluster: Sequence[dm.Annotation]) -> tuple[int | None, float]:
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
        else:
            label = self._context.get_label_id(label)

        score = score / self._context.dataset_count()
        return label, score

    def _merge_cluster_shape_mean_box_nearest(
        self, cluster: Sequence[dm.Annotation]
    ) -> dm.Annotation:
        mbbox = dm.Bbox(*mean_bbox(cluster))
        img_h, img_w = self._context.get_item_media_dims(id(cluster[0]))

        dist = []
        for s in cluster:
            if isinstance(s, (dm.Points, dm.PolyLine)):
                s = self._comparator.to_polygon(dm.Bbox(*s.get_bbox()))
            elif isinstance(s, (dm.Bbox, dm.Ellipse)):
                s = self._comparator.to_polygon(s)
            dist.append(
                segment_iou(self._comparator.to_polygon(mbbox), s, img_h=img_h, img_w=img_w)
            )
        nearest_pos, _ = max(enumerate(dist), key=lambda e: e[1])
        return cluster[nearest_pos]

    def merge_cluster_shape_mean_nearest(self, cluster: Sequence[dm.Annotation]) -> dm.Annotation:
        return self._merge_cluster_shape_mean_box_nearest(cluster)

    def merge_cluster_shape(self, cluster: Sequence[dm.Annotation]) -> tuple[dm.Annotation, float]:
        shape = self.merge_cluster_shape_mean_nearest(cluster)
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


@attrs.define(kw_only=True, slots=False)
class BboxMerger(ShapeMerger, BboxMatcher):
    pass


@attrs.define(kw_only=True, slots=False)
class PolygonMerger(ShapeMerger, PolygonMatcher):
    pass


@attrs.define(kw_only=True, slots=False)
class MaskMerger(ShapeMerger, MaskMatcher):
    pass


@attrs.define(kw_only=True, slots=False)
class PointsMerger(ShapeMerger, PointsMatcher):
    pass


@attrs.define(kw_only=True, slots=False)
class LineMerger(ShapeMerger, LineMatcher):
    pass


@attrs.define(kw_only=True, slots=False)
class EllipseMerger(ShapeMerger, EllipseMatcher):
    pass


@attrs.define(kw_only=True, slots=False)
class SkeletonMerger(ShapeMerger, SkeletonMatcher):
    def merge_cluster_shape_mean_nearest(self, cluster):
        dist = {}
        for idx, a in enumerate(cluster):
            a_cluster_distance = 0
            for b in cluster:
                # (1 - x) because it's actually a similarity function
                a_cluster_distance += 1 - self.distance(a, b)

            dist[idx] = a_cluster_distance / len(cluster)

        return cluster[min(dist, key=dist.get)]
