# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework import serializers


class LabelCountSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    color = serializers.CharField()
    count = serializers.IntegerField()
    by_type = serializers.DictField(child=serializers.IntegerField())


class AnnotationStatsSerializer(serializers.Serializer):
    task_id = serializers.IntegerField()
    total = serializers.IntegerField()
    labels = LabelCountSerializer(many=True)
    ws_ticket = serializers.CharField(
        help_text="Signed, short-lived ticket for /api/annotation-stats/<task_id>/ws"
    )
