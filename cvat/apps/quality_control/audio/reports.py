# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""
Output / intermediate result shapes for the audio QE pipeline.

`compare()` returns a `ComparisonReport`; the rest of the dataclasses
here capture intermediate matching products used while building it.
The CVAT side (`cvat.apps.quality_control.quality_reports`) consumes
the top-level fields to fill its persisted `QualityReport.data`
JSON.
"""

from __future__ import annotations

from dataclasses import dataclass

from .data import Interval

# ============================ Interval matching layer ============================


@dataclass
class IntervalPairMetrics:
    gt: Interval
    ds: Interval
    iou: float
    onset_delta: float
    offset_delta: float
    label_match: bool


@dataclass
class BoundaryAgreement:
    tp: int
    fp: int
    fn: int
    precision: float
    recall: float
    f1: float


@dataclass
class IntervalReport:
    matches: list[IntervalPairMetrics]
    label_mismatches: list[IntervalPairMetrics]
    gt_unmatched: list[Interval]
    ds_unmatched: list[Interval]
    iou_threshold: float
    low_overlap_threshold: float
    boundary_tolerance_ms: float
    boundary: BoundaryAgreement | None = None

    @property
    def low_overlap(self) -> list[IntervalPairMetrics]:
        return [m for m in self.matches if m.iou < self.low_overlap_threshold]


# ============================ Top-level ==========================================


@dataclass
class ComparisonReport:
    gt: list[Interval]
    ds: list[Interval]
    intervals: IntervalReport
