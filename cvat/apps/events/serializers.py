# Copyright (C) 2023-2024 CVAT.ai Corporation
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
    ALLOWED_SCOPES = frozenset((
        'load:cvat', 'load:job', 'save:job', 'restore:job',
        'upload:annotations', 'send:exception', 'send:task_info',
        'draw:object', 'paste:object', 'copy:object', 'propagate:object',
        'drag:object', 'resize:object', 'delete:object', 'lock:object',
        'merge:objects', 'split:objects', 'group:objects', 'slice:object',
        'join:objects', 'change:attribute', 'change:label', 'change:frame',
        'zoom:image', 'fit:image', 'rotate:image', 'action:undo', 'action:redo',
        'debug:info', 'run:annotations_action', 'click:element'
    ))

    events = EventSerializer(many=True, default=[])
    previous_event = EventSerializer(default=None, allow_null=True, write_only=True)
    timestamp = serializers.DateTimeField()

    def to_internal_value(self, data):
        data = super().to_internal_value(data)
        request = self.context.get("request")
        org = request.iam_context["organization"]
        org_id = getattr(org, "id", None)
        org_slug = getattr(org, "slug", None)

        send_time = data["timestamp"]
        receive_time = datetime.datetime.now(datetime.timezone.utc)
        time_correction = receive_time - send_time

        if data["previous_event"]:
            data["previous_event"]["timestamp"] += time_correction

        for event in data["events"]:
            scope = event["scope"]
            if scope not in ClientEventsSerializer.ALLOWED_SCOPES:
                raise serializers.ValidationError({ "scope": f"Event scope **{scope}** is not allowed from client" })

            try:
                payload = json.loads(event.get("payload", "{}"))
            except json.JSONDecodeError:
                raise serializers.ValidationError({ "payload": "JSON payload is not valid in passed event" })

            event.update({
                "timestamp": event["timestamp"] + time_correction,
                "source": "client",
                "org_id": org_id,
                "org_slug": org_slug,
                "user_id": request.user.id,
                "user_name": request.user.username,
                "user_email": request.user.email,
                "payload": json.dumps(payload),
            })

        return data
