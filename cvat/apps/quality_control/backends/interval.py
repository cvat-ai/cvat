# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from collections.abc import Collection, Iterator
from typing import TYPE_CHECKING

from attrs import evolve

from cvat.apps.dataset_manager import data_model as cdm
from cvat.apps.quality_control.attribute_comparison import CVAT_ATTRIBUTE_SPEC_IDS_ATTR
from cvat.apps.quality_control.backends.base import (
    ComparisonSample,
    QualityBackend,
    RecordingComparisonSample,
)
from cvat.apps.quality_control.matching import (
    AnnotationMatches,
    AttributeMatchingFunction,
    MatchingResults,
    PairwiseComparison,
    match_segments,
    temporal_iou,
)
from cvat.apps.quality_control.models import QualityRequirementAnnotationType

if TYPE_CHECKING:
    from cvat.apps.quality_control.interval_data_provider import IntervalJobDataProvider
    from cvat.apps.quality_control.quality_handlers import EffectiveQualityRequirement


class IntervalBackend(QualityBackend):
    uses_frames = False

    def __init__(
        self, ds_provider: IntervalJobDataProvider, gt_provider: IntervalJobDataProvider
    ) -> None:
        self._ds_provider = ds_provider
        self._gt_provider = gt_provider

    @property
    def supported_annotation_types(self) -> Collection[QualityRequirementAnnotationType]:
        return (QualityRequirementAnnotationType.INTERVAL,)

    @property
    def catalog(self) -> cdm.LabelCatalog:
        return self._gt_provider.label_catalog

    @property
    def ignored_attributes(self) -> Collection[str]:
        return {CVAT_ATTRIBUTE_SPEC_IDS_ATTR}

    @property
    def total_samples(self) -> int:
        return 1

    def iter_samples(self) -> Iterator[RecordingComparisonSample]:
        gt_start, gt_stop = self._gt_provider.recording_range
        ds_start, ds_stop = self._ds_provider.recording_range
        if not (
            0 <= gt_start < gt_stop <= self._gt_provider.recording_stop
            and 0 <= ds_start < ds_stop <= self._ds_provider.recording_stop
        ):
            raise AssertionError("Invalid recording boundaries for audio quality")
        start, stop = max(gt_start, ds_start), min(gt_stop, ds_stop)
        if start >= stop:
            return
        indices = {label.id: index for index, label in enumerate(self.catalog.labels)}

        def annotations(provider):
            result = []
            for sample in provider.dataset:
                for annotation in sample.annotations:
                    end = provider.recording_stop if annotation.stop is None else annotation.stop
                    if not 0 <= annotation.start <= end <= provider.recording_stop:
                        raise AssertionError(
                            f"Invalid audio interval boundaries: {annotation.reference}"
                        )
                    if annotation.start == end:
                        if not start <= annotation.start < stop:
                            continue
                    elif end <= start or annotation.start >= stop:
                        continue
                    result.append(
                        evolve(
                            annotation,
                            start=max(annotation.start, start),
                            stop=min(end, stop),
                            label=indices[provider.label_catalog.labels[annotation.label].id],
                        )
                    )
            return tuple(result)

        yield RecordingComparisonSample(
            gt_annotations=annotations(self._gt_provider),
            ds_annotations=annotations(self._ds_provider),
            start=start,
            stop=stop,
        )

    def prepare_sample(
        self,
        sample: ComparisonSample,
        *,
        requirement_type: QualityRequirementAnnotationType | str,
    ) -> ComparisonSample:
        if requirement_type != QualityRequirementAnnotationType.INTERVAL:
            raise AssertionError("Audio quality only supports interval requirements")
        return sample

    def compare(
        self,
        sample: ComparisonSample,
        *,
        requirement: EffectiveQualityRequirement,
        attribute_matcher: AttributeMatchingFunction,
    ) -> MatchingResults:
        def comparison(gt, ds):
            iou = temporal_iou(gt.start, gt.stop, ds.start, ds.stop)
            return PairwiseComparison(
                geometry_similarity=iou,
                base_geometry_similarity=iou,
                conflicting_attribute_names=attribute_matcher(gt, ds).conflicting_names,
            )

        def similarity(gt, ds):
            iou = temporal_iou(gt.start, gt.stop, ds.start, ds.stop)
            if iou == 0:
                return 0.0
            return 0.0 if attribute_matcher(gt, ds).conflicting_names else iou

        matches, mismatches, gt_unmatched, ds_unmatched = match_segments(
            sample.gt_annotations,
            sample.ds_annotations,
            distance=similarity,
            dist_thresh=requirement.iou_threshold,
        )
        result = AnnotationMatches(
            matches,
            mismatches,
            gt_unmatched,
            ds_unmatched,
            {(id(gt), id(ds)): comparison(gt, ds) for gt, ds in [*matches, *mismatches]},
        )
        return MatchingResults(result, result, [], [])

    def close(self) -> None:
        pass  # Providers own recording data; the backend retains no per-sample resources.
