# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework import serializers
from django.contrib.auth.models import User

from cvat.apps.engine.models import Task, CloudStorage
from cvat.apps.engine.serializers import WriteOnceMixin
from .models import AugmentationJob, AugmentationConfig, AugmentationLog


class AugmentationConfigReadSerializer(serializers.ModelSerializer):
    """Serializer for reading augmentation configurations"""

    owner = serializers.CharField(source='owner.username', allow_null=True, read_only=True)
    organization = serializers.IntegerField(source='organization.id', allow_null=True, read_only=True)

    class Meta:
        model = AugmentationConfig
        fields = [
            'id', 'name', 'description', 'pipeline', 'owner', 'organization',
            'created_date', 'updated_date', 'usage_count', 'last_used_at', 'is_template'
        ]
        read_only_fields = ['id', 'owner', 'organization', 'created_date', 'updated_date', 'usage_count', 'last_used_at']


class AugmentationConfigWriteSerializer(WriteOnceMixin, serializers.ModelSerializer):
    """Serializer for creating/updating augmentation configurations"""

    class Meta:
        model = AugmentationConfig
        fields = ['name', 'description', 'pipeline', 'is_template']

    def validate_pipeline(self, value):
        """Validate that pipeline is a valid Albumentations configuration"""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Pipeline must be a JSON object")

        if 'transforms' not in value:
            raise serializers.ValidationError("Pipeline must contain 'transforms' key")

        if not isinstance(value['transforms'], list):
            raise serializers.ValidationError("'transforms' must be a list")

        # Validate each transform has 'type' field
        for idx, transform in enumerate(value['transforms']):
            if not isinstance(transform, dict):
                raise serializers.ValidationError(f"Transform {idx} must be an object")
            if 'type' not in transform:
                raise serializers.ValidationError(f"Transform {idx} must have 'type' field")

        return value


class AugmentationJobReadSerializer(serializers.ModelSerializer):
    """Serializer for reading augmentation jobs"""

    owner = serializers.CharField(source='owner.username', allow_null=True, read_only=True)
    organization = serializers.IntegerField(source='organization.id', allow_null=True, read_only=True)
    task_name = serializers.CharField(source='task.name', read_only=True)
    config_name = serializers.CharField(source='config.name', allow_null=True, read_only=True)
    cloud_storage_name = serializers.CharField(source='cloud_storage.display_name', allow_null=True, read_only=True)

    # Computed fields
    is_running = serializers.BooleanField(read_only=True)
    is_finished = serializers.BooleanField(read_only=True)
    success_rate = serializers.FloatField(read_only=True)
    processing_time_seconds = serializers.IntegerField(allow_null=True, read_only=True)

    class Meta:
        model = AugmentationJob
        fields = [
            'id', 'name', 'description', 'task', 'task_name', 'config', 'config_name',
            'config_snapshot', 'dataset_name', 'version', 'augmentations_per_image',
            'cloud_storage', 'cloud_storage_name', 'drive_folder_id', 'status', 'progress',
            'owner', 'organization', 'created_date', 'updated_date', 'started_at', 'completed_at',
            'total_images', 'processed_images', 'generated_images', 'failed_images',
            'error_message', 'rq_job_id', 'is_running', 'is_finished', 'success_rate',
            'processing_time_seconds'
        ]
        read_only_fields = [
            'id', 'owner', 'organization', 'created_date', 'updated_date', 'started_at',
            'completed_at', 'status', 'progress', 'total_images', 'processed_images',
            'generated_images', 'failed_images', 'error_message', 'rq_job_id',
            'drive_folder_id', 'config_snapshot', 'is_running', 'is_finished',
            'success_rate', 'processing_time_seconds'
        ]


class AugmentationJobWriteSerializer(WriteOnceMixin, serializers.ModelSerializer):
    """Serializer for creating augmentation jobs"""

    # Write-only fields
    task_id = serializers.IntegerField(write_only=True)
    config_id = serializers.IntegerField(write_only=True, allow_null=True, required=False)
    cloud_storage_id = serializers.IntegerField(write_only=True)

    # Optional inline config (if not using config_id)
    inline_config = serializers.JSONField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = AugmentationJob
        fields = [
            'name', 'description', 'task_id', 'config_id', 'inline_config',
            'dataset_name', 'version', 'augmentations_per_image', 'cloud_storage_id'
        ]
        write_once_fields = ['task_id']

    def validate_task_id(self, value):
        """Validate that task exists"""
        try:
            Task.objects.get(pk=value)
        except Task.DoesNotExist:
            raise serializers.ValidationError(f"Task with id {value} does not exist")
        return value

    def validate_config_id(self, value):
        """Validate that config exists"""
        if value is None:
            return value
        try:
            AugmentationConfig.objects.get(pk=value)
        except AugmentationConfig.DoesNotExist:
            raise serializers.ValidationError(f"AugmentationConfig with id {value} does not exist")
        return value

    def validate_cloud_storage_id(self, value):
        """Validate that cloud storage exists and is Google Drive"""
        try:
            storage = CloudStorage.objects.get(pk=value)
            if storage.provider_type != 'GOOGLE_DRIVE':
                raise serializers.ValidationError("Cloud storage must be Google Drive type")
        except CloudStorage.DoesNotExist:
            raise serializers.ValidationError(f"CloudStorage with id {value} does not exist")
        return value

    def validate(self, attrs):
        """Validate that either config_id or inline_config is provided"""
        config_id = attrs.get('config_id')
        inline_config = attrs.get('inline_config')

        if not config_id and not inline_config:
            raise serializers.ValidationError(
                "Either 'config_id' or 'inline_config' must be provided"
            )

        if config_id and inline_config:
            raise serializers.ValidationError(
                "Cannot provide both 'config_id' and 'inline_config'"
            )

        # Validate inline_config format if provided
        if inline_config:
            serializer = AugmentationConfigWriteSerializer(data={'name': 'temp', 'pipeline': inline_config})
            if not serializer.is_valid():
                raise serializers.ValidationError({"inline_config": serializer.errors})

        # Validate augmentations_per_image
        if attrs.get('augmentations_per_image', 1) < 1:
            raise serializers.ValidationError(
                "'augmentations_per_image' must be at least 1"
            )
        if attrs.get('augmentations_per_image', 1) > 10:
            raise serializers.ValidationError(
                "'augmentations_per_image' cannot exceed 10"
            )

        return attrs


class AugmentationLogSerializer(serializers.ModelSerializer):
    """Serializer for augmentation logs"""

    class Meta:
        model = AugmentationLog
        fields = ['id', 'job', 'timestamp', 'log_level', 'message', 'metadata']
        read_only_fields = ['id', 'job', 'timestamp']
