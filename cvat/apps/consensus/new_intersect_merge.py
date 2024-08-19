# Copyright (C) 2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import itertools
import logging as log
import math
from typing import Any, Callable, Dict, List, Optional, Sequence, Tuple, Union, cast

import attr
import datumaro as dm
import numpy as np
from attr import attrib, attrs
from datumaro.components.annotation import AnnotationType, Bbox
from datumaro.components.dataset import Dataset
from datumaro.components.errors import FailedLabelVotingError, NoMatchingItemError
from datumaro.components.operations import ExactMerge
from datumaro.components.operations import IntersectMerge as ClassicIntersectMerge
from datumaro.util.annotation_util import find_instances, max_bbox, mean_bbox
from datumaro.util.attrs_util import ensure_cls

from cvat.apps.engine.models import Label
from cvat.apps.quality_control.quality_reports import OKS, KeypointsMatcher
from cvat.apps.quality_control.quality_reports import LineMatcher as LineMatcherQualityReports
from cvat.apps.quality_control.quality_reports import match_segments, to_rle


def segment_iou(
    a: dm.Annotation,
    b: dm.Annotation,
    *,
    img_h: Union[int, None] = None,
    img_w: Union[int, None] = None,
) -> float:
    """
    Generic IoU computation with masks and polygons.
    Returns -1 if no intersection, [0; 1] otherwise
    """
    # Comparing to the dm version, this fixes the comparison for segments,
    # as the images size are required for correct decoding.
    # Boxes are not included, because they are not needed

    from pycocotools import mask as mask_utils

    is_bbox = AnnotationType.bbox in [a.type, b.type]

    if not is_bbox:
        assert img_h is not None and img_w is not None
        a = to_rle(a, img_h=img_h, img_w=img_w)
        b = to_rle(b, img_h=img_h, img_w=img_w)
    else:
        a = [list(a.get_bbox())]
        b = [list(b.get_bbox())]

    # Note that mask_utils.iou expects (dt, gt). Check this if the 3rd param is True
    return float(mask_utils.iou(b, a, [0]))


@attrs
class IntersectMerge(ClassicIntersectMerge):
    @attrs(repr_ns="IntersectMerge", kw_only=True)
    class Conf:
        pairwise_dist = attrib(converter=float, default=0.5)
        sigma = attrib(converter=float, factory=float)

        output_conf_thresh = attrib(converter=float, default=0)
        quorum = attrib(converter=int, default=0)
        ignored_attributes = attrib(converter=set, factory=set)

        def _groups_converter(value):
            result = []
            for group in value:
                rg = set()
                for label in group:
                    optional = label.endswith("?")
                    name = label if not optional else label[:-1]
                    rg.add((name, optional))
                result.append(rg)
            return result

        groups = attrib(converter=_groups_converter, factory=list)
        close_distance = attrib(converter=float, default=0.75)

    conf = attrib(converter=ensure_cls(Conf), factory=Conf)

    # Error trackers:
    errors = attrib(factory=list, init=False)

    def add_item_error(self, error, *args, **kwargs):
        self.errors.append(error(self._item_id, *args, **kwargs))

    # Indexes:
    _dataset_map = attrib(init=False)  # id(dataset) -> (dataset, index)
    _item_map = attrib(init=False)  # id(item) -> (item, id(dataset))
    _ann_map = attrib(init=False)  # id(ann) -> (ann, id(item))
    _item_id = attrib(init=False)
    _item = attrib(init=False)
    dataset_mean_consensus_score = attrib(init=False)  # id(dataset) -> mean consensus score: float

    # Misc.
    _categories = attrib(init=False)  # merged categories

    def __call__(self, datasets):
        self.errors = []
        self._categories = self._merge_categories([d.categories() for d in datasets])
        merged = Dataset(
            categories=self._categories,
            media_type=ExactMerge.merge_media_types(datasets),
        )

        self._check_groups_definition()

        item_matches, item_map = self.match_items(datasets)
        self.item_map = item_map
        self.dataset_mean_consensus_score = {id(d): [] for d in datasets}
        self.dataset_map = {id(d): (d, i) for i, d in enumerate(datasets)}
        self.ann_map = {}

        for item_id, items in item_matches.items():
            self._item_id = item_id

            if len(items) < len(datasets):
                missing_sources = set(id(s) for s in datasets) - set(items)
                missing_sources = [self._dataset_map[s][1] for s in missing_sources]
                self.add_item_error(NoMatchingItemError, sources=missing_sources)
            merged.put(self.merge_items(items))

        # now we have consensus score for all annotations in
        for dataset_id in self.dataset_mean_consensus_score:
            self.dataset_mean_consensus_score[dataset_id] = np.mean(
                self.dataset_mean_consensus_score[dataset_id]
            )

        return merged

    def get_ann_dataset_id(self, ann_id):
        return self._dataset_map[self.get_ann_source(ann_id)][1]

    def merge_items(self, items):
        self._item = next(iter(items.values()))

        # self.ann_map = {}  # id(annotation) -> (annotation, id(frame/item))
        sources = []  # [annotation of frame 0, frame 1, ...]
        for item in items.values():
            self._ann_map.update({id(a): (a, id(item)) for a in item.annotations})
            sources.append(item.annotations)
        log.debug(
            "Merging item %s: source annotations %s" % (self._item_id, list(map(len, sources)))
        )

        annotations = self.merge_annotations(sources)

        annotations = [
            a for a in annotations if self.conf.output_conf_thresh <= a.attributes.get("score", 1)
        ]

        return self._item.wrap(annotations=annotations)

    def _make_mergers(self, sources):
        def _make(c, **kwargs):
            kwargs.update(attr.asdict(self.conf))
            fields = attr.fields_dict(c)
            return c(**{k: v for k, v in kwargs.items() if k in fields}, context=self)

        def _for_type(t, **kwargs):
            if t is AnnotationType.label:
                return _make(LabelMerger, **kwargs)
            elif t is AnnotationType.bbox:
                return _make(BboxMerger, **kwargs)
            elif t is AnnotationType.mask:
                return _make(MaskMerger, **kwargs)
            elif t is AnnotationType.polygon or AnnotationType.mask:
                return _make(PolygonMerger, **kwargs)
            elif t is AnnotationType.polyline:
                return _make(LineMerger, **kwargs)
            elif t is AnnotationType.points:
                return _make(PointsMerger, **kwargs)
            elif t is AnnotationType.skeleton:
                return _make(SkeletonMerger, **kwargs)
            # else:
            # pass
            # raise NotImplementedError("Type %s is not supported" % t)

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
            for t in AnnotationType
        }


@attrs(kw_only=True)
class AnnotationMatcher:
    _context: Optional[IntersectMerge] = attrib(default=None)

    def match_annotations(self, sources):
        raise NotImplementedError()


@attrs
class LabelMatcher(AnnotationMatcher):
    def distance(self, a, b):
        a_label = self._context._get_any_label_name(a, a.label)
        b_label = self._context._get_any_label_name(b, b.label)
        return a_label == b_label

    def match_annotations(self, sources):
        return [sum(sources, [])]


@attrs(kw_only=True)
class _ShapeMatcher(AnnotationMatcher):
    pairwise_dist = attrib(converter=float, default=0.9)
    cluster_dist = attrib(converter=float, default=-1.0)
    return_distances = False
    categories = attrib(converter=dict, default={})
    distance_index = attrib(converter=dict, default={})

    def _instance_bbox(
        self, instance_anns: Sequence[dm.Annotation]
    ) -> Tuple[float, float, float, float]:
        return dm.ops.max_bbox(
            a.get_bbox() if isinstance(a, dm.Skeleton) else a
            for a in instance_anns
            if hasattr(a, "get_bbox") and not a.attributes.get("outside", False)
        )

    def distance(self, a, b):
        return segment_iou(a, b)

    def label_matcher(self, a, b):
        a_label = self._context._get_any_label_name(a, a.label)
        b_label = self._context._get_any_label_name(b, b.label)
        return a_label == b_label

    @classmethod
    def _make_memoizing_distance(cls, distance_function: Callable[[Any, Any], float]):
        distances = {}
        notfound = object()

        def memoizing_distance(a, b):
            if isinstance(a, int) and isinstance(b, int):
                key = (a, b)
            else:
                key = (id(a), id(b))

            dist = distances.get(key, notfound)

            if dist is notfound:
                dist = distance_function(a, b)
                distances[key] = dist

            return dist

        return memoizing_distance, distances

    @staticmethod
    def _get_ann_type(t, item: dm.Annotation) -> Sequence[dm.Annotation]:
        return [a for a in item if a.type == t and not a.attributes.get("outside", False)]

    def _match_segments(
        self,
        t,
        item_a,
        item_b,
        *,
        distance: Callable = distance,
        label_matcher: Callable = None,
        a_objs: Optional[Sequence[dm.Annotation]] = None,
        b_objs: Optional[Sequence[dm.Annotation]] = None,
        dist_thresh: Optional[float] = None,
    ):
        if label_matcher is None:
            label_matcher = self.label_matcher
        if dist_thresh is None:
            dist_thresh = self.pairwise_dist
        if a_objs is None:
            a_objs = self._get_ann_type(t, item_a)
        if b_objs is None:
            b_objs = self._get_ann_type(t, item_b)

        if self.return_distances:
            distance, distances = self._make_memoizing_distance(distance)

        if not a_objs and not b_objs:
            distances = {}
            returned_values = [], [], [], []
        else:
            extra_args = {}
            if label_matcher:
                extra_args["label_matcher"] = label_matcher

            returned_values = match_segments(
                a_objs,
                b_objs,
                distance=distance,
                dist_thresh=dist_thresh if dist_thresh is not None else self.iou_threshold,
                **extra_args,
            )

        if self.return_distances:
            returned_values = returned_values + (distances,)

        return returned_values

    def match_annotations_two_sources(self, item_a: dm.Annotation, item_b: dm.Annotation) -> Tuple[
        List[dm.Annotation],
        List[dm.Annotation],
        List[dm.Annotation],
        List[dm.Annotation],
        Optional[Dict[int, float]],
    ]:
        if self.return_distances:
            return [], [], [], [], {}

        return [], [], [], []

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
                if self.return_distances:
                    matches, _, _, _, _ = self.match_annotations_two_sources(
                        src_a,
                        src_b,
                    )
                else:
                    matches, _, _, _ = self.match_annotations_two_sources(
                        src_a,
                        src_b,
                    )
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
                        # if that annotation is already in another cluster
                        continue
                    if 0 < cluster_dist and not _is_close_enough(cluster, i):
                        # if positive cluster_dist and this annotation isn't close enough with other annotations in cluster
                        continue
                    if _has_same_source(cluster, i):
                        # if both the annotation are belong to the same frame in same consensus job
                        continue

                    to_visit.add(
                        i
                    )  # check whether annotations matching this element in cluster can be added in this cluster

            clusters.append([id_segm[i][0] for i in cluster])

        return clusters


@attrs
class BboxMatcher(_ShapeMatcher):
    def distance(self, item_a, item_b):
        def _to_polygon(bbox_ann: dm.Bbox):
            points = bbox_ann.as_polygon()
            angle = bbox_ann.attributes.get("rotation", 0) / 180 * math.pi

            if angle:
                points = np.reshape(points, (-1, 2))
                center = (points[0] + points[2]) / 2
                rel_points = points - center
                cos = np.cos(angle)
                sin = np.sin(angle)
                rotation_matrix = ((cos, sin), (-sin, cos))
                points = np.matmul(rel_points, rotation_matrix) + center
                points = points.flatten()

            return dm.Polygon(points)

        def _bbox_iou(a: dm.Bbox, b: dm.Bbox, *, img_w: int, img_h: int) -> float:
            if a.attributes.get("rotation", 0) == b.attributes.get("rotation", 0):
                return dm.ops.bbox_iou(a, b)
            else:
                return segment_iou(_to_polygon(a), _to_polygon(b), img_h=img_h, img_w=img_w)

        dataitem_id = self._context._ann_map[id(item_a)][1]
        img_h, img_w = self._context._item_map[dataitem_id][0].image.size
        return _bbox_iou(item_a, item_b, img_h=img_h, img_w=img_w)

    def match_annotations_two_sources(self, item_a: dm.Bbox, item_b: dm.Bbox):
        return self._match_segments(
            dm.AnnotationType.bbox,
            item_a,
            item_b,
            distance=self.distance,
        )


@attrs
class PolygonMatcher(_ShapeMatcher):
    def distance(self, item_a, item_b):
        from pycocotools import mask as mask_utils

        def _get_segment(item):
            dataitem_id = self._context._ann_map[id(item)][1]
            img_h, img_w = self._context._item_map[dataitem_id][0].image.size
            object_rle_groups = [to_rle(item, img_h=img_h, img_w=img_w)]
            rle = mask_utils.merge(list(itertools.chain.from_iterable(object_rle_groups)))
            return rle

        a_segm = _get_segment(item_a)
        b_segm = _get_segment(item_b)
        return float(mask_utils.iou([b_segm], [a_segm], [0])[0])

    def match_annotations_two_sources(
        self, item_a: Union[dm.Polygon, dm.Mask], item_b: Union[dm.Polygon, dm.Mask]
    ):
        def _get_segmentations(item):
            return self._get_ann_type(dm.AnnotationType.polygon, item) + self._get_ann_type(
                dm.AnnotationType.mask, item
            )

        dataitem_id = self._context._ann_map[id(item_a[0])][1]
        img_h, img_w = self._context._item_map[dataitem_id][0].image.size

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

        a_instances, _ = _find_instances(_get_segmentations(item_a))
        b_instances, _ = _find_instances(_get_segmentations(item_b))

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
        matched, mismatched, a_extra, b_extra = results[:4]
        if self.return_distances:
            distances = results[4]

        # i_x ~ instance idx in _x
        # ia_x ~ instance annotation in _x
        matched = [
            (ia_a, ia_b)
            for (i_a, i_b) in matched
            for (ia_a, ia_b) in itertools.product(a_instances[i_a], b_instances[i_b])
        ]
        mismatched = [
            (ia_a, ia_b)
            for (i_a, i_b) in mismatched
            for (ia_a, ia_b) in itertools.product(a_instances[i_a], b_instances[i_b])
        ]
        a_extra = [ia_a for i_a in a_extra for ia_a in a_instances[i_a]]
        b_extra = [ia_b for i_b in b_extra for ia_b in b_instances[i_b]]

        if self.return_distances:
            for i_a, i_b in list(distances.keys()):
                dist = distances.pop((i_a, i_b))

                for ia_a, ia_b in itertools.product(a_instances[i_a], b_instances[i_b]):
                    distances[(id(ia_a), id(ia_b))] = dist

        returned_values = (matched, mismatched, a_extra, b_extra)

        if self.return_distances:
            returned_values = returned_values + (distances,)

        return returned_values


@attrs
class MaskMatcher(PolygonMatcher):
    pass


@attrs(kw_only=True)
class PointsMatcher(_ShapeMatcher):
    sigma: Optional[list] = attrib(default=None)
    instance_map = attrib(converter=dict)

    def distance(self, a, b):
        for source_anns in [a.annotations, b.annotations]:
            source_instances = dm.ops.find_instances(source_anns)
            for instance_group in source_instances:
                instance_bbox = self._instance_bbox(instance_group)

                for ann in instance_group:
                    if ann.type == dm.AnnotationType.points:
                        self.instance_map[id(ann)] = [instance_group, instance_bbox]

        dataitem_id = self._context._ann_map[id(a)][1]
        img_h, img_w = self._context._item_map[dataitem_id][0].image.size
        a_bbox = self.instance_map[id(a)][1]
        b_bbox = self.instance_map[id(b)][1]
        a_area = a_bbox[2] * a_bbox[3]
        b_area = b_bbox[2] * b_bbox[3]

        if a_area == 0 and b_area == 0:
            # Simple case: singular points without bbox
            # match them in the image space
            return OKS(a, b, sigma=self.sigma, scale=img_h * img_w)

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
                distance=lambda ai, bi: OKS(
                    dm.Points(a_points[ai]),
                    dm.Points(b_points[bi]),
                    sigma=self.sigma,
                    scale=scale,
                ),
                dist_thresh=self.iou_threshold,
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

            # Compute OKS for 2 groups of points, matching points aligned
            dists = np.linalg.norm(a_points - b_points, axis=1)
            return np.sum(np.exp(-(dists**2) / (2 * scale * (2 * self.sigma) ** 2))) / (
                len(matched_points) + len(a_extra) + len(b_extra)
            )

    def match_annotations_two_sources(self, item_a: dm.Points, item_b: dm.Points):
        a_points = self._get_ann_type(dm.AnnotationType.points, item_a)
        b_points = self._get_ann_type(dm.AnnotationType.points, item_b)

        return self._match_segments(
            dm.AnnotationType.points,
            item_a,
            item_b,
            a_objs=a_points,
            b_objs=b_points,
            distance=self.distance,
        )


class SkeletonMatcher(_ShapeMatcher):
    return_distances = True
    sigma: float = 0.1
    instance_map = {}
    skeleton_map = {}
    _skeleton_info = {}
    distances = {}

    def distance(self, a, b):
        matcher = KeypointsMatcher(instance_map=self.instance_map, sigma=self.sigma)
        if isinstance(a, dm.Skeleton) and isinstance(b, dm.Skeleton):
            if a == b:
                return 1
            elif (id(b), id(a)) in self.distances:
                return self.distances[(id(b), id(a))]
            else:
                return self.distances[(id(a), id(b))]

        return matcher.distance(a, b)

    def _get_skeleton_info(self, skeleton_label_id: int):
        label_cat = cast(dm.LabelCategories, self.categories[dm.AnnotationType.label])
        skeleton_info = self._skeleton_info.get(skeleton_label_id)

        if skeleton_info is None:
            skeleton_label_name = label_cat[skeleton_label_id].name

            # Build item_a sorted list of sub labels to arrange skeleton points during comparison
            skeleton_info = sorted(
                idx for idx, label in enumerate(label_cat) if label.parent == skeleton_label_name
            )
            self._skeleton_info[skeleton_label_id] = skeleton_info

        return skeleton_info

    def match_annotations_two_sources(self, a_skeletons: dm.Skeleton, b_skeletons: dm.Skeleton):
        if not a_skeletons and not b_skeletons:
            return [], [], [], []

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
                    skeleton.label, self._get_skeleton_info(skeleton.label)
                )

                # Merge skeleton points into item_a single list
                # The list is ordered by skeleton_info
                skeleton_points = [
                    next((p for p in skeleton.elements if p.label == sublabel), None)
                    for sublabel in skeleton_info
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
                instance_bbox = self._instance_bbox(instance_group)

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

        matched, mismatched, a_extra, b_extra = results[:4]
        if self.return_distances:
            distances = results[4]

        matched = [(points_map[id(p_a)], points_map[id(p_b)]) for (p_a, p_b) in matched]
        mismatched = [(points_map[id(p_a)], points_map[id(p_b)]) for (p_a, p_b) in mismatched]
        a_extra = [points_map[id(p_a)] for p_a in a_extra]
        b_extra = [points_map[id(p_b)] for p_b in b_extra]

        # Map points back to skeletons
        if self.return_distances:
            for p_a_id, p_b_id in list(distances.keys()):
                dist = distances.pop((p_a_id, p_b_id))
                distances[(id(points_map[p_a_id]), id(points_map[p_b_id]))] = dist

        self.distances.update(distances)
        returned_values = (matched, mismatched, a_extra, b_extra)

        if self.return_distances:
            returned_values = returned_values + (distances,)

        return returned_values


@attrs
class LineMatcher(_ShapeMatcher, LineMatcherQualityReports):
    def match_annotations_two_sources(self, item_a: dm.PolyLine, item_b: dm.PolyLine):
        return self._match_segments(
            dm.AnnotationType.polyline, item_a, item_b, distance=self.distance
        )


@attrs(kw_only=True)
class LabelMerger(LabelMatcher):
    quorum = attrib(converter=int, default=0)

    def merge_clusters(self, clusters):
        assert len(clusters) <= 1
        if len(clusters) == 0:
            return []

        votes = {}  # label -> score
        for ann in clusters[0]:
            label = self._context._get_src_label_name(ann, ann.label)
            votes[label] = 1 + votes.get(label, 0)

        merged = []
        for label, count in votes.items():
            if count < self.quorum:
                sources = set(
                    self.get_ann_source(id(a))
                    for a in clusters[0]
                    if label not in [self._context._get_src_label_name(l, l.label) for l in a]
                )
                sources = [self._context._dataset_map[s][1] for s in sources]
                self._context.add_item_error(FailedLabelVotingError, votes, sources=sources)
                continue

            merged.append(
                Label(
                    self._context._get_label_id(label),
                    attributes={"score": count / len(self._context._dataset_map)},
                )
            )

        return merged


@attrs(kw_only=True)
class _ShapeMerger(_ShapeMatcher):
    quorum = attrib(converter=int, default=0)

    def merge_clusters(self, clusters):
        return list(filter(lambda x: x is not None, map(self.merge_cluster, clusters)))

    def find_cluster_label(self, cluster):
        votes = {}
        for s in cluster:
            label = self._context._get_src_label_name(s, s.label)
            state = votes.setdefault(label, [0, 0])
            state[0] += s.attributes.get("score", 1.0)
            state[1] += 1

        label, (score, count) = max(votes.items(), key=lambda e: e[1][0])
        if count < self.quorum:
            self._context.add_item_error(FailedLabelVotingError, votes)
            label = None
        score = score / len(self._context._dataset_map)
        label = self._context._get_label_id(label)
        return label, score

    def _merge_cluster_shape_mean_box_nearest(self, cluster):
        mbbox = Bbox(*mean_bbox(cluster))
        a = cluster[0]
        dataitem_id = self._context._ann_map[id(a)][1]
        img_h, img_w = self._context._item_map[dataitem_id][0].image.size
        dist = list(segment_iou(mbbox, s, img_h=img_h, img_w=img_w) for s in cluster)
        nearest_pos, _ = max(enumerate(dist), key=lambda e: e[1])
        return cluster[nearest_pos]

    def merge_cluster_shape(self, cluster):
        shape = self._merge_cluster_shape_mean_box_nearest(cluster)
        distance, _ = self._make_memoizing_distance(self.distance)
        for ann in cluster:
            dataset_id = self._context._item_map[self._context._ann_map[id(ann)][1]][1]
            self._context.dataset_mean_consensus_score.setdefault(dataset_id, []).append(
                max(0, distance(ann, shape))
            )
        shape_score = sum(max(0, distance(shape, s)) for s in cluster) / len(cluster)
        return shape, shape_score

    def merge_cluster(self, cluster):
        label, label_score = self.find_cluster_label(cluster)

        # when the merged annotation is rejected due to quorum constraint
        if label is None:
            return None

        shape, shape_score = self.merge_cluster_shape(cluster)
        shape.z_order = max(cluster, key=lambda a: a.z_order).z_order
        shape.label = label
        shape.attributes["score"] = label_score * shape_score if label is not None else shape_score

        return shape


@attrs
class BboxMerger(_ShapeMerger, BboxMatcher):
    pass


@attrs
class PolygonMerger(_ShapeMerger, PolygonMatcher):
    pass


@attrs
class MaskMerger(_ShapeMerger, MaskMatcher):
    pass


@attrs
class PointsMerger(_ShapeMerger, PointsMatcher):
    pass


@attrs
class LineMerger(_ShapeMerger, LineMatcher):
    pass


class SkeletonMerger(_ShapeMerger, SkeletonMatcher):
    def _merge_cluster_shape_nearest(self, cluster):
        dist = {}
        for idx, skeleton1 in enumerate(cluster):
            id_skeleton1 = id(skeleton1)
            skeleton_distance = 0
            for skeleton2 in cluster:
                id_skeleton2 = id(skeleton2)
                if (id_skeleton1, id_skeleton2) in self.distances:
                    skeleton_distance += self.distances[(id_skeleton1, id_skeleton2)]
                elif (id_skeleton2, id_skeleton1) in self.distances:
                    skeleton_distance += self.distances[(id_skeleton2, id_skeleton1)]
                else:
                    skeleton_distance += 1

            dist[idx] = skeleton_distance / len(cluster)

        return cluster[min(dist, key=dist.get)]

    def merge_cluster_shape(self, cluster):
        shape = self._merge_cluster_shape_nearest(cluster)
        shape_score = sum(max(0, self.distance(shape, s)) for s in cluster) / len(cluster)
        return shape, shape_score
