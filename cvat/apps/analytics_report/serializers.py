# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework import serializers

from cvat.apps.analytics_report.models import TypeChoice, GranularityChoice, ViewChoice

class StatisticsItemSerializer(serializers.Serializer):
    title = serializers.CharField()
    description = serializers.CharField(allow_blank=True)
    granularity = serializers.ChoiceField(choices=GranularityChoice.choices(), required=False, allow_null=True)
    default_view = serializers.ChoiceField(choices=ViewChoice.choices())
    dataseries = serializers.DictField()
    transformations = serializers.ListField(child=serializers.DictField())

class AnalyticsReportSerializer(serializers.Serializer):
    created_date = serializers.DateTimeField()
    target = serializers.ChoiceField(choices=TypeChoice.choices())
    job_id = serializers.IntegerField(required=False)
    task_id = serializers.IntegerField(required=False)
    project_id = serializers.IntegerField(required=False)
    statistics = serializers.DictField(child=StatisticsItemSerializer())
