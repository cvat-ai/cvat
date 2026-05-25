# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from typing import Sequence

from .config import QualitySettings
from .data import Interval
from .interval_matching import match_intervals
from .reports import ComparisonReport
from .transcription_matching import match_transcriptions


def compare(
    gt: Sequence[Interval], ds: Sequence[Interval], *, settings: QualitySettings
) -> ComparisonReport:
    return ComparisonReport(
        gt=list(gt),
        ds=list(ds),
        intervals=match_intervals(gt, ds, config=settings.interval_matching),
        transcriptions=[match_transcriptions(gt, ds, req=req) for req in settings.transcriptions],
    )
