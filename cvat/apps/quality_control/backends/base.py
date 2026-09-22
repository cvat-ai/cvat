# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Collection, Iterator, Sequence
from typing import TYPE_CHECKING, Literal

from attrs import define

from cvat.apps.dataset_manager import data_model as cdm
from cvat.apps.quality_control.matching import AttributeMatchingFunction, MatchingResults

if TYPE_CHECKING:
    from cvat.apps.quality_control.models import QualityRequirementAnnotationType
    from cvat.apps.quality_control.quality_handlers import EffectiveQualityRequirement


@define(frozen=True)
class ComparisonSample:
    gt_annotations: Sequence[cdm.Annotation]
    ds_annotations: Sequence[cdm.Annotation]
    frame_id: int | None
    scope: Literal["frame", "recording"] = "frame"


class QualityBackend(ABC):
    """Data and geometry boundary for shared requirement evaluation.

    Consume each sample before advancing the iterator. A backend may retain
    native media and identity mappings for the duration of that sample.
    """

    @property
    @abstractmethod
    def catalog(self) -> cdm.LabelCatalog:
        raise NotImplementedError

    @property
    @abstractmethod
    def ignored_attributes(self) -> Collection[str]:
        raise NotImplementedError

    @property
    @abstractmethod
    def total_frames(self) -> int:
        raise NotImplementedError

    @abstractmethod
    def iter_samples(self) -> Iterator[ComparisonSample]:
        raise NotImplementedError

    @abstractmethod
    def prepare_sample(
        self,
        sample: ComparisonSample,
        *,
        requirement_type: QualityRequirementAnnotationType | str,
    ) -> ComparisonSample:
        raise NotImplementedError

    @abstractmethod
    def get_annotation_area(self, annotation: cdm.Annotation) -> float | None:
        raise NotImplementedError

    @abstractmethod
    def compare(
        self,
        sample: ComparisonSample,
        *,
        requirement: EffectiveQualityRequirement,
        attribute_matcher: AttributeMatchingFunction,
    ) -> MatchingResults:
        raise NotImplementedError

    @abstractmethod
    def close(self) -> None:
        raise NotImplementedError
