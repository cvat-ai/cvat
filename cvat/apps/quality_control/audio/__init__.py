"""Public surface of the audio QE pipeline.

Domain types, settings, reports, and algorithms are defined in the
thematic sub-modules; this file re-exports the names callers most
often need so they can write `from cvat.apps.quality_control import
audio` and then access everything via `audio.X`.
"""

from .config import (
    GroupingConfig,
    IntervalMatchingConfig,
    NormalizerConfig,
    QualitySettings,
    StepConfig,
    TranscriptionRequirement,
)
from .data import (
    AlignMode,
    AnnotationSet,
    EditOp,
    Granularity,
    GroupingStrategy,
    GroupKey,
    Interval,
    Metric,
    NormalizerMode,
)
from .interval_matching import boundary_f1, iou, run_interval_matching
from .normalization import (
    BASIC_STACK,
    LANG_PRESETS,
    TIER1_LANGS,
    Normalizer,
    lang_preset,
    register_step,
    step_available,
)
from .reports import (
    AlignmentEdit,
    AlignmentResult,
    BoundaryAgreement,
    ComparisonReport,
    FilterPairAlignment,
    GroupAlignment,
    IntervalPairMetrics,
    IntervalReport,
    TranscriptionReport,
)
from .pipeline import compare
from .transcription_matching import (
    align_group_via_chars,
    align_group_with_overlap,
    align_pair,
    group_intervals,
    group_key,
    run_transcription_qe,
    tokenize,
)

__all__ = [
    # data
    "Interval", "AnnotationSet", "Granularity", "GroupKey",
    "AlignMode", "EditOp", "GroupingStrategy", "Metric", "NormalizerMode",
    # config
    "StepConfig", "NormalizerConfig", "GroupingConfig", "TranscriptionRequirement",
    "IntervalMatchingConfig", "QualitySettings",
    # reports
    "AlignmentEdit", "AlignmentResult", "BoundaryAgreement", "ComparisonReport",
    "FilterPairAlignment", "GroupAlignment", "IntervalPairMetrics", "IntervalReport",
    "TranscriptionReport",
    # normalization
    "Normalizer", "BASIC_STACK", "LANG_PRESETS", "TIER1_LANGS",
    "lang_preset", "register_step", "step_available",
    # interval matching
    "iou", "boundary_f1", "run_interval_matching",
    # transcription matching
    "tokenize", "align_pair",
    "align_group_via_chars", "align_group_with_overlap",
    "group_key", "group_intervals", "run_transcription_qe",
    "compare",
]
