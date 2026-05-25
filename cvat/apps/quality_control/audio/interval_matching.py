# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from typing import Callable, Sequence

from .config import IntervalMatchingConfig
from .data import Interval
from .reports import BoundaryAgreement, IntervalPairMetrics, IntervalReport


def iou(a: Interval, b: Interval) -> float:
    lo = max(a.start, b.start)
    hi = min(a.stop, b.stop)
    inter = hi - lo
    if inter <= 0:
        return 0.0
    uni = max(a.stop, b.stop) - min(a.start, b.start)
    return inter / uni if uni > 0 else 0.0


def _label_eq(a: Interval, b: Interval) -> bool:
    return a.label == b.label


def _hungarian_match(
    gt: Sequence[Interval],
    ds: Sequence[Interval],
    *,
    distance: Callable[[Interval, Interval], float],
    iou_thresh: float,
    label_matcher: Callable[[Interval, Interval], bool] = _label_eq,
) -> tuple[
    list[tuple[Interval, Interval]],
    list[tuple[Interval, Interval]],
    list[Interval],
    list[Interval],
]:
    from cvat.apps.quality_control.quality_reports import match_segments

    return match_segments(
        gt, ds, distance=distance, dist_thresh=iou_thresh, label_matcher=label_matcher
    )


def _two_stage_match(gt: Sequence[Interval], ds: Sequence[Interval], *, iou_thresh: float) -> tuple[
    list[tuple[Interval, Interval]],
    list[tuple[Interval, Interval]],
    list[Interval],
    list[Interval],
]:
    """Two-pass Hungarian: first pass prefers same-label pairs, second pass
    picks up remaining different-label pairs. Keeps high-quality label
    matches from getting outbid by IoU-only matches with the wrong label."""

    def iou_with_label(a: Interval, b: Interval) -> float:
        return iou(a, b) if _label_eq(a, b) else 0.0

    matches, _, gt_u, ds_u = _hungarian_match(
        gt, ds, distance=iou_with_label, iou_thresh=iou_thresh
    )
    _, mispred, gt_u, ds_u = _hungarian_match(gt_u, ds_u, distance=iou, iou_thresh=iou_thresh)
    return matches, mispred, gt_u, ds_u


def _collect_boundaries(intervals: Sequence[Interval]) -> list[float]:
    pts: list[float] = []
    for iv in intervals:
        pts.append(iv.start)
        pts.append(iv.stop)
    return sorted(pts)


def boundary_f1(
    ref_boundaries: Sequence[float],
    hyp_boundaries: Sequence[float],
    *,
    tolerance_s: float,
) -> BoundaryAgreement:
    """Greedy nearest-neighbor matching of boundary timestamps within a
    fixed temporal tolerance. Returns precision / recall / F1 plus
    raw tp / fp / fn counts."""

    matched: set[int] = set()
    tp = 0
    for r in ref_boundaries:
        best_idx = -1
        best_d = tolerance_s + 1e-9
        for i, h in enumerate(hyp_boundaries):
            if i in matched:
                continue
            d = abs(r - h)
            if d <= best_d:
                best_idx, best_d = i, d
        if best_idx >= 0 and best_d <= tolerance_s:
            matched.add(best_idx)
            tp += 1
    fp = len(hyp_boundaries) - len(matched)
    fn = len(ref_boundaries) - tp
    precision = tp / (tp + fp) if (tp + fp) else 1.0
    recall = tp / (tp + fn) if (tp + fn) else 1.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0
    return BoundaryAgreement(tp=tp, fp=fp, fn=fn, precision=precision, recall=recall, f1=f1)


def match_intervals(
    gt: Sequence[Interval], ds: Sequence[Interval], *, config: IntervalMatchingConfig
) -> IntervalReport:
    """
    Compare intervals at the boundary level. This function does not touch transcriptions.

    Pairs GT and DS intervals by IoU + label using a two-stage Hungarian
    assignment, then derives per-pair spatial metrics (IoU, onset / offset
    deltas, label match). Boundary-F1 also lives here because it is a
    purely temporal metric — it cares where intervals start / stop, not
    what they contain.
    """

    matches, mispred, gt_unmatched, ds_unmatched = _two_stage_match(
        gt, ds, iou_thresh=config.iou_threshold
    )

    def to_metric(a: Interval, b: Interval) -> IntervalPairMetrics:
        return IntervalPairMetrics(
            gt=a,
            ds=b,
            iou=iou(a, b),
            onset_delta=b.start - a.start,
            offset_delta=b.stop - a.stop,
            label_match=_label_eq(a, b),
        )

    boundary = boundary_f1(
        _collect_boundaries(gt),
        _collect_boundaries(ds),
        tolerance_s=config.boundary_tolerance_s,
    )

    return IntervalReport(
        matches=[to_metric(a, b) for a, b in matches],
        label_mismatches=[to_metric(a, b) for a, b in mispred],
        gt_unmatched=gt_unmatched,
        ds_unmatched=ds_unmatched,
        iou_threshold=config.iou_threshold,
        low_overlap_threshold=config.low_overlap_threshold,
        boundary_tolerance_s=config.boundary_tolerance_s,
        boundary=boundary,
    )
