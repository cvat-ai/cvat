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

if TYPE_CHECKING:
    from cvat.apps.quality_control.interval_data_provider import IntervalJobDataProvider
    from cvat.apps.quality_control.models import QualityRequirementAnnotationType
    from cvat.apps.quality_control.quality_handlers import EffectiveQualityRequirement


class IntervalBackend(QualityBackend):
    def __init__(
        self, ds_provider: IntervalJobDataProvider, gt_provider: IntervalJobDataProvider
    ) -> None:
        self._ds_provider = ds_provider
        self._gt_provider = gt_provider

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
        start, stop = self._gt_provider.recording_range
        if type(start) is not int or type(stop) is not int or not 0 <= start < stop:
            raise ValueError("Invalid recording boundaries for audio quality")
        if self._ds_provider.recording_range != (start, stop):
            raise ValueError("Audio quality requires identical whole-recording ranges")
        indices = {label.id: index for index, label in enumerate(self.catalog.labels)}

        def annotations(provider):
            result = []
            for sample in provider.dataset:
                for annotation in sample.annotations:
                    end = stop if annotation.stop is None else annotation.stop
                    if (
                        type(annotation.start) is not int
                        or type(end) is not int
                        or not start <= annotation.start <= end <= stop
                    ):
                        raise ValueError(
                            f"Invalid audio interval boundaries: {annotation.reference}"
                        )
                    result.append(
                        evolve(
                            annotation,
                            stop=end,
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
        if requirement_type != "interval":
            raise ValueError("Audio quality only supports interval requirements")
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
