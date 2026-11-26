# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Collection, Iterator, Sequence
from typing import TYPE_CHECKING, ClassVar

from attrs import define, field, validators

from cvat.apps.quality_control.backends.capabilities import QualityBackendCapabilities

if TYPE_CHECKING:
    from cvat.apps.dataset_manager import data_model as cdm
    from cvat.apps.engine.models import Task
    from cvat.apps.quality_control.matching import AttributeMatchingFunction, MatchingResults
    from cvat.apps.quality_control.models import QualityRequirementAnnotationType
    from cvat.apps.quality_control.quality_handlers import EffectiveQualityRequirement


@define(frozen=True)
class ComparisonSample:
    gt_annotations: Sequence[cdm.Annotation]
    ds_annotations: Sequence[cdm.Annotation]


@define(frozen=True)
class FrameComparisonSample(ComparisonSample):
    frame_id: int = field(validator=validators.instance_of(int))


class QualityBackend(ABC):
    """Data and geometry boundary for shared requirement evaluation.

    Consume each sample before advancing the iterator. A backend may retain
    native media and identity mappings for the duration of that sample.
    """

    capabilities: ClassVar[QualityBackendCapabilities]

    @classmethod
    def get_capabilities(cls) -> QualityBackendCapabilities:
        return cls.capabilities

    @classmethod
    def validate_task(cls, task: Task) -> None:
        capabilities = cls.get_capabilities()
        if (
            task.dimension != capabilities.dimension
            or task.media_type not in capabilities.media_types
        ):
            raise ValueError(
                f"Quality reports require {capabilities.dimension} data with media type "
                + ", ".join(f"'{media_type}'" for media_type in sorted(capabilities.media_types))
            )

    @classmethod
    def validate_requirement(cls, requirement: EffectiveQualityRequirement) -> None:
        from cvat.apps.quality_control import models
        from cvat.apps.quality_control.filters import RequirementJsonLogicFilter

        capabilities = cls.get_capabilities()
        if requirement.annotation_type not in capabilities.similarity_metrics:
            raise ValueError(
                f"Quality reports for {capabilities.dimension} data support only "
                + ", ".join(capabilities.similarity_metrics)
                + " requirements"
            )

        for field_name in models.INHERITED_REQUIREMENT_FIELDS:
            if field_name in capabilities.supported_parameters:
                continue
            value = getattr(requirement, field_name)
            disabled_value = models.QualityRequirement.get_disabled_parameter_value(field_name)
            if value is not None and value is not disabled_value:
                raise ValueError(
                    f"The '{field_name}' setting is not supported "
                    f"for '{requirement.annotation_type}' requirements"
                )

        if (
            requirement.similarity_metric
            not in capabilities.similarity_metrics[requirement.annotation_type]
        ):
            raise ValueError(
                f"The '{requirement.similarity_metric}' similarity metric is not supported "
                f"for '{requirement.annotation_type}' requirements"
            )

        RequirementJsonLogicFilter.validate_expression(
            requirement.filter, annotation_type=requirement.annotation_type
        )

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
    def total_samples(self) -> int:
        """Total samples in the job, including those outside the comparison subset."""
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
    def compare(
        self,
        sample: ComparisonSample,
        *,
        requirement: EffectiveQualityRequirement,
        attribute_matcher: AttributeMatchingFunction,
    ) -> MatchingResults:
        raise NotImplementedError

    @abstractmethod
    def shape_area(self, annotations: Sequence[cdm.Annotation]) -> float:
        """Area of a GT object before comparison transforms; groups use their union."""
        raise NotImplementedError("This quality backend does not support GT shape areas")

    @abstractmethod
    def close(self) -> None:
        raise NotImplementedError
