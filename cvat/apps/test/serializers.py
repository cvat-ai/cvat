# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework import serializers


class ClassAnnotationCountSerializer(serializers.Serializer):
    label_id = serializers.IntegerField(help_text="ID of the annotation label")
    label_name = serializers.CharField(max_length=64, help_text="Name of the label/class")
    color = serializers.CharField(max_length=8, required=False, allow_blank=True, default="")
    count = serializers.IntegerField(min_value=0, help_text="Number of annotations for this class")


class TaskAnnotationAnalyticsResponseSerializer(serializers.Serializer):
    task_id = serializers.IntegerField(help_text="ID of the task")
    total_annotations = serializers.IntegerField(min_value=0, help_text="Total count across all matching classes")
    shape_type = serializers.CharField(required=False, allow_null=True, help_text="Optional shape type filter applied")
    counts = ClassAnnotationCountSerializer(many=True, help_text="Per-class annotation distribution")
