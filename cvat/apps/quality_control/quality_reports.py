# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from collections.abc import Hashable
from contextlib import suppress
from functools import cached_property

import datumaro as dm
from datumaro.util import dump_json
from django.db import transaction
from django.db.models import OuterRef, Subquery, prefetch_related_objects

from cvat.apps.dataset_manager.bindings import (
    CommonData,
    CvatToDmAnnotationConverter,
    GetCVATDataExtractor,
    JobData,
    match_dm_item,
)
from cvat.apps.dataset_manager.formats.registry import dm_env
from cvat.apps.dataset_manager.task import JobAnnotation
from cvat.apps.engine import serializers as engine_serializers
from cvat.apps.engine.model_utils import bulk_create
from cvat.apps.engine.models import (
    Job,
    Project,
    Task,
    User,
)
from cvat.apps.quality_control import models
from cvat.apps.quality_control.comparison_report import (
    AnnotationId,
    ComparisonReport,
    ComparisonReportJobStats,
    ComparisonReportTaskStats,
)
from cvat.apps.quality_control.models import AnnotationType

# For backwards compatibility, don't break old reports when requirements are changed

class _MemoizingAnnotationConverterFactory:
    def __init__(self):
        self._annotation_mapping = {}  # dm annotation -> cvat annotation

    def remember_conversion(self, cvat_ann, dm_anns):
        for dm_ann in dm_anns:
            self._annotation_mapping[self._make_key(dm_ann)] = cvat_ann

    def _make_key(self, dm_ann: dm.Annotation) -> Hashable:
        return id(dm_ann)

    def get_source_ann(self, dm_ann: dm.Annotation) -> CommonData.Tag | CommonData.LabeledShape:
        "Retrieve the original CVAT annotation for a Datumaro annotation"
        return self._annotation_mapping[self._make_key(dm_ann)]

    def clear(self):
        self._annotation_mapping.clear()

    def __call__(self, *args, **kwargs) -> list[dm.Annotation]:
        converter = _MemoizingAnnotationConverter(*args, factory=self, **kwargs)
        return converter.convert()


class _MemoizingAnnotationConverter(CvatToDmAnnotationConverter):
    def __init__(self, *args, factory: _MemoizingAnnotationConverterFactory, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self._factory = factory

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

        self._annotation_memo = _MemoizingAnnotationConverterFactory()

    @cached_property
    def dm_dataset(self):
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


class QualitySettingsManager:
    def get_project_settings(self, project: Project) -> models.QualitySettings:
        return project.quality_settings

    def get_task_settings(self, task: Task, *, inherit: bool = True) -> models.QualitySettings:
        quality_settings = task.quality_settings

        if inherit and quality_settings.inherit and task.project:
            quality_settings = self.get_project_settings(task.project)

        return quality_settings



def prepare_report_for_downloading(db_report: models.QualityReport, *, host: str) -> str:
    # Decorate the report for better usability and readability:
    # - add conflicting annotation links like:
    # <host>/tasks/62/jobs/82?frame=250&type=shape&serverID=33741
    # - convert some fractions to percents
    # - add common report info

    project_id = None
    task_id = None
    job_id = None
    jobs_to_tasks: dict[int, int] = {}
    if db_report.project:
        project_id = db_report.project.id

        jobs = Job.objects.filter(segment__task__project__id=project_id).all()
        jobs_to_tasks.update((j.id, j.segment.task.id) for j in jobs)
    elif db_report.task:
        project_id = getattr(db_report.task.project, "id", None)
        task_id = db_report.task.id

        jobs = Job.objects.filter(segment__task__id=task_id).all()
        jobs_to_tasks.update((j.id, task_id) for j in jobs)
    elif db_report.job:
        project_id = getattr(db_report.get_task().project, "id", None)
        task_id = db_report.get_task().id
        job_id = db_report.job.id

        jobs_to_tasks[db_report.job.id] = task_id
        jobs_to_tasks[db_report.get_task().gt_job.id] = task_id
    else:
        assert False

    # Add ids for the hierarchy objects, don't add empty ids
    def _serialize_assignee(assignee: User | None) -> dict | None:
        if not db_report.assignee:
            return None

        reported_keys = ["id", "username", "first_name", "last_name"]
        assert set(reported_keys).issubset(engine_serializers.BasicUserSerializer.Meta.fields)
        # check that only safe fields are reported

        return {k: getattr(assignee, k) for k in reported_keys}

    serialized_data = dict(
        id=db_report.id,
        **dict(job_id=db_report.job.id) if job_id else {},
        **dict(task_id=task_id) if task_id else {},
        **dict(project_id=project_id) if project_id else {},
        **dict(parent_id=db_report.parent.id) if db_report.parent else {},
        created_date=str(db_report.created_date),
        target_last_updated=str(db_report.target_last_updated),
        **dict(gt_last_updated=str(db_report.gt_last_updated)) if db_report.gt_last_updated else {},
        assignee=_serialize_assignee(db_report.assignee),
    )

    comparison_report = ComparisonReport.from_json(db_report.get_report_data())
    serialized_data.update(comparison_report.to_dict())

    if db_report.project:
        # project reports should not have per-frame statistics, it's too detailed for this level
        serialized_data["comparison_summary"].pop("frames")
        serialized_data.pop("frame_results")
    else:
        for frame_result in serialized_data["frame_results"].values():
            for conflict in frame_result["conflicts"]:
                for ann_id in conflict["annotation_ids"]:
                    task_id = jobs_to_tasks[ann_id["job_id"]]
                    ann_id["url"] = (
                        f"{host}tasks/{task_id}/jobs/{ann_id['job_id']}"
                        f"?frame={conflict['frame_id']}"
                        f"&type={ann_id['type']}"
                        f"&serverID={ann_id['obj_id']}"
                    )

        # String keys are needed for json dumping
        serialized_data["frame_results"] = {
            str(k): v for k, v in serialized_data["frame_results"].items()
        }

    if task_stats := serialized_data["comparison_summary"].get("tasks", {}):
        for k in ("all", "custom", "not_configured", "excluded"):
            task_stats[k] = sorted(task_stats[k])

    if job_stats := serialized_data["comparison_summary"].get("jobs", {}):
        for k in ("all", "excluded", "not_checkable"):
            job_stats[k] = sorted(job_stats[k])

    # Add the percent representation for better human readability
    serialized_data["comparison_summary"]["frame_share_percent"] = (
        serialized_data["comparison_summary"]["frame_share"] * 100
    )

    return dump_json(serialized_data, indent=True, append_newline=True).decode()
