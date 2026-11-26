# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import math
from collections.abc import Collection, Iterator, Mapping, Sequence
from functools import cached_property
from math import prod
from types import MappingProxyType
from typing import TYPE_CHECKING, Any

from cvat.apps.dataset_manager import data_model as cdm
from cvat.apps.dataset_manager.data_model.adapters.datumaro import DatumaroCuboidAdapter
from cvat.apps.engine.models import ValidationMode
from cvat.apps.quality_control.attribute_comparison import CVAT_ATTRIBUTE_SPEC_IDS_ATTR
from cvat.apps.quality_control.backends.base import (
    ComparisonSample,
    FrameComparisonSample,
    QualityBackend,
)
from cvat.apps.quality_control.backends.cuboid.capabilities import CAPABILITIES
from cvat.apps.quality_control.geometry.cuboid import CuboidGeometry, cuboid_iou
from cvat.apps.quality_control.matching import (
    AnnotationMatches,
    AttributeMatchingFunction,
    MatchingResults,
    PairwiseComparison,
    match_segments,
)
from cvat.apps.quality_control.models import QualityRequirementAnnotationType

if TYPE_CHECKING:
    from cvat.apps.engine.models import Task
    from cvat.apps.quality_control.backends.datumaro.data_provider import DatumaroJobDataProvider
    from cvat.apps.quality_control.quality_handlers import EffectiveQualityRequirement


class _CuboidView(DatumaroCuboidAdapter):
    def __init__(self, view: DatumaroCuboidAdapter, provider: DatumaroJobDataProvider) -> None:
        super().__init__(
            view.native_annotation, reference_getter=provider.dm_ann_to_annotation_reference
        )
        source = provider._annotation_memo.get_source_ann(view.native_annotation)
        # CVAT's shared 2D/3D cuboid wire format pads the nine 3D pose/size
        # components to 16 entries. The trailing seven values carry no 3D geometry.
        self.points = tuple(source.points[:9] if len(source.points) == 16 else source.points)
        self._source = source
        self._attributes = dict(
            provider._annotation_memo.get_user_attributes(view.native_annotation)
        )

    @property
    def source(self) -> str | None:
        return self._source.source

    @property
    def attributes(self) -> Mapping[str, Any]:
        return MappingProxyType(self._attributes)

    @property
    def metadata(self) -> Mapping[str, Any]:
        return {
            "source": self.source,
            "occluded": self._source.occluded,
            "outside": self._source.outside,
            "track_id": getattr(self._source, "track_id", None),
            "keyframe": getattr(self._source, "keyframe", None),
        }

    @cached_property
    def geometry(self) -> CuboidGeometry:
        try:
            return CuboidGeometry.from_points(self.points)
        except (ValueError, TypeError) as error:
            raise ValueError(f"Invalid cuboid {self.reference}: {error}") from error

    def get_volume(self) -> float:
        return prod(float(length) for length in self.geometry.size)


class Cuboid3DBackend(QualityBackend):
    capabilities = CAPABILITIES

    @classmethod
    def validate_task(cls, task: Task) -> None:
        super().validate_task(task)
        if task.data.validation_mode != ValidationMode.GT:
            raise ValueError("3D quality reports require ordinary point cloud ground truth")

    @classmethod
    def validate_requirement(cls, requirement: EffectiveQualityRequirement) -> None:
        super().validate_requirement(requirement)
        if (
            not isinstance(requirement.iou_threshold, (int, float))
            or not math.isfinite(requirement.iou_threshold)
            or not 0 <= requirement.iou_threshold <= 1
        ):
            raise ValueError("Cuboid IoU requires a numeric threshold")

    def __init__(
        self, ds_provider: DatumaroJobDataProvider, gt_provider: DatumaroJobDataProvider
    ) -> None:
        self._ds_provider = ds_provider
        self._gt_provider = gt_provider
        self._similarities: dict[tuple[int, int], float] = {}

    @property
    def catalog(self) -> cdm.LabelCatalog:
        return self._gt_provider.label_catalog

    @property
    def ignored_attributes(self) -> Collection[str]:
        return (CVAT_ATTRIBUTE_SPEC_IDS_ATTR,)

    @property
    def total_samples(self) -> int:
        return self._ds_provider.total_samples

    def iter_samples(self) -> Iterator[FrameComparisonSample]:
        def annotations(item, provider):
            return tuple(
                _CuboidView(view, provider)
                for view in item.annotations
                if isinstance(view, cdm.Cuboid)
                and not provider._annotation_memo.get_source_ann(view.native_annotation).outside
            )

        for gt_item in self._gt_provider.dataset:
            ds_item = self._ds_provider.dataset.get(gt_item.id, subset=gt_item.subset)
            if ds_item is None:
                continue
            try:
                yield FrameComparisonSample(
                    gt_annotations=annotations(gt_item, self._gt_provider),
                    ds_annotations=annotations(ds_item, self._ds_provider),
                    frame_id=ds_item.frame_id,
                )
            finally:
                self.close()

    def prepare_sample(
        self, sample: ComparisonSample, *, requirement_type: QualityRequirementAnnotationType | str
    ) -> ComparisonSample:
        if requirement_type != QualityRequirementAnnotationType.CUBOID:
            raise ValueError("3D quality comparison supports only cuboid requirements")
        return sample

    def shape_area(self, annotations: Sequence[cdm.Annotation]) -> float:
        raise NotImplementedError("3D cuboids do not have a 2D shape area")

    def compare(
        self,
        sample: ComparisonSample,
        *,
        requirement: EffectiveQualityRequirement,
        attribute_matcher: AttributeMatchingFunction,
    ) -> MatchingResults:
        comparisons = {}
        for annotation in (*sample.gt_annotations, *sample.ds_annotations):
            # Validate selected geometry even if the other side is empty.
            _ = annotation.geometry

        def distance(gt, ds):
            key = (id(gt), id(ds))
            if key not in comparisons:
                if key not in self._similarities:
                    self._similarities[key] = cuboid_iou(gt.geometry, ds.geometry)
                comparisons[key] = PairwiseComparison(
                    geometry_similarity=self._similarities[key],
                    conflicting_attribute_names=attribute_matcher(gt, ds).conflicting_names,
                )
            return comparisons[key].similarity

        matches = AnnotationMatches(
            *match_segments(
                sample.gt_annotations,
                sample.ds_annotations,
                distance=distance,
                dist_thresh=requirement.iou_threshold,
            ),
            comparisons,
        )
        return MatchingResults(matches, matches, covered_annotations=[], group_comparisons=[])

    def close(self) -> None:
        self._similarities.clear()
