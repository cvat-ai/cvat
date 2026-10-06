# SPDX-License-Identifier: MIT

from rest_framework import serializers


class LabelCountSerializer(serializers.Serializer):
    label_id = serializers.IntegerField()
    name = serializers.CharField()
    color = serializers.CharField()
    count = serializers.IntegerField()


class AnnotationCountsSerializer(serializers.Serializer):
    task_id = serializers.IntegerField()
    total = serializers.IntegerField()
    labels = LabelCountSerializer(many=True)
