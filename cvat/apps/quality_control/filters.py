# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import operator
from collections.abc import Collection
from functools import cached_property
from typing import Any

import attrs
import datumaro as dm
from rest_framework.exceptions import ValidationError

from cvat.apps.engine.filters import JsonLogicFilter
from cvat.apps.quality_control import models

_PARENT_SKELETON_CONTEXT_KEY = "__parent_skeleton_context__"
_FILTER_INTERNAL_ATTRIBUTE_FIELDS = frozenset({_PARENT_SKELETON_CONTEXT_KEY})


def _with_replaced_prefix(
    lookup_fields: dict[str, str], *, source_prefix: str, target_prefix: str
) -> dict[str, str]:
    return {
        key.replace(source_prefix, target_prefix, 1): value.replace(source_prefix, target_prefix, 1)
        for key, value in lookup_fields.items()
    }


def _get_label_name(ann: dm.Annotation, categories: dm.Categories) -> str | None:
    if getattr(ann, "label", None) is None:
        return None

    try:
        label_categories = categories[dm.AnnotationType.label]
    except KeyError:
        return None

    return label_categories[ann.label].name


def _get_annotation_area(ann: dm.Annotation) -> float | None:
    if ann.type == dm.AnnotationType.label or not hasattr(ann, "get_bbox"):
        return None

    _, _, width, height = ann.get_bbox()
    return width * height


def _dm_type_to_requirement_type(ann_type: dm.AnnotationType) -> str:
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


@attrs.define(slots=False)
class _AnnotationAttributesFilterContext:
    _attributes: dict[str, Any]

    @cached_property
    def _public_attributes(self) -> dict[str, Any]:
        return {
            name: value
            for name, value in self._attributes.items()
            if name not in _FILTER_INTERNAL_ATTRIBUTE_FIELDS
        }

    @property
    def name(self) -> list[str]:
        return list(self._public_attributes.keys())

    @property
    def value(self) -> list[Any]:
        return list(self._public_attributes.values())


@attrs.define(slots=False)
class _FilterAttributeContext:
    name: str
    value: Any


@attrs.define(slots=False)
class _ShapeFilterContext:
    _ann: dm.Annotation
    _categories: dm.Categories
    _attributes: dict[str, Any]
    _include_track: bool = True

    @classmethod
    def from_annotation(
        cls,
        ann: dm.Annotation,
        *,
        categories: dm.Categories,
        include_track: bool = True,
    ) -> "_ShapeFilterContext":
        return cls(
            ann,
            categories,
            dict(getattr(ann, "attributes", {}) or {}),
            include_track=include_track,
        )

    @property
    def label(self) -> str | None:
        return _get_label_name(self._ann, self._categories)

    @property
    def type(self) -> str:
        return _dm_type_to_requirement_type(self._ann.type)

    @cached_property
    def area(self) -> float | None:
        return _get_annotation_area(self._ann)

    @property
    def source(self) -> Any:
        return self._attributes.get("source")

    @property
    def occluded(self) -> Any:
        return self._attributes.get("occluded")

    @property
    def track_id(self) -> Any:
        return self._attributes.get("track_id")

    @property
    def outside(self) -> Any:
        return self._attributes.get("outside")

    @property
    def keyframe(self) -> Any:
        return self._attributes.get("keyframe")

    @cached_property
    def attribute(self) -> _AnnotationAttributesFilterContext:
        return _AnnotationAttributesFilterContext(self._attributes)

    @property
    def skeleton(self) -> Any:
        return self._attributes.get(_PARENT_SKELETON_CONTEXT_KEY)

    @property
    def track_ref(self) -> Any:
        return self.track_id

    @cached_property
    def track(self) -> "_ShapeFilterContext | None":
        if not self._include_track or self.track_id is None:
            return None

        return self.__class__(
            self._ann,
            self._categories,
            self._attributes,
            include_track=False,
        )


@attrs.define(slots=False)
class _FilterContext:
    shape: _ShapeFilterContext
    attribute: _FilterAttributeContext | None = None


class RequirementJsonLogicFilter(JsonLogicFilter):
    nested_attribute_separator = "."
    PARENT_SKELETON_CONTEXT_KEY = _PARENT_SKELETON_CONTEXT_KEY

    _SHAPE_FILTER_FIELDS = (
        "label",
        "type",
        "area",
        "source",
        "occluded",
        "track_id",
        "outside",
        "keyframe",
    )

    _ATTRIBUTE_FILTER_FIELDS = (
        "name",
        "value",
    )

    _INTERNAL_ATTRIBUTE_FIELDS = _FILTER_INTERNAL_ATTRIBUTE_FIELDS

    _SHAPE_LOOKUP_FIELDS = {
        **{f"shape.{name}": f"shape.{name}" for name in _SHAPE_FILTER_FIELDS},
        **{
            f"shape.attribute.{name}": f"shape.attribute.{name}"
            for name in _ATTRIBUTE_FILTER_FIELDS
        },
        "shape.track": "shape.track_ref",
        **{f"shape.track.{name}": f"shape.track.{name}" for name in _SHAPE_FILTER_FIELDS},
        **{
            f"shape.track.attribute.{name}": f"shape.track.attribute.{name}"
            for name in _ATTRIBUTE_FILTER_FIELDS
        },
    }

    _SKELETON_LOOKUP_FIELDS = {
        "shape.skeleton": "shape.skeleton",
        **_with_replaced_prefix(
            _SHAPE_LOOKUP_FIELDS,
            source_prefix="shape",
            target_prefix="shape.skeleton",
        ),
    }

    _ATTRIBUTE_LOOKUP_FIELDS = {
        f"attribute.{name}": f"attribute.{name}" for name in _ATTRIBUTE_FILTER_FIELDS
    }

    _LOOKUP_FIELDS = {
        **_SHAPE_LOOKUP_FIELDS,
        **_SKELETON_LOOKUP_FIELDS,
        **_ATTRIBUTE_LOOKUP_FIELDS,
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
            self._parse_and_validate_query(
                filter_expression,
                allowed_terms=set(self._LOOKUP_FIELDS),
            )
            if filter_expression
            else None
        )

    @classmethod
    def get_supported_terms(
        cls,
        *,
        annotation_type: str | None = None,
        parent_annotation_type: str | None = None,
    ) -> list[str]:
        if annotation_type is None:
            return sorted(cls._LOOKUP_FIELDS)

        supported_terms = dict(cls._LOOKUP_FIELDS)

        if annotation_type != models.QualityRequirementAnnotationType.ATTRIBUTE:
            for term in cls._ATTRIBUTE_LOOKUP_FIELDS:
                supported_terms.pop(term, None)

        supports_skeleton_lookup = (
            annotation_type == models.QualityRequirementAnnotationType.SKELETON_KEYPOINT
            or (
                annotation_type == models.QualityRequirementAnnotationType.ATTRIBUTE
                and parent_annotation_type
                == models.QualityRequirementAnnotationType.SKELETON_KEYPOINT
            )
        )
        if not supports_skeleton_lookup:
            for term in cls._SKELETON_LOOKUP_FIELDS:
                supported_terms.pop(term, None)

        return sorted(supported_terms)

    @classmethod
    def validate_expression(
        cls,
        expression: str,
        *,
        annotation_type: str | None = None,
        parent_annotation_type: str | None = None,
    ) -> None:
        filter_expression = (expression or "").strip()
        if not filter_expression:
            return

        allowed_terms = set(
            cls.get_supported_terms(
                annotation_type=annotation_type,
                parent_annotation_type=parent_annotation_type,
            )
        )
        cls._parse_and_validate_query(filter_expression, allowed_terms=allowed_terms)

    @classmethod
    def _parse_and_validate_query(
        cls,
        json_rules: str,
        *,
        allowed_terms: set[str],
    ) -> JsonLogicFilter.Rules:
        parsed_rules = JsonLogicFilter().parse_query(json_rules, raise_on_empty=False)
        cls._validate_rules(parsed_rules, allowed_terms=allowed_terms)
        return parsed_rules

    # TODO: Perhaps it would be worth incorporating this into the general logic for filters that use JsonLogicFilter?
    @classmethod
    def _validate_rules(cls, rules: Any, *, allowed_terms: set[str]) -> None:
        if not isinstance(rules, dict) or not rules:
            raise ValidationError("filter: expected a dict and non-empty object")

        op, args = next(iter(rules.items()))

        if op in {"and", "or"}:
            if not isinstance(args, list) or not args:
                raise ValidationError(
                    f"filter: operation '{op}' requires a non-empty list argument"
                )

            for arg in args:
                cls._validate_rules(arg, allowed_terms=allowed_terms)
            return

        if op in {"!", "!!"}:
            if not isinstance(args, dict) or not args:
                raise ValidationError(
                    f"filter: operation '{op}' requires a dict and non-empty object argument"
                )

            cls._validate_rules(args, allowed_terms=allowed_terms)
            return

        if op == "var":
            cls._validate_var(args, allowed_terms=allowed_terms)
            return

        if op == "<=" and isinstance(args, list) and len(args) == 3:
            cls._validate_var_operand(args[1], op=op, allowed_terms=allowed_terms)
            return

        if op in {"!=", "==", "<", ">", "<=", ">="}:
            if not isinstance(args, list) or len(args) != 2:
                raise ValidationError(f"filter: operation '{op}' requires exactly 2 arguments")

            cls._validate_var_operand(args[0], op=op, allowed_terms=allowed_terms)
            return

        if op == "in":
            if not isinstance(args, list) or len(args) != 2:
                raise ValidationError("filter: operation 'in' requires exactly 2 arguments")

            if isinstance(args[0], dict):
                cls._validate_var_operand(args[0], op=op, allowed_terms=allowed_terms)
                return

            if isinstance(args[1], dict):
                cls._validate_var_operand(args[1], op=op, allowed_terms=allowed_terms)
                return

            raise ValidationError(
                "filter: operation 'in' requires a variable reference in one of its arguments"
            )

        raise ValidationError(f"filter: operation '{op}' with arguments '{args}' is not supported")

    @classmethod
    def _validate_var_operand(
        cls,
        arg: Any,
        *,
        op: str,
        allowed_terms: set[str],
    ) -> None:
        if not isinstance(arg, dict) or set(arg.keys()) != {"var"}:
            raise ValidationError(
                f"filter: operation '{op}' requires a variable reference argument"
            )

        cls._validate_var(arg["var"], allowed_terms=allowed_terms)

    @classmethod
    def _validate_var(cls, arg: Any, *, allowed_terms: set[str]) -> None:
        if not isinstance(arg, str):
            raise ValidationError(
                f"filter: operation 'var' requires a string argument, got '{arg}'"
            )

        if arg not in allowed_terms:
            raise ValidationError(f"filter: term '{arg}' is not supported")

    def matches_annotation(self, ann: dm.Annotation) -> bool:
        if ann.type not in self._included_annotation_types:
            return False

        return self._matches(self._build_shape_filter_context(ann))

    def matches_attribute(self, shape_ann: dm.Annotation, attr_name: str, attr_value: Any) -> bool:
        return self._matches(self._build_attribute_filter_context(shape_ann, attr_name, attr_value))

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

    def _matches(self, filter_obj: _FilterContext) -> bool:
        if not self._rules:
            return True

        return bool(self._apply_filter(self._rules, self._LOOKUP_FIELDS, filter_obj))

    def get_nested_attr(self, obj: Any, nested_attr_path: str) -> Any:
        result = obj
        for attribute in nested_attr_path.split(self.nested_attribute_separator):
            if result is None:
                return None

            if isinstance(result, dict):
                result = result.get(attribute)
            else:
                result = getattr(result, attribute, None)

        if callable(result):
            result = result()

        return result

    @classmethod
    def _is_multi_value(cls, value: Any) -> bool:
        return isinstance(value, (list, tuple, set, frozenset))

    @classmethod
    def _get_candidate_values(cls, value: Any) -> list[Any]:
        if value is None:
            return []

        if cls._is_multi_value(value):
            return [candidate for candidate in value if candidate is not None]

        return [value]

    @classmethod
    def _contains(cls, container: Any, member: Any) -> bool:
        if container is None:
            return False

        try:
            return operator.contains(container, member)
        except TypeError:
            return False

    @classmethod
    def _compare_values(cls, actual: Any, expected: Any, *, op: str) -> bool:
        candidates = cls._get_candidate_values(actual)
        if not candidates:
            return False

        comparator = {
            "!=": operator.ne,
            "==": operator.eq,
            "<": operator.lt,
            "<=": operator.le,
            ">": operator.gt,
            ">=": operator.ge,
        }[op]

        matches: list[bool] = []
        for candidate in candidates:
            try:
                matches.append(comparator(candidate, expected))
            except TypeError:
                matches.append(False)

        return all(matches) if op == "!=" else any(matches)

    @classmethod
    def _compare_range(cls, actual: Any, lower: Any, upper: Any) -> bool:
        for candidate in cls._get_candidate_values(actual):
            try:
                if lower <= candidate <= upper:
                    return True
            except TypeError:
                continue

        return False

    def _apply_filter(self, rules, lookup_fields, obj):
        op, args = next(iter(rules.items()))
        if op in ["or", "and"]:
            return {"or": any, "and": all}[op](
                self._apply_filter(arg, lookup_fields, obj) for arg in args
            )
        elif op == "!":
            return not self._apply_filter(args, lookup_fields, obj)
        elif op == "!!":
            return self._apply_filter(args, lookup_fields, obj)
        elif op == "var":
            var = lookup_fields[args]
            var_value = self.get_nested_attr(obj, var)
            return bool(var_value) if self._is_multi_value(var_value) else var_value is not None
        elif op == "<=" and len(args) == 3:
            var = lookup_fields[args[1]["var"]]
            var_value = self.get_nested_attr(obj, var)
            return self._compare_range(var_value, args[0], args[2])
        elif op in ["!=", "==", "<", ">", "<=", ">="] and len(args) == 2:
            var = lookup_fields[args[0]["var"]]
            var_value = self.get_nested_attr(obj, var)
            return self._compare_values(var_value, args[1], op=op)
        elif op == "in":
            if isinstance(args[0], dict):
                var = lookup_fields[args[0]["var"]]
                var_value = self.get_nested_attr(obj, var)
                return any(
                    self._contains(args[1], candidate)
                    for candidate in self._get_candidate_values(var_value)
                )

            var = lookup_fields[args[1]["var"]]
            var_value = self.get_nested_attr(obj, var)
            return self._contains(var_value, args[0])
        else:
            raise ValidationError(
                f"filter: {op} operation with {args} arguments is not implemented"
            )

    def build_shape_context_for_annotation(self, ann: dm.Annotation) -> _ShapeFilterContext:
        return _ShapeFilterContext.from_annotation(ann, categories=self._categories)

    def _build_shape_filter_context(self, ann: dm.Annotation) -> _FilterContext:
        return _FilterContext(shape=self.build_shape_context_for_annotation(ann))

    def _build_attribute_filter_context(
        self, shape_ann: dm.Annotation, attr_name: str, attr_value: Any
    ) -> _FilterContext:
        return _FilterContext(
            shape=self.build_shape_context_for_annotation(shape_ann),
            attribute=_FilterAttributeContext(name=attr_name, value=attr_value),
        )
