# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from enum import Enum

import django.db.models as models
from django.conf import settings
from django.contrib.auth.models import User


class ServiceStatus(str, Enum):
    """Status of inference service container"""
    CREATING = 'CREATING'
    STARTING = 'STARTING'
    RUNNING = 'RUNNING'
    STOPPING = 'STOPPING'
    STOPPED = 'STOPPED'
    FAILED = 'FAILED'
    DELETED = 'DELETED'

    @classmethod
    def choices(cls):
        return [(item.value, item.value) for item in cls]


class HealthStatus(str, Enum):
    """Health status of inference service"""
    HEALTHY = 'HEALTHY'
    UNHEALTHY = 'UNHEALTHY'
    UNKNOWN = 'UNKNOWN'

    @classmethod
    def choices(cls):
        return [(item.value, item.value) for item in cls]


class LogLevel(str, Enum):
    """Log level for inference service logs"""
    DEBUG = 'DEBUG'
    INFO = 'INFO'
    WARNING = 'WARNING'
    ERROR = 'ERROR'
    CRITICAL = 'CRITICAL'

    @classmethod
    def choices(cls):
        return [(item.value, item.value) for item in cls]


class InferenceService(models.Model):
    """
    Dynamically created inference service for model predictions.

    Each service represents a Docker container running an inference server
    for a specific model from the Model Registry.
    """
    # Service identification
    name = models.CharField(
        max_length=256,
        help_text="User-friendly name for the service"
    )
    description = models.TextField(
        blank=True,
        default='',
        help_text="Optional description of the service"
    )

    # Model reference
    model = models.ForeignKey(
        'engine.ModelRegistry',
        on_delete=models.CASCADE,
        related_name='inference_services',
        help_text="Model from Model Registry to use for inference"
    )

    # Service configuration
    port = models.IntegerField(
        help_text="Port number allocated to this service"
    )
    api_config = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional API configuration (e.g., batch size, timeout)"
    )

    # Container information
    container_id = models.CharField(
        max_length=128,
        blank=True,
        default='',
        db_index=True,
        help_text="Docker container ID"
    )
    container_name = models.CharField(
        max_length=256,
        blank=True,
        default='',
        help_text="Docker container name"
    )
    container_status = models.CharField(
        max_length=32,
        choices=ServiceStatus.choices(),
        default=ServiceStatus.CREATING,
        db_index=True,
        help_text="Current status of the container"
    )

    # Lifecycle timestamps
    owner = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='inference_services',
        help_text="User who created the service"
    )
    organization = models.ForeignKey(
        'organizations.Organization',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='inference_services',
        help_text="Organization this service belongs to"
    )
    created_date = models.DateTimeField(auto_now_add=True)
    updated_date = models.DateTimeField(auto_now=True)
    started_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the service was last started"
    )
    stopped_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the service was stopped"
    )

    # Health monitoring
    health_status = models.CharField(
        max_length=32,
        choices=HealthStatus.choices(),
        default=HealthStatus.UNKNOWN,
        help_text="Health status of the service"
    )
    last_health_check = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp of last health check"
    )
    error_message = models.TextField(
        blank=True,
        default='',
        help_text="Error message if service failed"
    )

    # Usage tracking
    request_count = models.IntegerField(
        default=0,
        help_text="Total number of prediction requests made to this service"
    )
    last_request_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp of last prediction request"
    )

    class Meta:
        indexes = [
            models.Index(fields=['owner', 'created_date']),
            models.Index(fields=['organization', 'created_date']),
            models.Index(fields=['container_status']),
            models.Index(fields=['-updated_date']),
        ]
        ordering = ['-created_date']

    def __str__(self):
        return f"{self.name} ({self.model.name})"

    @property
    def organization_id(self):
        return self.organization.id if self.organization else None

    @property
    def service_url(self):
        """Return the URL to access this service"""
        if self.container_status == ServiceStatus.RUNNING:
            # In production, this would be the external URL
            # For development, use localhost
            host = getattr(settings, 'INFERENCE_SERVICE_HOST', 'localhost')
            return f"http://{host}:{self.port}"
        return None

    @property
    def is_running(self):
        """Check if service is currently running"""
        return self.container_status == ServiceStatus.RUNNING

    @property
    def is_healthy(self):
        """Check if service is healthy"""
        return (
            self.is_running and
            self.health_status == HealthStatus.HEALTHY
        )


class InferenceServiceLog(models.Model):
    """
    Logs for inference services.

    Captures important events and errors from inference service containers.
    """
    service = models.ForeignKey(
        InferenceService,
        on_delete=models.CASCADE,
        related_name='logs',
        help_text="Inference service this log belongs to"
    )
    timestamp = models.DateTimeField(
        auto_now_add=True,
        db_index=True
    )
    log_level = models.CharField(
        max_length=32,
        choices=LogLevel.choices(),
        default=LogLevel.INFO,
        db_index=True
    )
    message = models.TextField(
        help_text="Log message"
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional metadata (e.g., request_id, duration)"
    )

    class Meta:
        indexes = [
            models.Index(fields=['service', '-timestamp']),
            models.Index(fields=['log_level', '-timestamp']),
        ]
        ordering = ['-timestamp']

    def __str__(self):
        return f"[{self.log_level}] {self.service.name}: {self.message[:50]}"


class InferencePrediction(models.Model):
    """
    Tracks predictions made by inference services.

    Stores metadata about prediction requests for analytics and debugging.
    """
    service = models.ForeignKey(
        InferenceService,
        on_delete=models.CASCADE,
        related_name='predictions',
        help_text="Inference service that made the prediction"
    )
    user = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        help_text="User who requested the prediction"
    )
    job = models.ForeignKey(
        'engine.Job',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='inference_predictions',
        help_text="Job where prediction was used (if applicable)"
    )

    # Request details
    frame_number = models.IntegerField(
        null=True,
        blank=True,
        help_text="Frame number that was predicted"
    )
    request_timestamp = models.DateTimeField(
        auto_now_add=True,
        db_index=True
    )

    # Response details
    prediction_count = models.IntegerField(
        default=0,
        help_text="Number of shapes/objects predicted"
    )
    response_time_ms = models.IntegerField(
        help_text="Response time in milliseconds"
    )
    success = models.BooleanField(
        default=True,
        help_text="Whether the prediction was successful"
    )
    error_message = models.TextField(
        blank=True,
        default='',
        help_text="Error message if prediction failed"
    )

    class Meta:
        indexes = [
            models.Index(fields=['service', '-request_timestamp']),
            models.Index(fields=['user', '-request_timestamp']),
            models.Index(fields=['-request_timestamp']),
        ]
        ordering = ['-request_timestamp']

    def __str__(self):
        status = "SUCCESS" if self.success else "FAILED"
        return f"{self.service.name} prediction [{status}] - {self.prediction_count} shapes"
