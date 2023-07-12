# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework import serializers
from drf_spectacular.utils import extend_schema_serializer

from cvat.apps.analytics_report.models import GranularityChoice, TypeChoice, ViewChoice


class StatisticsItemSerializer(serializers.Serializer):
    title = serializers.CharField()
    description = serializers.CharField(allow_blank=True)
    granularity = serializers.ChoiceField(
        choices=GranularityChoice.choices(), required=False, allow_null=True
    )
    default_view = serializers.ChoiceField(choices=ViewChoice.choices())
    dataseries = serializers.DictField()
    transformations = serializers.ListField(child=serializers.DictField())

@extend_schema_serializer(many=False)
class AnalyticsReportSerializer(serializers.Serializer):
    created_date = serializers.DateTimeField()
    target = serializers.ChoiceField(choices=TypeChoice.choices())
    job_id = serializers.IntegerField(required=False)
    task_id = serializers.IntegerField(required=False)
    project_id = serializers.IntegerField(required=False)
    statistics = serializers.DictField(child=StatisticsItemSerializer())


class AnalyticsReportCreateSerializer(serializers.Serializer):
    job_id = serializers.IntegerField(required=False)
    task_id = serializers.IntegerField(required=False)
    project_id = serializers.IntegerField(required=False)

    def validate(self, data):
        job_id = data.get("job_id")
        task_id = data.get("task_id")
        project_id = data.get("project_id")

        if job_id is None and task_id is None and project_id is None:
            raise serializers.ValidationError("No any job, task or project specified")

        if sum(map(bool, [job_id, task_id, project_id])) > 1:
            raise serializers.ValidationError(
                "Only one of job_id, task_id or project_id must be specified"
            )

        return data
