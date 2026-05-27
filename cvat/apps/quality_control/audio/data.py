# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum


@dataclass(frozen=True)
class Interval:
    id: int
    start: float  # milliseconds
    stop: float  # milliseconds
    label: str
    source: str = ""
    score: float = 1.0
    extra: dict[str, str] = field(default_factory=dict)

    @property
    def duration(self) -> float:
        return self.stop - self.start


class Granularity(str, Enum):
    """Output unit of the reported rate (CER / WER / SER scope)."""

    WORD = "word"
    CHARACTER = "character"


class AlignMode(str, Enum):
    """Transcription alignment mode — what unit the DP operates on."""

    CHAR = "char"
    "char-level Levenshtein DP, word-edit reconstruction"

    WORD = "word"
    "word-level Levenshtein DP, no boundary detection"


class Metric(str, Enum):
    """Per-chunk cost function for L2 scoring."""

    EQUALITY = "equality"
    "0/1 strict per chunk"

    ERROR_RATE = "error-rate"
    "char_edits / len(ref) — recall-shaped"

    NORMALIZED_LEV = "normalized-lev"
    "char_edits / max(len) — bounded"


class NormalizerMode(str, Enum):
    """Top-level normalizer mode selector."""

    NONE = "none"  # passthrough
    BASIC = "basic"  # universal Unicode / whitespace / case stack
    CUSTOM = "custom"  # caller-supplied `steps`


class GroupingStrategy(str, Enum):
    """How to combine intervals within a (label, attr) group."""

    FILTER = "filter"
    "Match intervals by IoU and label, match text in pairs"

    JOIN = "join"
    "Concatenate text per group key, align"


class EditOp(str, Enum):
    """Per-chunk operation produced by the L2 aligner."""

    EQUAL = "equal"
    SUBSTITUTE = "substitute"
    INSERT = "insert"
    DELETE = "delete"
    BOUNDARY = "boundary"  # N-to-1 / 1-to-N word-boundary disagreement


GroupKey = tuple[str, str | None]  # (label, attr_value_or_None)
