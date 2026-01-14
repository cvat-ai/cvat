# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


from __future__ import annotations

import csv
from io import BytesIO, TextIOWrapper
from typing import IO

from datumaro.util import dump_json
from django.db.models import TextChoices

from cvat.apps.engine import serializers as engine_serializers
from cvat.apps.engine.models import Job, User
from cvat.apps.quality_control import models
from cvat.apps.quality_control.quality_reports import ComparisonReport
from cvat.apps.quality_control.statistics import (
    Averaging,
    compute_accuracy,
    compute_dice_coefficient,
)


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

    return BytesIO(dump_json(serialized_data, indent=True, append_newline=True))


def prepare_csv_report_for_downloading(db_report: models.QualityReport) -> IO[bytes]:
    """
    Create a report with a .csv confusion matrix.
    """

    report_summary = db_report.summary
    conf_matrix = report_summary.annotations.confusion_matrix

    if not conf_matrix:
        # Old reports can have no matrix included
        return BytesIO()

    labels = list(conf_matrix.labels)
    confusion_rows = conf_matrix.rows
    precisions = conf_matrix.precision
    recalls = conf_matrix.recall

    # Accuracy per class is Jaccard in Object detection
    jaccards = conf_matrix.jaccard_index
    jaccards[-1] = "nan"

    unmatched_label = "unmatched"
    dataset_accuracy_micro, *_ = compute_accuracy(
        confusion_rows, excluded_label_idx=labels.index(unmatched_label)
    )
    dataset_dice_coeff_avg_macro, dataset_dice_coeff_by_class, *_ = compute_dice_coefficient(
        confusion_rows,
        averaging=Averaging.macro,
        excluded_label_idx=labels.index(unmatched_label),
    )

    csv_file = BytesIO()

    csv_text_wrapper = TextIOWrapper(csv_file, write_through=True, newline="")
    csv_writer = csv.writer(csv_text_wrapper)
    csv_writer.writerow(["label"] + labels + ["precision"])

    for confusion_row, label, precision in zip(confusion_rows, labels, precisions):
        csv_writer.writerow([label] + confusion_row.tolist() + [precision])

    csv_writer.writerow(["recall"] + recalls.tolist())
    csv_writer.writerow(["dice coefficient"] + dataset_dice_coeff_by_class.tolist())
    csv_writer.writerow(["jaccard index"] + jaccards.tolist())
    csv_writer.writerow([""])
    csv_writer.writerow(["avg. accuracy (micro)", dataset_accuracy_micro])
    csv_writer.writerow(["avg. dice coefficient (macro)", dataset_dice_coeff_avg_macro])
    csv_text_wrapper.detach()

    csv_file.seek(0)

    return csv_file


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
