# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from datetime import datetime, timedelta, timezone

from dateutil import parser
from rest_framework import serializers, status
from rest_framework.exceptions import NotFound
from rest_framework.response import Response

from cvat.apps.analytics_report.models import AnalyticsReport, TargetChoice
from cvat.apps.analytics_report.report.create import get_empty_report
from cvat.apps.analytics_report.serializers import AnalyticsReportSerializer
from cvat.apps.engine.models import Job, Project, Task


def _filter_statistics_by_date(statistics, start_date, end_date):
    for metric in statistics:
        data_series = metric.get("data_series", {})
        if metric.get("is_filterable_by_date", False):
            for ds_name, ds_entry in data_series.items():
                data_series[ds_name] = list(
                    filter(
                        lambda df: start_date <= parser.parse(df["datetime"]) <= end_date, ds_entry
                    )
                )

    return statistics


def _convert_datetime_to_date(statistics):
    for metric in statistics:
        data_series = metric.get("data_series", {})
        for ds_entry in data_series.values():
            for df in ds_entry:
                df["date"] = parser.parse(df["datetime"]).date()
                del df["datetime"]
    return statistics


def _get_object_report(obj_model, pk, start_date, end_date):
    data = {}
    try:
        db_obj = obj_model.objects.get(pk=pk)
        db_analytics_report = db_obj.analytics_report
        data[f"{obj_model.__name__.lower()}_id"] = pk
    except obj_model.DoesNotExist as ex:
        raise NotFound(f"{obj_model.__name__} object with pk={pk} does not exist") from ex
    except AnalyticsReport.DoesNotExist:
        db_analytics_report = get_empty_report()

    statistics = _filter_statistics_by_date(db_analytics_report.statistics, start_date, end_date)
    statistics = _convert_datetime_to_date(statistics)
    data["statistics"] = statistics
    data["created_date"] = db_analytics_report.created_date

    if obj_model is Job:
        data["target"] = TargetChoice.JOB
    elif obj_model is Task:
        data["target"] = TargetChoice.TASK
    elif obj_model is Project:
        data["target"] = TargetChoice.PROJECT
    return data


def _get_job_report(job_id, start_date, end_date):
    return _get_object_report(Job, int(job_id), start_date, end_date)


def _get_task_report(task_id, start_date, end_date):
    return _get_object_report(Task, int(task_id), start_date, end_date)


def _get_project_report(project_id, start_date, end_date):
    return _get_object_report(Project, int(project_id), start_date, end_date)


def get_analytics_report(request, query_params):
    query_params = {
        "project_id": query_params.get("project_id", None),
        "task_id": query_params.get("task_id", None),
        "job_id": query_params.get("job_id", None),
        "start_date": query_params.get("start_date", None),
        "end_date": query_params.get("end_date", None),
    }

    try:
        if query_params["start_date"]:
            query_params["start_date"] = parser.parse(query_params["start_date"])
    except parser.ParserError:
        raise serializers.ValidationError(
            f"Cannot parse 'start_date' datetime parameter: {query_params['start_date']}"
        )
    try:
        if query_params["end_date"]:
            query_params["end_date"] = parser.parse(query_params["end_date"])
    except parser.ParserError:
        raise serializers.ValidationError(
            f"Cannot parse 'end_date' datetime parameter: {query_params['end_date']}"
        )

    if (
        query_params["start_date"]
        and query_params["end_date"]
        and query_params["start_date"] > query_params["end_date"]
    ):
        raise serializers.ValidationError("'start_date' must be before than 'end_date'")

    # Set the default time interval to last 30 days
    if not query_params["start_date"] and not query_params["end_date"]:
        query_params["end_date"] = datetime.now(timezone.utc)
        query_params["start_date"] = query_params["end_date"] - timedelta(days=30)
    elif query_params["start_date"] and not query_params["end_date"]:
        query_params["end_date"] = datetime.now(timezone.utc)
    elif not query_params["start_date"] and query_params["end_date"]:
        query_params["end_date"] = datetime.min

    job_id = query_params.get("job_id", None)
    task_id = query_params.get("task_id", None)
    project_id = query_params.get("project_id", None)

    if job_id is None and task_id is None and project_id is None:
        raise serializers.ValidationError("No any job, task or project specified")

    if sum(map(bool, [job_id, task_id, project_id])) > 1:
        raise serializers.ValidationError(
            "Only one of job_id, task_id or project_id must be specified"
        )

    report = None
    try:
        if job_id is not None:
            report = _get_job_report(job_id, query_params["start_date"], query_params["end_date"])
        elif task_id is not None:
            report = _get_task_report(task_id, query_params["start_date"], query_params["end_date"])
        elif project_id is not None:
            report = _get_project_report(
                project_id, query_params["start_date"], query_params["end_date"]
            )
    except AnalyticsReport.DoesNotExist:
        return Response("Analytics report not found", status=status.HTTP_404_NOT_FOUND)

    serializer = AnalyticsReportSerializer(data=report)
    serializer.is_valid(raise_exception=True)

    return Response(serializer.data)
