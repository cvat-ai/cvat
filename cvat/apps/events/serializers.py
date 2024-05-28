# Copyright (C) 2023-2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import datetime
import json

from contextlib import suppress
from rest_framework import serializers
from cvat.apps.engine.models import Job

class EventSerializer(serializers.Serializer):
    scope = serializers.CharField(required=True)
    obj_name = serializers.CharField(required=False, allow_null=True)
    obj_id = serializers.IntegerField(required=False, allow_null=True)
    obj_val = serializers.CharField(required=False, allow_null=True)
    source = serializers.CharField(required=False, allow_null=True)
    timestamp = serializers.DateTimeField(required=True)
    count = serializers.IntegerField(required=False, allow_null=True)
    duration = serializers.IntegerField(required=False, default=0)
    project_id = serializers.IntegerField(required=False, allow_null=True)
    task_id = serializers.IntegerField(required=False, allow_null=True)
    job_id = serializers.IntegerField(required=False, allow_null=True)
    user_id = serializers.IntegerField(required=False, allow_null=True)
    user_name = serializers.CharField(required=False, allow_null=True)
    user_email = serializers.CharField(required=False, allow_null=True)
    org_id = serializers.IntegerField(required=False, allow_null=True)
    org_slug = serializers.CharField(required=False, allow_null=True)
    payload = serializers.CharField(required=False, allow_null=True)

class ClientEventsSerializer(serializers.Serializer):
    events = EventSerializer(many=True, default=[])
    previous_event = EventSerializer(default=None, allow_null=True, write_only=True)
    timestamp = serializers.DateTimeField()
    _TIME_THRESHOLD = datetime.timedelta(seconds=100)
    _WORKING_TIME_RESOLUTION = datetime.timedelta(milliseconds=1)
    _COLLAPSED_EVENT_SCOPES = frozenset(("change:frame",))
    _WORKING_TIME_SCOPE = 'send:working_time'

    @classmethod
    def _generate_wt_event(cls, job_id: int | None, wt: datetime.timedelta, common: dict) -> EventSerializer:
        if wt.total_seconds():
            task_id = None
            project_id = None

            if job_id is not None:
                with suppress(Job.DoesNotExist):
                    task_id, project_id = Job.objects.values_list(
                        "segment__task__id", "segment__task__project__id"
                    ).get(pk=job_id)

            value = wt // cls._WORKING_TIME_RESOLUTION
            event = EventSerializer(data={
                **common,
                "scope": cls._WORKING_TIME_SCOPE,
                "obj_name": "working_time",
                "obj_val": value,
                "source": "server",
                "count": 1,
                "project_id": project_id,
                "task_id": task_id,
                "job_id": job_id,
                # keep it in payload for backward compatibility
                # but in the future it is much better to use a dedicated field "obj_value"
                # because parsing JSON in SQL query is very slow
                "payload": json.dumps({ "working_time": value })
            })

            event.is_valid(raise_exception=True)
            return event

    @classmethod
    def _end_timestamp(cls, event: dict) -> datetime.datetime:
        if event["scope"] in cls._COLLAPSED_EVENT_SCOPES:
            return event["timestamp"] + datetime.timedelta(milliseconds=event["duration"])

        return event["timestamp"]

    def to_internal_value(self, data):
        data = super().to_internal_value(data)
        request = self.context.get("request")
        org = request.iam_context["organization"]
        org_id = getattr(org, "id", None)
        org_slug = getattr(org, "slug", None)

        send_time = data["timestamp"]
        receive_time = datetime.datetime.now(datetime.timezone.utc)
        time_correction = receive_time - send_time

        if previous_event := data["previous_event"]:
            previous_end_timestamp = self._end_timestamp(previous_event)
            previous_job_id = previous_event.get("job_id")
        elif data["events"]:
            previous_end_timestamp = data["events"][0]["timestamp"]
            previous_job_id = data["events"][0].get("job_id")

        working_time_per_job = {}
        for event in data["events"]:
            job_id = event.get('job_id')
            working_time = datetime.timedelta()

            timestamp = event["timestamp"]
            if timestamp > previous_end_timestamp:
                t_diff = timestamp - previous_end_timestamp
                if t_diff < self._TIME_THRESHOLD:
                    working_time += t_diff

                previous_end_timestamp = timestamp

            end_timestamp = self._end_timestamp(event)
            if end_timestamp > previous_end_timestamp:
                working_time += end_timestamp - previous_end_timestamp
                previous_end_timestamp = end_timestamp

            if previous_job_id not in working_time_per_job:
                working_time_per_job[previous_job_id] = datetime.timedelta()
            working_time_per_job[previous_job_id] += working_time
            previous_job_id = job_id

            try:
                json_payload = json.dumps(json.loads(event.get("payload", "{}")))
            except:
                raise serializers.ValidationError("JSON payload is not valid in passed event")

            event.update({
                "timestamp": str((timestamp + time_correction).timestamp()),
                "source": "client",
                "org_id": org_id,
                "org_slug": org_slug,
                "user_id": request.user.id,
                "user_name": request.user.username,
                "user_email": request.user.email,
                "payload": json_payload,
            })

        common = {
            "timestamp": str(receive_time.timestamp()),
            "user_id": request.user.id,
            "user_name": request.user.username,
            "user_email": request.user.email,
            "org_id": org_id,
            "org_slug": org_slug,
        }

        for job_id in working_time_per_job:
            event = ClientEventsSerializer._generate_wt_event(job_id, working_time_per_job[job_id], common)
            data["events"].append(event.to_internal_value())

        return data
