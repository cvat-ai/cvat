# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework import serializers

from cvat.apps.analytics_report.models import TypeChoice, GranularityChoice, ViewChoice

class StatisticsItemSerializer(serializers.Serializer):
    title = serializers.CharField()
    description = serializers.CharField(allow_blank=True)
    granularity = serializers.ChoiceField(choices=GranularityChoice.choices(), required=False)
    default_view = serializers.ChoiceField(choices=ViewChoice.choices())
    dataseries = serializers.DictField()


class AnalytcisReportSerializer(serializers.Serializer):
    created_date = serializers.DateTimeField()
    type = serializers.ChoiceField(choices=TypeChoice.choices())
    id = serializers.IntegerField()
    statistics = serializers.DictField(child=StatisticsItemSerializer())
