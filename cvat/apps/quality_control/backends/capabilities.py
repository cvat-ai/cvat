# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from collections.abc import Mapping
from dataclasses import dataclass


@dataclass(frozen=True)
class QualityBackendCapabilities:
    """Configuration support, available without importing a backend implementation.

    Each annotation type lists its default similarity metric first. Parameters
    absent from supported_parameters must remain disabled, including new ones.
    """

    dimension: str
    media_types: frozenset[str]
    supported_parameters: frozenset[str]
    similarity_metrics: Mapping[str, tuple[str, ...]]

    def get_default_similarity_metric(self, annotation_type: str) -> str:
        return self.similarity_metrics[annotation_type][0]


def get_all_backend_capabilities() -> tuple[QualityBackendCapabilities, ...]:
    from .cuboid.capabilities import CAPABILITIES as cuboid_capabilities
    from .datumaro.capabilities import CAPABILITIES as datumaro_capabilities

    return (datumaro_capabilities, cuboid_capabilities)


def get_backend_capabilities(annotation_type: str) -> QualityBackendCapabilities:
    for capabilities in get_all_backend_capabilities():
        if annotation_type in capabilities.similarity_metrics:
            return capabilities

    raise ValueError(f"Unknown quality requirement annotation type '{annotation_type}'")
