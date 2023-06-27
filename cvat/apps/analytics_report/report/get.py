# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from datetime import datetime, timedelta, timezone
from dateutil import parser

from django.core.exceptions import ObjectDoesNotExist
from django.conf import settings

from rest_framework import serializers, status
from rest_framework.response import Response

from cvat.apps.engine.models import Job, Task, Project
from cvat.apps.analytics_report.models import TypeChoice
from cvat.apps.analytics_report.serializers import AnalytcisReportSerializer

def _filter_statistics_by_date(statistics, start_date, end_date):
    for _, st_entry in statistics.items():
        dataseries = st_entry.get("dataseries", {})
        for ds_name, ds_entry in dataseries.items():
            dataseries[ds_name] = list(filter(lambda ds_endtry: start_date <= parser.parse(ds_endtry["datetime"]) <= end_date, ds_entry))

    return statistics

def get_analytics_report(request, query_params):
    query_params = {
        'project_id': query_params.get('project_id', None),
        'task_id': query_params.get('task_id', None),
        'job_id': query_params.get('job_id', None),
        'start_date': query_params.get('startDate', None),
        'end_date': query_params.get('endDate', None),
    }

    try:
        if query_params['start_date']:
            query_params['start_date'] = parser.parse(query_params['start_date'])
    except parser.ParserError:
        raise serializers.ValidationError(
            f"Cannot parse 'start_date' datetime parameter: {query_params['start_date']}"
        )
    try:
        if query_params['end_date']:
            query_params['end_date'] = parser.parse(query_params['end_date'])
    except parser.ParserError:
        raise serializers.ValidationError(
            f"Cannot parse 'end_date' datetime parameter: {query_params['end_date']}"
        )

    if query_params['start_date'] and query_params['end_date'] and query_params['start_date'] > query_params['end_date']:
        raise serializers.ValidationError("'start_date' must be before than 'end_date'")

    # Set the default time interval to last 30 days
    if not query_params["start_date"] and not query_params["end_date"]:
        query_params["end_date"] = datetime.now(timezone.utc)
        query_params["start_date"] = query_params["end_date"] - timedelta(days=30)
    elif query_params["start_date"] and not query_params["end_date"]:
        query_params["end_date"] = datetime.now(timezone.utc)
    elif not query_params["start_date"] and query_params["end_date"]:
        query_params["end_date"] = datetime.min

    job_id = query_params.get('job_id', None)
    task_id = query_params.get('task_id', None)
    project_id = query_params.get('project_id', None)

    if job_id is None and task_id is None and project_id is None:
        raise serializers.ValidationError("No any job, task or project specified")

    if [job_id, task_id, project_id].count(True) > 1:
        raise serializers.ValidationError("Only one of job_id, task_id or project_id must be specified")

    if job_id is not None:
        pk = int(job_id)
        try:
            db_job = Job.objects.get(pk=pk)
        except ObjectDoesNotExist:
            return Response('Job not found', status=status.HTTP_404_NOT_FOUND)
        try:
            db_analytics_report = db_job.analytics_report
        except ObjectDoesNotExist:
            return Response('Analytics report not found', status=status.HTTP_404_NOT_FOUND)
        data = {
            "type": TypeChoice.JOB,
            "id": pk,
            "statistics": _filter_statistics_by_date(db_analytics_report.statistics, query_params['start_date'], query_params['end_date']),
            "created_date": db_analytics_report.created_date,
        }
        serializer = AnalytcisReportSerializer(data=data)
    elif task_id is not None:
        pk = int(task_id)
        raise NotImplementedError()
    elif project_id is not None:
        pk = int(project_id)
        raise NotImplementedError()

    serializer.is_valid(raise_exception=True)

    return Response(serializer.data)
