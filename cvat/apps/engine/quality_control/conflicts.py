# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from typing import Hashable, List, Optional, Union

import datumaro as dm
from django.db import transaction

from cvat.apps.dataset_manager.task import JobAnnotation
from cvat.apps.dataset_manager.bindings import (CommonData, CvatToDmAnnotationConverter,
    GetCVATDataExtractor, JobData)
from cvat.apps.dataset_manager.formats.registry import dm_env
import cvat.apps.engine.models as db_models

from .models import (AnnotationConflictsReport, AnnotationConflict, AnnotationConflictType,
    AnnotationId)


class _JobDataProvider:
    def __init__(self, job_id: int) -> None:
        self.job_id = job_id
        self.job_annotation = JobAnnotation(job_id)
        self.job_data = JobData(
            annotation_ir=self.job_annotation.ir_data,
            db_job=self.job_annotation.db_job
        )

        self._annotation_memo = _MemoizingAnnotationConverterFactory()
        extractor = GetCVATDataExtractor(self.job_data)
        extractor.convert_annotations = self._annotation_memo
        self.dm_dataset = dm.Dataset.from_extractors(extractor, env=dm_env)

    def dm_item_id_to_frame_id(self, item_id: str) -> int:
        return self.job_data.match_frame(item_id)

    def dm_ann_to_ann_id(self, ann: dm.Annotation) -> AnnotationId:
        source_ann = self._annotation_memo.get_source_ann(ann)
        ann_type = 'tag' if isinstance(ann, CommonData.Tag) else source_ann.type
        return AnnotationId(id=source_ann.id, type=ann_type, job_id=self.job_id)


class _MemoizingAnnotationConverterFactory:
    def __init__(self):
        self._annotation_mapping = {} # dm annotation -> cvat annotation

    def remember_conversion(self, cvat_ann, dm_anns):
        for dm_ann in dm_anns:
            self._annotation_mapping[self._make_key(dm_ann)] = cvat_ann

    def _make_key(self, dm_ann: dm.Annotation) -> Hashable:
        return id(dm_ann)

    def get_source_ann(
        self, dm_ann: dm.Annotation
    ) -> Union[CommonData.Tag, CommonData.LabeledShape]:
        return self._annotation_mapping[self._make_key(dm_ann)]

    def clear(self):
        self._annotation_mapping.clear()

    def convert_cvat_anno_to_dm(self, *args, **kwargs) -> List[dm.Annotation]:
        self.clear() # old annotations will be irrelevant

        converter = _MemoizingAnnotationConverter(*args, factory=self, **kwargs)
        return converter.convert()

class _MemoizingAnnotationConverter(CvatToDmAnnotationConverter):
    def __init__(self,
        cvat_frame_anno: CommonData.Frame,
        *,
        factory: _MemoizingAnnotationConverterFactory,
        **kwargs
    ) -> None:
        super().__init__(cvat_frame_anno, **kwargs)
        self._factory = factory

    def _convert_tag(self, tag):
        converted = list(super()._convert_tag(tag))
        self._factory.remember_conversion(tag, converted.copy())
        return converted

    def _convert_shape(self, shape, *, index):
        converted = list(super()._convert_shape(shape, index=index))
        self._factory.remember_conversion(shape, converted.copy())
        return converted


@transaction.atomic
def _save_report_to_db(
    report: AnnotationConflictsReport, job: db_models.Job
) -> db_models.AnnotationConflictsReport:
    db_report = db_models.AnnotationConflictsReport.objects.create(**report.to_dict(), job=job)
    db_report.conflicts = db_models.AnnotationConflict.objects.bulk_create([
        db_models.AnnotationConflict(**conflict.to_dict(), )
        for conflict in report.conflicts
    ])
    return db_report


class DatasetComparator:
    def __init__(self,
        this_job_data_provider: _JobDataProvider,
        gt_job_data_provider: _JobDataProvider
    ) -> None:
        self._this_job_data_provider = this_job_data_provider
        self._gt_job_data_provider = gt_job_data_provider
        self._comparator = dm.ops.DistanceComparator()

    def find_gt_conflicts(self) -> List[AnnotationConflict]:
        this_job_dataset = self._gt_job_data_provider.dm_dataset
        gt_job_dataset = self._gt_job_data_provider.dm_dataset

        conflicts = []
        for gt_item in gt_job_dataset:
            this_item = this_job_dataset.get(gt_item.id)
            if not this_item:
                continue # we need to compare only intersecting frames

            frame_id = self._gt_job_data_provider.dm_item_id_to_frame_id(this_item.id)
            frame_results = self._comparator.match_annotations(gt_item, this_item)

            conflicts.extend(self._generate_frame_annotation_conflicts(frame_id, frame_results))

        return conflicts

    def find_frame_gt_conflicts(self, frame_id: int) -> List[AnnotationConflict]:
        this_job_dataset = self._gt_job_data_provider.dm_dataset
        gt_job_dataset = self._gt_job_data_provider.dm_dataset

        conflicts = []

        for gt_item in gt_job_dataset:
            this_item = this_job_dataset.get(gt_item.id)
            if not this_item:
                continue # we need to compare only intersecting frames

            _frame_id = self._gt_job_data_provider.dm_item_id_to_frame_id(this_item.id)
            if frame_id != _frame_id:
                # TODO: find more optimal way
                continue

            frame_results = self._comparator.match_annotations(gt_item, this_item)

            conflicts.extend(self._generate_frame_annotation_conflicts(_frame_id, frame_results))

            break

        return conflicts

    def _generate_frame_annotation_conflicts(self, frame_id, frame_results):
        conflicts = []

        merged_results = [[], [], [], []]
        for shape_type in [
            dm.AnnotationType.bbox, dm.AnnotationType.mask,
            dm.AnnotationType.points, dm.AnnotationType.polygon, dm.AnnotationType.polyline
        ]:
            for merged_field, field in zip(merged_results, frame_results[shape_type]):
                merged_field.extend(field)

        _, mispred, gt_unmatched, this_unmatched = merged_results

        for unmatched_ann in gt_unmatched:
            conflicts.append(AnnotationConflict(
                frame_id=frame_id,
                type=AnnotationConflictType.MISSING_ANNOTATION,
                annotation_ids=[self._gt_job_data_provider.dm_ann_to_ann_id(unmatched_ann)],
            ))

        for unmatched_ann in this_unmatched:
            conflicts.append(AnnotationConflict(
                frame_id=frame_id,
                type=AnnotationConflictType.EXTRA_ANNOTATION,
                annotation_ids=[self._this_job_data_provider.dm_ann_to_ann_id(unmatched_ann)],
            ))

        for gt_ann, this_ann in mispred:
            conflicts.append(AnnotationConflict(
                frame_id=frame_id,
                type=AnnotationConflictType.MISMATCHING_ANNOTATION,
                annotation_ids=[
                    self._this_job_data_provider.dm_ann_to_ann_id(this_ann),
                    self._gt_job_data_provider.dm_ann_to_ann_id(gt_ann),
                ],
                data={
                    'kind': 'mismatching_label',
                    'value1': gt_ann.label,
                    'value2': this_ann.label,
                },
            ))

        # TODO: Need to check for mismatching attributes
        # for gt_ann, this_ann in matches:
        #
        #     conflicts.append(AnnotationConflict(
        #         frame_id=gt_job_data_provider.dm_item_id_to_frame_id(error.item_id),
        #         type=AnnotationConflictType.MISMATCHING_ANNOTATION,
        #         data={
        #             'kind': 'mismatching_shape_attribute',
        #             'attribute': error.key,
        #             'value1': error.a,
        #             'value2': error.b,
        #         },
        #         message=str(error)
        #     ))

        return conflicts


def find_gt_conflicts(
    this_job: db_models.Job, gt_job: db_models.Job, *, frame_id: Optional[int] = None
) -> db_models.AnnotationConflictsReport:
    this_job_data_provider = _JobDataProvider(this_job.pk)
    gt_job_data_provider = _JobDataProvider(gt_job.pk)

    comparator = DatasetComparator(this_job_data_provider, gt_job_data_provider)
    if frame_id is not None:
        conflicts = comparator.find_frame_gt_conflicts(frame_id=frame_id)
    else:
        conflicts = comparator.find_gt_conflicts()

    report = AnnotationConflictsReport(
        job_id=this_job.id,
        job_last_updated=this_job.updated_date,
        gt_job_last_updated=gt_job.updated_date,
        conflicts=conflicts
    )
    return _save_report_to_db(report, job=this_job)
