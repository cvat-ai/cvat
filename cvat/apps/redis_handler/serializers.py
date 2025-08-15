# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal
from typing import Any
from uuid import UUID

import rq.defaults as rq_defaults
from django.db.models import TextChoices
from django.utils import timezone
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers
from rq.job import JobStatus as RQJobStatus

from cvat.apps.engine import models
from cvat.apps.engine.log import ServerLogManager
from cvat.apps.engine.models import RequestAction
from cvat.apps.engine.rq import BaseRQMeta, ExportRQMeta, ImportRQMeta, RequestIdWithOptionalFormat
from cvat.apps.engine.serializers import BasicUserSerializer
from cvat.apps.engine.utils import parse_exception_message
from cvat.apps.lambda_manager.rq import LambdaRQMeta
from cvat.apps.redis_handler.rq import CustomRQJob, RequestId

slogger = ServerLogManager(__name__)


class RequestStatus(TextChoices):
    QUEUED = "queued"
    STARTED = "started"
    FAILED = "failed"
    FINISHED = "finished"


class RqIdSerializer(serializers.Serializer):
    rq_id = serializers.CharField(help_text="Request id")


class UserIdentifiersSerializer(BasicUserSerializer):
    class Meta(BasicUserSerializer.Meta):
        fields = (
            "id",
            "username",
        )


class RequestDataOperationSerializer(serializers.Serializer):
    type = serializers.CharField()
    target = serializers.CharField()
    project_id = serializers.IntegerField(required=False, allow_null=True)
    task_id = serializers.IntegerField(required=False, allow_null=True)
    job_id = serializers.IntegerField(required=False, allow_null=True)
    format = serializers.CharField(required=False, allow_null=True)
    function_id = serializers.CharField(required=False, allow_null=True)
    lightweight = serializers.BooleanField(required=False, allow_null=True)

    def to_representation(self, rq_job: CustomRQJob) -> dict[str, Any]:
        parsed_request_id: RequestId = rq_job.parsed_id

        base_rq_job_meta = BaseRQMeta.for_job(rq_job)
        representation = {
            "type": parsed_request_id.type,
            "target": parsed_request_id.target,
            "project_id": base_rq_job_meta.project_id,
            "task_id": base_rq_job_meta.task_id,
            "job_id": base_rq_job_meta.job_id,
        }
        if parsed_request_id.action == RequestAction.AUTOANNOTATE:
            representation["function_id"] = LambdaRQMeta.for_job(rq_job).function_id
        elif isinstance(parsed_request_id, RequestIdWithOptionalFormat):
            representation["format"] = parsed_request_id.format
        representation["lightweight"] = getattr(parsed_request_id, "lightweight", None)

        return representation


class RequestSerializer(serializers.Serializer):
    # SerializerMethodField is not used here to mark "status" field as required and fix schema generation.
    # Marking them as read_only leads to generating type as allOf with one reference to RequestStatus component.
    # The client generated using openapi-generator from such a schema contains wrong type like:
    # status (bool, date, datetime, dict, float, int, list, str, none_type): [optional]
    status = serializers.ChoiceField(source="get_status", choices=RequestStatus.choices)
    message = serializers.SerializerMethodField()
    id = serializers.CharField()
    operation = RequestDataOperationSerializer(source="*")
    progress = serializers.SerializerMethodField()
    created_date = serializers.DateTimeField(source="created_at")
    started_date = serializers.DateTimeField(
        required=False,
        allow_null=True,
        source="started_at",
    )
    finished_date = serializers.DateTimeField(
        required=False,
        allow_null=True,
        source="ended_at",
    )
    expiry_date = serializers.SerializerMethodField()
    owner = serializers.SerializerMethodField()
    result_url = serializers.URLField(required=False, allow_null=True)
    result_id = serializers.IntegerField(required=False, allow_null=True)

    def __init__(self, *args, **kwargs):
        self._base_rq_job_meta: BaseRQMeta | None = None
        super().__init__(*args, **kwargs)

    @extend_schema_field(UserIdentifiersSerializer())
    def get_owner(self, rq_job: CustomRQJob) -> dict[str, Any]:
        assert self._base_rq_job_meta
        return UserIdentifiersSerializer(self._base_rq_job_meta.user).data

    @extend_schema_field(
        serializers.FloatField(min_value=0, max_value=1, required=False, allow_null=True)
    )
    def get_progress(self, rq_job: CustomRQJob) -> Decimal:
        rq_job_meta = ImportRQMeta.for_job(rq_job)
        # progress of task creation is stored in "task_progress" field
        # progress of project import is stored in "progress" field
        return Decimal(rq_job_meta.progress or rq_job_meta.task_progress or 0.0)

    @extend_schema_field(serializers.DateTimeField(required=False, allow_null=True))
    def get_expiry_date(self, rq_job: CustomRQJob) -> str | None:
        delta = None
        if rq_job.is_finished:
            delta = rq_job.result_ttl or rq_defaults.DEFAULT_RESULT_TTL
        elif rq_job.is_failed:
            delta = rq_job.failure_ttl or rq_defaults.DEFAULT_FAILURE_TTL

        if rq_job.ended_at and delta:
            expiry_date = rq_job.ended_at + timedelta(seconds=delta)
            return expiry_date.replace(tzinfo=timezone.utc)

        return None

    @extend_schema_field(serializers.CharField(allow_blank=True))
    def get_message(self, rq_job: CustomRQJob) -> str:
        assert self._base_rq_job_meta
        rq_job_status = rq_job.get_status()
        message = ""

        if RQJobStatus.STARTED == rq_job_status:
            message = self._base_rq_job_meta.status or message
        elif RQJobStatus.FAILED == rq_job_status:

            message = self._base_rq_job_meta.formatted_exception or parse_exception_message(
                str(rq_job.exc_info or "Unknown error")
            )

        return message

    def to_representation(self, rq_job: CustomRQJob) -> dict[str, Any]:
        self._base_rq_job_meta = BaseRQMeta.for_job(rq_job)
        representation = super().to_representation(rq_job)

        # FUTURE-TODO: support such statuses on UI
        if representation["status"] in (RQJobStatus.DEFERRED, RQJobStatus.SCHEDULED):
            representation["status"] = RQJobStatus.QUEUED

        if representation["status"] == RQJobStatus.FINISHED:
            if rq_job.parsed_id.action == models.RequestAction.EXPORT:
                representation["result_url"] = ExportRQMeta.for_job(rq_job).result_url
            else:
                return_value = rq_job.return_value()
                # bool class is a subclass of int
                if isinstance(return_value, (int, UUID)) and not isinstance(return_value, bool):
                    representation["result_id"] = return_value

        return representation
