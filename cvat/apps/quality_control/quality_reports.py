# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from collections.abc import Hashable, Sequence
from functools import cached_property
from typing import Any

import datumaro as dm
from django.db import transaction

from cvat.apps.dataset_manager.bindings import (
    CommonData,
    CvatToDmAnnotationConverter,
    GetCVATDataExtractor,
    JobData,
    match_dm_item,
)
from cvat.apps.dataset_manager.task import JobAnnotation
from cvat.apps.engine.models import (
    Project,
    Task,
)
from cvat.apps.quality_control import models
from cvat.apps.quality_control.attribute_comparison import CVAT_ATTRIBUTE_SPEC_IDS_ATTR
from cvat.apps.quality_control.comparison_report import AnnotationId
from cvat.apps.quality_control.models import AnnotationType

# For backwards compatibility, don't break old reports when requirements are changed


class _MemoizingAnnotationConverterFactory:
    def __init__(
        self,
        attribute_spec_ids_by_label: dict[str, dict[str, int]] | None = None,
    ) -> None:
        self._annotation_mapping = {}  # dm annotation -> cvat annotation
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

    def get_source_ann(self, dm_ann: dm.Annotation) -> CommonData.Tag | CommonData.LabeledShape:
        "Retrieve the original CVAT annotation for a Datumaro annotation"
        return self._annotation_mapping[self._make_key(dm_ann)]

    def clear(self):
        self._annotation_mapping.clear()

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

        self._factory.remember_conversion(shape, converted)
        return converted


class JobDataProvider:
    @classmethod
    def add_prefetch_info(cls, queryset):
        return JobAnnotation.add_prefetch_info(queryset)

    @transaction.atomic
    def __init__(self, job_id: int, *, queryset=None, included_frames=None) -> None:
        self.job_id = job_id
        self.job_annotation = JobAnnotation(job_id, queryset=queryset)
        self.job_annotation.init_from_db()
        self.job_data = JobData(
            annotation_ir=self.job_annotation.ir_data,
            db_job=self.job_annotation.db_job,
            use_server_track_ids=True,
            included_frames=included_frames,
        )

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
    def dm_dataset(self):
        from cvat.apps.dataset_manager.formats.registry import dm_env

        extractor = GetCVATDataExtractor(self.job_data, convert_annotations=self._annotation_memo)
        return dm.Dataset.from_extractors(extractor, env=dm_env)

    def dm_item_id_to_frame_id(self, item: dm.DatasetItem) -> int:
        return match_dm_item(item, self.job_data)

    def dm_ann_to_ann_id(self, ann: dm.Annotation) -> AnnotationId:
        source_ann = self._annotation_memo.get_source_ann(ann)
        if "track_id" in ann.attributes:
            source_ann_id = source_ann.track_id
            ann_type = AnnotationType.TRACK
            shape_type = source_ann.type
        else:
            if isinstance(source_ann, CommonData.LabeledShape):
                ann_type = AnnotationType.SHAPE
                shape_type = source_ann.type
            elif isinstance(source_ann, CommonData.Tag):
                ann_type = AnnotationType.TAG
                shape_type = None
            else:
                assert False

            source_ann_id = source_ann.id

        return AnnotationId(
            obj_id=source_ann_id, type=ann_type, shape_type=shape_type, job_id=self.job_id
        )

    def remember_dm_ann_alias(self, source_ann: dm.Annotation, alias_ann: dm.Annotation) -> None:
        self._annotation_memo.remember_annotation_alias(source_ann, alias_ann)


class QualitySettingsManager:
    def get_project_settings(self, project: Project) -> models.QualitySettings:
        return project.quality_settings

    def get_task_settings(self, task: Task, *, inherit: bool = True) -> models.QualitySettings:
        quality_settings = task.quality_settings

        if inherit and quality_settings.inherit and task.project:
            quality_settings = self.get_project_settings(task.project)

        return quality_settings
