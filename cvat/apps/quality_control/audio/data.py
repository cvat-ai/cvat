"""
Input data shapes for the audio QE pipeline.

Carries the GT / DS annotation sets fed into `compare()` (see
`cvat.apps.quality_control.audio.transcription_matching`). Used by
all other audio-QE modules.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum


@dataclass(frozen=True)
class Interval:
    id: int
    start: float  # seconds
    stop: float  # seconds
    label: str
    text: str
    source: str = ""
    score: float = 1.0
    extra: dict[str, str] = field(default_factory=dict)

    @property
    def duration(self) -> float:
        return self.stop - self.start


@dataclass
class AnnotationSet:
    name: str
    filename: str
    intervals: list[Interval]

    def __len__(self) -> int:
        return len(self.intervals)


class Granularity(str, Enum):
    """Output unit of the reported rate (CER / WER / SER scope)."""

    SENTENCE = "sentence"
    WORD = "word"
    CHARACTER = "character"


class AlignMode(str, Enum):
    """L2 alignment regime — what unit the DP operates on."""

    CHAR = "char"      # char-level Levenshtein DP, word-edit reconstruction
    WORD = "word"      # word-level Levenshtein DP, no boundary detection


class Metric(str, Enum):
    """Per-chunk cost function for L2 scoring."""

    EQUALITY = "equality"               # 0/1 strict per chunk
    ERROR_RATE = "error-rate"           # char_edits / len(ref) — recall-shaped
    NORMALIZED_LEV = "normalized-lev"   # char_edits / max(len) — bounded


class NormalizerMode(str, Enum):
    """Top-level normalizer mode selector."""

    NONE = "none"      # passthrough
    BASIC = "basic"    # universal Unicode / whitespace / case stack
    CUSTOM = "custom"  # caller-supplied `steps`


class GroupingStrategy(str, Enum):
    """How to combine intervals within a (label, attr) group."""

    JOIN = "join"      # G2: concatenate text per group, one alignment
    FILTER = "filter"  # G1: per-interval pair matching by IoU + label


class EditOp(str, Enum):
    """Per-chunk operation produced by the L2 aligner."""

    EQUAL = "equal"
    SUBSTITUTE = "substitute"
    INSERT = "insert"
    DELETE = "delete"
    BOUNDARY = "boundary"  # N-to-1 / 1-to-N word-boundary disagreement


GroupKey = tuple[str, str | None]  # (label, attr_value_or_None)
