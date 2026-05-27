# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .data import AlignMode, Granularity, GroupingStrategy, Metric, NormalizerMode


@dataclass
class StepConfig:
    """One layer in the normalization pipeline."""

    name: str  # registered step name
    options: dict[str, Any] = field(default_factory=dict)


@dataclass
class NormalizerConfig:
    """
    NormalizerMode selects the stack:
      - NONE   — passthrough
      - BASIC  — universal Unicode/whitespace/case layer (language-agnostic)
      - CUSTOM — explicit pipeline; caller provides `steps`
    """

    mode: NormalizerMode = NormalizerMode.BASIC
    steps: list[StepConfig] = field(default_factory=list)


@dataclass
class GroupingConfig:
    attribute: str | None = None  # None → group by label only
    strategy: GroupingStrategy = GroupingStrategy.JOIN
    join_separator: str = " "


@dataclass
class TranscriptionRequirement:
    name: str = "transcription"  # human-readable, used in report headings
    text_attribute: str = "transcription"  # which column / attr holds text

    # Output unit of the reported rate (CER vs WER vs SER scope).
    #   WORD       → WER-family
    #   CHARACTER  → CER-family
    granularity: Granularity = Granularity.WORD

    # Alignment regime.
    #   CHAR — char-level Levenshtein DP (default; handles arbitrary
    #          N-to-M boundary cases via natural char alignment)
    #   WORD — word-level (token) Levenshtein DP (faster, no boundary
    #          detection; equivalent to plain WER when granularity=word)
    align: AlignMode = AlignMode.CHAR

    # Per-chunk cost function. Softness is a property of the metric
    # itself rather than a side-channel knob.
    # For granularity=CHARACTER (atomic units): all three metrics
    # degenerate to EQUALITY. Only granularity=WORD makes the choice
    # meaningful.
    metric: Metric = Metric.EQUALITY

    # If set, per-chunk cost is rounded: cost > threshold → 1, else 0.
    # Turns any soft metric into a binary one. With metric=EQUALITY the
    # threshold is a no-op.
    threshold: float | None = None

    normalizer: NormalizerConfig = field(default_factory=NormalizerConfig)
    grouping: GroupingConfig = field(default_factory=GroupingConfig)
    iou_threshold: float = 0.3  # used by FILTER strategy
    enforce_overlap: bool = True  # join: forbid token match between non-overlapping intervals

    # Gap (ms) by which the join overlap gate is relaxed: intervals separated by
    # up to this much still count as overlapping.
    overlap_tolerance_ms: float = 0.0


@dataclass
class IntervalMatchingConfig:
    iou_threshold: float = 0.3
    low_overlap_threshold: float = 0.5
    boundary_tolerance_ms: float = 200.0  # boundary-F1 timestamp tolerance


@dataclass
class QualitySettings:
    interval_matching: IntervalMatchingConfig = field(default_factory=IntervalMatchingConfig)
    transcriptions: list[TranscriptionRequirement] = field(default_factory=list)
