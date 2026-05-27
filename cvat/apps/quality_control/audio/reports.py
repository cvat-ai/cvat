# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""
Output / intermediate result shapes for the audio QE pipeline.

`compare()` returns a `ComparisonReport`; the rest of the dataclasses
here capture intermediate alignment products used while building it.
The CVAT side (`cvat.apps.quality_control.quality_reports`) consumes
the top-level fields to fill its persisted `QualityReport.data`
JSON.
"""

from __future__ import annotations

from dataclasses import dataclass

from .config import TranscriptionRequirement
from .data import EditOp, Granularity, GroupKey, Interval

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


# ============================ Transcription layer ================================


# ============================ Transcription alignment ============================


@dataclass
class AlignmentEdit:
    op: EditOp
    ref_start: int
    ref_end: int  # exclusive
    hyp_start: int
    hyp_end: int  # exclusive
    ref_units: list[str]
    hyp_units: list[str]


@dataclass
class AlignmentResult:
    granularity: Granularity
    ref_normalized: str
    hyp_normalized: str
    ref_units: list[str]
    hyp_units: list[str]
    edits: list[AlignmentEdit]
    error_rate: float  # word error rate (WER) / CER (when granularity=character)

    substitutions: int
    insertions: int
    deletions: int
    hits: int

    # Per-token source-interval index (within the group). None for the
    # per-pair (filter) path, which aligns a single text pair and has no
    # multi-interval origins to track.
    ref_origins: list[int] | None = None
    hyp_origins: list[int] | None = None


# ============================ Transcription report ===============================


@dataclass
class GroupAlignment:
    key: GroupKey
    gt_intervals: list[Interval]
    ds_intervals: list[Interval]
    alignment: AlignmentResult


@dataclass
class FilterPairAlignment:
    gt: Interval
    ds: Interval
    iou: float
    onset_delta: float
    offset_delta: float
    alignment: AlignmentResult


@dataclass
class TranscriptionReport:
    requirement: TranscriptionRequirement

    # Filter mode outputs
    pairs: list[FilterPairAlignment]
    pair_gt_unmatched: list[Interval]
    pair_ds_unmatched: list[Interval]

    # Join mode outputs
    groups: list[GroupAlignment]
    missing_groups: list[tuple[GroupKey, list[Interval]]]  # only in GT
    extra_groups: list[tuple[GroupKey, list[Interval]]]  # only in DS

    @property
    def alignments(self) -> list[AlignmentResult]:
        if self.requirement.grouping.strategy == "join":
            return [g.alignment for g in self.groups]
        return [p.alignment for p in self.pairs]

    @property
    def corpus_rate(self) -> float:
        """Headline rate per `requirement.metric` aggregated across all
        group / pair alignments. Lazy-imports the aggregator to avoid an
        import cycle with `transcription_matching`."""
        from .transcription_matching import aggregate_metric

        _, rate = aggregate_metric(
            self.alignments,
            metric=self.requirement.metric,
            threshold=self.requirement.threshold,
            granularity=self.requirement.granularity,
        )
        return rate


# ============================ Top-level ==========================================


@dataclass
class ComparisonReport:
    gt: list[Interval]
    ds: list[Interval]
    intervals: IntervalReport
    transcriptions: list[TranscriptionReport]
