# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework import serializers

from cvat.apps.engine.models import ModelRegistry
from cvat.apps.engine.serializers import WriteOnceMixin
from cvat.apps.inference_manager.models import (
    InferencePrediction,
    InferenceService,
    InferenceServiceLog,
)


class InferenceServiceReadSerializer(serializers.ModelSerializer):
    """Read serializer for InferenceService with computed fields"""
    owner = serializers.CharField(source='owner.username', allow_null=True, read_only=True)
    organization = serializers.IntegerField(source='organization.id', allow_null=True, read_only=True)
    model_name = serializers.CharField(source='model.name', read_only=True)
    model_display_name = serializers.CharField(source='model.display_name', read_only=True)
    model_framework = serializers.CharField(source='model.framework', read_only=True)
    service_url = serializers.CharField(read_only=True)
    is_running = serializers.BooleanField(read_only=True)
    is_healthy = serializers.BooleanField(read_only=True)

    class Meta:
        model = InferenceService
        fields = '__all__'
        read_only_fields = (
            'id',
            'container_id',
            'container_name',
            'container_status',
            'port',
            'health_status',
            'last_health_check',
            'error_message',
            'request_count',
            'last_request_at',
            'created_date',
            'updated_date',
            'started_at',
            'stopped_at',
        )


class InferenceServiceWriteSerializer(WriteOnceMixin, serializers.ModelSerializer):
    """Write serializer for creating/updating InferenceService"""
    owner_id = serializers.IntegerField(required=False, allow_null=True)
    organization_id = serializers.IntegerField(required=False, allow_null=True)
    model_id = serializers.IntegerField(write_only=True)

    # Additional configuration fields
    cloud_storage_id = serializers.IntegerField(
        write_only=True,
        required=False,
        help_text="Cloud storage ID to download model from (if not already cached)"
    )

    class Meta:
        model = InferenceService
        fields = (
            'id',
            'name',
            'description',
            'model_id',
            'api_config',
            'owner_id',
            'organization_id',
            'cloud_storage_id',
        )
        write_once_fields = ('model_id',)

    def validate_name(self, value):
        """Validate service name is unique for this user"""
        user = self.context['request'].user
        queryset = InferenceService.objects.filter(
            owner=user,
            name=value
        )

        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)

        if queryset.exists():
            raise serializers.ValidationError(
                f"An inference service with name '{value}' already exists."
            )

        return value

    def validate_model_id(self, value):
        """Validate model exists and user has access"""
        try:
            model = ModelRegistry.objects.get(pk=value)
        except ModelRegistry.DoesNotExist:
            raise serializers.ValidationError(f"Model {value} not found.")

        # Permission check will be handled by ViewSet
        return value

    def validate_api_config(self, value):
        """Validate API configuration"""
        if not isinstance(value, dict):
            raise serializers.ValidationError("api_config must be a dictionary")

        # Validate resource limits if provided
        if 'memory_limit' in value:
            mem_limit = value['memory_limit']
            # Must be string like '2g', '512m'
            if not isinstance(mem_limit, str) or not any(
                mem_limit.endswith(suffix) for suffix in ['k', 'K', 'm', 'M', 'g', 'G']
            ):
                raise serializers.ValidationError(
                    "memory_limit must be a string like '512m' or '4g'"
                )

        if 'cpu_limit' in value:
            cpu_limit = value['cpu_limit']
            if not isinstance(cpu_limit, (int, float)) or cpu_limit <= 0 or cpu_limit > 16:
                raise serializers.ValidationError(
                    "cpu_limit must be a number between 0 and 16"
                )

        return value


class InferenceServiceLogSerializer(serializers.ModelSerializer):
    """Serializer for InferenceServiceLog"""
    service_name = serializers.CharField(source='service.name', read_only=True)

    class Meta:
        model = InferenceServiceLog
        fields = '__all__'
        read_only_fields = ('id', 'timestamp')


class InferencePredictionSerializer(serializers.ModelSerializer):
    """Serializer for InferencePrediction"""
    service_name = serializers.CharField(source='service.name', read_only=True)
    user_name = serializers.CharField(source='user.username', allow_null=True, read_only=True)
    job_id = serializers.IntegerField(source='job.id', allow_null=True, read_only=True)

    class Meta:
        model = InferencePrediction
        fields = '__all__'
        read_only_fields = ('id', 'request_timestamp')


class PredictionRequestSerializer(serializers.Serializer):
    """Serializer for prediction request"""
    image = serializers.ImageField(
        required=True,
        help_text="Image file to run prediction on"
    )
    confidence_threshold = serializers.FloatField(
        default=0.5,
        min_value=0.0,
        max_value=1.0,
        help_text="Minimum confidence score for predictions"
    )
    job_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="Job ID if prediction is for a specific job"
    )
    frame_number = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="Frame number if applicable"
    )


class PredictionResponseSerializer(serializers.Serializer):
    """Serializer for prediction response"""
    shapes = serializers.ListField(
        child=serializers.DictField(),
        help_text="Predicted shapes in CVAT format"
    )
    prediction_count = serializers.IntegerField(
        help_text="Number of predictions returned"
    )
    response_time_ms = serializers.IntegerField(
        help_text="Response time in milliseconds"
    )
    service_url = serializers.URLField(
        help_text="URL of the inference service"
    )


class ServiceHealthSerializer(serializers.Serializer):
    """Serializer for service health response"""
    status = serializers.ChoiceField(
        choices=['healthy', 'unhealthy', 'unknown']
    )
    service_url = serializers.URLField(required=False)
    container_status = serializers.CharField(required=False)
    reason = serializers.CharField(required=False)
    model_loaded = serializers.BooleanField(required=False)
    metadata = serializers.DictField(required=False)


class BatchPredictionRequestSerializer(serializers.Serializer):
    """Serializer for batch prediction request"""
    job_id = serializers.IntegerField(
        required=True,
        help_text="Job ID to run predictions on"
    )
    frame_range = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_null=True,
        help_text="List of frame numbers [start, end] or null for all frames"
    )
    confidence_threshold = serializers.FloatField(
        default=0.5,
        min_value=0.0,
        max_value=1.0,
        help_text="Minimum confidence score for predictions"
    )
    overwrite_existing = serializers.BooleanField(
        default=False,
        help_text="Whether to overwrite existing annotations"
    )
    label_mapping = serializers.DictField(
        required=False,
        allow_null=True,
        child=serializers.IntegerField(),
        help_text="Map model label IDs to CVAT label IDs"
    )

    def validate_frame_range(self, value):
        """Validate frame range"""
        if value is not None:
            if len(value) != 2:
                raise serializers.ValidationError(
                    "frame_range must be [start, end] or null"
                )
            if value[0] > value[1]:
                raise serializers.ValidationError(
                    "Start frame must be <= end frame"
                )
        return value
