# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import itertools
import math
from collections.abc import Callable, Sequence
from functools import partial
from typing import Any, TypeAlias, TypeVar, cast

import datumaro as dm
import datumaro.components.annotations.matcher
import datumaro.components.comparator
import datumaro.util.annotation_util
import datumaro.util.mask_tools
import numpy as np
from attrs import define
from scipy.optimize import linear_sum_assignment

from cvat.apps.quality_control.comparison_report import ComparisonParameters
from cvat.apps.quality_control.models import PointSizeBase

_ShapeT1 = TypeVar("_ShapeT1")
_ShapeT2 = TypeVar("_ShapeT2")
ShapeSimilarityFunction: TypeAlias = Callable[
    [_ShapeT1, _ShapeT2], float
]  # (shape1, shape2) -> [0; 1], returns 0 for mismatches, 1 for matches
LabelEqualityFunction: TypeAlias = Callable[[_ShapeT1, _ShapeT2], bool]
SegmentMatchingResult: TypeAlias = tuple[
    list[tuple[_ShapeT1, _ShapeT2]],  # matches
    list[tuple[_ShapeT1, _ShapeT2]],  # mismatches
    list[_ShapeT1],  # a unmatched
    list[_ShapeT2],  # b unmatched
]


def match_segments(
    a_segms: Sequence[_ShapeT1],
    b_segms: Sequence[_ShapeT2],
    *,
    distance: ShapeSimilarityFunction[_ShapeT1, _ShapeT2],
    dist_thresh: float = 1.0,
    label_matcher: LabelEqualityFunction[_ShapeT1, _ShapeT2] = lambda a, b: a.label == b.label,
) -> SegmentMatchingResult[_ShapeT1, _ShapeT2]:
    # Comparing to the dm version, this one changes the algorithm to match shapes first
    # label comparison is only used to distinguish between matches and mismatches

    assert callable(distance), distance
    assert callable(label_matcher), label_matcher

    max_anns = max(len(a_segms), len(b_segms))
    distances = np.array(
        [
            [
                1 - distance(a, b) if a is not None and b is not None else 1
                for b, _ in itertools.zip_longest(b_segms, range(max_anns), fillvalue=None)
            ]
            for a, _ in itertools.zip_longest(a_segms, range(max_anns), fillvalue=None)
        ]
    )
    distances[~np.isfinite(distances)] = 1
    distances[distances > 1 - dist_thresh] = 1

    if a_segms and b_segms:
        a_matches, b_matches = linear_sum_assignment(distances)
    else:
        a_matches = []
        b_matches = []

    # matches: segments we succeeded to match completely
    # mispred: segments we succeeded to match, having label mismatch
    matches = []
    mispred = []
    # *_umatched: segments of (*) we failed to match
    a_unmatched = []
    b_unmatched = []

    for a_idx, b_idx in zip(a_matches, b_matches):
        dist = distances[a_idx, b_idx]
        if dist > 1 - dist_thresh or dist == 1:
            if a_idx < len(a_segms):
                a_unmatched.append(a_segms[a_idx])
            if b_idx < len(b_segms):
                b_unmatched.append(b_segms[b_idx])
        else:
            a_ann = a_segms[a_idx]
            b_ann = b_segms[b_idx]
            if label_matcher(a_ann, b_ann):
                matches.append((a_ann, b_ann))
            else:
                mispred.append((a_ann, b_ann))

    if not len(a_matches) and not len(b_matches):
        a_unmatched = list(a_segms)
        b_unmatched = list(b_segms)

    return matches, mispred, a_unmatched, b_unmatched


def oks(a, b, sigma=0.1, bbox=None, scale=None, visibility_a=None, visibility_b=None):
    """
    Object Keypoint Similarity metric.
    https://cocodataset.org/#keypoints-eval
    """

    p1 = np.array(a.points).reshape((-1, 2))
    p2 = np.array(b.points).reshape((-1, 2))
    if len(p1) != len(p2):
        return 0

    if visibility_a is None:
        visibility_a = np.full(len(p1), True)
    else:
        visibility_a = np.asarray(visibility_a, dtype=bool)

    if visibility_b is None:
        visibility_b = np.full(len(p2), True)
    else:
        visibility_b = np.asarray(visibility_b, dtype=bool)

    if not scale:
        if bbox is None:
            bbox = datumaro.util.annotation_util.mean_bbox([a, b])
        scale = bbox[2] * bbox[3]

    dists = np.linalg.norm(p1 - p2, axis=1)
    return np.sum(
        visibility_a
        * visibility_b
        * np.exp((visibility_a == visibility_b) * (-(dists**2) / (2 * scale * (2 * sigma) ** 2)))
    ) / np.sum(visibility_a | visibility_b, dtype=float)


@define(kw_only=True)
class KeypointsMatcher(datumaro.components.annotations.matcher.PointsMatcher):
    def distance(self, a: dm.Points, b: dm.Points) -> float:
        a_bbox = self.instance_map[id(a)][1]
        b_bbox = self.instance_map[id(b)][1]
        if datumaro.util.annotation_util.bbox_iou(a_bbox, b_bbox) <= 0:
            return 0

        bbox = datumaro.util.annotation_util.mean_bbox([a_bbox, b_bbox])
        return oks(
            a,
            b,
            sigma=self.sigma,
            bbox=bbox,
            visibility_a=[v == dm.Points.Visibility.visible for v in a.visibility],
            visibility_b=[v == dm.Points.Visibility.visible for v in b.visibility],
        )


def to_rle(ann: dm.Annotation, *, img_h: int, img_w: int):
    from pycocotools import mask as mask_utils

    if ann.type == dm.AnnotationType.polygon:
        return mask_utils.frPyObjects([ann.points], img_h, img_w)
    elif isinstance(ann, dm.RleMask):
        return [ann.rle]
    elif ann.type == dm.AnnotationType.mask:
        return [mask_utils.encode(ann.image)]
    else:
        assert False


def segment_iou(a: dm.Annotation, b: dm.Annotation, *, img_h: int, img_w: int) -> float:
    """
    Generic IoU computation with masks and polygons.
    Returns -1 if no intersection, [0; 1] otherwise
    """
    # Comparing to the dm version, this fixes the comparison for segments,
    # as the images size are required for correct decoding.
    # Boxes are not included, because they are not needed

    from pycocotools import mask as mask_utils

    a = to_rle(a, img_h=img_h, img_w=img_w)
    b = to_rle(b, img_h=img_h, img_w=img_w)

    # Note that mask_utils.iou expects (dt, gt). Check this if the 3rd param is True
    return float(mask_utils.iou(b, a, [0]))


@define(kw_only=True)
class LineMatcher(datumaro.components.annotations.matcher.LineMatcher):
    EPSILON = 1e-7

    torso_r: float = 0.25
    oriented: bool = False
    scale: float = None

    def distance(self, gt_ann: dm.PolyLine, ds_ann: dm.PolyLine) -> float:
        # Check distances of the very coarse estimates for the curves
        def _get_bbox_circle(ann: dm.PolyLine):
            xs = ann.points[0::2]
            ys = ann.points[1::2]
            x0 = min(xs)
            x1 = max(xs)
            y0 = min(ys)
            y1 = max(ys)
            return (x0 + x1) / 2, (y0 + y1) / 2, ((x1 - x0) ** 2 + (y1 - y0) ** 2) / 4

        gt_center_x, gt_center_y, gt_r2 = _get_bbox_circle(gt_ann)
        ds_center_x, ds_center_y, ds_r2 = _get_bbox_circle(ds_ann)
        sigma6_2 = self.scale * (6 * self.torso_r) ** 2
        if (
            (ds_center_x - gt_center_x) ** 2 + (ds_center_y - gt_center_y) ** 2
        ) > ds_r2 + gt_r2 + sigma6_2:
            return 0

        # Approximate lines to the same number of points for pointwise comparison
        a, b = self.approximate_points(
            np.array(gt_ann.points).reshape((-1, 2)), np.array(ds_ann.points).reshape((-1, 2))
        )

        # Compare the direct and, optionally, the reverse variants
        similarities = []
        candidates = [b]
        if not self.oriented:
            candidates.append(b[::-1])

        for candidate_b in candidates:
            similarities.append(self._compare_lines(a, candidate_b))

        return max(similarities)

    def _compare_lines(self, a: np.ndarray, b: np.ndarray) -> float:
        dists = np.linalg.norm(a - b, axis=1)

        scale = self.scale
        if scale is None:
            segment_dists = np.linalg.norm(a[1:] - a[:-1], axis=1)
            scale = np.sum(segment_dists) ** 2

        # Compute Gaussian for approximated lines similarly to OKS
        return sum(np.exp(-(dists**2) / (2 * scale * (2 * self.torso_r) ** 2))) / len(a)

    @classmethod
    def approximate_points(cls, a: np.ndarray, b: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        """
        Creates 2 polylines with the same numbers of points,
        the points are placed on the original lines with the same step.
        The step for each point is determined as minimal to the next original
        point on one of the curves.
        A simpler, but slower version could be just approximate each curve to
        some big number of points. The advantage of this algo is that it keeps
        corners and original points untouched, while adding intermediate points.
        """
        a_segment_count = len(a) - 1
        b_segment_count = len(b) - 1

        a_segment_lengths = np.linalg.norm(a[1:] - a[:-1], axis=1)
        a_segment_end_dists = [0]
        for l in a_segment_lengths:
            a_segment_end_dists.append(a_segment_end_dists[-1] + l)
        a_segment_end_dists.pop(0)
        a_segment_end_dists.append(a_segment_end_dists[-1])  # duplicate for simpler code

        b_segment_lengths = np.linalg.norm(b[1:] - b[:-1], axis=1)
        b_segment_end_dists = [0]
        for l in b_segment_lengths:
            b_segment_end_dists.append(b_segment_end_dists[-1] + l)
        b_segment_end_dists.pop(0)
        b_segment_end_dists.append(b_segment_end_dists[-1])  # duplicate for simpler code

        a_length = a_segment_end_dists[-1]
        b_length = b_segment_end_dists[-1]

        # lines can have lesser number of points in some cases
        max_points_count = len(a) + len(b) - 1
        a_new_points = np.zeros((max_points_count, 2))
        b_new_points = np.zeros((max_points_count, 2))
        a_new_points[0] = a[0]
        b_new_points[0] = b[0]

        a_segment_idx = 0
        b_segment_idx = 0
        while a_segment_idx < a_segment_count or b_segment_idx < b_segment_count:
            next_point_idx = a_segment_idx + b_segment_idx + 1

            a_segment_end_pos = a_segment_end_dists[a_segment_idx] / (a_length or 1)
            b_segment_end_pos = b_segment_end_dists[b_segment_idx] / (b_length or 1)
            if a_segment_idx < a_segment_count and a_segment_end_pos <= b_segment_end_pos:
                if b_segment_idx < b_segment_count:
                    # advance b in the current segment to the relative position in a
                    q = (b_segment_end_pos - a_segment_end_pos) * (
                        b_length / (b_segment_lengths[b_segment_idx] or 1)
                    )
                    if abs(q) <= cls.EPSILON:
                        b_new_points[next_point_idx] = b[1 + b_segment_idx]
                    else:
                        b_new_points[next_point_idx] = b[b_segment_idx] * q + b[
                            1 + b_segment_idx
                        ] * (1 - q)
                elif b_segment_idx == b_segment_count:
                    b_new_points[next_point_idx] = b[b_segment_idx]

                # advance a to the end of the current segment
                a_segment_idx += 1
                a_new_points[next_point_idx] = a[a_segment_idx]

            elif b_segment_idx < b_segment_count:
                if a_segment_idx < a_segment_count:
                    # advance a in the current segment to the relative position in b
                    q = (a_segment_end_pos - b_segment_end_pos) * (
                        a_length / (a_segment_lengths[a_segment_idx] or 1)
                    )
                    if abs(q) <= cls.EPSILON:
                        a_new_points[next_point_idx] = a[1 + a_segment_idx]
                    else:
                        a_new_points[next_point_idx] = a[a_segment_idx] * q + a[
                            1 + a_segment_idx
                        ] * (1 - q)
                elif a_segment_idx == a_segment_count:
                    a_new_points[next_point_idx] = a[a_segment_idx]

                # advance b to the end of the current segment
                b_segment_idx += 1
                b_new_points[next_point_idx] = b[b_segment_idx]

            else:
                assert False

        # truncate the final values
        if next_point_idx < max_points_count:
            a_new_points = a_new_points[:next_point_idx]
            b_new_points = b_new_points[:next_point_idx]

        return a_new_points, b_new_points


class DistanceComparator(datumaro.components.comparator.DistanceComparator):
    def __init__(
        self,
        categories: dm.CategoriesInfo,
        *,
        included_ann_types: list[dm.AnnotationType] | None = None,
        return_distances: bool = False,
        iou_threshold: float = 0.5,
        # https://cocodataset.org/#keypoints-eval
        # https://github.com/cocodataset/cocoapi/blob/8c9bcc3cf640524c4c20a9c40e89cb6a2f2fa0e9/PythonAPI/pycocotools/cocoeval.py#L523
        oks_sigma: float = 0.09,
        point_size_base: PointSizeBase = PointSizeBase.GROUP_BBOX_SIZE,
        compare_line_orientation: bool = False,
        line_torso_radius: float = 0.01,
        panoptic_comparison: bool = False,
        allow_groups: bool = True,
    ):
        super().__init__(iou_threshold=iou_threshold)
        self.categories = categories
        self._skeleton_info = {}
        self.included_ann_types = included_ann_types
        self.return_distances = return_distances

        self.oks_sigma = oks_sigma
        "% of the shape area"

        self.point_size_base = point_size_base
        "Compare point groups using the group bbox size or the image size"

        self.compare_line_orientation = compare_line_orientation
        "Whether lines are oriented or not"

        # Here we use a % of image size in pixels, using the image size as the scale
        self.line_torso_radius = line_torso_radius
        "% of the line length at the specified scale"

        self.panoptic_comparison = panoptic_comparison
        "Compare only the visible parts of polygons and masks"

        self.allow_groups = allow_groups
        """
        When comparing grouped annotations, consider all the group elements with the same label
        as the same annotation, if applicable. Affects polygons, masks, and points
        """

    def instance_bbox(
        self, instance_anns: Sequence[dm.Annotation]
    ) -> tuple[float, float, float, float]:
        return datumaro.util.annotation_util.max_bbox(
            a.get_bbox() if isinstance(a, dm.Skeleton) else a
            for a in instance_anns
            if hasattr(a, "get_bbox") and not a.attributes.get("outside", False)
        )

    @staticmethod
    def to_polygon(bbox_ann: dm.Bbox | dm.Ellipse):
        points = bbox_ann.as_polygon()
        angle = bbox_ann.attributes.get("rotation", 0) / 180 * math.pi

        if angle:
            points = np.reshape(points, (-1, 2))
            if isinstance(bbox_ann, dm.Bbox):
                center = (points[0] + points[2]) / 2
            else:
                center = (bbox_ann.c_x, bbox_ann.c_y)
            rel_points = points - center
            cos = np.cos(angle)
            sin = np.sin(angle)
            rotation_matrix = ((cos, sin), (-sin, cos))
            points = np.matmul(rel_points, rotation_matrix) + center
            points = points.flatten()

        return dm.Polygon(points)

    @staticmethod
    def _get_ann_type(t: dm.AnnotationType, item: dm.DatasetItem) -> Sequence[dm.Annotation]:
        return [
            a for a in item.annotations if a.type == t and not a.attributes.get("outside", False)
        ]

    def _match_ann_type(self, t: dm.AnnotationType, *args):
        if t not in self.included_ann_types:
            return None

        if t == dm.AnnotationType.label:
            return self.match_labels(*args)
        elif t == dm.AnnotationType.bbox:
            return self.match_boxes(*args)
        elif t == dm.AnnotationType.polygon:
            return self.match_segmentations(*args)
        elif t == dm.AnnotationType.points:
            return self.match_points(*args)
        elif t == dm.AnnotationType.skeleton:
            return self.match_skeletons(*args)
        elif t == dm.AnnotationType.polyline:
            return self.match_lines(*args)
        elif t == dm.AnnotationType.ellipse:
            return self.match_ellipses(*args)
        else:
            return None

    def match_labels(self, item_a: dm.DatasetItem, item_b: dm.DatasetItem):
        def label_distance(a: dm.Label, b: dm.Label) -> float:
            if a is None or b is None:
                return 0
            return 0.5 + (a.label == b.label) / 2

        return self.match_segments(
            dm.AnnotationType.label,
            item_a,
            item_b,
            distance=label_distance,
            label_matcher=lambda a, b: a.label == b.label,
            dist_thresh=0.5,
        )

    def match_segments(
        self,
        t: dm.AnnotationType,
        item_a: dm.DatasetItem,
        item_b: dm.DatasetItem,
        *,
        distance: ShapeSimilarityFunction[_ShapeT1, _ShapeT2],
        label_matcher: LabelEqualityFunction[_ShapeT1, _ShapeT2] | None = None,
        a_objs: Sequence[_ShapeT1] | None = None,
        b_objs: Sequence[_ShapeT2] | None = None,
        dist_thresh: float | None = None,
    ):
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

    def match_boxes(self, item_a: dm.DatasetItem, item_b: dm.DatasetItem):
        def _bbox_iou(a: dm.Bbox, b: dm.Bbox, *, img_w: int, img_h: int) -> float:
            if a.attributes.get("rotation", 0) == b.attributes.get("rotation", 0):
                return datumaro.util.annotation_util.bbox_iou(a, b)
            else:
                return segment_iou(self.to_polygon(a), self.to_polygon(b), img_h=img_h, img_w=img_w)

        img_h, img_w = item_a.media_as(dm.Image).size
        return self.match_segments(
            dm.AnnotationType.bbox,
            item_a,
            item_b,
            distance=partial(_bbox_iou, img_h=img_h, img_w=img_w),
        )

    def match_ellipses(self, item_a: dm.DatasetItem, item_b: dm.DatasetItem):
        def _ellipse_iou(a: dm.Ellipse, b: dm.Ellipse, *, img_w: int, img_h: int) -> float:
            return segment_iou(self.to_polygon(a), self.to_polygon(b), img_h=img_h, img_w=img_w)

        img_h, img_w = item_a.media_as(dm.Image).size
        return self.match_segments(
            dm.AnnotationType.ellipse,
            item_a,
            item_b,
            distance=partial(_ellipse_iou, img_h=img_h, img_w=img_w),
        )

    def match_segmentations(self, item_a: dm.DatasetItem, item_b: dm.DatasetItem):
        def _get_segmentations(item):
            return self._get_ann_type(dm.AnnotationType.polygon, item) + self._get_ann_type(
                dm.AnnotationType.mask, item
            )

        img_h, img_w = item_a.media_as(dm.Image).size

        def _find_instances(annotations):
            instances = []
            instance_map = {}  # ann id -> instance id

            if self.allow_groups:
                # Group instance annotations by label.
                # Annotations with the same label and group will be merged,
                # and considered a single object in comparison
                groups = datumaro.util.annotation_util.find_instances(annotations)
            else:
                groups = [[a] for a in annotations]  # ignore groups

            for ann_group in groups:
                ann_group = sorted(ann_group, key=lambda a: a.label)
                for _, label_group in itertools.groupby(ann_group, key=lambda a: a.label):
                    label_group = list(label_group)
                    instance_id = len(instances)
                    instances.append(label_group)
                    for ann in label_group:
                        instance_map[id(ann)] = instance_id

            return instances, instance_map

        def _get_compiled_mask(
            anns: Sequence[dm.Annotation], *, instance_ids: dict[int, int]
        ) -> dm.CompiledMask:
            if not anns:
                return None

            from pycocotools import mask as mask_utils

            # Merge instance groups
            object_rle_groups = [to_rle(ann, img_h=img_h, img_w=img_w) for ann in anns]
            object_rles = [mask_utils.merge(g) for g in object_rle_groups]

            # Mask materialization can consume a lot of memory,
            # avoid storing all the masks simultaneously
            def _make_lazy_decode(i: int):
                def _lazy_decode() -> dm.BinaryMaskImage:
                    return mask_utils.decode([object_rles[i]])[:, :, 0]

                return _lazy_decode

            return dm.CompiledMask.from_instance_masks(
                # need to increment labels and instance ids by 1 to avoid confusion with background
                instance_masks=(
                    dm.Mask(image=_make_lazy_decode(i), z_order=ann.z_order, label=ann.label + 1)
                    for i, ann in enumerate(anns)
                ),
                instance_ids=(iid + 1 for iid in instance_ids),
            )

        a_instances, a_instance_map = _find_instances(_get_segmentations(item_a))
        b_instances, b_instance_map = _find_instances(_get_segmentations(item_b))

        if self.panoptic_comparison:
            a_compiled_mask = _get_compiled_mask(
                list(itertools.chain.from_iterable(a_instances)),
                instance_ids=[
                    a_instance_map[id(ann)] for ann in itertools.chain.from_iterable(a_instances)
                ],
            )
            b_compiled_mask = _get_compiled_mask(
                list(itertools.chain.from_iterable(b_instances)),
                instance_ids=[
                    b_instance_map[id(ann)] for ann in itertools.chain.from_iterable(b_instances)
                ],
            )
        else:
            a_compiled_mask = None
            b_compiled_mask = None

        segment_cache = {}

        def _get_segment(obj_id: int, *, compiled_mask: dm.CompiledMask | None = None, instances):
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

        results = self.match_segments(
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

    def match_lines(self, item_a: dm.DatasetItem, item_b: dm.DatasetItem):
        matcher = LineMatcher(
            oriented=self.compare_line_orientation,
            torso_r=self.line_torso_radius,
            scale=np.prod(item_a.media_as(dm.Image).size),
        )
        return self.match_segments(
            dm.AnnotationType.polyline, item_a, item_b, distance=matcher.distance
        )

    def match_points(self, item_a: dm.DatasetItem, item_b: dm.DatasetItem):
        a_points = self._get_ann_type(dm.AnnotationType.points, item_a)
        b_points = self._get_ann_type(dm.AnnotationType.points, item_b)

        if not a_points and not b_points:
            results = [[], [], [], []]

            if self.return_distances:
                results.append({})

            return tuple(results)

        instance_map = {}  # points id -> (instance group, instance bbox)
        for source_anns in [item_a.annotations, item_b.annotations]:
            if self.allow_groups:
                # Group instance annotations by label.
                # Annotations with the same label and group will be merged,
                # and considered a single object in comparison
                source_instances = datumaro.util.annotation_util.find_instances(source_anns)
            else:
                source_instances = [[a] for a in source_anns]  # ignore groups

            for instance_group in source_instances:
                instance_bbox = self.instance_bbox(instance_group)

                for ann in instance_group:
                    if ann.type == datumaro.AnnotationType.points:
                        instance_map[id(ann)] = [instance_group, instance_bbox]

        img_h, img_w = item_a.media_as(dm.Image).size

        def _distance(a: dm.Points, b: dm.Points) -> float:
            a_bbox = instance_map[id(a)][1]
            b_bbox = instance_map[id(b)][1]
            a_area = a_bbox[2] * a_bbox[3]
            b_area = b_bbox[2] * b_bbox[3]

            if a_area == 0 and b_area == 0:
                # Simple case: singular points without bbox
                # match them in the image space
                return oks(a, b, sigma=self.oks_sigma, scale=img_h * img_w)

            else:
                # Complex case: multiple points, grouped points, points with a bbox
                # Try to align points and then return the metric

                if self.point_size_base == PointSizeBase.IMAGE_SIZE:
                    scale = img_h * img_w
                elif self.point_size_base == PointSizeBase.GROUP_BBOX_SIZE:
                    # match points in their bbox space

                    if datumaro.util.annotation_util.bbox_iou(a_bbox, b_bbox) <= 0:
                        # this early exit may not work for points forming an axis-aligned line
                        return 0

                    bbox = datumaro.util.annotation_util.mean_bbox([a_bbox, b_bbox])
                    scale = bbox[2] * bbox[3]
                else:
                    assert False, f"Unknown point size base {self.point_size_base}"

                a_points = np.reshape(a.points, (-1, 2))
                b_points = np.reshape(b.points, (-1, 2))

                matches, mismatches, a_extra, b_extra = match_segments(
                    range(len(a_points)),
                    range(len(b_points)),
                    distance=lambda ai, bi: oks(
                        dm.Points(a_points[ai]),
                        dm.Points(b_points[bi]),
                        sigma=self.oks_sigma,
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
                return np.sum(np.exp(-(dists**2) / (2 * scale * (2 * self.oks_sigma) ** 2))) / (
                    len(matched_points) + len(a_extra) + len(b_extra)
                )

        return self.match_segments(
            dm.AnnotationType.points,
            item_a,
            item_b,
            a_objs=a_points,
            b_objs=b_points,
            distance=_distance,
        )

    def _get_skeleton_info(self, skeleton_label_id: int):
        label_cat = cast(dm.LabelCategories, self.categories[dm.AnnotationType.label])
        skeleton_info = self._skeleton_info.get(skeleton_label_id)

        if skeleton_info is None:
            skeleton_label_name = label_cat[skeleton_label_id].name

            # Build a sorted list of sublabels to arrange skeleton points during comparison
            skeleton_info = sorted(
                idx for idx, label in enumerate(label_cat) if label.parent == skeleton_label_name
            )
            self._skeleton_info[skeleton_label_id] = skeleton_info

        return skeleton_info

    def match_skeletons(self, item_a, item_b):
        a_skeletons = self._get_ann_type(dm.AnnotationType.skeleton, item_a)
        b_skeletons = self._get_ann_type(dm.AnnotationType.skeleton, item_b)
        if not a_skeletons and not b_skeletons:
            results = [[], [], [], []]

            if self.return_distances:
                results.append({})

            return tuple(results)

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
                    skeleton_map[id(skeleton)] = None
                    continue

                points_map[id(merged_points)] = skeleton
                skeleton_map[id(skeleton)] = merged_points
                source_points.append(merged_points)

        instance_map = {}
        for source in [item_a.annotations, item_b.annotations]:
            for instance_group in datumaro.util.annotation_util.find_instances(source):
                instance_bbox = self.instance_bbox(instance_group)

                instance_group = [
                    skeleton_map[id(a)] if isinstance(a, dm.Skeleton) else a
                    for a in instance_group
                    if not isinstance(a, dm.Skeleton) or skeleton_map[id(a)] is not None
                ]
                for ann in instance_group:
                    instance_map[id(ann)] = [instance_group, instance_bbox]

        matcher = KeypointsMatcher(instance_map=instance_map, sigma=self.oks_sigma)

        results = self.match_segments(
            dm.AnnotationType.points,
            item_a,
            item_b,
            a_objs=a_points,
            b_objs=b_points,
            distance=matcher.distance,
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

        returned_values = (matched, mismatched, a_extra, b_extra)

        if self.return_distances:
            returned_values = returned_values + (distances,)

        return returned_values

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

    def match_annotations(self, item_a, item_b):
        return {t: self._match_ann_type(t, item_a, item_b) for t in self.included_ann_types}


def _find_covered_segments(
    segments, *, img_w: int, img_h: int, visibility_threshold: float = 0.01
) -> Sequence[int]:
    from pycocotools import mask as mask_utils

    segments = [[s] for s in segments]
    input_rles = [mask_utils.frPyObjects(s, img_h, img_w) for s in segments]
    covered_ids = []
    for i, bottom_rles in enumerate(input_rles):
        top_rles = input_rles[i + 1 :]
        top_rle = mask_utils.merge(list(itertools.chain.from_iterable(top_rles)))
        intersection_rle = mask_utils.merge([top_rle] + bottom_rles, intersect=True)
        union_rle = mask_utils.merge([top_rle] + bottom_rles)

        bottom_area, intersection_area, union_area = mask_utils.area(
            bottom_rles + [intersection_rle, union_rle]
        )
        iou = intersection_area / (union_area or 1)

        if iou == 0:
            continue

        # Check if the bottom segment is fully covered by the top one
        if 1 - intersection_area / (bottom_area or 1) < visibility_threshold:
            covered_ids.append(i)

    return covered_ids


class Comparator:
    def __init__(self, categories: dm.CategoriesInfo, *, settings: ComparisonParameters):
        self.ignored_attrs = set(settings.ignored_attributes) | {
            "track_id",  # changes from task to task, can't be defined manually with the same name
            "keyframe",  # indicates the way annotation obtained, meaningless to compare
            "z_order",  # changes from frame to frame, compared by other means
            "group",  # changes from job to job, compared by other means
            "rotation",  # handled by other means
            "outside",  # handled by other means
        }
        self.included_ann_types = settings.included_annotation_types
        self.non_groupable_ann_type = settings.non_groupable_ann_type
        self._annotation_comparator = DistanceComparator(
            categories,
            included_ann_types=set(self.included_ann_types)
            - {dm.AnnotationType.mask},  # masks are compared together with polygons
            return_distances=True,
            panoptic_comparison=settings.panoptic_comparison,
            iou_threshold=settings.iou_threshold,
            oks_sigma=settings.oks_sigma,
            point_size_base=settings.point_size_base,
            line_torso_radius=settings.line_thickness,
            compare_line_orientation=False,  # should not be taken from outside, handled differently
        )
        self.coverage_threshold = settings.object_visibility_threshold
        self.group_match_threshold = settings.group_match_threshold

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

    def find_groups(
        self, item: dm.DatasetItem
    ) -> tuple[dict[int, list[dm.Annotation]], dict[int, int]]:
        ann_groups = datumaro.util.annotation_util.find_instances(
            [
                ann
                for ann in item.annotations
                if ann.type in self.included_ann_types and ann.type != self.non_groupable_ann_type
            ]
        )

        groups = {}
        group_map = {}  # ann id -> group id
        for group_id, group in enumerate(ann_groups):
            groups[group_id] = group
            for ann in group:
                group_map[id(ann)] = group_id

        return groups, group_map

    def match_groups(self, gt_groups, ds_groups, matched_anns):
        matched_ann_ids = dict((id(a), id(b)) for a, b in matched_anns)

        def _group_distance(gt_group_id, ds_group_id):
            intersection = sum(
                1
                for gt_ann in gt_groups[gt_group_id]
                for ds_ann in ds_groups[ds_group_id]
                if matched_ann_ids.get(id(gt_ann), None) == id(ds_ann)
            )
            union = len(gt_groups[gt_group_id]) + len(ds_groups[ds_group_id]) - intersection
            return intersection / (union or 1)

        matches, mismatches, gt_unmatched, ds_unmatched = match_segments(
            list(gt_groups),
            list(ds_groups),
            distance=_group_distance,
            label_matcher=lambda a, b: _group_distance(a, b) == 1,
            dist_thresh=self.group_match_threshold,
        )

        ds_to_gt_groups = {
            ds_group_id: gt_group_id
            for gt_group_id, ds_group_id in itertools.chain(
                matches, mismatches, zip(itertools.repeat(None), ds_unmatched)
            )
        }
        ds_to_gt_groups[None] = gt_unmatched

        return ds_to_gt_groups

    def find_covered(self, item: dm.DatasetItem) -> list[dm.Annotation]:
        # Get annotations that can cover or be covered
        spatial_types = {
            dm.AnnotationType.polygon,
            dm.AnnotationType.mask,
            dm.AnnotationType.bbox,
            dm.AnnotationType.ellipse,
        }.intersection(self.included_ann_types)
        anns = sorted(
            [a for a in item.annotations if a.type in spatial_types], key=lambda a: a.z_order
        )

        segms = []
        for ann in anns:
            if ann.type in (dm.AnnotationType.bbox, dm.AnnotationType.ellipse):
                segms.append(ann.as_polygon())
            elif ann.type == dm.AnnotationType.polygon:
                segms.append(ann.points)
            elif ann.type == dm.AnnotationType.mask:
                segms.append(datumaro.util.mask_tools.mask_to_rle(ann.image))
            else:
                assert False

        img_h, img_w = item.media_as(dm.Image).size
        covered_ids = _find_covered_segments(
            segms, img_w=img_w, img_h=img_h, visibility_threshold=self.coverage_threshold
        )
        return [anns[i] for i in covered_ids]

    def match_annotations(self, item_a: dm.DatasetItem, item_b: dm.DatasetItem):
        per_type_results = self._annotation_comparator.match_annotations(item_a, item_b)

        merged_results = [[], [], [], [], {}]
        shape_merged_results = [[], [], [], [], {}]
        for shape_type in self.included_ann_types:
            shape_type_results = per_type_results.get(shape_type, None)
            if shape_type_results is None:
                continue

            for merged_field, field in zip(merged_results, shape_type_results[:-1]):
                merged_field.extend(field)

            if shape_type != dm.AnnotationType.label:
                for merged_field, field in zip(shape_merged_results, shape_type_results[:-1]):
                    merged_field.extend(field)
                shape_merged_results[-1].update(per_type_results[shape_type][-1])

            merged_results[-1].update(per_type_results[shape_type][-1])

        return {"all_ann_types": merged_results, "all_shape_ann_types": shape_merged_results}

    def get_distance(
        self, pairwise_distances, gt_ann: dm.Annotation, ds_ann: dm.Annotation
    ) -> float | None:
        return pairwise_distances.get((id(gt_ann), id(ds_ann)))
