# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from typing import Tuple
import datumaro as dm

from cvat.apps.dataset_manager.task import JobAnnotation
from cvat.apps.engine.models import Job
from cvat.apps.dataset_manager.bindings import GetCVATDataExtractor, JobData
from cvat.apps.dataset_manager.formats.registry import dm_env

from .models import AnnotationConflictsReport, AnnotationConflict, AnnotationConflictType


class JobDataProvider:
    def __init__(self, job_id: int) -> None:
        self.job_id = job_id
        self.job_annotation = JobAnnotation(job_id)
        self.job_data = JobData(
            annotation_ir=self.job_annotation.ir_data,
            db_job=self.job_annotation.db_job
        )
        self.dm_dataset = dm.Dataset.from_extractors(
            GetCVATDataExtractor(self.job_data),
            env=dm_env
        )

    def dm_item_id_to_frame_id(self, item_id: Tuple[str, str]) -> int:
        path, _ = item_id[0]
        return self.job_data.match_frame(path)

def find_gt_conflicts(current_job: Job, gt_job: Job) -> AnnotationConflictsReport:
    this_job_data_provider = JobDataProvider(current_job.pk)
    gt_job_data_provider = JobDataProvider(gt_job.pk)

    this_job_dataset = this_job_data_provider.dm_dataset
    gt_job_dataset = gt_job_data_provider.dm_dataset
    merger = dm.ops.IntersectMerge()
    merger([gt_job_dataset, this_job_dataset])

    conflicts = []
    for error in merger.errors:
        if isinstance(error, dm.errors.MismatchingImageInfoError):
            assert False
        elif isinstance(error, dm.errors.MismatchingMediaPathError):
            assert False
        elif isinstance(error, dm.errors.MismatchingMediaError):
            assert False
        elif isinstance(error, dm.errors.MismatchingAttributesError):
            assert False
        elif isinstance(error, dm.errors.ConflictingCategoriesError):
            assert False
        elif isinstance(error, dm.errors.NoMatchingAnnError):
            if 0 in error.sources:
                conflict_type = AnnotationConflictType.EXTRA_ANNOTATION
            else:
                conflict_type = AnnotationConflictType.MISSING_ANNOTATION

            conflicts.append(AnnotationConflict(
                frame_id=this_job_data_provider.dm_item_id_to_frame_id(error.item_id),
                type=conflict_type,
                annotation_ids=[error.ann],
                message=str(error)
            ))
        elif isinstance(error, dm.errors.NoMatchingItemError):
            assert False
        elif isinstance(error, dm.errors.FailedLabelVotingError):
            conflicts.append(AnnotationConflict(
                frame_id=this_job_data_provider.dm_item_id_to_frame_id(error.item_id),
                type=AnnotationConflictType.MISMATCHING_ANNOTATION,
                data={
                    'kind': 'mismatching_shape_label',
                    'attribute': error.key,
                    'value1': error.a,
                    'value2': error.b,
                },
                message=str(error)
            ))
        elif isinstance(error, dm.errors.FailedAttrVotingError):
            conflicts.append(AnnotationConflict(
                frame_id=this_job_data_provider.dm_item_id_to_frame_id(error.item_id),
                type=AnnotationConflictType.MISMATCHING_ANNOTATION,
                data={
                    'kind': 'mismatching_shape_attribute',
                    'attribute': error.key,
                    'value1': error.a,
                    'value2': error.b,
                },
                message=str(error)
            ))
        elif isinstance(error, dm.errors.VideoMergeError):
            assert False
        else:
            assert False





    return AnnotationConflictsReport(
        job_id=current_job.id,
        job_last_updated=current_job.updated_date,
        gt_job_last_updated=gt_job.updated_date,
        conflicts=conflicts
    )

def find_gt_frame_conflicts(current_job: Job, gt_job: Job, *, frame_id: int) -> AnnotationConflictsReport:
    this_job_extractor = dm.Dataset.from_extractors(GetCVATDataExtractor(current_job), env=dm_env)
    gt_job_extractor = dm.Dataset.from_extractors(GetCVATDataExtractor(gt_job), env=dm_env)

    this_job_frame = this_job_extractor.get(frame_id)
    gt_job_frame = gt_job_extractor.get(frame_id)
    comparator = dm.ops.DistanceComparator()
    conflicts = comparator.match_annotations(this_job_frame, gt_job_frame)
    return AnnotationConflictsReport(conflicts)
