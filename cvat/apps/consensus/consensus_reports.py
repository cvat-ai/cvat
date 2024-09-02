# Copyright (C) 2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import itertools
from collections import Counter
from copy import deepcopy
from functools import cached_property
from types import NoneType
from typing import Any, Dict, List, Optional, Tuple, Union, cast

import datumaro as dm
import numpy as np
from attrs import define, fields_dict
from datumaro.components.annotation import Annotation
from datumaro.util import dump_json, parse_json
from django.db import transaction

from cvat.apps.consensus import models
from cvat.apps.consensus.models import (
    AssigneeConsensusReport,
    ConsensusConflict,
    ConsensusConflictType,
    ConsensusReport,
    ConsensusSettings,
)
from cvat.apps.consensus.new_intersect_merge import IntersectMerge
from cvat.apps.dataset_manager.util import bulk_create
from cvat.apps.engine import serializers as engine_serializers
from cvat.apps.engine.models import Job, Task, User
from cvat.apps.quality_control.quality_reports import AnnotationId, JobDataProvider, Serializable


@define(kw_only=True)
class AnnotationConflict(Serializable):
    frame_id: int
    type: models.ConsensusConflictType
    annotation_ids: List[AnnotationId]

    def _value_serializer(self, v):
        if isinstance(v, models.ConsensusConflictType):
            return str(v)
        else:
            return super()._value_serializer(v)

    @classmethod
    def from_dict(cls, d: dict):
        return cls(
            frame_id=d["frame_id"],
            type=models.ConsensusConflictType(d["type"]),
            annotation_ids=list(AnnotationId.from_dict(v) for v in d["annotation_ids"]),
        )


@define(kw_only=True)
class ComparisonReportComparisonSummary(Serializable):
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
class ComparisonReportFrameSummary(Serializable):
    conflicts: List[AnnotationConflict]
    consensus_score: float

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
            consensus_score=d["consensus_score"],
        )


@define(kw_only=True)
class ComparisonParameters(Serializable):
    included_annotation_types: List[dm.AnnotationType] = [
        dm.AnnotationType.bbox,
        dm.AnnotationType.points,
        dm.AnnotationType.mask,
        dm.AnnotationType.polygon,
        dm.AnnotationType.polyline,
        dm.AnnotationType.skeleton,
        dm.AnnotationType.label,
    ]

    agreement_score_threshold: float
    quorum: int
    iou_threshold: float
    sigma: float
    line_thickness: float

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
class ComparisonReport(Serializable):
    parameters: ComparisonParameters
    comparison_summary: ComparisonReportComparisonSummary
    frame_results: Dict[int, ComparisonReportFrameSummary]

    @property
    def conflicts(self) -> List[AnnotationConflict]:
        return list(itertools.chain.from_iterable(r.conflicts for r in self.frame_results.values()))

    @property
    def consensus_score(self) -> int:
        mean_consensus_score = 0
        frame_count = 0
        for frame_result in self.frame_results.values():
            if not isinstance(frame_result.consensus_score, NoneType):
                mean_consensus_score += frame_result.consensus_score
                frame_count += 1

        return np.round(100 * (mean_consensus_score / (frame_count or 1)))

    def _fields_dict(self, *, include_properties: Optional[List[str]] = None) -> dict:
        return super()._fields_dict(
            include_properties=include_properties
            or [
                "consensus_score",
            ]
        )

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


def generate_assignee_consensus_report(
    consensus_job_ids: List[int],
    assignees: List[User],
    consensus_datasets: List[dm.Dataset],
    dataset_mean_consensus_score: Dict[int, float],
):
    assignee_report_data: Dict[User, Dict[str, Union[List[float], float]]] = {}
    for idx, _ in enumerate(consensus_job_ids):
        if not assignees[idx]:
            continue
        assignee_report_data.setdefault(
            assignees[idx], {"consensus_score": [], "conflict_count": 0}
        )
        assignee_report_data[assignees[idx]]["consensus_score"].append(
            dataset_mean_consensus_score[id(consensus_datasets[idx])]
        )

    for assignee_id, assignee_info in assignee_report_data.items():
        assignee_report_data[assignee_id]["consensus_score"] = sum(
            assignee_info["consensus_score"]
        ) / (len(assignee_info["consensus_score"]) or 1)

    return assignee_report_data


def generate_job_consensus_report(
    consensus_settings: ConsensusSettings,
    errors,
    consensus_job_data_providers: List[JobDataProvider],
    merged_dataset: dm.Dataset,
    merger: IntersectMerge,
    assignees: List[User],
    assignee_report_data: Dict[User, Dict[str, float]],
) -> ComparisonReport:

    frame_results: Dict[int, ComparisonReportFrameSummary] = {}
    frames = set()
    conflicts_count = len(errors)
    frame_wise_conflicts: Dict[int, List[AnnotationConflict]] = {}
    frame_wise_consensus_score: Dict[int, List[float]] = {}
    conflicts: List[AnnotationConflict] = []

    for error in errors:
        error_type = str(type(error)).split(".")[-1].split("'")[0]
        try:
            error_type = ConsensusConflictType[error_type].value
        except KeyError:
            continue
        annotation_ids = []
        error_annotations = []

        for arg in error.args:
            if isinstance(arg, Annotation):
                error_annotations.append(arg)

        for annotation in error_annotations:
            # the annotation belongs to which consensus dataset
            idx = merger.get_ann_dataset_id(id(annotation))
            annotation_ids.append(consensus_job_data_providers[idx].dm_ann_to_ann_id(annotation))
            if assignees[idx]:
                assignee_report_data[assignees[idx]]["conflict_count"] += 1

        dm_item = consensus_job_data_providers[0].dm_dataset.get(error.item_id[0])
        frame_id: int = consensus_job_data_providers[0].dm_item_id_to_frame_id(dm_item)
        frames.add(frame_id)
        frame_wise_conflicts.setdefault(frame_id, []).append(
            AnnotationConflict(
                frame_id=frame_id,
                type=error_type,
                annotation_ids=annotation_ids,
            )
        )

    # dataset item is a frame in the merged dataset, which corresponds to regular job
    for dataset_item in merged_dataset:
        frame_id = consensus_job_data_providers[0].dm_item_id_to_frame_id(dataset_item)
        frames.add(frame_id)
        consensus_score = np.mean(
            [ann.attributes.get("score", 0) for ann in dataset_item.annotations]
        )
        # if that frame has no annotations, the consensus score is NaN
        frame_wise_consensus_score.setdefault(frame_id, []).append(
            0 if np.isnan(consensus_score) else consensus_score
        )

    for frame_id in frames:
        conflicts += frame_wise_conflicts.get(frame_id, [])
        frame_results[frame_id] = ComparisonReportFrameSummary(
            conflicts=frame_wise_conflicts.get(frame_id, []),
            consensus_score=np.mean(frame_wise_consensus_score.get(frame_id, [0])),
        )

    return (
        ComparisonReport(
            parameters=ComparisonParameters.from_dict(consensus_settings.to_dict()),
            comparison_summary=ComparisonReportComparisonSummary(
                frames=list(frames),
                conflict_count=conflicts_count,
                conflicts_by_type=Counter(c.type for c in conflicts),
            ),
            frame_results=frame_results,
        ),
        assignee_report_data,
    )


def generate_task_consensus_report(
    job_reports: List[ComparisonReport],
) -> Tuple[ComparisonReport, int]:
    task_frames = set()
    task_conflicts: List[AnnotationConflict] = []
    task_frame_results = {}
    task_frame_results_counts = {}
    task_mean_consensus_score = 0
    for r in job_reports:
        task_frames.update(r.comparison_summary.frames)
        task_conflicts.extend(r.conflicts)
        task_mean_consensus_score += r.consensus_score

        for frame_id, job_frame_result in r.frame_results.items():
            task_frame_result = cast(
                Optional[ComparisonReportFrameSummary], task_frame_results.get(frame_id)
            )
            frame_results_count = task_frame_results_counts.get(frame_id, 0)

            if task_frame_result is None:
                task_frame_result = deepcopy(job_frame_result)
            else:
                task_frame_result.conflicts += job_frame_result.conflicts
                task_frame_result.consensus_score = (
                    task_frame_result.consensus_score * task_frame_results_counts[frame_id]
                    + job_frame_result.consensus_score
                ) / (task_frame_results_counts[frame_id] + 1)

            task_frame_results_counts[frame_id] = 1 + frame_results_count
            task_frame_results[frame_id] = task_frame_result

    task_mean_consensus_score /= len(job_reports)
    task_report_data = ComparisonReport(
        parameters=job_reports[0].parameters,
        comparison_summary=ComparisonReportComparisonSummary(
            frames=sorted(task_frames),
            conflict_count=len(task_conflicts),
            conflicts_by_type=Counter(c.type for c in task_conflicts),
        ),
        frame_results=task_frame_results,
    )
    return task_report_data, np.round(task_mean_consensus_score)


@transaction.atomic
def save_report(
    task_id: int,
    jobs: List[Job],
    task_report_data: ComparisonReport,
    job_report_data: Dict[int, ComparisonReport],
    assignee_report_data: Dict[User, float],
    task_mean_consensus_score: int,
):
    try:
        Task.objects.get(id=task_id)
    except Task.DoesNotExist:
        return

    task = Task.objects.filter(id=task_id).first()

    job_reports = {}
    for job in jobs:
        job_comparison_report = job_report_data[job.id]
        job_consensus_score = job_comparison_report.consensus_score
        job_report = dict(
            job=job,
            target_last_updated=job.updated_date,
            data=job_comparison_report.to_json(),
            conflicts=[c.to_dict() for c in job_comparison_report.conflicts],
            consensus_score=job_consensus_score,
            assignee=job.assignee,
        )
        job_reports[job.id] = job_report

    job_reports = list(job_reports.values())

    task_report = dict(
        task=task,
        target_last_updated=task.updated_date,
        data=task_report_data.to_json(),
        conflicts=[],  # the task doesn't have own conflicts
        consensus_score=task_mean_consensus_score,
        assignee=task.assignee,
    )

    db_task_report = ConsensusReport(
        task=task_report["task"],
        target_last_updated=task_report["target_last_updated"],
        data=task_report["data"],
        consensus_score=task_report["consensus_score"],
        assignee=task_report["assignee"],
    )
    db_task_report.save()

    db_job_reports = []
    for job_report in job_reports:
        db_job_report = ConsensusReport(
            task=task_report["task"],
            job=job_report["job"],
            target_last_updated=job_report["target_last_updated"],
            data=job_report["data"],
            consensus_score=job_report["consensus_score"],
            assignee=job_report["assignee"],
        )
        db_job_reports.append(db_job_report)

    db_job_reports = bulk_create(db_model=ConsensusReport, objects=db_job_reports, flt_param={})

    for assignee, assignee_info in assignee_report_data.items():
        # db_assignee = models.User.objects.get(id=)
        db_assignee_report = AssigneeConsensusReport(
            task=task_report["task"],
            consensus_score=np.round(100 * assignee_info["consensus_score"]),
            conflict_count=assignee_info["conflict_count"],
            assignee=assignee,
            consensus_report_id=db_task_report.id,
        )
        db_assignee_report.save()

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
    # copied from quality_reports.py
    # Decorate the report for better usability and readability:
    # - add conflicting annotation links like:
    # <host>/tasks/62/jobs/82?frame=250&type=shape&serverID=33741
    # - convert some fractions to percents
    # - add common report info

    def _serialize_assignee(assignee: Optional[User]) -> Optional[dict]:
        if not db_report.assignee:
            return None

        reported_keys = ["id", "username", "first_name", "last_name"]
        assert set(reported_keys).issubset(engine_serializers.BasicUserSerializer.Meta.fields)
        # check that only safe fields are reported

        return {k: getattr(assignee, k) for k in reported_keys}

    task_id = db_report.get_task().id
    serialized_data = dict(
        job_id=db_report.job.id if db_report.job is not None else None,
        task_id=task_id,
        created_date=str(db_report.created_date),
        target_last_updated=str(db_report.target_last_updated),
        assignee=_serialize_assignee(db_report.assignee),
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
