# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import itertools
from collections.abc import Callable, Sequence
from typing import NamedTuple, TypeAlias, TypeVar

import numpy as np
from attrs import define
from scipy.optimize import linear_sum_assignment

from cvat.apps.dataset_manager import data_model as cdm

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


@define(frozen=True)
class AttributeMatchingResult:
    matches: tuple[str, ...] = ()
    mismatches: tuple[str, ...] = ()
    a_only: tuple[str, ...] = ()
    b_only: tuple[str, ...] = ()

    @property
    def conflicting_names(self) -> tuple[str, ...]:
        return tuple(sorted({*self.mismatches, *self.a_only, *self.b_only}))


AttributeMatchingFunction: TypeAlias = Callable[
    [cdm.Annotation, cdm.Annotation], AttributeMatchingResult
]


@define(frozen=True)
class PairwiseComparison:
    geometry_similarity: float
    base_geometry_similarity: float
    conflicting_attribute_names: tuple[str, ...] = ()
    direction_mismatch: bool = False

    @property
    def similarity(self) -> float:
        if self.conflicting_attribute_names or self.direction_mismatch:
            return 0

        return self.geometry_similarity


def _match_segments_once(
    a_segms: Sequence[_ShapeT1],
    b_segms: Sequence[_ShapeT2],
    *,
    distance: ShapeSimilarityFunction[_ShapeT1, _ShapeT2],
    dist_thresh: float = 1.0,
    label_matcher: LabelEqualityFunction[_ShapeT1, _ShapeT2] = lambda a, b: a.label == b.label,
) -> SegmentMatchingResult[_ShapeT1, _ShapeT2]:
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


def match_segments(
    a_segms: Sequence[_ShapeT1],
    b_segms: Sequence[_ShapeT2],
    *,
    distance: ShapeSimilarityFunction[_ShapeT1, _ShapeT2],
    dist_thresh: float = 1.0,
    label_matcher: LabelEqualityFunction[_ShapeT1, _ShapeT2] = lambda a, b: a.label == b.label,
) -> SegmentMatchingResult[_ShapeT1, _ShapeT2]:
    assert callable(distance), distance
    assert callable(label_matcher), label_matcher

    def _same_label_distance(a: _ShapeT1, b: _ShapeT2) -> float:
        if not label_matcher(a, b):
            return 0

        return distance(a, b)

    matches, _, a_unmatched, b_unmatched = _match_segments_once(
        a_segms,
        b_segms,
        distance=_same_label_distance,
        dist_thresh=dist_thresh,
        label_matcher=label_matcher,
    )
    if not a_unmatched or not b_unmatched:
        return matches, [], a_unmatched, b_unmatched

    extra_matches, mismatches, a_unmatched, b_unmatched = _match_segments_once(
        a_unmatched,
        b_unmatched,
        distance=distance,
        dist_thresh=dist_thresh,
        label_matcher=label_matcher,
    )

    return matches + extra_matches, mismatches, a_unmatched, b_unmatched


@define(frozen=True)
class GroupComparison:
    """Group sizes and matching result for a pair of annotations."""

    gt_annotation: cdm.Annotation
    ds_annotation: cdm.Annotation
    gt_group_size: int
    ds_group_size: int
    groups_match: bool


class AnnotationMatches(NamedTuple):
    matches: list[tuple[cdm.Annotation, cdm.Annotation]]
    mismatches: list[tuple[cdm.Annotation, cdm.Annotation]]
    gt_unmatched: list[cdm.Annotation]
    ds_unmatched: list[cdm.Annotation]
    comparisons: dict[tuple[int, int], PairwiseComparison]


@define(frozen=True)
class MatchingResults:
    all_ann_types: AnnotationMatches
    all_shape_ann_types: AnnotationMatches
    covered_annotations: list[cdm.Annotation]
    group_comparisons: list[GroupComparison]
