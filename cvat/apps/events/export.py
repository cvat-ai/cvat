# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import csv
import os
import uuid
from datetime import datetime, timedelta
from pathlib import Path

import attrs
import clickhouse_connect
from dateutil import parser
from django.conf import settings
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.reverse import reverse
from rq import get_current_job

from cvat.apps.dataset_manager.util import TmpDirManager
from cvat.apps.dataset_manager.views import log_exception
from cvat.apps.engine.log import ServerLogManager
from cvat.apps.engine.rq import RQMetaWithFailureInfo
from cvat.apps.engine.types import ExtendedRequest
from cvat.apps.engine.utils import sendfile
from cvat.apps.events.permissions import EventsPermission
from cvat.apps.redis_handler.background import AbstractExporter
from cvat.apps.redis_handler.rq import RequestId

slogger = ServerLogManager(__name__)

DEFAULT_CACHE_TTL = timedelta(hours=1)


def _create_csv(query_params: dict):
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

        current_job = get_current_job()
        output_filename = Path(TmpDirManager.TMP_ROOT) / current_job.id

        with open(output_filename, "w", encoding="UTF8") as f:
            writer = csv.writer(f)
            writer.writerow(result.column_names)
            writer.writerows(result.result_rows)

        return output_filename
    except Exception:
        log_exception(slogger.glob)
        raise


class EventsRequestId(RequestId):
    @property
    def user_id(self) -> int:
        return self.extra["user_id"]


@attrs.define(kw_only=True)
class EventsExporter(AbstractExporter):

    filter_query: dict = attrs.field(init=False)
    query_id: uuid.UUID = attrs.field(init=False)  # temporary arg

    def __attrs_post_init__(self):
        super().__attrs_post_init__()
        self.query_id = self.request.query_params.get("query_id") or uuid.uuid4()

    def build_request_id(self):
        return EventsRequestId(
            queue=self.QUEUE_NAME,
            action="export",
            target="events",
            id=self.query_id,
            extra={
                "user_id": self.user_id,
            },
        ).render()

    def init_request_args(self):
        super().init_request_args()
        perm = EventsPermission.create_scope_list(self.request)
        self.filter_query = perm.filter(self.request.query_params)

    def define_query_params(self) -> dict:
        query_params = {
            "org_id": self.filter_query.get("org_id", None),
            "project_id": self.filter_query.get("project_id", None),
            "task_id": self.filter_query.get("task_id", None),
            "job_id": self.filter_query.get("job_id", None),
            "user_id": self.filter_query.get("user_id", None),
            "from": self.filter_query.get("from", None),
            "to": self.filter_query.get("to", None),
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

        if (
            query_params["from"]
            and query_params["to"]
            and query_params["from"] > query_params["to"]
        ):
            raise serializers.ValidationError("'from' must be before than 'to'")

        # Set the default time interval to last 30 days
        if not query_params["from"] and not query_params["to"]:
            query_params["to"] = datetime.now(timezone.utc)
            query_params["from"] = query_params["to"] - timedelta(days=30)

        return query_params

    def _init_callback_with_params(self):
        self.callback = _create_csv
        query_params = self.define_query_params()
        self.callback_args = (query_params,)

    def where_to_redirect(self) -> str:
        return reverse("events-download-file", request=self.request)

    def get_result_filename(self):
        if self.export_args.filename:
            return self.export_args.filename

        timestamp = self.get_file_timestamp()
        return f"logs_{timestamp}.csv"


# FUTURE-TODO: delete deprecated function after several releases
def export(request: ExtendedRequest):
    action = request.query_params.get("action")
    if action not in (None, "download"):
        raise serializers.ValidationError("Unexpected action specified for the request")

    filename = request.query_params.get("filename")
    manager = EventsExporter(request=request)
    request_id = manager.build_request_id()
    queue = manager.get_queue()

    response_data = {
        "query_id": manager.query_id,
    }
    deprecation_timestamp = int(datetime(2025, 3, 17, tzinfo=timezone.utc).timestamp())
    response_headers = {"Deprecation": f"@{deprecation_timestamp}"}

    rq_job = queue.fetch_job(request_id)

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
                    return Response(status=status.HTTP_201_CREATED, headers=response_headers)
        elif rq_job.is_failed:
            rq_job_meta = RQMetaWithFailureInfo.for_job(rq_job)
            exc_info = rq_job_meta.formatted_exception or str(rq_job.exc_info)
            rq_job.delete()
            return Response(
                exc_info, status=status.HTTP_500_INTERNAL_SERVER_ERROR, headers=response_headers
            )
        else:
            return Response(
                data=response_data, status=status.HTTP_202_ACCEPTED, headers=response_headers
            )

    manager.init_request_args()
    # request validation is missed here since exporting to a cloud_storage is disabled
    manager.init_callback_with_params()
    manager.setup_new_job(queue, request_id)

    return Response(data=response_data, status=status.HTTP_202_ACCEPTED)
