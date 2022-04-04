# Copyright (C) 2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework import serializers
from .models import GitData

class DatasetRepoSerializer(serializers.ModelSerializer):
    task_id = serializers.IntegerField(write_only=True, allow_null=True, required=False)

    class Meta:
        model = GitData
        fields = ['task_id', 'path', 'format', 'sync_date', 'status', 'lfs', 'task']
        read_only_fields = ['status', 'task']

class DatasetRepoGetSerializer(serializers.ModelSerializer):
    error = serializers.CharField(allow_null=True, required=False, read_only=True)

    class Meta:
        model = GitData
        fields = ['path', 'format', 'sync_date', 'status', 'lfs', 'error']
        read_only_fields = fields

class RqStatusSerializer(serializers.Serializer):
    status = serializers.CharField()
    stderr = serializers.CharField(allow_blank=True, default='')
