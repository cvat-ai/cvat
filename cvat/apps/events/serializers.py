# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


from rest_framework import serializers

class EventSerializer(serializers.Serializer):
    scope = serializers.CharField(required=True)
    obj_name = serializers.CharField(required=False)
    obj_id = serializers.IntegerField(required=False)
    obj_val = serializers.CharField(required=False)
    source = serializers.CharField(required=False)
    timestamp = serializers.DateTimeField(required=True)
    count = serializers.IntegerField(required=False)
    duration = serializers.IntegerField(required=False, default=0)
    project = serializers.IntegerField(required=False, allow_null=True)
    task = serializers.IntegerField(required=False, allow_null=True)
    job = serializers.IntegerField(required=False, allow_null=True)
    user = serializers.IntegerField(required=False, allow_null=True)
    organization = serializers.IntegerField(required=False, allow_null=True)
    payload = serializers.CharField(required=False)

class ClientEventsSerializer(serializers.Serializer):
    events = EventSerializer(many=True, default=[])
    timestamp = serializers.DateTimeField()

class EventQuerySerializer(serializers.Serializer):
    organization = serializers.SerializerMethodField()
    project = serializers.SerializerMethodField()
    task = serializers.SerializerMethodField()
    job = serializers.SerializerMethodField()
    user = serializers.SerializerMethodField()
    start_time = serializers.SerializerMethodField()
    end_time = serializers.SerializerMethodField()

    def _get_query_param(self, param_name):
        request = self.context['request']
        return request.query_params.get(param_name, None)

    def get_organization(self, _):
        return self._get_query_param('organization')

    def get_project(self, _):
        return self._get_query_param('project')

    def get_task(self, _):
        return self._get_query_param('task')

    def get_job(self, _):
        return self._get_query_param('job')

    def get_user(self, _):
        return self._get_query_param('user')

    def get_start_time(self, _):
        return self._get_query_param('start-time')

    def get_end_time(self, _):
        return self._get_query_param('end-time')

    def validate(self, data):
        if not any ((data["organization"], data["project"], data["task"], data["job"], data["user"])):
            raise serializers.ValidationError("One of 'organization', 'project', 'task', 'job', 'user' fields must be specified")

        return data
