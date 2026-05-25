# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

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
    EditOp,
    Granularity,
    GroupingStrategy,
    GroupKey,
    Interval,
    Metric,
    NormalizerMode,
)
from .interval_matching import match_intervals
from .normalization import (
    BASIC_STACK,
    LANG_PRESETS,
    SUPPORTED_LANGS,
    Normalizer,
    lang_preset,
    register_step,
    step_available,
)
from .pipeline import compare
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
from .transcription_matching import match_transcriptions

__all__ = [
    # data
    "Interval",
    "Granularity",
    "GroupKey",
    "AlignMode",
    "EditOp",
    "GroupingStrategy",
    "Metric",
    "NormalizerMode",
    #
    # config
    "StepConfig",
    "NormalizerConfig",
    "GroupingConfig",
    "TranscriptionRequirement",
    "IntervalMatchingConfig",
    "QualitySettings",
    #
    # reports
    "AlignmentEdit",
    "AlignmentResult",
    "BoundaryAgreement",
    "ComparisonReport",
    "FilterPairAlignment",
    "GroupAlignment",
    "IntervalPairMetrics",
    "IntervalReport",
    "TranscriptionReport",
    #
    # normalization
    "Normalizer",
    "BASIC_STACK",
    "LANG_PRESETS",
    "SUPPORTED_LANGS",
    "lang_preset",
    "register_step",
    "step_available",
    #
    # interval matching
    "match_intervals",
    #
    # transcription matching
    "match_transcriptions",
    #
    # top-level
    "compare",
]
