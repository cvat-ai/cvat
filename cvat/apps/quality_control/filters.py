# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from collections.abc import Collection
from typing import Any

import datumaro as dm

from cvat.apps.engine.filters import NonModelJsonLogicFilter
from cvat.apps.quality_control import models


class RequirementJsonLogicFilter(NonModelJsonLogicFilter):
    _SHAPE_FILTER_FIELDS = (
        "label",
        "type",
        "area",
        "source",
        "occluded",
        "track_id",
        "outside",
        "keyframe",
        "track",
    )

    _ATTRIBUTE_FILTER_FIELDS = (
        "name",
        "value",
    )

    _LOOKUP_FIELDS = {
        **{f"shape.{name}": f"shape.{name}" for name in _SHAPE_FILTER_FIELDS},
        **{f"attribute.{name}": f"attribute.{name}" for name in _ATTRIBUTE_FILTER_FIELDS},
    }

    def __init__(
        self,
        *,
        expression: str,
        categories: dm.Categories,
        included_annotation_types: Collection[dm.AnnotationType],
    ) -> None:
        self._categories = categories
        self._included_annotation_types = set(included_annotation_types)

        filter_expression = expression.strip()
        self._rules = (
            self.parse_query(filter_expression, raise_on_empty=False)
            if filter_expression
            else None
        )

    def matches_annotation(self, ann: dm.Annotation) -> bool:
        if ann.type not in self._included_annotation_types:
            return False

        return self._matches(self._build_shape_filter_context(ann))

    def matches_attribute(
        self, shape_ann: dm.Annotation, attr_name: str, attr_value: Any
    ) -> bool:
        return self._matches(
            self._build_attribute_filter_context(shape_ann, attr_name, attr_value)
        )

    def filter_item(self, item: dm.DatasetItem) -> dm.DatasetItem:
        filtered_annotations = [ann for ann in item.annotations if self.matches_annotation(ann)]

        if len(filtered_annotations) == len(item.annotations):
            return item

        return dm.DatasetItem(
            id=item.id,
            subset=item.subset,
            annotations=filtered_annotations,
            media=item.media,
            attributes=dict(item.attributes or {}),
        )

    def _matches(self, filter_obj: dict[str, Any]) -> bool:
        if not self._rules:
            return True

        return bool(self._apply_filter(self._rules, self._LOOKUP_FIELDS, filter_obj))

    def _get_label_name(self, ann: dm.Annotation) -> str | None:
        if getattr(ann, "label", None) is None:
            return None

        try:
            label_categories = self._categories[dm.AnnotationType.label]
        except KeyError:
            return None

        return label_categories[ann.label].name

    def _get_annotation_area(self, ann: dm.Annotation) -> float | None:
        if ann.type == dm.AnnotationType.label or not hasattr(ann, "get_bbox"):
            return None

        _, _, width, height = ann.get_bbox()
        return width * height

    def _build_shape_filter_context(self, ann: dm.Annotation) -> dict[str, Any]:
        ann_attrs = dict(getattr(ann, "attributes", {}) or {})
        return {
            "shape": {
                "label": self._get_label_name(ann),
                "type": self._dm_type_to_requirement_type(ann.type),
                "area": self._get_annotation_area(ann),
                "source": ann_attrs.get("source"),
                "occluded": ann_attrs.get("occluded"),
                "track_id": ann_attrs.get("track_id"),
                "outside": ann_attrs.get("outside"),
                "keyframe": ann_attrs.get("keyframe"),
                "track": ann_attrs.get("track_id"),
            }
        }

    def _build_attribute_filter_context(
        self, shape_ann: dm.Annotation, attr_name: str, attr_value: Any
    ) -> dict[str, Any]:
        context = self._build_shape_filter_context(shape_ann)
        context["attribute"] = {"name": attr_name, "value": attr_value}
        return context

    def _dm_type_to_requirement_type(self, ann_type: dm.AnnotationType) -> str:
        return {
            dm.AnnotationType.label: models.QualityRequirementAnnotationType.TAG,
            dm.AnnotationType.bbox: models.QualityRequirementAnnotationType.RECTANGLE,
            dm.AnnotationType.skeleton: models.QualityRequirementAnnotationType.SKELETON,
            dm.AnnotationType.points: models.QualityRequirementAnnotationType.POINTS,
            dm.AnnotationType.polyline: models.QualityRequirementAnnotationType.POLYLINE,
            dm.AnnotationType.mask: models.QualityRequirementAnnotationType.MASK,
            dm.AnnotationType.polygon: models.QualityRequirementAnnotationType.POLYGON,
            dm.AnnotationType.ellipse: models.QualityRequirementAnnotationType.ELLIPSE,
        }.get(ann_type, str(ann_type))
