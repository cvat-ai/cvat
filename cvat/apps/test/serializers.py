# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework import serializers


class LabelCountSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    color = serializers.CharField()
    count = serializers.IntegerField()


class AnnotationStatsSerializer(serializers.Serializer):
    task_id = serializers.IntegerField()
    total = serializers.IntegerField()
    labels = LabelCountSerializer(many=True)
