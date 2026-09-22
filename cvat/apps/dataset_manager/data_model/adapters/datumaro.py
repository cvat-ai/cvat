# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from collections.abc import Callable, Iterator, Mapping
from functools import cached_property
from types import MappingProxyType
from typing import Any

import datumaro as dm

from cvat.apps.dataset_manager import data_model as cdm

_DATUMARO_TO_CVAT_ANNOTATION_TYPES: dict[dm.AnnotationType, cdm.AnnotationType] = {
    dm.AnnotationType.label: cdm.AnnotationType.TAG,
    dm.AnnotationType.bbox: cdm.AnnotationType.RECTANGLE,
    dm.AnnotationType.skeleton: cdm.AnnotationType.SKELETON,
    dm.AnnotationType.points: cdm.AnnotationType.POINTS,
    dm.AnnotationType.polyline: cdm.AnnotationType.POLYLINE,
    dm.AnnotationType.mask: cdm.AnnotationType.MASK,
    dm.AnnotationType.polygon: cdm.AnnotationType.POLYGON,
    dm.AnnotationType.ellipse: cdm.AnnotationType.ELLIPSE,
    dm.AnnotationType.cuboid_3d: cdm.AnnotationType.CUBOID,
}
_CVAT_TO_DATUMARO_ANNOTATION_TYPES = {
    value: key for key, value in _DATUMARO_TO_CVAT_ANNOTATION_TYPES.items()
}


def to_annotation_type(annotation_type: dm.AnnotationType) -> cdm.AnnotationType:
    try:
        return _DATUMARO_TO_CVAT_ANNOTATION_TYPES[annotation_type]
    except KeyError:
        raise ValueError(f"Unsupported Datumaro annotation type: {annotation_type}") from None


def to_datumaro_annotation_type(annotation_type: cdm.AnnotationType) -> dm.AnnotationType:
    try:
        return _CVAT_TO_DATUMARO_ANNOTATION_TYPES[annotation_type]
    except KeyError:
        raise ValueError(
            f"No Datumaro representation for annotation type: {annotation_type}"
        ) from None


class DatumaroAnnotationAdapter(cdm.Annotation):
    """A view of native geometry with source identity supplied by the caller.

    The adapter does not depend on a provider, Django models, or quality control.
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
    def annotation_type(self) -> cdm.AnnotationType:
        return to_annotation_type(self._annotation.type)

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


class DatumaroDatasetItemAdapter(cdm.DatasetItem):
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
        return DatumaroAnnotationAdapter(annotation, reference_getter=self._reference_getter)

    def get_frame_id(self, item: dm.DatasetItem) -> int | None:
        return self._frame_id_getter(item) if self._frame_id_getter is not None else None

    def __iter__(self) -> Iterator[DatumaroDatasetItemAdapter]:
        for item in self._dataset:
            yield DatumaroDatasetItemAdapter(item, self)

    def __len__(self) -> int:
        return len(self._dataset)

    def get(self, item_id: str, *, subset: str) -> DatumaroDatasetItemAdapter | None:
        item = self._dataset.get(id=item_id, subset=subset)
        return DatumaroDatasetItemAdapter(item, self) if item is not None else None
