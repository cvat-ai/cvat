"""
Top-level orchestrator for the audio QE pipeline.

`compare()` runs L1 interval matching + every configured L2
transcription requirement, packs the results into a
`ComparisonReport`. This is the only entry point CVAT's
`quality_reports.py` needs to call.
"""

from __future__ import annotations

from .config import QualitySettings
from .data import AnnotationSet
from .interval_matching import run_interval_matching
from .reports import ComparisonReport
from .transcription_matching import run_transcription_qe


def compare(
    gt: AnnotationSet, ds: AnnotationSet, settings: QualitySettings
) -> ComparisonReport:
    return ComparisonReport(
        gt=gt, ds=ds,
        intervals=run_interval_matching(gt, ds, settings.interval_matching),
        transcriptions=[run_transcription_qe(gt, ds, req) for req in settings.transcriptions],
    )
