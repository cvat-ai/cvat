# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import datetime
import json

from rest_framework import serializers

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
    timestamp = serializers.DateTimeField()
    _TIME_THRESHOLD = datetime.timedelta(seconds=100)
    _WORKING_TIME_RESOLUTION = datetime.timedelta(milliseconds=1)
    _COLLAPSED_EVENT_SCOPES = frozenset(("change:frame",))

    def to_internal_value(self, data):
        data = super().to_internal_value(data)
        request = self.context.get("request")
        org = request.iam_context["organization"]
        org_id = getattr(org, "id", None)
        org_slug = getattr(org, "slug", None)

        send_time = data["timestamp"]
        receive_time = datetime.datetime.now(datetime.timezone.utc)
        time_correction = receive_time - send_time
        last_timestamp = datetime.datetime(datetime.MINYEAR, 1, 1, tzinfo=datetime.timezone.utc)
        zero_t_delta = datetime.timedelta()

        for event in data["events"]:
            timestamp = event["timestamp"]
            working_time = datetime.timedelta()
            event_duration = datetime.timedelta()
            t_diff = timestamp - last_timestamp

            payload = json.loads(event.get("payload", "{}"))

            if t_diff >= zero_t_delta:
                if event["scope"] in self._COLLAPSED_EVENT_SCOPES:
                    event_duration += datetime.timedelta(milliseconds=event["duration"])
                    working_time += event_duration

                if t_diff < self._TIME_THRESHOLD:
                    working_time += t_diff

            payload.update({
                "working_time": working_time // self._WORKING_TIME_RESOLUTION,
                "username": request.user.username,
            })

            event.update({
                "timestamp": str((timestamp + time_correction).timestamp()),
                "source": "client",
                "org_id": org_id,
                "org_slug": org_slug,
                "user_id": request.user.id,
                "user_name": request.user.username,
                "user_email": request.user.email,
                "payload": json.dumps(payload),
            })

            last_timestamp = timestamp + event_duration

        return data
