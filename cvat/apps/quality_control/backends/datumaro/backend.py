# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import itertools
from collections.abc import Iterator
from typing import TYPE_CHECKING, cast

import attrs
import datumaro as dm

from cvat.apps.dataset_manager import data_model as cdm
from cvat.apps.dataset_manager.data_model.adapters.datumaro import (
    DatumaroAnnotationAdapter,
    DatumaroSampleAdapter,
    to_datumaro_annotation_type,
)
from cvat.apps.quality_control.attribute_comparison import attribute_comparison_may_compare
from cvat.apps.quality_control.backends.base import (
    ComparisonSample,
    FrameComparisonSample,
    QualityBackend,
)
from cvat.apps.quality_control.backends.datumaro.matching import Comparator
from cvat.apps.quality_control.comparison_report import ComparisonParameters
from cvat.apps.quality_control.filters import RequirementJsonLogicFilter
from cvat.apps.quality_control.matching import (
    AnnotationMatches,
    AttributeMatchingFunction,
    GroupComparison,
    MatchingResults,
)
from cvat.apps.quality_control.models import QualityRequirementAnnotationType

if TYPE_CHECKING:
    from cvat.apps.quality_control.datumaro_data_provider import DatumaroJobDataProvider
    from cvat.apps.quality_control.quality_handlers import EffectiveQualityRequirement


class Datumaro2DBackend(QualityBackend):
    def __init__(
        self, ds_provider: DatumaroJobDataProvider, gt_provider: DatumaroJobDataProvider
    ) -> None:
        self._ds_provider = ds_provider
        self._gt_provider = gt_provider
        self._views: dict[tuple[int, int], DatumaroAnnotationAdapter] = {}
        self._native_items: tuple[dm.DatasetItem, dm.DatasetItem] | None = None

    @property
    def catalog(self) -> cdm.LabelCatalog:
        return self._gt_provider.label_catalog

    @property
    def ignored_attributes(self):
        return Comparator.IGNORED_ATTRIBUTES

    @property
    def total_samples(self) -> int:
        return self._ds_provider.total_samples

    def _view(
        self, annotation: dm.Annotation, provider: DatumaroJobDataProvider
    ) -> DatumaroAnnotationAdapter:
        key = (id(provider), id(annotation))
        if key not in self._views:
            self._views[key] = provider.dataset.adapt_annotation(annotation)
        return self._views[key]

    def iter_samples(self) -> Iterator[FrameComparisonSample]:
        def annotations(item: cdm.Sample, provider: DatumaroJobDataProvider):
            views = []
            for annotation in item.annotations:
                view = cast(DatumaroAnnotationAdapter, annotation)
                key = (id(provider), id(view.native_annotation))
                views.append(self._views.setdefault(key, view))
            return tuple(views)

        for gt_item in self._gt_provider.dataset:
            ds_item = self._ds_provider.dataset.get(gt_item.id, subset=gt_item.subset)
            if ds_item is None:
                continue

            self._native_items = (
                cast(DatumaroSampleAdapter, gt_item).native_item,
                cast(DatumaroSampleAdapter, ds_item).native_item,
            )
            try:
                yield FrameComparisonSample(
                    gt_annotations=annotations(gt_item, self._gt_provider),
                    ds_annotations=annotations(ds_item, self._ds_provider),
                    frame_id=ds_item.frame_id,
                )
            finally:
                self.close()

    def prepare_sample(
        self,
        sample: ComparisonSample,
        *,
        requirement_type: QualityRequirementAnnotationType | str,
    ) -> ComparisonSample:
        if requirement_type != QualityRequirementAnnotationType.SKELETON_KEYPOINT:
            return sample

        def prepare(annotations, provider):
            used_groups = {ann.group for ann in annotations if ann.group}
            virtual_groups = itertools.count(max({0, *used_groups}) + 1)
            prepared = []
            annotation_filter = RequirementJsonLogicFilter(
                expression="",
                catalog=self.catalog,
                included_annotation_types=[cdm.Skeleton],
            )
            for view in annotations:
                ann = cast(DatumaroAnnotationAdapter, view).native_annotation
                if ann.type != dm.AnnotationType.skeleton:
                    continue
                skeleton_group = ann.group or next(virtual_groups)
                parent_context = annotation_filter.build_shape_context_for_annotation(view)
                parent_attrs = dict(ann.attributes or {})
                for element in ann.elements:
                    element_attrs = dict(element.attributes or {})
                    for name in ("source", "track_id", "keyframe"):
                        if name not in element_attrs and name in parent_attrs:
                            element_attrs[name] = parent_attrs[name]
                    visibility = list(element.visibility or [])
                    if visibility:
                        element_attrs.setdefault(
                            "outside", visibility[0] == dm.Points.Visibility.absent
                        )
                        element_attrs.setdefault(
                            "occluded", visibility[0] == dm.Points.Visibility.hidden
                        )
                    element_attrs[RequirementJsonLogicFilter.PARENT_SKELETON_CONTEXT_KEY] = (
                        parent_context
                    )
                    wrapped = element.wrap(attributes=element_attrs, group=skeleton_group)
                    provider.remember_dm_ann_alias(element, wrapped)
                    prepared.append(self._view(wrapped, provider))
            return tuple(prepared)

        return attrs.evolve(
            sample,
            gt_annotations=prepare(sample.gt_annotations, self._gt_provider),
            ds_annotations=prepare(sample.ds_annotations, self._ds_provider),
        )

    @staticmethod
    def _comparison_parameters(requirement: EffectiveQualityRequirement) -> ComparisonParameters:
        settings = ComparisonParameters()
        for name in (
            "iou_threshold",
            "oks_sigma",
            "line_thickness",
            "point_size_base",
            "compare_line_orientation",
            "line_orientation_threshold",
            "compare_attributes",
            "compare_groups",
            "group_match_threshold",
            "check_covered_annotations",
            "object_visibility_threshold",
            "panoptic_comparison",
        ):
            value = getattr(requirement, name)
            if value is not None:
                setattr(settings, name, value)
        settings.compare_attributes = attribute_comparison_may_compare(
            requirement.attribute_comparison
        )
        settings.included_annotation_types = [
            to_datumaro_annotation_type(requirement.comparison_annotation_type)
        ]
        return settings

    def compare(
        self,
        sample: ComparisonSample,
        *,
        requirement: EffectiveQualityRequirement,
        attribute_matcher: AttributeMatchingFunction,
    ) -> MatchingResults:
        if self._native_items is None:
            raise RuntimeError("Comparison must run while iterating backend samples")
        gt_original, ds_original = self._native_items
        gt_item = gt_original.wrap(
            annotations=[
                cast(DatumaroAnnotationAdapter, a).native_annotation for a in sample.gt_annotations
            ]
        )
        ds_item = ds_original.wrap(
            annotations=[
                cast(DatumaroAnnotationAdapter, a).native_annotation for a in sample.ds_annotations
            ]
        )
        settings = self._comparison_parameters(requirement)
        comparator = Comparator(
            self._gt_provider.dataset.native_dataset.categories(),
            settings=settings,
            attribute_matcher=lambda a, b: attribute_matcher(
                self._view(a, self._gt_provider), self._view(b, self._ds_provider)
            ),
        )
        native_results = comparator.match_annotations(gt_item, ds_item)

        def normalize(result):
            matches, mismatches, gt_unmatched, ds_unmatched, comparisons = result
            gt_views = {id(a): self._view(a, self._gt_provider) for a in gt_item.annotations}
            ds_views = {id(a): self._view(a, self._ds_provider) for a in ds_item.annotations}
            return AnnotationMatches(
                [(gt_views[id(a)], ds_views[id(b)]) for a, b in matches],
                [(gt_views[id(a)], ds_views[id(b)]) for a, b in mismatches],
                [gt_views[id(a)] for a in gt_unmatched],
                [ds_views[id(b)] for b in ds_unmatched],
                {
                    (id(gt_views[a]), id(ds_views[b])): value
                    for (a, b), value in comparisons.items()
                },
            )

        covered_annotations = []
        group_comparisons = []
        matches, mismatches, _, _, _ = native_results["all_shape_ann_types"]

        if requirement.annotation_type != QualityRequirementAnnotationType.TAG:
            if settings.check_covered_annotations:
                covered_annotations = [
                    self._view(ann, self._ds_provider) for ann in comparator.find_covered(ds_item)
                ]
            if settings.compare_groups:
                gt_groups, gt_group_map = comparator.find_groups(gt_item)
                ds_groups, ds_group_map = comparator.find_groups(ds_item)
                matched_objects = matches + mismatches
                ds_to_gt_groups = comparator.match_groups(gt_groups, ds_groups, matched_objects)
                for gt_ann, ds_ann in matched_objects:
                    gt_group = gt_groups.get(gt_group_map[id(gt_ann)], [gt_ann])
                    ds_group = ds_groups.get(ds_group_map[id(ds_ann)], [ds_ann])
                    ds_gt_group = ds_to_gt_groups.get(ds_group_map[id(ds_ann)])
                    group_comparisons.append(
                        GroupComparison(
                            gt_annotation=self._view(gt_ann, self._gt_provider),
                            ds_annotation=self._view(ds_ann, self._ds_provider),
                            gt_group_size=len(gt_group),
                            ds_group_size=len(ds_group),
                            groups_match=ds_gt_group == gt_group_map[id(gt_ann)],
                        )
                    )

        return MatchingResults(
            all_ann_types=normalize(native_results["all_ann_types"]),
            all_shape_ann_types=normalize(native_results["all_shape_ann_types"]),
            covered_annotations=covered_annotations,
            group_comparisons=group_comparisons,
        )

    def close(self) -> None:
        self._native_items = None
        self._views.clear()
