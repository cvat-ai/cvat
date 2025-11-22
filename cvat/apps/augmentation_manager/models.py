# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from enum import Enum
from typing import TYPE_CHECKING, Optional

import django.db.models as models
from django.conf import settings
from django.contrib.auth.models import User

if TYPE_CHECKING:
    from cvat.apps.organizations.models import Organization


class JobStatus(str, Enum):
    """Status of an augmentation job"""
    PENDING = 'pending'
    PROCESSING = 'processing'
    COMPLETED = 'completed'
    FAILED = 'failed'
    CANCELLED = 'cancelled'

    @classmethod
    def choices(cls):
        return tuple((x.value, x.name) for x in cls)

    def __str__(self):
        return self.value


class LogLevel(str, Enum):
    """Log level for augmentation logs"""
    DEBUG = 'debug'
    INFO = 'info'
    WARNING = 'warning'
    ERROR = 'error'

    @classmethod
    def choices(cls):
        return tuple((x.value, x.name) for x in cls)

    def __str__(self):
        return self.value


class AugmentationConfig(models.Model):
    """
    Stores reusable augmentation pipeline configurations.

    An augmentation config defines a pipeline of image transformations using Albumentations.
    Configs can be saved as templates and reused across multiple augmentation jobs.
    """

    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=256, unique=True, help_text="Unique name for the configuration")
    description = models.TextField(blank=True, default="", help_text="Optional description")

    # Pipeline configuration (Albumentations format)
    pipeline = models.JSONField(help_text="Albumentations pipeline configuration as JSON")
    # Example format:
    # {
    #   "transforms": [
    #     {"type": "HorizontalFlip", "p": 0.5},
    #     {"type": "RandomBrightnessContrast", "brightness_limit": 0.2, "contrast_limit": 0.2, "p": 0.5},
    #     {"type": "Rotate", "limit": 45, "p": 0.3}
    #   ]
    # }

    # Ownership
    owner = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='augmentation_configs',
        help_text="User who created the configuration"
    )
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='augmentation_configs',
        help_text="Organization this configuration belongs to"
    )

    # Timestamps
    created_date = models.DateTimeField(auto_now_add=True)
    updated_date = models.DateTimeField(auto_now=True)

    # Usage tracking
    usage_count = models.PositiveIntegerField(default=0, help_text="Number of times this config was used")
    last_used_at = models.DateTimeField(null=True, blank=True, help_text="When this config was last used")

    # Template flag
    is_template = models.BooleanField(
        default=False,
        help_text="If True, available as a template for all users in organization"
    )

    class Meta:
        ordering = ['-updated_date']
        default_permissions = ()

    def __str__(self):
        return self.name

    @property
    def organization_id(self) -> Optional[int]:
        return self.organization.id if self.organization else None


class AugmentationJob(models.Model):
    """
    Tracks augmentation job execution.

    An augmentation job processes images from a CVAT task, applies transformations,
    and uploads the results to Google Drive.
    """

    # Identification
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=256, help_text="User-friendly job name")
    description = models.TextField(blank=True, default="", help_text="Optional description")

    # Source data
    task = models.ForeignKey(
        'engine.Task',
        on_delete=models.CASCADE,
        related_name='augmentation_jobs',
        help_text="Source task to augment"
    )

    # Configuration
    config = models.ForeignKey(
        AugmentationConfig,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='jobs',
        help_text="Augmentation pipeline configuration"
    )
    config_snapshot = models.JSONField(
        blank=True,
        default=dict,
        help_text="Snapshot of the config at job creation time"
    )

    # Output settings
    dataset_name = models.CharField(
        max_length=256,
        help_text="Name for the augmented dataset (Drive folder)"
    )
    version = models.CharField(
        max_length=64,
        help_text="Version identifier (e.g., 'v1', 'v2', 'exp-20231122')"
    )
    augmentations_per_image = models.PositiveIntegerField(
        default=1,
        help_text="Number of augmented copies to generate per image"
    )

    # Storage
    cloud_storage = models.ForeignKey(
        'engine.CloudStorage',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='augmentation_jobs',
        help_text="Google Drive cloud storage"
    )
    drive_folder_id = models.CharField(
        max_length=256,
        blank=True,
        default="",
        help_text="Google Drive folder ID where dataset is stored"
    )

    # Status tracking
    status = models.CharField(
        max_length=32,
        choices=JobStatus.choices(),
        default=JobStatus.PENDING,
        db_index=True,
        help_text="Current job status"
    )
    progress = models.FloatField(
        default=0.0,
        help_text="Progress percentage (0-100)"
    )

    # Ownership
    owner = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='augmentation_jobs',
        help_text="User who created the job"
    )
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='augmentation_jobs',
        help_text="Organization this job belongs to"
    )

    # Timestamps
    created_date = models.DateTimeField(auto_now_add=True)
    updated_date = models.DateTimeField(auto_now=True)
    started_at = models.DateTimeField(null=True, blank=True, help_text="When the job started processing")
    completed_at = models.DateTimeField(null=True, blank=True, help_text="When the job completed")

    # Results
    total_images = models.PositiveIntegerField(default=0, help_text="Total number of source images")
    processed_images = models.PositiveIntegerField(default=0, help_text="Number of source images processed")
    generated_images = models.PositiveIntegerField(default=0, help_text="Number of augmented images generated")
    failed_images = models.PositiveIntegerField(default=0, help_text="Number of images that failed to augment")
    error_message = models.TextField(blank=True, default="", help_text="Error message if job failed")

    # RQ job tracking
    rq_job_id = models.CharField(max_length=64, blank=True, default="", help_text="Redis Queue job ID")

    class Meta:
        ordering = ['-created_date']
        default_permissions = ()

    def __str__(self):
        return f"{self.name} ({self.status})"

    @property
    def organization_id(self) -> Optional[int]:
        return self.organization.id if self.organization else None

    @property
    def is_running(self) -> bool:
        """Check if job is currently running"""
        return self.status in [JobStatus.PENDING, JobStatus.PROCESSING]

    @property
    def is_finished(self) -> bool:
        """Check if job has finished (success or failure)"""
        return self.status in [JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED]

    @property
    def success_rate(self) -> float:
        """Calculate success rate as percentage"""
        if self.processed_images == 0:
            return 0.0
        return ((self.processed_images - self.failed_images) / self.processed_images) * 100

    @property
    def processing_time_seconds(self) -> Optional[int]:
        """Calculate processing time in seconds"""
        if self.started_at and self.completed_at:
            return int((self.completed_at - self.started_at).total_seconds())
        return None


class AugmentationLog(models.Model):
    """
    Logs for augmentation job execution.

    Stores log messages generated during job processing for debugging and monitoring.
    """

    id = models.AutoField(primary_key=True)
    job = models.ForeignKey(
        AugmentationJob,
        on_delete=models.CASCADE,
        related_name='logs',
        help_text="Augmentation job this log belongs to"
    )
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    log_level = models.CharField(
        max_length=32,
        choices=LogLevel.choices(),
        default=LogLevel.INFO,
        db_index=True
    )
    message = models.TextField(help_text="Log message")
    metadata = models.JSONField(
        blank=True,
        default=dict,
        help_text="Additional metadata (e.g., image_id, error_details)"
    )

    class Meta:
        ordering = ['-timestamp']
        default_permissions = ()

    def __str__(self):
        return f"[{self.log_level}] {self.timestamp}: {self.message[:50]}"
