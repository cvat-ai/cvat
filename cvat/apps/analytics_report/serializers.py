# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from drf_spectacular.utils import extend_schema_serializer
from rest_framework import serializers

from cvat.apps.analytics_report.models import GranularityChoice, TargetChoice, ViewChoice, BinaryOperatorType

class BinaryOperationSerializer(serializers.Serializer):
    left = serializers.CharField(required=False, allow_null=True)
    operator = serializers.ChoiceField(choices=BinaryOperatorType.choices())
    right = serializers.CharField(required=False, allow_null=True)

class TransformationSerializer(serializers.Serializer):
    name = serializers.CharField()
    binary = BinaryOperationSerializer(required=False, allow_null=True)

class MetricSerializer(serializers.Serializer):
    name = serializers.CharField()
    title = serializers.CharField()
    description = serializers.CharField(allow_blank=True)
    granularity = serializers.ChoiceField(
        choices=GranularityChoice.choices(), required=False, allow_null=True
    )
    default_view = serializers.ChoiceField(choices=ViewChoice.choices())
    dataseries = serializers.DictField()
    transformations = serializers.ListField(child=TransformationSerializer())


@extend_schema_serializer(many=False)
class AnalyticsReportSerializer(serializers.Serializer):
    created_date = serializers.DateTimeField()
    target = serializers.ChoiceField(choices=TargetChoice.choices())
    job_id = serializers.IntegerField(required=False)
    task_id = serializers.IntegerField(required=False)
    project_id = serializers.IntegerField(required=False)
    statistics = serializers.ListField(child=MetricSerializer())


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
