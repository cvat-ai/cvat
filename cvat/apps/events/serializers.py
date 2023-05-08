# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from dateutil import parser as datetime_parser
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

    def to_internal_value(self, data):
        request = self.context.get("request")
        org = request.iam_context['organization']
        org_id = getattr(org, "id", None)
        org_slug = getattr(org, "slug", None)

        send_time = datetime_parser.isoparse(data["timestamp"])
        receive_time = datetime.datetime.now(datetime.timezone.utc)
        time_correction = receive_time - send_time
        last_timestamp = None

        for event in data["events"]:
            timestamp = datetime_parser.isoparse(event['timestamp'])
            if last_timestamp:
                t_diff = timestamp - last_timestamp
                if t_diff < self._TIME_THRESHOLD:
                    payload = event.get('payload', {})
                    if payload:
                        payload = json.loads(payload)

                    payload['working_time'] = t_diff // self._WORKING_TIME_RESOLUTION
                    payload['username'] = request.user.username
                    event['payload'] = json.dumps(payload)

            last_timestamp = timestamp
            event['timestamp'] = str((timestamp + time_correction).timestamp())
            event['source'] = 'client'
            event['org_id'] = org_id
            event['org_slug'] = org_slug
            event['user_id'] = request.user.id
            event['user_name'] = request.user.username
            event['user_email'] = request.user.email

        return data
