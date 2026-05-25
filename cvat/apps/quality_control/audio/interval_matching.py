"""
L1 layer of the audio QE pipeline — interval-level matching.

Pairs GT and DS intervals by IoU + label using a two-stage Hungarian
assignment, then derives per-pair spatial metrics (IoU, onset / offset
deltas, label match). Boundary-F1 also lives here because it is a
purely temporal metric — it cares where intervals start / stop, not
what they contain.

This module does not touch the transcription content of intervals.
That's `transcription_matching.py`.
"""

from __future__ import annotations

from typing import Callable, Sequence

import numpy as np
from scipy.optimize import linear_sum_assignment

from .config import IntervalMatchingConfig
from .data import AnnotationSet, Interval
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
    n = max(len(gt), len(ds), 1)
    cost = np.ones((n, n), dtype=float)
    for i, a in enumerate(gt):
        for j, b in enumerate(ds):
            cost[i, j] = 1 - distance(a, b)
    cost[cost > 1 - iou_thresh] = 1

    if gt and ds:
        rows, cols = linear_sum_assignment(cost)
    else:
        rows, cols = [], []

    matches: list[tuple[Interval, Interval]] = []
    mispred: list[tuple[Interval, Interval]] = []
    matched_gt_ids: set[int] = set()
    matched_ds_ids: set[int] = set()

    for r, c in zip(rows, cols):
        if cost[r, c] >= 1 or r >= len(gt) or c >= len(ds):
            continue
        a, b = gt[r], ds[c]
        matched_gt_ids.add(a.id)
        matched_ds_ids.add(b.id)
        (matches if label_matcher(a, b) else mispred).append((a, b))

    gt_u = [iv for iv in gt if iv.id not in matched_gt_ids]
    ds_u = [iv for iv in ds if iv.id not in matched_ds_ids]
    return matches, mispred, gt_u, ds_u


def _two_stage_match(
    gt: Sequence[Interval], ds: Sequence[Interval], *, iou_thresh: float
) -> tuple[
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
    _, mispred, gt_u, ds_u = _hungarian_match(
        gt_u, ds_u, distance=iou, iou_thresh=iou_thresh
    )
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


def run_interval_matching(
    gt: AnnotationSet, ds: AnnotationSet, cfg: IntervalMatchingConfig
) -> IntervalReport:
    matches, mispred, gt_u, ds_u = _two_stage_match(
        gt.intervals, ds.intervals, iou_thresh=cfg.iou_threshold
    )

    def to_metric(a: Interval, b: Interval) -> IntervalPairMetrics:
        return IntervalPairMetrics(
            gt=a, ds=b, iou=iou(a, b),
            onset_delta=b.start - a.start,
            offset_delta=b.stop - a.stop,
            label_match=_label_eq(a, b),
        )

    boundary = boundary_f1(
        _collect_boundaries(gt.intervals),
        _collect_boundaries(ds.intervals),
        tolerance_s=cfg.boundary_tolerance_s,
    )

    return IntervalReport(
        matches=[to_metric(a, b) for a, b in matches],
        label_mismatches=[to_metric(a, b) for a, b in mispred],
        gt_unmatched=gt_u,
        ds_unmatched=ds_u,
        iou_threshold=cfg.iou_threshold,
        low_overlap_threshold=cfg.low_overlap_threshold,
        boundary_tolerance_s=cfg.boundary_tolerance_s,
        boundary=boundary,
    )
