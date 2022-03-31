# Copyright (C) 2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework import serializers
from .models import GitData

class DatasetRepoSerializer(serializers.ModelSerializer):
    task_id = serializers.IntegerField(write_only=True, allow_null=True, required=False)
    class Meta:
        model = GitData
        fields = ['task_id', 'path', 'format', 'sync_date',
            'status', 'lfs', 'task']
        read_only_fields = ['task']

class RqStatusSerializer(serializers.Serializer):
    status = serializers.CharField(allow_blank=True, default='')
    stderr = serializers.CharField(allow_blank=True, default='')