# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from collections.abc import Callable, Iterator, Mapping
from functools import cached_property
from types import MappingProxyType
from typing import Any, cast

import datumaro as dm

from cvat.apps.dataset_manager import data_model as cdm


class DatumaroAnnotationAdapter(cdm.Annotation):
    """A view of native geometry with source identity supplied by the caller.

    Source references are resolved lazily and cached for this view.
    """

    def __init__(
        self,
        annotation: dm.Annotation,
        *,
        reference_getter: Callable[[dm.Annotation], cdm.AnnotationReference],
    ) -> None:
        self._annotation = annotation
        self._reference_getter = reference_getter

    @property
    def native_annotation(self) -> dm.Annotation:
        """Expose native geometry to consumers specific to Datumaro."""
        return self._annotation

    @property
    def id(self) -> int | None:
        return self._annotation.id

    @property
    def label(self) -> int | None:
        return self._annotation.label

    @property
    def attributes(self) -> Mapping[str, Any]:
        return MappingProxyType(self._annotation.attributes)

    @cached_property
    def reference(self) -> cdm.AnnotationReference:
        return self._reference_getter(self._annotation)

    @property
    def source(self) -> str | None:
        return self._annotation.attributes.get("source")

    @property
    def group(self) -> int:
        return self._annotation.group

    @property
    def score(self) -> float:
        return self._annotation.attributes.get("score", 1.0)


class DatumaroAnnotation2DAdapter(DatumaroAnnotationAdapter, cdm.Annotation2D):
    def get_area(self) -> float:
        return cast(
            dm.Bbox | dm.Polygon | dm.PolyLine | dm.Points | dm.Ellipse | dm.Mask | dm.Skeleton,
            self.native_annotation,
        ).get_area()


class DatumaroTagAdapter(DatumaroAnnotationAdapter, cdm.Tag):
    pass


class DatumaroRectangleAdapter(DatumaroAnnotation2DAdapter, cdm.Rectangle):
    pass


class DatumaroPolygonAdapter(DatumaroAnnotation2DAdapter, cdm.Polygon):
    pass


class DatumaroPolylineAdapter(DatumaroAnnotation2DAdapter, cdm.Polyline):
    pass


class DatumaroPointsAdapter(DatumaroAnnotation2DAdapter, cdm.Points):
    pass


class DatumaroEllipseAdapter(DatumaroAnnotation2DAdapter, cdm.Ellipse):
    pass


class DatumaroMaskAdapter(DatumaroAnnotation2DAdapter, cdm.Mask):
    pass


class DatumaroSkeletonAdapter(DatumaroAnnotation2DAdapter, cdm.Skeleton):
    pass


class DatumaroCuboidAdapter(DatumaroAnnotationAdapter, cdm.Cuboid):
    pass


_ANNOTATION_ADAPTERS: dict[dm.AnnotationType, type[DatumaroAnnotationAdapter]] = {
    dm.AnnotationType.label: DatumaroTagAdapter,
    dm.AnnotationType.bbox: DatumaroRectangleAdapter,
    dm.AnnotationType.polygon: DatumaroPolygonAdapter,
    dm.AnnotationType.polyline: DatumaroPolylineAdapter,
    dm.AnnotationType.points: DatumaroPointsAdapter,
    dm.AnnotationType.ellipse: DatumaroEllipseAdapter,
    dm.AnnotationType.mask: DatumaroMaskAdapter,
    dm.AnnotationType.skeleton: DatumaroSkeletonAdapter,
    dm.AnnotationType.cuboid_3d: DatumaroCuboidAdapter,
}


def _build_native_annotation_types() -> dict[type[cdm.Annotation], dm.AnnotationType]:
    """Map each adapter's declared model interface to its native type."""
    native_types: dict[type[cdm.Annotation], dm.AnnotationType] = {}
    for native_type, adapter in _ANNOTATION_ADAPTERS.items():
        if not issubclass(adapter, DatumaroAnnotationAdapter):
            raise TypeError(f"{adapter.__name__} must inherit from DatumaroAnnotationAdapter")

        annotation_types = [
            base
            for base in adapter.__bases__
            if issubclass(base, cdm.Annotation) and not issubclass(base, DatumaroAnnotationAdapter)
        ]
        if len(annotation_types) != 1:
            raise TypeError(
                f"{adapter.__name__} must directly inherit from exactly one CDM annotation "
                f"interface; found {len(annotation_types)}"
            )

        native_types[annotation_types[0]] = native_type
    return native_types


_NATIVE_ANNOTATION_TYPES = _build_native_annotation_types()


def adapt_annotation(
    annotation: dm.Annotation,
    *,
    reference_getter: Callable[[dm.Annotation], cdm.AnnotationReference],
) -> DatumaroAnnotationAdapter:
    try:
        adapter = _ANNOTATION_ADAPTERS[annotation.type]
    except KeyError:
        raise ValueError(f"Unsupported Datumaro annotation type: {annotation.type}") from None
    return adapter(annotation, reference_getter=reference_getter)


def to_datumaro_annotation_type(annotation_type: type[cdm.Annotation]) -> dm.AnnotationType:
    try:
        return _NATIVE_ANNOTATION_TYPES[annotation_type]
    except KeyError:
        raise ValueError(
            f"No Datumaro representation for annotation type: {annotation_type}"
        ) from None


class DatumaroSampleAdapter(cdm.Sample):
    def __init__(self, item: dm.DatasetItem, dataset: DatumaroDatasetAdapter) -> None:
        self._item = item
        self._dataset = dataset

    @property
    def native_item(self) -> dm.DatasetItem:
        return self._item

    @property
    def id(self) -> str:
        return self._item.id

    @property
    def subset(self) -> str:
        return self._item.subset

    @cached_property
    def annotations(self) -> tuple[DatumaroAnnotationAdapter, ...]:
        return tuple(self._dataset.adapt_annotation(ann) for ann in self._item.annotations)

    @cached_property
    def frame_id(self) -> int | None:
        return self._dataset.get_frame_id(self._item)


class DatumaroDatasetAdapter(cdm.Dataset):
    """A dataset view that preserves native category order and media objects.

    Item views are created on demand and are not retained by the dataset.
    The caller owns the native dataset and source-reference lifetime.
    """

    def __init__(
        self,
        dataset: dm.Dataset,
        *,
        label_catalog: cdm.LabelCatalog,
        reference_getter: Callable[[dm.Annotation], cdm.AnnotationReference],
        frame_id_getter: Callable[[dm.DatasetItem], int | None] | None = None,
    ) -> None:
        self._dataset = dataset
        self._label_catalog = label_catalog
        self._reference_getter = reference_getter
        self._frame_id_getter = frame_id_getter

    @property
    def native_dataset(self) -> dm.Dataset:
        return self._dataset

    @cached_property
    def label_catalog(self) -> cdm.LabelCatalog:
        return cdm.LabelCatalog(
            tuple(
                self._label_catalog.find(label.name, parent=label.parent)
                for label in self._dataset.categories().get(dm.AnnotationType.label, ())
            )
        )

    def adapt_annotation(self, annotation: dm.Annotation) -> DatumaroAnnotationAdapter:
        return adapt_annotation(annotation, reference_getter=self._reference_getter)

    def get_frame_id(self, item: dm.DatasetItem) -> int | None:
        return self._frame_id_getter(item) if self._frame_id_getter is not None else None

    def __iter__(self) -> Iterator[DatumaroSampleAdapter]:
        for item in self._dataset:
            yield DatumaroSampleAdapter(item, self)

    def __len__(self) -> int:
        return len(self._dataset)

    def get(self, item_id: str, *, subset: str) -> DatumaroSampleAdapter | None:
        item = self._dataset.get(id=item_id, subset=subset)
        return DatumaroSampleAdapter(item, self) if item is not None else None
