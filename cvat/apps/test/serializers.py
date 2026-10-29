# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework import serializers


class LabelCountsQuerySerializer(serializers.Serializer):
    task_id = serializers.IntegerField(help_text="A task to count annotations in")
    job_id = serializers.IntegerField(
        required=False, help_text="A job of the task to count annotations in"
    )


class LabelCountSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    color = serializers.CharField(allow_blank=True)
    count = serializers.IntegerField(help_text="The number of shapes, tracks and tags")


class LabelCountsSerializer(serializers.Serializer):
    task_id = serializers.IntegerField()
    job_id = serializers.IntegerField(allow_null=True)
    total = serializers.IntegerField()
    labels = LabelCountSerializer(many=True)
