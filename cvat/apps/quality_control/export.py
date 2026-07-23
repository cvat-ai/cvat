# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import csv
from io import BytesIO, StringIO
from typing import IO, Any
from zipfile import ZIP_DEFLATED, ZipFile

from datumaro.util import dump_json
from django.db.models import TextChoices
from django.utils.text import slugify

from cvat.apps.engine import serializers as engine_serializers
from cvat.apps.engine.models import Job, User
from cvat.apps.quality_control import models
from cvat.apps.quality_control.comparison_report import ComparisonReport, ConfusionMatrix


class QualityReportExportFormat(TextChoices):
    CSV = ("csv", "CSV")
    JSON = ("json", "JSON")


def prepare_json_report_for_downloading(db_report: models.QualityReport, *, host: str) -> IO[bytes]:
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

    def _decorate_frame_results(frame_results: dict) -> None:
        for frame_result in frame_results.values():
            for conflict in frame_result["conflicts"]:
                for ann_id in conflict["annotation_ids"]:
                    task_id = jobs_to_tasks[ann_id["job_id"]]
                    ann_id["url"] = (
                        f"{host}tasks/{task_id}/jobs/{ann_id['job_id']}"
                        f"?frame={conflict['frame_id']}"
                        f"&type={ann_id['type']}"
                        f"&serverID={ann_id['obj_id']}"
                    )

    def _stringify_frame_results(frame_results: dict) -> dict[str, dict]:
        return {str(k): v for k, v in frame_results.items()}

    if db_report.project:
        # project reports should not have per-frame statistics, it's too detailed for this level
        serialized_data["comparison_summary"].pop("frames")

    for group in (serialized_data.get("groups") or {}).values():
        if group.get("frame_results") is None:
            continue

        _decorate_frame_results(group["frame_results"])
        group["frame_results"] = _stringify_frame_results(group["frame_results"])

    if task_stats := serialized_data["comparison_summary"].get("tasks", {}):
        for k in ("all", "custom", "not_configured", "excluded", "completed"):
            task_stats[k] = sorted(task_stats[k])

    if job_stats := serialized_data["comparison_summary"].get("jobs", {}):
        for k in ("all", "excluded", "not_checkable", "completed"):
            job_stats[k] = sorted(job_stats[k])

    # Add the percent representation for better human readability
    serialized_data["comparison_summary"]["validation_frame_share_percent"] = (
        serialized_data["comparison_summary"]["validation_frame_share"] * 100
    )

    return BytesIO(dump_json(serialized_data, indent=True, append_newline=True))


def prepare_csv_report_for_downloading(db_report: models.QualityReport) -> IO[bytes]:
    """
    Root reports do not have an aggregate confusion matrix.
    """

    return BytesIO()


def _serialize_confusion_matrix_csv(confusion_matrix: ConfusionMatrix) -> str:
    assert confusion_matrix.labels is not None
    assert confusion_matrix.rows is not None

    output = StringIO(newline="")
    writer = csv.writer(output)
    writer.writerow(["ds \\ gt", *confusion_matrix.labels])

    for row_label, row in zip(confusion_matrix.labels, confusion_matrix.rows.tolist()):
        writer.writerow([row_label, *row])

    return output.getvalue()


def _has_downloadable_confusion_matrix(confusion_matrix: ConfusionMatrix | None) -> bool:
    return (
        confusion_matrix is not None
        and confusion_matrix.labels is not None
        and confusion_matrix.rows is not None
        and bool(confusion_matrix.labels)
    )


def _get_group_requirement_id(group_report) -> int | None:
    requirement_id = group_report.parameters.get("requirement_id")
    return int(requirement_id) if requirement_id is not None else None


def _get_requirement_confusion_matrix(
    db_report: models.QualityReport, *, requirement_id: int
) -> ConfusionMatrix | None:
    comparison_report = ComparisonReport.from_json(db_report.get_report_data())
    groups = comparison_report.groups or {}
    group_report = next(
        (
            group_report
            for group_report in groups.values()
            if _get_group_requirement_id(group_report) == requirement_id
        ),
        None,
    )

    if not group_report:
        return None

    confusion_matrix = group_report.comparison_summary.confusion_matrix
    if not _has_downloadable_confusion_matrix(confusion_matrix):
        return None

    return confusion_matrix


def prepare_requirement_confusion_matrix_json(
    db_report: models.QualityReport, *, requirement_id: int
) -> dict[str, Any] | None:
    confusion_matrix = _get_requirement_confusion_matrix(
        db_report,
        requirement_id=requirement_id,
    )
    if confusion_matrix is None:
        return None

    return confusion_matrix.to_dict()


def prepare_requirement_confusion_matrix_for_downloading(
    db_report: models.QualityReport, *, requirement_id: int
) -> str | None:
    confusion_matrix = _get_requirement_confusion_matrix(
        db_report,
        requirement_id=requirement_id,
    )
    if confusion_matrix is None:
        return None

    return _serialize_confusion_matrix_csv(confusion_matrix)


def _make_unique_group_archive_path(group_name: str, used_paths: set[str]) -> str:
    base_name = slugify(group_name) or "group"
    archive_path = f"groups/{base_name}.csv"
    suffix = 2

    while archive_path in used_paths:
        archive_path = f"groups/{base_name}-{suffix}.csv"
        suffix += 1

    used_paths.add(archive_path)
    return archive_path


def prepare_confusion_matrices_archive_for_downloading(db_report: models.QualityReport) -> bytes:
    comparison_report = ComparisonReport.from_json(db_report.get_report_data())
    archive_buffer = BytesIO()
    used_paths = {"manifest.json"}
    manifest = {
        "report_id": db_report.id,
        "target": str(db_report.target),
        "matrices": [],
    }

    def _add_matrix_to_archive(
        archive: ZipFile,
        *,
        archive_path: str,
        scope: str,
        name: str,
        confusion_matrix: ConfusionMatrix | None,
        requirement_id: int | None = None,
    ) -> None:
        if not _has_downloadable_confusion_matrix(confusion_matrix):
            return

        assert confusion_matrix is not None
        archive.writestr(archive_path, _serialize_confusion_matrix_csv(confusion_matrix))
        manifest_item = {
            "scope": scope,
            "name": name,
            "path": archive_path,
            "labels": confusion_matrix.labels,
        }
        if requirement_id is not None:
            manifest_item["requirement_id"] = requirement_id
        manifest["matrices"].append(manifest_item)

    with ZipFile(archive_buffer, mode="w", compression=ZIP_DEFLATED) as archive:
        for group_name, group_report in sorted((comparison_report.groups or {}).items()):
            _add_matrix_to_archive(
                archive,
                archive_path=_make_unique_group_archive_path(group_name, used_paths),
                scope="group",
                name=group_name,
                confusion_matrix=group_report.comparison_summary.confusion_matrix,
                requirement_id=_get_group_requirement_id(group_report),
            )

        archive.writestr(
            "manifest.json",
            dump_json(manifest, indent=True, append_newline=True).decode(),
        )

    return archive_buffer.getvalue()


def prepare_report_for_downloading(
    db_report: models.QualityReport, *, host: str, export_format: QualityReportExportFormat
) -> tuple[IO[bytes], str]:
    if export_format == QualityReportExportFormat.JSON:
        return (
            prepare_json_report_for_downloading(db_report=db_report, host=host),
            "application/json",
        )
    elif export_format == QualityReportExportFormat.CSV:
        return (
            prepare_csv_report_for_downloading(db_report=db_report),
            "text/csv",
        )
    else:
        assert False
