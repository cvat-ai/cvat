# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import itertools
import math
from collections import OrderedDict
from collections.abc import Callable, Hashable, Sequence
from functools import partial
from typing import Any, NamedTuple, TypeAlias, TypedDict, TypeVar, cast

import cv2
import datumaro as dm
import datumaro.components.annotations.matcher
import datumaro.util.annotation_util
import datumaro.util.mask_tools
import numpy as np
from attrs import define, field

from cvat.apps.quality_control.attribute_comparison import CVAT_ATTRIBUTE_SPEC_IDS_ATTR
from cvat.apps.quality_control.matching import (
    AttributeMatchingResult,
    LabelEqualityFunction,
)
from cvat.apps.quality_control.matching import PairwiseComparison as _PairwiseComparison
from cvat.apps.quality_control.matching import (
    ShapeSimilarityFunction,
    match_segments,
)
from cvat.apps.quality_control.models import (
    DefaultComparisonSettings,
    PointSizeBase,
    ShapeSimilarityMetricType,
)

_ShapeT1 = TypeVar("_ShapeT1")
_ShapeT2 = TypeVar("_ShapeT2")
AttributeMatchingFunction: TypeAlias = Callable[
    [dm.Annotation, dm.Annotation], AttributeMatchingResult
]


class MatchResult(NamedTuple):
    "The result of matching 2 sets of objects"

    matches: list[tuple[dm.Annotation, dm.Annotation]]
    "The matched pairs with the same labels"

    mismatches: list[tuple[dm.Annotation, dm.Annotation]]
    "The matched pairs with different labels"

    a_unmatched: list[dm.Annotation]
    b_unmatched: list[dm.Annotation]

    comparisons: dict[tuple[int, int], _PairwiseComparison] | None = None
    "The pairwise comparisons by the object ids, if requested"


@define(kw_only=True)
class ComparisonParameters:
    # Each field should either have a description, or use the default value
    # from DefaultComparisonSettings, which describes it.

    annotation_type: dm.AnnotationType
    "The compared annotation type"

    non_groupable_ann_type: dm.AnnotationType = dm.AnnotationType.label
    "Annotation type that can't be grouped"

    compare_attributes: bool = DefaultComparisonSettings.compare_attributes

    ignored_attributes: list[str] = field(factory=list)
    "Annotation attributes excluded from comparison, in addition to the internal ones"

    similarity_metric: ShapeSimilarityMetricType
    "Similarity metric to use for annotation comparisons"

    boundary_f_tolerance: float = DefaultComparisonSettings.boundary_f_tolerance
    boundary_f_threshold: float = DefaultComparisonSettings.boundary_f_threshold
    iou_threshold: float = DefaultComparisonSettings.iou_threshold
    oks_threshold: float = DefaultComparisonSettings.oks_threshold
    oks_sigma: float = DefaultComparisonSettings.oks_sigma
    point_size_base: PointSizeBase = DefaultComparisonSettings.point_size_base
    line_thickness: float = DefaultComparisonSettings.line_thickness
    compare_line_orientation: bool = DefaultComparisonSettings.compare_line_orientation
    line_orientation_threshold: float = DefaultComparisonSettings.line_orientation_threshold
    compare_groups: bool = DefaultComparisonSettings.compare_groups
    group_match_threshold: float = DefaultComparisonSettings.group_match_threshold
    check_covered_annotations: bool = DefaultComparisonSettings.check_covered_annotations
    object_visibility_threshold: float = DefaultComparisonSettings.object_visibility_threshold
    panoptic_comparison: bool = DefaultComparisonSettings.panoptic_comparison


def safe_divide(numerator: Any, denominator: Any, *, eps: float = 1e-7) -> Any:
    return numerator / max(denominator, eps)


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
        * np.exp(
            (visibility_a == visibility_b) * -safe_divide(dists**2, 2 * scale * (2 * sigma) ** 2)
        )
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


OUTSIDE_IMAGE_LIMIT_RELATIVE = 0.1
"The relative limit for the distance outside the image, relative to the image diagonal"

OUTSIDE_IMAGE_LIMIT_ABSOLUTE = 20
"The absolute limit for the distance outside the image, in pixels"


def get_outside_image_limit(*, img_h: int, img_w: int) -> int:
    """
    The maximum distance, which annotations can extend outside the image, in pixels.
    The annotation parts, extending farther, are ignored in the Boundary F comparisons.
    This also limits the computational costs for such annotations.

    The limit is the maximum of the absolute and relative limits.
    """

    return max(
        OUTSIDE_IMAGE_LIMIT_ABSOLUTE,
        math.ceil(OUTSIDE_IMAGE_LIMIT_RELATIVE * math.hypot(img_h, img_w)),
    )


class LtrbBox(NamedTuple):
    "A box of pixels (left, top, right, bottom). The right and bottom are exclusive"

    left: int
    top: int
    right: int
    bottom: int

    @classmethod
    def from_points_bbox(cls, bbox: Sequence[float]) -> LtrbBox:
        """
        The pixels of the rasterized points, from the points bbox (x, y, w, h).
        The points are rasterized into the nearest pixels, so the points on the right and bottom
        bbox borders are in the next pixels after the bbox.
        """

        x, y, w, h = bbox
        return cls(math.floor(x), math.floor(y), math.ceil(x + w) + 1, math.ceil(y + h) + 1)

    @property
    def shape(self) -> tuple[int, int]:
        "The array shape (height, width) of the box"
        return (self.bottom - self.top, self.right - self.left)

    def pad(self, padding: int) -> LtrbBox:
        return LtrbBox(
            self.left - padding, self.top - padding, self.right + padding, self.bottom + padding
        )

    def clip(self, limits: LtrbBox) -> LtrbBox:
        "The box can become empty, if it's outside the limits"
        left, top, right, bottom = limits
        return LtrbBox(
            *(int(v) for v in np.clip(self, (left, top, left, top), (right, bottom, right, bottom)))
        )


def get_image_roi(*, img_h: int, img_w: int) -> LtrbBox:
    """
    The region of interest (RoI), where the annotations can be located.
    It's the image, extended by the allowed distance outside the image on each side.
    """

    limit = get_outside_image_limit(img_h=img_h, img_w=img_w)
    return LtrbBox.from_points_bbox((-limit, -limit, img_w + 2 * limit, img_h + 2 * limit))


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


@define(frozen=True)
class MaterializedObjectBoundary:
    origin: tuple[int, int]
    "The window position in the image, (y, x)"

    points: np.ndarray
    "The boundary pixel coordinates in the image, (N, 2), (y, x)"

    distances: np.ndarray
    "The distance from each window pixel to the nearest boundary pixel"

    def coverage(self, other: MaterializedObjectBoundary, *, tolerance: float) -> float:
        "The share of the other boundary pixels within the tolerance from this boundary"
        if not len(other.points):
            return 0

        ys = other.points[:, 0] - self.origin[0]
        xs = other.points[:, 1] - self.origin[1]
        h, w = self.distances.shape
        inside = (0 <= ys) & (ys < h) & (0 <= xs) & (xs < w)
        close = np.zeros(len(other.points), dtype=bool)
        close[inside] = self.distances[ys[inside], xs[inside]] <= tolerance
        return float(np.count_nonzero(close)) / len(other.points)


@define(frozen=True)
class CompressedObjectBoundary:
    """
    The object boundary in a window around the object, stored compactly as RLE.
    The window covers the object bbox padded by the tolerance, the points outside the window
    are farther than the tolerance from the boundary.
    The pixel data is only available after materialization.
    """

    origin: tuple[int, int]
    "The window position in the image, (y, x)"

    rle: dict
    "The window boundary mask in the COCO RLE format"

    @staticmethod
    def window_padding(tolerance: float) -> int:
        "The window padding around the object bbox"
        return math.ceil(tolerance) + 1

    @classmethod
    def _window(cls, bbox: LtrbBox, *, tolerance: float, roi: LtrbBox) -> LtrbBox:
        "The window around the bbox, limited by the RoI. It can be empty, if the bbox is outside"
        return bbox.pad(cls.window_padding(tolerance)).clip(roi)

    @classmethod
    def _from_window_region(
        cls, region: np.ndarray, origin: tuple[int, int]
    ) -> CompressedObjectBoundary:
        "Region boundary is it's inner 1-px boundary"

        if region.size:  # OpenCV fails on empty arrays
            eroded = cv2.erode(
                region.astype(np.uint8),
                cv2.getStructuringElement(cv2.MORPH_CROSS, (3, 3)),
                borderType=cv2.BORDER_CONSTANT,
                borderValue=0,
            ).astype(bool)

            boundary = region & ~eroded
        else:
            boundary = region

        return cls._from_window_boundary(boundary, origin)

    @classmethod
    def _from_window_boundary(cls, boundary: np.ndarray, origin: tuple[int, int]):
        from pycocotools import mask as mask_utils

        rle = mask_utils.encode(np.asfortranarray(boundary, dtype=np.uint8))
        return cls(origin=origin, rle=rle)

    @classmethod
    def from_rle(
        cls,
        full_coco_rle: datumaro.util.mask_tools.Rle,
        *,
        tolerance: float,
        roi: LtrbBox,
    ) -> CompressedObjectBoundary:
        """
        Region boundary is it's inner 1-px boundary.
        The RLE covers the image, only the image part of the window is filled.
        """

        from pycocotools import mask as mask_utils

        img_h, img_w = full_coco_rle["size"]
        x, y, w, h = mask_utils.toBbox(full_coco_rle)
        window = cls._window(
            LtrbBox(int(x), int(y), math.ceil(x + w), math.ceil(y + h)),
            tolerance=tolerance,
            roi=roi,
        )
        region = np.zeros(window.shape, dtype=bool)

        # Paste the image part of the window
        image_part = window.clip(LtrbBox(0, 0, img_w, img_h))
        if all(image_part.shape):
            offset_x = image_part.left - window.left
            offset_y = image_part.top - window.top
            part_h, part_w = image_part.shape
            region[offset_y : offset_y + part_h, offset_x : offset_x + part_w] = mask_utils.decode(
                full_coco_rle
            )[image_part.top : image_part.bottom, image_part.left : image_part.right]

        return cls._from_window_region(region, (window.top, window.left))

    @classmethod
    def from_polygons(
        cls,
        polygons: Sequence[dm.Polygon],
        *,
        tolerance: float,
        roi: LtrbBox,
    ) -> CompressedObjectBoundary:
        """
        Region boundary is it's inner 1-px boundary.
        The polygons are rasterized in the window, the parts outside the window are clipped.
        """

        from pycocotools import mask as mask_utils

        window = cls._window(
            LtrbBox.from_points_bbox(datumaro.util.annotation_util.max_bbox(polygons)),
            tolerance=tolerance,
            roi=roi,
        )
        region = np.zeros(window.shape, dtype=bool)

        if region.size:
            # The same rasterization as in the IoU computations, but in the window coordinates.
            # The pixels can rarely differ by 1 at the rounding ties, because of the shift.
            window_polygons = [
                (np.reshape(polygon.points, (-1, 2)) - (window.left, window.top)).ravel().tolist()
                for polygon in polygons
            ]
            rles = mask_utils.frPyObjects(window_polygons, *region.shape)
            region = mask_utils.decode(mask_utils.merge(rles)).astype(bool)

        return cls._from_window_region(region, (window.top, window.left))

    @classmethod
    def from_polyline(
        cls, line: dm.PolyLine, *, tolerance: float, roi: LtrbBox
    ) -> CompressedObjectBoundary:
        """
        Line boundary is the rasterized line itself.
        The parts of the line outside the window are clipped.
        """

        window = cls._window(
            LtrbBox.from_points_bbox(line.get_bbox()), tolerance=tolerance, roi=roi
        )
        canvas = np.zeros(window.shape, dtype=np.uint8)

        if canvas.size:  # OpenCV fails on empty arrays
            shift = 4  # fractional bits of the point coordinates
            coords = np.reshape(line.points, (-1, 2)) - (window.left, window.top)
            window_coords = np.round(coords * (1 << shift)).astype(np.int32)
            cv2.polylines(
                canvas, [window_coords.reshape(-1, 1, 2)], isClosed=False, color=1, shift=shift
            )

        return cls._from_window_boundary(canvas.astype(bool), (window.top, window.left))

    def materialize(self) -> MaterializedObjectBoundary:
        from pycocotools import mask as mask_utils

        boundary = mask_utils.decode(self.rle).astype(bool)
        ys, xs = np.nonzero(boundary)
        points = np.stack([ys + self.origin[0], xs + self.origin[1]], axis=1)

        if boundary.size:
            # the exact Euclidean distance to the nearest boundary (zero) pixel
            distances = cv2.distanceTransform(
                (~boundary).astype(np.uint8), cv2.DIST_L2, cv2.DIST_MASK_PRECISE
            )
        else:
            # The window can be empty, e.g. for objects outside the image.
            # OpenCV crashes on the arrays with 0 width, but not on 0 height,
            # so all the empty arrays are skipped.
            distances = np.zeros(boundary.shape, dtype=np.float32)

        return MaterializedObjectBoundary(origin=self.origin, points=points, distances=distances)


class MaterializedBoundaryCache:
    """
    An LRU cache for materialized boundaries.

    Limits the number of the materialized boundaries, which can take a lot of memory.
    The capacity of 2 is enough for a pair of boundaries. When the cost matrix is computed
    line by line, the line object stays materialized, so it costs 1 materialization
    per compared pair.

    The cache keys are the boundary object ids, so the boundaries must stay alive
    while the cache is used.
    """

    def __init__(self, capacity: int = 2) -> None:
        self._capacity = capacity
        self._items: OrderedDict[int, MaterializedObjectBoundary] = OrderedDict()

    def get(self, boundary: CompressedObjectBoundary) -> MaterializedObjectBoundary:
        key = id(boundary)
        materialized = self._items.get(key)
        if materialized is not None:
            self._items.move_to_end(key)
            return materialized

        materialized = boundary.materialize()
        self._items[key] = materialized
        if len(self._items) > self._capacity:
            self._items.popitem(last=False)

        return materialized


def boundary_f(
    a: MaterializedObjectBoundary, b: MaterializedObjectBoundary, *, tolerance: float
) -> float:
    """
    Compute the Boundary F1 score.

    The score is defined as the F1 of the boundary precision and recall - the shares of
    each boundary within the tolerance from the other one.
    """

    precision = a.coverage(b, tolerance=tolerance)
    recall = b.coverage(a, tolerance=tolerance)

    if not precision + recall:
        return 0

    return 2 * precision * recall / (precision + recall)


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
        return sum(np.exp(-safe_divide(dists**2, 2 * scale * (2 * self.torso_r) ** 2))) / len(a)

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


class DistanceComparator:
    def __init__(
        self,
        categories: dm.CategoriesInfo,
        *,
        settings: ComparisonParameters,
        return_comparisons: bool = False,
        allow_groups: bool = True,
        attribute_matcher: AttributeMatchingFunction | None = None,
        gt_threshold: Callable[[Sequence[dm.Annotation]], float] | None = None,
    ):
        supported_metrics = self.SIMILARITY_METRICS.get(settings.annotation_type)
        if supported_metrics is None:
            raise AssertionError(f"Unsupported annotation type: {settings.annotation_type.name}")
        if settings.similarity_metric not in supported_metrics:
            raise AssertionError(
                f"The {settings.similarity_metric} similarity metric "
                f"is not supported for {settings.annotation_type.name} annotations"
            )

        self.categories = categories
        self.gt_threshold = gt_threshold
        self._skeleton_info = {}
        self.settings = settings
        self.return_comparisons = return_comparisons
        "Return the pairwise comparisons of the matched objects as the last result element"

        self.allow_groups = allow_groups
        """
        When comparing grouped annotations, consider all the group elements with the same label
        as the same annotation, if applicable. Affects polygons, masks, and points
        """

        self.attribute_matcher = attribute_matcher

    _SHAPE_METRICS = frozenset(
        {ShapeSimilarityMetricType.IOU, ShapeSimilarityMetricType.BOUNDARY_F}
    )
    SIMILARITY_METRICS: dict[dm.AnnotationType, frozenset[ShapeSimilarityMetricType]] = {
        dm.AnnotationType.label: frozenset({ShapeSimilarityMetricType.EQUALITY}),
        dm.AnnotationType.bbox: _SHAPE_METRICS,
        dm.AnnotationType.ellipse: _SHAPE_METRICS,
        dm.AnnotationType.polygon: _SHAPE_METRICS,
        dm.AnnotationType.mask: _SHAPE_METRICS,
        dm.AnnotationType.polyline: _SHAPE_METRICS,
        dm.AnnotationType.points: frozenset({ShapeSimilarityMetricType.OKS}),
        dm.AnnotationType.skeleton: frozenset({ShapeSimilarityMetricType.OKS}),
    }
    "The similarity metrics supported for each annotation type"

    @property
    def _annotation_match_threshold(self) -> float:
        match self.settings.similarity_metric:
            case ShapeSimilarityMetricType.BOUNDARY_F:
                return self.settings.boundary_f_threshold
            case ShapeSimilarityMetricType.OKS:
                return self.settings.oks_threshold
            case ShapeSimilarityMetricType.IOU:
                return self.settings.iou_threshold
            case ShapeSimilarityMetricType.EQUALITY:
                return 0.5
            case _:
                assert False, f"Unknown similarity metric '{self.settings.similarity_metric}'"

    def _make_boundary_f_similarity(
        self,
        *,
        get_a_bbox: Callable[[_ShapeT1], tuple[float, float, float, float]],
        get_b_bbox: Callable[[_ShapeT2], tuple[float, float, float, float]],
        get_a_boundary: Callable[[_ShapeT1], CompressedObjectBoundary],
        get_b_boundary: Callable[[_ShapeT2], CompressedObjectBoundary],
        object_key: Callable[[_ShapeT1 | _ShapeT2], Hashable] = id,
    ) -> ShapeSimilarityFunction[_ShapeT1, _ShapeT2]:
        """
        Boundary F similarity of the objects.
        The bboxes (x, y, w, h) allow to skip the far objects without computing the boundaries.
        The bboxes and the boundaries are computed once per object, identified by object_key.
        """

        def _memoize(fn: Callable[[Any], Any]) -> Callable[[Any], Any]:
            cache = {}

            def memoized(obj):
                key = object_key(obj)
                value = cache.get(key)
                if value is None:
                    value = fn(obj)
                    cache[key] = value
                return value

            return memoized

        get_a_bbox = _memoize(get_a_bbox)
        get_b_bbox = _memoize(get_b_bbox)
        get_a_boundary = _memoize(get_a_boundary)
        get_b_boundary = _memoize(get_b_boundary)
        materialized_boundaries = MaterializedBoundaryCache()

        # The boundary windows are the bboxes padded by this margin,
        # the boundaries can only be within the tolerance, if the windows intersect
        margin = CompressedObjectBoundary.window_padding(self.settings.boundary_f_tolerance)

        def _similarity(a: _ShapeT1, b: _ShapeT2) -> float:
            ax, ay, aw, ah = get_a_bbox(a)
            bx, by, bw, bh = get_b_bbox(b)
            if (
                ax + aw + 2 * margin <= bx
                or bx + bw + 2 * margin <= ax
                or ay + ah + 2 * margin <= by
                or by + bh + 2 * margin <= ay
            ):
                return 0

            similarity = boundary_f(
                materialized_boundaries.get(get_a_boundary(a)),
                materialized_boundaries.get(get_b_boundary(b)),
                tolerance=self.settings.boundary_f_tolerance,
            )

            return similarity

        return _similarity

    def instance_bbox(
        self, instance_anns: Sequence[dm.Annotation]
    ) -> tuple[float, float, float, float]:
        return datumaro.util.annotation_util.max_bbox(
            a.get_bbox() if isinstance(a, dm.Skeleton) else a
            for a in instance_anns
            if hasattr(a, "get_bbox") and not a.attributes.get("outside", False)
        )

    @staticmethod
    def to_polygon(bbox_ann: dm.Bbox | dm.Ellipse) -> dm.Polygon:
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

    def _match_ann_type(self, t: dm.AnnotationType, *args) -> MatchResult:
        match t:
            case dm.AnnotationType.label:
                return self.match_labels(*args)
            case dm.AnnotationType.bbox:
                return self.match_boxes(*args)
            case dm.AnnotationType.polygon | dm.AnnotationType.mask:
                return self.match_segmentations(*args)
            case dm.AnnotationType.points:
                return self.match_points(*args)
            case dm.AnnotationType.skeleton:
                return self.match_skeletons(*args)
            case dm.AnnotationType.polyline:
                return self.match_lines(*args)
            case dm.AnnotationType.ellipse:
                return self.match_ellipses(*args)
            case _:
                assert False, f"Matching is not supported for annotations of type '{t}'"

    def match_labels(self, item_a: dm.DatasetItem, item_b: dm.DatasetItem) -> MatchResult:
        if self.settings.similarity_metric != ShapeSimilarityMetricType.EQUALITY:
            raise AssertionError(
                f"Similarity metric '{self.settings.similarity_metric}' is not available for tags"
            )

        def label_similarity(a: dm.Label, b: dm.Label) -> float:
            if a is None or b is None:
                return 0
            return 0.5 + (a.label == b.label) / 2

        return self.match_segments(
            dm.AnnotationType.label,
            item_a,
            item_b,
            similarity=label_similarity,
            label_matcher=lambda a, b: a.label == b.label,
            dist_thresh=self._annotation_match_threshold,
            compare_attributes=False,
        )

    def match_segments(
        self,
        t: dm.AnnotationType,
        item_a: dm.DatasetItem,
        item_b: dm.DatasetItem,
        *,
        similarity: ShapeSimilarityFunction[_ShapeT1, _ShapeT2],
        label_matcher: LabelEqualityFunction[_ShapeT1, _ShapeT2] | None = None,
        a_objs: Sequence[_ShapeT1] | None = None,
        b_objs: Sequence[_ShapeT2] | None = None,
        dist_thresh: float | None = None,
        a_annotations_getter: Callable[[_ShapeT1], Sequence[dm.Annotation]] | None = None,
        b_annotations_getter: Callable[[_ShapeT2], Sequence[dm.Annotation]] | None = None,
        directed_similarity: ShapeSimilarityFunction[_ShapeT1, _ShapeT2] | None = None,
        undirected_similarity: ShapeSimilarityFunction[_ShapeT1, _ShapeT2] | None = None,
        direction_threshold: float | None = None,
        compare_attributes: bool = True,
    ) -> MatchResult:
        """
        If the similarity metric used can respect object direction, the optional direction check
        can be performed. To enabled, pass all of the 'directed_similarity',
        'undirected_similarity' and 'direction_threshold' parameters. The callbacks must
        follow the conventions:
        - 'undirected_similarity' ignores the object direction,
          'directed_similarity' takes it into account
        - both callbacks belong to the same metric family, and the directed similarity
          if always <= the undirected one for the same pair of objects
        - if the base 'similarity' is from the same metric family, the same function object
          must be passed as 'undirected_similarity'. Then the directed similarity is used as
          the matching cost. Otherwise, the base similarity is used as the matching cost,
          and the directed and undirected similarities are only used for the direction check.

        A direction mismatch is reported, if the undirected similarity exceeds the directed
        one by more than 'direction_threshold'.
        """

        assert (
            (directed_similarity is None)
            == (undirected_similarity is None)
            == (direction_threshold is None)
        ), (
            "'directed_similarity', 'undirected_similarity' and 'direction_threshold' "
            "must be used together"
        )

        if a_objs is None:
            a_objs = self._get_ann_type(t, item_a)
        if b_objs is None:
            b_objs = self._get_ann_type(t, item_b)

        if a_annotations_getter is None:
            a_annotations_getter = self._as_annotation_sequence
        if b_annotations_getter is None:
            b_annotations_getter = self._as_annotation_sequence

        def _compare(a: _ShapeT1, b: _ShapeT2) -> _PairwiseComparison:
            geometry_similarity_score = similarity(a, b)

            direction_mismatch = False
            if directed_similarity:
                directed_similarity_score = directed_similarity(a, b)

                if undirected_similarity is similarity:
                    # The same metric family: the directed score is the matching cost
                    undirected_similarity_score = geometry_similarity_score
                    geometry_similarity_score = directed_similarity_score
                else:
                    # Different metric families: only check the direction
                    undirected_similarity_score = undirected_similarity(a, b)

                direction_mismatch = (
                    undirected_similarity_score - directed_similarity_score > direction_threshold
                )

            conflicting_attribute_names: set[str] = set()
            if compare_attributes and self.attribute_matcher:
                for a_ann, b_ann in itertools.product(
                    a_annotations_getter(a),
                    b_annotations_getter(b),
                ):
                    attribute_result = self.attribute_matcher(a_ann, b_ann)
                    conflicting_attribute_names.update(attribute_result.conflicting_names)

            return _PairwiseComparison(
                geometry_similarity=geometry_similarity_score,
                conflicting_attribute_names=tuple(sorted(conflicting_attribute_names)),
                direction_mismatch=direction_mismatch,
            )

        compare, comparisons = self._make_memoizing_comparison(_compare)

        if not a_objs and not b_objs:
            comparisons = {}
            matches, mismatches, a_unmatched, b_unmatched = [], [], [], []
        else:
            extra_args = {}
            if label_matcher:
                extra_args["label_matcher"] = label_matcher

            threshold = dist_thresh if dist_thresh is not None else self._annotation_match_threshold
            if (
                self.gt_threshold
                and dist_thresh is None
                and t
                in {
                    dm.AnnotationType.bbox,
                    dm.AnnotationType.polygon,
                    dm.AnnotationType.mask,
                    dm.AnnotationType.ellipse,
                }
            ):
                threshold = lambda a: self.gt_threshold(a_annotations_getter(a))

            matches, mismatches, a_unmatched, b_unmatched = match_segments(
                a_objs,
                b_objs,
                distance=lambda a, b: compare(a, b).similarity,
                dist_thresh=threshold,
                **extra_args,
            )

        return MatchResult(
            matches,
            mismatches,
            a_unmatched,
            b_unmatched,
            comparisons=comparisons if self.return_comparisons else None,
        )

    def match_boxes(self, item_a: dm.DatasetItem, item_b: dm.DatasetItem) -> MatchResult:
        def _bbox_iou(a: dm.Bbox, b: dm.Bbox, *, img_w: int, img_h: int) -> float:
            if a.attributes.get("rotation", 0) == b.attributes.get("rotation", 0):
                return datumaro.util.annotation_util.bbox_iou(a, b)
            else:
                return segment_iou(self.to_polygon(a), self.to_polygon(b), img_h=img_h, img_w=img_w)

        img_h, img_w = item_a.media_as(dm.Image).size
        similarity = partial(_bbox_iou, img_h=img_h, img_w=img_w)
        if self.settings.similarity_metric == ShapeSimilarityMetricType.BOUNDARY_F:
            similarity = self._make_polygonal_boundary_f(img_h=img_h, img_w=img_w)
        elif self.settings.similarity_metric != ShapeSimilarityMetricType.IOU:
            raise AssertionError(
                f"Similarity metric '{self.settings.similarity_metric}' is not available for boxes"
            )

        return self.match_segments(dm.AnnotationType.bbox, item_a, item_b, similarity=similarity)

    def match_ellipses(self, item_a: dm.DatasetItem, item_b: dm.DatasetItem) -> MatchResult:
        def _ellipse_iou(a: dm.Ellipse, b: dm.Ellipse, *, img_w: int, img_h: int) -> float:
            return segment_iou(self.to_polygon(a), self.to_polygon(b), img_h=img_h, img_w=img_w)

        img_h, img_w = item_a.media_as(dm.Image).size
        similarity = partial(_ellipse_iou, img_h=img_h, img_w=img_w)
        if self.settings.similarity_metric == ShapeSimilarityMetricType.BOUNDARY_F:
            similarity = self._make_polygonal_boundary_f(img_h=img_h, img_w=img_w)
        elif self.settings.similarity_metric != ShapeSimilarityMetricType.IOU:
            raise AssertionError(
                f"Similarity metric '{self.settings.similarity_metric}' "
                "is not available for ellipses"
            )

        return self.match_segments(dm.AnnotationType.ellipse, item_a, item_b, similarity=similarity)

    def _make_polygonal_boundary_f(
        self,
        *,
        img_h: int,
        img_w: int,
    ) -> ShapeSimilarityFunction[dm.Annotation, dm.Annotation]:
        roi = get_image_roi(img_h=img_h, img_w=img_w)

        def _get_boundary(ann: dm.Annotation) -> CompressedObjectBoundary:
            return CompressedObjectBoundary.from_polygons(
                [self.to_polygon(ann)],
                tolerance=self.settings.boundary_f_tolerance,
                roi=roi,
            )

        def _get_bbox(ann: dm.Annotation) -> tuple[float, float, float, float]:
            # the rotation can extend the bbox
            return self.to_polygon(ann).get_bbox()

        return self._make_boundary_f_similarity(
            get_a_bbox=_get_bbox,
            get_b_bbox=_get_bbox,
            get_a_boundary=_get_boundary,
            get_b_boundary=_get_boundary,
        )

    def match_segmentations(self, item_a: dm.DatasetItem, item_b: dm.DatasetItem) -> MatchResult:
        def _get_segmentations(item):
            return self._get_ann_type(self.settings.annotation_type, item)

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

        if self.settings.panoptic_comparison:
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

        def _segment_iou(a_inst_id: int, b_inst_id: int) -> float:
            a_segm = _get_segment(a_inst_id, compiled_mask=a_compiled_mask, instances=a_instances)
            b_segm = _get_segment(b_inst_id, compiled_mask=b_compiled_mask, instances=b_instances)

            from pycocotools import mask as mask_utils

            return float(mask_utils.iou([b_segm], [a_segm], [0])[0])

        if self.settings.similarity_metric == ShapeSimilarityMetricType.BOUNDARY_F:

            def _get_boundary(
                obj_id: int, *, compiled_mask: dm.CompiledMask | None, instances: list
            ) -> CompressedObjectBoundary:
                segment = _get_segment(obj_id, compiled_mask=compiled_mask, instances=instances)
                return CompressedObjectBoundary.from_rle(
                    segment,
                    tolerance=self.settings.boundary_f_tolerance,
                    roi=get_image_roi(img_h=img_h, img_w=img_w),
                )

            def _get_bbox(obj_id: int, *, instances: list) -> tuple[float, float, float, float]:
                # the visible parts can only be smaller than the whole instance
                return datumaro.util.annotation_util.max_bbox(instances[obj_id])

            _segment_comparator = self._make_boundary_f_similarity(
                get_a_bbox=partial(_get_bbox, instances=a_instances),
                get_b_bbox=partial(_get_bbox, instances=b_instances),
                get_a_boundary=partial(
                    _get_boundary, compiled_mask=a_compiled_mask, instances=a_instances
                ),
                get_b_boundary=partial(
                    _get_boundary, compiled_mask=b_compiled_mask, instances=b_instances
                ),
                object_key=lambda obj_id: obj_id,  # the instance indices
            )
        elif self.settings.similarity_metric == ShapeSimilarityMetricType.IOU:
            _segment_comparator = _segment_iou
        else:
            raise AssertionError(
                f"Similarity metric '{self.settings.similarity_metric}' "
                "is not available for polygons and masks"
            )

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
            similarity=_segment_comparator,
            label_matcher=_label_matcher,
            a_annotations_getter=lambda instance_id: a_instances[instance_id],
            b_annotations_getter=lambda instance_id: b_instances[instance_id],
        )

        # restore results for original annotations
        matched, mismatched, a_extra, b_extra, distances = results

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

        if self.return_comparisons:
            distances = {
                (id(ia_a), id(ia_b)): dist
                for (i_a, i_b), dist in distances.items()
                for ia_a, ia_b in itertools.product(a_instances[i_a], b_instances[i_b])
            }

        return MatchResult(matched, mismatched, a_extra, b_extra, comparisons=distances)

    def match_lines(self, item_a: dm.DatasetItem, item_b: dm.DatasetItem) -> MatchResult:
        img_h, img_w = item_a.media_as(dm.Image).size

        if self.settings.similarity_metric == ShapeSimilarityMetricType.BOUNDARY_F:
            # The line IoU is only used for the orientation check here,
            # the line thickness is defined by the boundary tolerance
            line_thickness = self.settings.boundary_f_tolerance / math.sqrt(img_h * img_w)
        else:
            line_thickness = self.settings.line_thickness

        def _make_line_iou_matcher(*, oriented: bool) -> LineMatcher:
            return LineMatcher(
                oriented=oriented,
                torso_r=line_thickness,
                scale=img_h * img_w,
            )

        undirected_line_iou = _make_line_iou_matcher(oriented=False).distance

        if self.settings.similarity_metric == ShapeSimilarityMetricType.BOUNDARY_F:

            def _get_boundary(ann: dm.PolyLine) -> CompressedObjectBoundary:
                return CompressedObjectBoundary.from_polyline(
                    ann,
                    tolerance=self.settings.boundary_f_tolerance,
                    roi=get_image_roi(img_h=img_h, img_w=img_w),
                )

            base_similarity = self._make_boundary_f_similarity(
                get_a_bbox=dm.PolyLine.get_bbox,
                get_b_bbox=dm.PolyLine.get_bbox,
                get_a_boundary=_get_boundary,
                get_b_boundary=_get_boundary,
            )

        elif self.settings.similarity_metric == ShapeSimilarityMetricType.IOU:
            base_similarity = undirected_line_iou
        else:
            raise AssertionError(
                f"Similarity metric '{self.settings.similarity_metric}' is not available for lines"
            )

        direction_args = {}
        if self.settings.compare_line_orientation:
            # Boundary F itself ignores the line orientation, so IoU is used always
            direction_args = dict(
                directed_similarity=_make_line_iou_matcher(oriented=True).distance,
                undirected_similarity=undirected_line_iou,
                direction_threshold=self.settings.line_orientation_threshold,
            )

        return self.match_segments(
            dm.AnnotationType.polyline,
            item_a,
            item_b,
            similarity=base_similarity,
            **direction_args,
        )

    def match_points(self, item_a: dm.DatasetItem, item_b: dm.DatasetItem) -> MatchResult:
        if self.settings.similarity_metric != ShapeSimilarityMetricType.OKS:
            raise AssertionError(
                f"Similarity metric '{self.settings.similarity_metric}' is not available for points"
            )

        a_points = self._get_ann_type(dm.AnnotationType.points, item_a)
        b_points = self._get_ann_type(dm.AnnotationType.points, item_b)

        if not a_points and not b_points:
            return MatchResult([], [], [], [], comparisons={} if self.return_comparisons else None)

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
                return oks(a, b, sigma=self.settings.oks_sigma, scale=img_h * img_w)

            else:
                # Complex case: multiple points, grouped points, points with a bbox
                # Try to align points and then return the metric

                if self.settings.point_size_base == PointSizeBase.IMAGE_SIZE:
                    scale = img_h * img_w
                elif self.settings.point_size_base == PointSizeBase.GROUP_BBOX_SIZE:
                    # match points in their bbox space

                    if datumaro.util.annotation_util.bbox_iou(a_bbox, b_bbox) <= 0:
                        # this early exit may not work for points forming an axis-aligned line
                        return 0

                    bbox = datumaro.util.annotation_util.mean_bbox([a_bbox, b_bbox])
                    scale = bbox[2] * bbox[3]
                else:
                    assert False, f"Unknown point size base {self.settings.point_size_base}"

                a_points = np.reshape(a.points, (-1, 2))
                b_points = np.reshape(b.points, (-1, 2))

                matches, mismatches, a_extra, b_extra = match_segments(
                    range(len(a_points)),
                    range(len(b_points)),
                    distance=lambda ai, bi: oks(
                        dm.Points(a_points[ai]),
                        dm.Points(b_points[bi]),
                        sigma=self.settings.oks_sigma,
                        scale=scale,
                    ),
                    dist_thresh=self.settings.oks_threshold,
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
                return np.sum(
                    np.exp(-safe_divide(dists**2, 2 * scale * (2 * self.settings.oks_sigma) ** 2))
                ) / (len(matched_points) + len(a_extra) + len(b_extra))

        return self.match_segments(
            dm.AnnotationType.points,
            item_a,
            item_b,
            a_objs=a_points,
            b_objs=b_points,
            similarity=_distance,
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

    def match_skeletons(self, item_a, item_b) -> MatchResult:
        if self.settings.similarity_metric != ShapeSimilarityMetricType.OKS:
            raise AssertionError(
                f"Similarity metric '{self.settings.similarity_metric}' "
                "is not available for skeletons"
            )

        a_skeletons = self._get_ann_type(dm.AnnotationType.skeleton, item_a)
        b_skeletons = self._get_ann_type(dm.AnnotationType.skeleton, item_b)
        if not a_skeletons and not b_skeletons:
            return MatchResult([], [], [], [], comparisons={} if self.return_comparisons else None)

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

        matcher = KeypointsMatcher(instance_map=instance_map, sigma=self.settings.oks_sigma)

        results = self.match_segments(
            dm.AnnotationType.points,
            item_a,
            item_b,
            a_objs=a_points,
            b_objs=b_points,
            similarity=matcher.distance,
            a_annotations_getter=lambda points: [points_map[id(points)]],
            b_annotations_getter=lambda points: [points_map[id(points)]],
        )

        matched, mismatched, a_extra, b_extra, distances = results

        matched = [(points_map[id(p_a)], points_map[id(p_b)]) for (p_a, p_b) in matched]
        mismatched = [(points_map[id(p_a)], points_map[id(p_b)]) for (p_a, p_b) in mismatched]
        a_extra = [points_map[id(p_a)] for p_a in a_extra]
        b_extra = [points_map[id(p_b)] for p_b in b_extra]

        # Map points back to skeletons
        if self.return_comparisons:
            distances = {
                (id(points_map[p_a_id]), id(points_map[p_b_id])): dist
                for (p_a_id, p_b_id), dist in distances.items()
            }

        return MatchResult(matched, mismatched, a_extra, b_extra, comparisons=distances)

    @staticmethod
    def _as_annotation_sequence(obj: Any) -> Sequence[dm.Annotation]:
        if isinstance(obj, dm.Annotation):
            return [obj]

        return []

    @classmethod
    def _make_memoizing_comparison(
        cls,
        comparison_function: Callable[[Any, Any], _PairwiseComparison],
    ) -> tuple[
        Callable[[Any, Any], _PairwiseComparison],
        dict[tuple[int, int], _PairwiseComparison],
    ]:
        comparisons = {}
        notfound = object()

        def memoizing_comparison(a: Any, b: Any) -> _PairwiseComparison:
            if isinstance(a, int) and isinstance(b, int):
                key = (a, b)
            else:
                key = (id(a), id(b))

            comparison = comparisons.get(key, notfound)

            if comparison is notfound:
                comparison = comparison_function(a, b)
                comparisons[key] = comparison

            return cast(_PairwiseComparison, comparison)

        return memoizing_comparison, comparisons

    def match_annotations(
        self, item_a: dm.DatasetItem, item_b: dm.DatasetItem
    ) -> dict[dm.AnnotationType, MatchResult]:
        return {
            self.settings.annotation_type: self._match_ann_type(
                self.settings.annotation_type, item_a, item_b
            )
        }


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
    IGNORED_ATTRIBUTES = frozenset(
        {
            "track_id",  # changes from task to task, can't be defined manually with the same name
            "keyframe",  # indicates the way annotation obtained, meaningless to compare
            "z_order",  # changes from frame to frame, compared by other means
            "group",  # changes from job to job, compared by other means
            "rotation",  # handled by other means
            "outside",  # handled by other means
            "score",  # builtin, meaningless to compare
            CVAT_ATTRIBUTE_SPEC_IDS_ATTR,  # internal mapping used by quality attribute rules
        }
    )

    def __init__(
        self,
        categories: dm.CategoriesInfo,
        *,
        settings: ComparisonParameters,
        attribute_matcher: AttributeMatchingFunction | None = None,
        gt_threshold: Callable[[Sequence[dm.Annotation]], float] | None = None,
    ):
        self.ignored_attrs = set(settings.ignored_attributes) | self.IGNORED_ATTRIBUTES
        self.included_ann_types = [settings.annotation_type]
        self.non_groupable_ann_type = settings.non_groupable_ann_type
        self._annotation_comparator = DistanceComparator(
            categories,
            settings=settings,
            return_comparisons=True,
            attribute_matcher=attribute_matcher if settings.compare_attributes else None,
            gt_threshold=gt_threshold,
        )
        self.coverage_threshold = settings.object_visibility_threshold
        self.group_match_threshold = settings.group_match_threshold

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

    def match_annotations(self, item_a: dm.DatasetItem, item_b: dm.DatasetItem) -> MatchingResults:
        per_type_results = self._annotation_comparator.match_annotations(item_a, item_b)

        merged_results = MatchResult([], [], [], [], comparisons={})
        shape_merged_results = MatchResult([], [], [], [], comparisons={})
        for annotation_type, results in per_type_results.items():
            targets = [merged_results]
            if annotation_type != dm.AnnotationType.label:
                targets.append(shape_merged_results)

            for target in targets:
                target.matches.extend(results.matches)
                target.mismatches.extend(results.mismatches)
                target.a_unmatched.extend(results.a_unmatched)
                target.b_unmatched.extend(results.b_unmatched)
                target.comparisons.update(results.comparisons)

        return {"all_ann_types": merged_results, "all_shape_ann_types": shape_merged_results}

    def get_comparison(
        self,
        pairwise_comparisons: dict[tuple[int, int], _PairwiseComparison],
        gt_ann: dm.Annotation,
        ds_ann: dm.Annotation,
    ) -> _PairwiseComparison | None:
        return pairwise_comparisons.get((id(gt_ann), id(ds_ann)))


class MatchingResults(TypedDict):
    all_ann_types: MatchResult
    all_shape_ann_types: MatchResult
