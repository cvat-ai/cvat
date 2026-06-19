# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Public surface of the audio QE pipeline.

Domain types, settings, reports, and algorithms are defined in the
thematic sub-modules; this file re-exports the names callers most
often need so they can write `from cvat.apps.quality_control import
audio` and then access everything via `audio.X`.
"""

from .config import IntervalMatchingConfig, QualitySettings
from .data import Interval
from .interval_matching import match_intervals
from .pipeline import compare
from .reports import (
    BoundaryAgreement,
    ComparisonReport,
    IntervalPairMetrics,
    IntervalReport,
)

__all__ = [
    # data
    "Interval",
    #
    # config
    "IntervalMatchingConfig",
    "QualitySettings",
    #
    # reports
    "BoundaryAgreement",
    "ComparisonReport",
    "IntervalPairMetrics",
    "IntervalReport",
    #
    # interval matching
    "match_intervals",
    #
    # top-level
    "compare",
]
