# Copyright (C) 2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import itertools
import math
from collections import Counter
from copy import deepcopy
from datetime import timedelta
from functools import cached_property, partial
from typing import Any, Callable, Dict, Hashable, List, Optional, Sequence, Tuple, Union, cast
from uuid import uuid4

import datumaro as dm
import datumaro.util.mask_tools
import django_rq
import numpy as np
from attrs import asdict, define, fields_dict
from datumaro.components.annotation import Annotation
from datumaro.util import dump_json, parse_json
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from scipy.optimize import linear_sum_assignment

from cvat.apps.consensus import models
from cvat.apps.consensus.models import (
    ConsensusConflict,
    ConsensusConflictType,
    ConsensusReport,
    ConsensusSettings,
)
from cvat.apps.dataset_manager.bindings import (
    CommonData,
    CvatToDmAnnotationConverter,
    GetCVATDataExtractor,
    JobData,
    match_dm_item,
)
from cvat.apps.dataset_manager.formats.registry import dm_env
from cvat.apps.dataset_manager.task import JobAnnotation
from cvat.apps.dataset_manager.util import bulk_create
from cvat.apps.engine.models import (
    DimensionType,
    Job,
    JobType,
    ShapeType,
    StageChoice,
    StatusChoice,
    Task,
)
from cvat.apps.profiler import silk_profile
from cvat.apps.quality_control.quality_reports import AnnotationId, JobDataProvider, _Serializable
from cvat.utils.background_jobs import schedule_job_with_throttling


@define(kw_only=True)
class AnnotationConflict(_Serializable):
    frame_id: int
    type: models.ConsensusConflictType
    annotation_ids: List[AnnotationId]

    def _value_serializer(self, v):
        if isinstance(v, models.ConsensusConflictType):
            return str(v)
        else:
            return super()._value_serializer(v)

    # def _fields_dict(self, *, include_properties: Optional[List[str]] = None) -> dict:
    #     return super()._fields_dict(include_properties=include_properties or ["severity"])

    @classmethod
    def from_dict(cls, d: dict):
        return cls(
            frame_id=d["frame_id"],
            type=models.ConsensusConflictType(d["type"]),
            annotation_ids=list(AnnotationId.from_dict(v) for v in d["annotation_ids"]),
        )


@define(kw_only=True)
class ComparisonReportComparisonSummary(_Serializable):
    frames: List[str]

    @property
    def mean_conflict_count(self) -> float:
        return self.conflict_count / (len(self.frames) or 1)

    conflict_count: int
    conflicts_by_type: Dict[models.ConsensusConflictType, int]

    @property
    def frame_count(self) -> int:
        return len(self.frames)

    def _value_serializer(self, v):
        if isinstance(v, models.ConsensusConflictType):
            return str(v)
        else:
            return super()._value_serializer(v)

    def _fields_dict(self, *, include_properties: Optional[List[str]] = None) -> dict:
        return super()._fields_dict(
            include_properties=include_properties
            or [
                "frame_count",
                "mean_conflict_count",
                "conflict_count",
                "conflicts_by_type",
            ]
        )

    @classmethod
    def from_dict(cls, d: dict):
        return cls(
            frames=list(d["frames"]),
            conflict_count=d["conflict_count"],
            conflicts_by_type={
                models.ConsensusConflictType(k): v
                for k, v in d.get("conflicts_by_type", {}).items()
            },
        )


@define(kw_only=True, init=False)
class ComparisonReportFrameSummary(_Serializable):
    conflicts: List[AnnotationConflict]

    @cached_property
    def conflict_count(self) -> int:
        return len(self.conflicts)

    @cached_property
    def conflicts_by_type(self) -> Dict[models.ConsensusConflictType, int]:
        return Counter(c.type for c in self.conflicts)

    _CACHED_FIELDS = ["conflict_count", "conflicts_by_type"]

    def _value_serializer(self, v):
        if isinstance(v, models.ConsensusConflictType):
            return str(v)
        else:
            return super()._value_serializer(v)

    def __init__(self, *args, **kwargs):
        # these fields are optional, but can be computed on access
        for field_name in self._CACHED_FIELDS:
            if field_name in kwargs:
                setattr(self, field_name, kwargs.pop(field_name))

        self.__attrs_init__(*args, **kwargs)

    def _fields_dict(self, *, include_properties: Optional[List[str]] = None) -> dict:
        return super()._fields_dict(include_properties=include_properties or self._CACHED_FIELDS)

    @classmethod
    def from_dict(cls, d: dict):
        optional_fields = set(cls._CACHED_FIELDS) - {
            "conflicts_by_type"  # requires extra conversion
        }
        return cls(
            **{field: d[field] for field in optional_fields if field in d},
            **(
                dict(
                    conflicts_by_type={
                        models.ConsensusConflictType(k): v
                        for k, v in d["conflicts_by_type"].items()
                    }
                )
                if "conflicts_by_type" in d
                else {}
            ),
            conflicts=[AnnotationConflict.from_dict(v) for v in d["conflicts"]],
        )


@define(kw_only=True)
class ComparisonParameters(_Serializable):
    # TODO: dm.AnnotationType.skeleton to be implemented
    included_annotation_types: List[dm.AnnotationType] = [
        dm.AnnotationType.bbox,
        dm.AnnotationType.points,
        dm.AnnotationType.mask,
        dm.AnnotationType.polygon,
        dm.AnnotationType.polyline,
        dm.AnnotationType.label,
    ]

    # non_groupable_ann_type = dm.AnnotationType.label
    # "Annotation type that can't be grouped"

    agreement_score_threshold: float
    quorum: int
    iou_threshold: float

    def _value_serializer(self, v):
        if isinstance(v, dm.AnnotationType):
            return str(v.name)
        else:
            return super()._value_serializer(v)

    @classmethod
    def from_dict(cls, d: dict):
        fields = fields_dict(cls)
        return cls(**{field_name: d[field_name] for field_name in fields if field_name in d})


@define(kw_only=True)
class ComparisonReport(_Serializable):
    parameters: ComparisonParameters
    comparison_summary: ComparisonReportComparisonSummary
    frame_results: Dict[int, ComparisonReportFrameSummary]

    @property
    def conflicts(self) -> List[AnnotationConflict]:
        return list(itertools.chain.from_iterable(r.conflicts for r in self.frame_results.values()))

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> ComparisonReport:
        return cls(
            parameters=ComparisonParameters.from_dict(d["parameters"]),
            comparison_summary=ComparisonReportComparisonSummary.from_dict(d["comparison_summary"]),
            frame_results={
                int(k): ComparisonReportFrameSummary.from_dict(v)
                for k, v in d["frame_results"].items()
            },
        )

    def to_json(self) -> str:
        d = self.to_dict()

        # String keys are needed for json dumping
        d["frame_results"] = {str(k): v for k, v in d["frame_results"].items()}
        return dump_json(d).decode()

    @classmethod
    def from_json(cls, data: str) -> ComparisonReport:
        return cls.from_dict(parse_json(data))


def generate_job_consensus_report(
    consensus_settings: ConsensusSettings,
    errors,
    consensus_job_data_providers: List[JobDataProvider],
) -> ComparisonReport:

    frame_results: Dict[int, ComparisonReportFrameSummary] = {}
    frames = set()
    conflicts_count = len(errors)
    conflicts = []

    for error in errors:
        error_type = str(type(error)).split(".")[-1].split("'")[0]
        error_type = ConsensusConflictType[error_type].value
        annotation_ids = []
        error_annotations = []

        for arg in error.args:
            if isinstance(arg, Annotation):
                error_annotations.append(arg)

        for annotation in error_annotations:
            for consensus_job_data_provider in consensus_job_data_providers:
                try:
                    annotation_id = consensus_job_data_provider.dm_ann_to_ann_id(annotation)
                    break
                except KeyError:
                    pass

            annotation_ids.append(annotation_id)
        dm_item = consensus_job_data_providers[0].dm_dataset.get(error.item_id[0])
        frame_id: int = consensus_job_data_providers[0].dm_item_id_to_frame_id(dm_item)
        frames.add(frame_id)
        frame_results.setdefault(frame_id, []).append(
            AnnotationConflict(
                frame_id=frame_id,
                type=error_type,
                annotation_ids=annotation_ids,
            )
        )

    for frame_id in frame_results:
        conflicts += frame_results[frame_id]
        frame_results[frame_id] = ComparisonReportFrameSummary(conflicts=frame_results[frame_id])

    return ComparisonReport(
        parameters=ComparisonParameters.from_dict(consensus_settings.to_dict()),
        comparison_summary=ComparisonReportComparisonSummary(
            frames=list(frames),
            conflict_count=conflicts_count,
            conflicts_by_type=Counter(c.type for c in conflicts),
        ),
        frame_results=frame_results,
    )


def generate_task_consensus_report(job_reports: List[ComparisonReport]) -> ComparisonReport:
    task_frames = set()
    task_conflicts: List[AnnotationConflict] = []
    task_frame_results = {}
    task_frame_results_counts = {}
    for r in job_reports.values():
        task_frames.update(r.comparison_summary.frames)
        task_conflicts.extend(r.conflicts)

        for frame_id, job_frame_result in r.frame_results.items():
            task_frame_result = cast(
                Optional[ComparisonReportFrameSummary], task_frame_results.get(frame_id)
            )
            frame_results_count = task_frame_results_counts.get(frame_id, 0)

            if task_frame_result is None:
                task_frame_result = deepcopy(job_frame_result)
            else:
                task_frame_result.conflicts += job_frame_result.conflicts

            task_frame_results_counts[frame_id] = 1 + frame_results_count
            task_frame_results[frame_id] = task_frame_result

    task_report_data = ComparisonReport(
        parameters=next(iter(job_reports.values())).parameters,
        comparison_summary=ComparisonReportComparisonSummary(
            frames=sorted(task_frames),
            conflict_count=len(task_conflicts),
            conflicts_by_type=Counter(c.type for c in task_conflicts),
        ),
        frame_results=task_frame_results,
    )
    return task_report_data


def get_last_report_time(task: Task) -> Optional[timezone.datetime]:
    report = models.ConsensusReport.objects.filter(task=task).order_by("-created_date").first()
    if report:
        return report.created_date
    return None


@transaction.atomic
def save_report(
    task_id: int,
    jobs: List[Job],
    task_report_data: ComparisonReport,
    job_report_data: List[ComparisonReport],
):
    try:
        Task.objects.get(id=task_id)
    except Task.DoesNotExist:
        return

    task = Task.objects.filter(id=task_id).first()

    # last_report_time = self._get_last_report_time(task)
    # if not self.is_custom_quality_check_job(self._get_current_job()) and (
    #     last_report_time
    #     and timezone.now() < last_report_time + self._get_quality_check_job_delay()
    # ):
    #     # Discard this report as it has probably been computed in parallel
    #     # with another one
    #     return

    job_reports = {}
    for job_id in jobs:
        job_comparison_report = job_report_data[job_id]
        job = Job.objects.filter(id=job_id).first()
        job_report = dict(
            job=job,
            target_last_updated=job.updated_date,
            data=job_comparison_report.to_json(),
            conflicts=[c.to_dict() for c in job_comparison_report.conflicts],
        )

        job_reports[job.id] = job_report

    job_reports = list(job_reports.values())

    task_report = dict(
        task=task,
        target_last_updated=task.updated_date,
        data=task_report_data.to_json(),
        conflicts=[],  # the task doesn't have own conflicts
    )

    db_task_report = ConsensusReport(
        task=task_report["task"],
        target_last_updated=task_report["target_last_updated"],
        data=task_report["data"],
    )
    db_task_report.save()

    db_job_reports = []
    for job_report in job_reports:
        db_job_report = ConsensusReport(
            job=job_report["job"],
            target_last_updated=job_report["target_last_updated"],
            data=job_report["data"],
        )
        db_job_reports.append(db_job_report)

    db_job_reports = bulk_create(db_model=ConsensusReport, objects=db_job_reports, flt_param={})

    db_conflicts = []
    db_report_iter = itertools.chain([db_task_report], db_job_reports)
    report_iter = itertools.chain([task_report], job_reports)
    for report, db_report in zip(report_iter, db_report_iter):
        if not db_report.id:
            continue
        for conflict in report["conflicts"]:
            db_conflict = ConsensusConflict(
                report=db_report,
                type=conflict["type"],
                frame=conflict["frame_id"],
            )
            db_conflicts.append(db_conflict)

    db_conflicts = bulk_create(db_model=ConsensusConflict, objects=db_conflicts, flt_param={})

    db_ann_ids = []
    db_conflicts_iter = iter(db_conflicts)
    for report in itertools.chain([task_report], job_reports):
        for conflict, db_conflict in zip(report["conflicts"], db_conflicts_iter):
            for ann_id in conflict["annotation_ids"]:
                db_ann_id = models.AnnotationId(
                    conflict=db_conflict,
                    job_id=ann_id["job_id"],
                    obj_id=ann_id["obj_id"],
                    type=ann_id["type"],
                    shape_type=ann_id["shape_type"],
                )
                db_ann_ids.append(db_ann_id)

    db_ann_ids = bulk_create(db_model=models.AnnotationId, objects=db_ann_ids, flt_param={})

    return db_task_report.id


def prepare_report_for_downloading(db_report: ConsensusReport, *, host: str) -> str:
    # Decorate the report for better usability and readability:
    # - add conflicting annotation links like:
    # <host>/tasks/62/jobs/82?frame=250&type=shape&serverID=33741
    # - convert some fractions to percents
    # - add common report info

    task_id = db_report.get_task().id
    serialized_data = dict(
        job_id=db_report.job.id if db_report.job is not None else None,
        task_id=task_id,
        created_date=str(db_report.created_date),
        target_last_updated=str(db_report.target_last_updated),
    )

    comparison_report = ComparisonReport.from_json(db_report.get_json_report())
    serialized_data.update(comparison_report.to_dict())

    for frame_result in serialized_data["frame_results"].values():
        for conflict in frame_result["conflicts"]:
            for ann_id in conflict["annotation_ids"]:
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
    return dump_json(serialized_data, indent=True, append_newline=True).decode()
