# Copyright (C) 2025 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.db import models
from django.contrib.auth.models import User
from cvat.apps.engine.models import CloudStorage
from cvat.apps.lambda_manager.models import FunctionKind


class FrameworkChoice(models.TextChoices):
    PYTORCH = "pytorch", "PyTorch"
    TENSORFLOW = "tensorflow", "TensorFlow"
    ONNX = "onnx", "ONNX Runtime"


class EngineStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    DOWNLOADING = "downloading", "Downloading Model"
    BUILDING = "building", "Building Container"
    DEPLOYING = "deploying", "Deploying to Nuclio"
    READY = "ready", "Ready"
    FAILED = "failed", "Failed"
    STOPPED = "stopped", "Stopped"


class InferenceEngine(models.Model):
    """
    Represents a deployed inference model that can be used for automated annotation.
    Models are downloaded from cloud storage and deployed as Nuclio serverless functions.
    """
    # Basic info
    name = models.CharField(max_length=255, unique=True, db_index=True)
    description = models.TextField(blank=True)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='inference_engines')

    # Source configuration
    cloud_storage = models.ForeignKey(
        CloudStorage,
        on_delete=models.CASCADE,
        help_text="Cloud storage containing the model files"
    )
    model_path = models.CharField(
        max_length=512,
        help_text="Path to model_metadata.yaml in cloud storage"
    )

    # Model metadata
    framework = models.CharField(
        max_length=32,
        choices=FrameworkChoice.choices,
        help_text="ML framework used by the model"
    )
    kind = models.CharField(
        max_length=32,
        choices=FunctionKind.choices,
        help_text="Type of annotation function (detector, interactor, etc.)"
    )
    version = models.CharField(max_length=64, default="1.0.0")
    classes = models.JSONField(
        default=list,
        help_text="List of class names the model can detect"
    )

    # Deployment configuration
    status = models.CharField(
        max_length=32,
        choices=EngineStatus.choices,
        default=EngineStatus.PENDING,
        db_index=True
    )
    endpoint = models.URLField(null=True, blank=True, help_text="URL to invoke the deployed function")
    nuclio_function_name = models.CharField(max_length=255, null=True, blank=True)
    deployment_error = models.TextField(blank=True, help_text="Error message if deployment failed")

    # Resource allocation
    cpu_limit = models.CharField(max_length=16, default='1000m', help_text="CPU limit (e.g., '1000m', '2')")
    memory_limit = models.CharField(max_length=16, default='2Gi', help_text="Memory limit (e.g., '2Gi', '512Mi')")
    gpu_enabled = models.BooleanField(default=False, help_text="Whether to use GPU for inference")

    # Metadata
    created_date = models.DateTimeField(auto_now_add=True)
    updated_date = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_date']

    def __str__(self):
        return f"{self.name} ({self.framework}/{self.kind})"


class InferenceResult(models.Model):
    """
    Stores the result of an inference run for auditing and debugging.
    """
    engine = models.ForeignKey(InferenceEngine, on_delete=models.CASCADE, related_name='results')
    task_id = models.IntegerField(db_index=True)
    frame_number = models.IntegerField()

    # Request data
    requested_at = models.DateTimeField(auto_now_add=True)
    requested_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    # Response data
    shapes = models.JSONField(help_text="Detected shapes/annotations")
    confidence_scores = models.JSONField(default=list)
    inference_time_ms = models.IntegerField(help_text="Inference duration in milliseconds")

    success = models.BooleanField(default=True)
    error_message = models.TextField(blank=True)

    class Meta:
        ordering = ['-requested_at']
        indexes = [
            models.Index(fields=['task_id', 'frame_number']),
            models.Index(fields=['engine', 'requested_at']),
        ]
