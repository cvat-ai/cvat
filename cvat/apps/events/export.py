# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import csv
import os
import uuid
from datetime import datetime, timedelta, timezone
from logging import Logger

import clickhouse_connect
import django_rq
from dateutil import parser
from django.conf import settings
from rest_framework import serializers, status
from rest_framework.response import Response

from cvat.apps.dataset_manager.views import log_exception
from cvat.apps.engine.log import ServerLogManager
from cvat.apps.engine.rq_job_handler import RQJobMetaField
from cvat.apps.engine.utils import sendfile

slogger = ServerLogManager(__name__)

DEFAULT_CACHE_TTL = timedelta(hours=1)


def _create_csv(query_params, output_filename, cache_ttl):
    try:
        clickhouse_settings = settings.CLICKHOUSE["events"]

        time_filter = {
            "from": query_params.pop("from"),
            "to": query_params.pop("to"),
        }

        query = "SELECT * FROM events"
        conditions = []
        parameters = {}

        if time_filter["from"]:
            conditions.append(f"timestamp >= {{from:DateTime64}}")
            parameters["from"] = time_filter["from"]

        if time_filter["to"]:
            conditions.append(f"timestamp <= {{to:DateTime64}}")
            parameters["to"] = time_filter["to"]

        for param, value in query_params.items():
            if value:
                conditions.append(f"{param} = {{{param}:UInt64}}")
                parameters[param] = value

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        query += " ORDER BY timestamp ASC"

        with clickhouse_connect.get_client(
            host=clickhouse_settings["HOST"],
            database=clickhouse_settings["NAME"],
            port=clickhouse_settings["PORT"],
            username=clickhouse_settings["USER"],
            password=clickhouse_settings["PASSWORD"],
        ) as client:
            result = client.query(query, parameters=parameters)

        with open(output_filename, "w", encoding="UTF8") as f:
            writer = csv.writer(f)
            writer.writerow(result.column_names)
            writer.writerows(result.result_rows)

        archive_ctime = os.path.getctime(output_filename)
        scheduler = django_rq.get_scheduler(settings.CVAT_QUEUES.EXPORT_DATA.value)
        cleaning_job = scheduler.enqueue_in(
            time_delta=cache_ttl,
            func=_clear_export_cache,
            file_path=output_filename,
            file_ctime=archive_ctime,
            logger=slogger.glob,
        )
        slogger.glob.info(
            f"The {output_filename} is created "
            f"and available for downloading for the next {cache_ttl}. "
            f"Export cache cleaning job is enqueued, id '{cleaning_job.id}'"
        )
        return output_filename
    except Exception:
        log_exception(slogger.glob)
        raise


def export(request, filter_query, queue_name):
    action = request.query_params.get("action", None)
    filename = request.query_params.get("filename", None)

    query_params = {
        "org_id": filter_query.get("org_id", None),
        "project_id": filter_query.get("project_id", None),
        "task_id": filter_query.get("task_id", None),
        "job_id": filter_query.get("job_id", None),
        "user_id": filter_query.get("user_id", None),
        "from": filter_query.get("from", None),
        "to": filter_query.get("to", None),
    }

    try:
        if query_params["from"]:
            query_params["from"] = parser.parse(query_params["from"]).timestamp()
    except parser.ParserError:
        raise serializers.ValidationError(
            f"Cannot parse 'from' datetime parameter: {query_params['from']}"
        )
    try:
        if query_params["to"]:
            query_params["to"] = parser.parse(query_params["to"]).timestamp()
    except parser.ParserError:
        raise serializers.ValidationError(
            f"Cannot parse 'to' datetime parameter: {query_params['to']}"
        )

    if query_params["from"] and query_params["to"] and query_params["from"] > query_params["to"]:
        raise serializers.ValidationError("'from' must be before than 'to'")

    # Set the default time interval to last 30 days
    if not query_params["from"] and not query_params["to"]:
        query_params["to"] = datetime.now(timezone.utc)
        query_params["from"] = query_params["to"] - timedelta(days=30)

    if action not in (None, "download"):
        raise serializers.ValidationError("Unexpected action specified for the request")

    query_id = request.query_params.get("query_id", None) or uuid.uuid4()
    rq_id = f"export:csv-logs-{query_id}-by-{request.user}"
    response_data = {
        "query_id": query_id,
    }

    queue = django_rq.get_queue(queue_name)
    rq_job = queue.fetch_job(rq_id)

    if rq_job:
        if rq_job.is_finished:
            file_path = rq_job.return_value()
            if action == "download" and os.path.exists(file_path):
                rq_job.delete()
                timestamp = datetime.strftime(datetime.now(), "%Y_%m_%d_%H_%M_%S")
                filename = filename or f"logs_{timestamp}.csv"

                return sendfile(request, file_path, attachment=True, attachment_filename=filename)
            else:
                if os.path.exists(file_path):
                    return Response(status=status.HTTP_201_CREATED)
        elif rq_job.is_failed:
            exc_info = rq_job.meta.get(RQJobMetaField.FORMATTED_EXCEPTION, str(rq_job.exc_info))
            rq_job.delete()
            return Response(exc_info, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            return Response(data=response_data, status=status.HTTP_202_ACCEPTED)

    ttl = DEFAULT_CACHE_TTL.total_seconds()
    output_filename = os.path.join(settings.TMP_FILES_ROOT, f"{query_id}.csv")
    queue.enqueue_call(
        func=_create_csv,
        args=(query_params, output_filename, DEFAULT_CACHE_TTL),
        job_id=rq_id,
        meta={},
        result_ttl=ttl,
        failure_ttl=ttl,
    )

    return Response(data=response_data, status=status.HTTP_202_ACCEPTED)


def _clear_export_cache(file_path: str, file_ctime: float, logger: Logger) -> None:
    try:
        if os.path.exists(file_path) and os.path.getctime(file_path) == file_ctime:
            os.remove(file_path)

            logger.info("Export cache file '{}' successfully removed".format(file_path))
    except Exception:
        log_exception(logger)
        raise
