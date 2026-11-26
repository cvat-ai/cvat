# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from collections.abc import Hashable, Sequence
from functools import cached_property, partial
from typing import Any

import datumaro as dm
from django.db import transaction

from cvat.apps.dataset_manager import data_model as cdm
from cvat.apps.dataset_manager.bindings import (
    CommonData,
    CvatDataExtractor,
    CvatToDmAnnotationConverter,
    GetCVATDataExtractor,
    match_dm_item,
)
from cvat.apps.dataset_manager.data_model.adapters.datumaro import DatumaroDatasetAdapter
from cvat.apps.engine.models import DimensionType
from cvat.apps.quality_control.attribute_comparison import CVAT_ATTRIBUTE_SPEC_IDS_ATTR
from cvat.apps.quality_control.data_providers import JobDataProvider


class _Quality3DDataExtractor(CvatDataExtractor):
    @staticmethod
    def _load_user_info(meta: dict) -> dict:
        # QC does not export author metadata; the task owner may have been deleted.
        return {}

    def _process_one_frame_data(self, frame_data: CommonData.Frame) -> dm.DatasetItem:
        # Frame indices are unique even when PCD basenames collide. Neither PCD
        # contents nor context images are needed to compare annotation geometry.
        return dm.DatasetItem(
            id=str(frame_data.idx),
            subset=frame_data.subset,
            annotations=partial(self._read_cvat_anno, frame_data, self._instance_meta["labels"]),
            media=dm.PointCloud.from_file(frame_data.name),
            attributes={"frame": frame_data.frame},
        )


class _MemoizingAnnotationConverterFactory:
    def __init__(
        self,
        attribute_spec_ids_by_label: dict[str, dict[str, int]] | None = None,
    ) -> None:
        self._annotation_mapping = {}  # dm annotation -> cvat annotation
        self._user_attributes = {}
        self._attribute_spec_ids_by_label = attribute_spec_ids_by_label or {}

    def remember_conversion(self, cvat_ann: Any, dm_anns: Sequence[dm.Annotation]) -> None:
        for dm_ann in dm_anns:
            self._remember_annotation(cvat_ann, dm_ann)

    def _remember_annotation(self, cvat_ann: Any, dm_ann: dm.Annotation) -> None:
        self._annotation_mapping[self._make_key(dm_ann)] = cvat_ann

        if isinstance(dm_ann, dm.Skeleton):
            cvat_elements = getattr(cvat_ann, "elements", ()) or ()
            for cvat_element, dm_element in zip(cvat_elements, dm_ann.elements):
                self._remember_annotation(cvat_element, dm_element)

    def remember_annotation_alias(
        self, source_dm_ann: dm.Annotation, alias_dm_ann: dm.Annotation
    ) -> None:
        self._annotation_mapping[self._make_key(alias_dm_ann)] = self.get_source_ann(source_dm_ann)

    def _make_key(self, dm_ann: dm.Annotation) -> Hashable:
        return id(dm_ann)

    def get_source_ann(
        self, dm_ann: dm.Annotation
    ) -> CommonData.Tag | CommonData.LabeledShape | CommonData.TrackedShape:
        "Retrieve the original CVAT annotation for a Datumaro annotation"
        return self._annotation_mapping[self._make_key(dm_ann)]

    def clear(self):
        self._annotation_mapping.clear()
        self._user_attributes.clear()

    def get_user_attributes(self, dm_ann: dm.Annotation) -> dict[str, Any]:
        return self._user_attributes[self._make_key(dm_ann)]

    def __call__(self, *args, **kwargs) -> list[dm.Annotation]:
        converter = _MemoizingAnnotationConverter(
            *args,
            factory=self,
            attribute_spec_ids_by_label=self._attribute_spec_ids_by_label,
            **kwargs,
        )
        return converter.convert()


class _MemoizingAnnotationConverter(CvatToDmAnnotationConverter):
    def __init__(
        self,
        *args,
        factory: _MemoizingAnnotationConverterFactory,
        attribute_spec_ids_by_label: dict[str, dict[str, int]],
        **kwargs,
    ) -> None:
        super().__init__(*args, **kwargs)
        self._factory = factory
        self._attribute_spec_ids_by_label = attribute_spec_ids_by_label

    def _convert_attrs(self, label: str, cvat_attrs: list[Any]) -> dict[str, Any]:
        dm_attrs = super()._convert_attrs(label, cvat_attrs)
        attribute_spec_ids = self._attribute_spec_ids_by_label.get(label, {})
        if attribute_spec_ids:
            dm_attrs[CVAT_ATTRIBUTE_SPEC_IDS_ATTR] = attribute_spec_ids

        return dm_attrs

    def _convert_tag(self, tag):
        converted = list(super()._convert_tag(tag))
        for dm_ann in converted:
            dm_ann.id = tag.id

        self._factory.remember_conversion(tag, converted)
        return converted

    def _convert_shape(self, shape, *, index):
        converted = list(super()._convert_shape(shape, index=index))
        for dm_ann in converted:
            dm_ann.id = shape.id
            if self.dimension == DimensionType.DIM_3D:
                self._factory._user_attributes[self._factory._make_key(dm_ann)] = (
                    self._convert_attrs(shape.label, shape.attributes)
                )

        self._factory.remember_conversion(shape, converted)
        return converted


class DatumaroJobDataProvider(JobDataProvider):
    """Datumaro conversion for quality comparison and native consensus merging."""

    @transaction.atomic
    def __init__(self, job_id: int, *, queryset=None, included_frames=None) -> None:
        super().__init__(job_id, queryset=queryset, included_frames=included_frames)
        self._annotation_memo = _MemoizingAnnotationConverterFactory(
            self._get_attribute_spec_ids_by_label()
        )

    def _get_attribute_spec_ids_by_label(self) -> dict[str, dict[str, int]]:
        return {
            f"{db_label.parent.name if db_label.parent else ''}{db_label.name}": {
                db_attribute.name: db_attribute.id
                for db_attribute in db_label.attributespec_set.all()
            }
            for db_label in self.job_data._label_mapping.values()
        }

    @cached_property
    def dataset(self) -> DatumaroDatasetAdapter:
        return DatumaroDatasetAdapter(
            self.dm_dataset,
            label_catalog=self._load_label_catalog(),
            reference_getter=self.dm_ann_to_annotation_reference,
            frame_id_getter=self.dm_item_id_to_frame_id,
        )

    @cached_property
    def dm_dataset(self) -> dm.Dataset:
        from cvat.apps.dataset_manager.formats.registry import dm_env

        extractor_factory = (
            _Quality3DDataExtractor
            if self.dimension == DimensionType.DIM_3D
            else GetCVATDataExtractor
        )
        extractor = extractor_factory(
            self.job_data, dimension=self.dimension, convert_annotations=self._annotation_memo
        )
        return dm.Dataset.from_extractors(extractor, env=dm_env)

    def dm_item_id_to_frame_id(self, item: dm.DatasetItem) -> int:
        if self.dimension == DimensionType.DIM_3D:
            return int(item.id)
        return match_dm_item(item, self.job_data)

    def dm_ann_to_annotation_reference(self, ann: dm.Annotation) -> cdm.AnnotationReference:
        source_ann = self._annotation_memo.get_source_ann(ann)
        if hasattr(source_ann, "track_id"):
            source_ann_id = source_ann.track_id
            ann_type = cdm.AnnotationReferenceType.TRACK
            shape_type = source_ann.type
        else:
            if isinstance(source_ann, CommonData.LabeledShape):
                ann_type = cdm.AnnotationReferenceType.SHAPE
                shape_type = source_ann.type
            elif isinstance(source_ann, CommonData.Tag):
                ann_type = cdm.AnnotationReferenceType.TAG
                shape_type = None
            else:
                assert False

            source_ann_id = source_ann.id

        return cdm.AnnotationReference(
            obj_id=source_ann_id,
            job_id=self.job_id,
            type=ann_type,
            shape_type=str(shape_type) if shape_type is not None else None,
        )

    def remember_dm_ann_alias(self, source_ann: dm.Annotation, alias_ann: dm.Annotation) -> None:
        self._annotation_memo.remember_annotation_alias(source_ann, alias_ann)

    def close(self) -> None:
        """Release both views and conversion caches without constructing a dataset."""
        self.__dict__.pop("dataset", None)
        self.__dict__.pop("dm_dataset", None)
        self._annotation_memo.clear()
