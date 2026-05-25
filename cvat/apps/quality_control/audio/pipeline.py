from __future__ import annotations

from .config import QualitySettings
from .data import DatasetItem
from .interval_matching import match_intervals
from .reports import ComparisonReport
from .transcription_matching import match_transcriptions


def compare(gt: DatasetItem, ds: DatasetItem, *, settings: QualitySettings) -> ComparisonReport:
    return ComparisonReport(
        gt=gt,
        ds=ds,
        intervals=match_intervals(gt, ds, settings.interval_matching),
        transcriptions=[match_transcriptions(gt, ds, req) for req in settings.transcriptions],
    )
