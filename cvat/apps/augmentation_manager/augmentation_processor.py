# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import io
import json
from pathlib import Path
from typing import Any, Dict, List, Optional

import albumentations as A
import cv2
import django_rq
import numpy as np
from django.utils import timezone
from PIL import Image
from rq import get_current_job

from cvat.apps.engine.log import ServerLogManager
from cvat.apps.engine.models import Image as CVATImage
from .drive_uploader import DriveUploader
from .models import AugmentationJob, AugmentationLog, JobStatus, LogLevel

slogger = ServerLogManager(__name__)


class AugmentationProcessor:
    """
    Processes augmentation jobs using Albumentations.

    Loads images from CVAT task, applies transformations, and uploads results to Google Drive.
    """

    def __init__(self, job: AugmentationJob):
        self.job = job
        self.pipeline = self._build_pipeline(job.config_snapshot)
        self.drive_uploader = DriveUploader(job.cloud_storage)

    def _build_pipeline(self, config: Dict[str, Any]) -> A.Compose:
        """Build Albumentations pipeline from JSON config"""
        transforms = []

        for transform_config in config.get('transforms', []):
            # Make a copy to avoid modifying original
            transform_config = transform_config.copy()
            transform_type = transform_config.pop('type')

            # Get transform class from Albumentations
            try:
                transform_class = getattr(A, transform_type)
                transforms.append(transform_class(**transform_config))
            except AttributeError:
                self._log(LogLevel.WARNING, f"Unknown transform type: {transform_type}, skipping")
                continue
            except Exception as e:
                self._log(LogLevel.WARNING, f"Failed to create transform {transform_type}: {e}, skipping")
                continue

        # Create compose with bbox support
        return A.Compose(
            transforms,
            bbox_params=A.BboxParams(
                format='pascal_voc',
                label_fields=['class_labels'],
                min_visibility=0.3
            )
        )

    def process(self):
        """Main processing loop"""
        try:
            self.job.status = JobStatus.PROCESSING
            self.job.started_at = timezone.now()
            self.job.save(update_fields=['status', 'started_at', 'updated_date'])

            self._log(LogLevel.INFO, "Starting augmentation job")

            # Get task images
            task = self.job.task
            images = list(CVATImage.objects.filter(data__tasks=task).order_by('frame'))

            if not images:
                raise Exception(f"No images found for task {task.id}")

            self.job.total_images = len(images)
            self.job.save(update_fields=['total_images'])

            self._log(LogLevel.INFO, f"Found {len(images)} images to augment")

            # Create Drive folder structure
            self._log(LogLevel.INFO, "Creating Google Drive folder structure")
            folder_id = self.drive_uploader.create_dataset_folder(
                self.job.dataset_name,
                self.job.version
            )
            self.job.drive_folder_id = folder_id
            self.job.save(update_fields=['drive_folder_id'])

            self._log(LogLevel.INFO, f"Created Drive folder with ID: {folder_id}")

            # Process each image
            generated_count = 0
            failed_count = 0

            for idx, image in enumerate(images):
                try:
                    # Generate augmented copies
                    for aug_idx in range(self.job.augmentations_per_image):
                        augmented = self._augment_image(image, aug_idx)

                        # Upload to Drive
                        self.drive_uploader.upload_image(
                            augmented['image_bytes'],
                            augmented['filename'],
                            folder_id
                        )

                        generated_count += 1

                    # Update progress
                    self.job.processed_images = idx + 1
                    self.job.generated_images = generated_count
                    self.job.progress = ((idx + 1) / self.job.total_images) * 100
                    self.job.save(update_fields=['processed_images', 'generated_images', 'progress', 'updated_date'])

                    # Log progress every 10% or every 100 images
                    if (idx + 1) % max(1, len(images) // 10) == 0 or (idx + 1) % 100 == 0:
                        self._log(
                            LogLevel.INFO,
                            f"Progress: {idx + 1}/{len(images)} images processed, {generated_count} augmented images generated"
                        )

                except Exception as e:
                    failed_count += 1
                    self._log(
                        LogLevel.ERROR,
                        f"Failed to augment image {image.path}: {e}",
                        metadata={'image_id': image.id, 'frame': image.frame}
                    )

            # Upload metadata
            metadata = self._generate_metadata(generated_count, failed_count)
            self.drive_uploader.upload_metadata(metadata, folder_id)

            # Complete job
            self.job.status = JobStatus.COMPLETED
            self.job.completed_at = timezone.now()
            self.job.failed_images = failed_count
            self.job.save(update_fields=['status', 'completed_at', 'failed_images', 'updated_date'])

            self._log(
                LogLevel.INFO,
                f"Job completed successfully: {generated_count} images generated, {failed_count} failed"
            )

        except Exception as e:
            self.job.status = JobStatus.FAILED
            self.job.error_message = str(e)
            self.job.completed_at = timezone.now()
            self.job.save(update_fields=['status', 'error_message', 'completed_at', 'updated_date'])
            self._log(LogLevel.ERROR, f"Job failed with error: {e}")
            raise

    def _augment_image(self, image: CVATImage, aug_idx: int) -> Dict[str, Any]:
        """Apply augmentation to a single image"""

        # Load image
        image_path = image.path
        if not Path(image_path).exists():
            raise FileNotFoundError(f"Image file not found: {image_path}")

        img = cv2.imread(str(image_path))
        if img is None:
            raise ValueError(f"Failed to load image: {image_path}")

        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        # For now, we don't transform annotations (bboxes)
        # TODO: Fetch annotations from CVAT API and transform them
        bboxes = []
        class_labels = []

        # Apply augmentation
        try:
            augmented = self.pipeline(
                image=img,
                bboxes=bboxes,
                class_labels=class_labels
            )
        except Exception as e:
            raise Exception(f"Augmentation failed: {e}")

        # Convert to PIL Image
        pil_img = Image.fromarray(augmented['image'])

        # Generate filename
        original_name = Path(image.path).stem
        extension = Path(image.path).suffix or '.jpg'
        filename = f"{original_name}_aug{aug_idx}{extension}"

        # Convert to bytes
        buffer = io.BytesIO()
        # Save as JPEG or PNG depending on extension
        if extension.lower() in ['.jpg', '.jpeg']:
            pil_img.save(buffer, format='JPEG', quality=95)
        elif extension.lower() == '.png':
            pil_img.save(buffer, format='PNG')
        else:
            pil_img.save(buffer, format='JPEG', quality=95)

        image_bytes = buffer.getvalue()

        return {
            'image_bytes': image_bytes,
            'filename': filename,
            'bboxes': augmented.get('bboxes', []),
            'class_labels': augmented.get('class_labels', [])
        }

    def _generate_metadata(self, generated_count: int, failed_count: int) -> Dict[str, Any]:
        """Generate metadata for the augmented dataset"""
        processing_time = self.job.processing_time_seconds or 0

        return {
            'dataset_name': self.job.dataset_name,
            'version': self.job.version,
            'source_task_id': self.job.task_id,
            'source_task_name': self.job.task.name,
            'augmentation_config': {
                'config_id': self.job.config_id if self.job.config else None,
                'config_name': self.job.config.name if self.job.config else 'inline',
                'pipeline': self.job.config_snapshot
            },
            'augmentations_per_image': self.job.augmentations_per_image,
            'created_by': self.job.owner.username if self.job.owner else None,
            'organization': self.job.organization.slug if self.job.organization else None,
            'created_date': self.job.created_date.isoformat(),
            'processing_time_seconds': processing_time,
            'statistics': {
                'total_source_images': self.job.total_images,
                'generated_images': generated_count,
                'failed_images': failed_count,
                'success_rate': self.job.success_rate
            }
        }

    def _log(self, level: LogLevel, message: str, metadata: Optional[Dict[str, Any]] = None):
        """Add log entry"""
        AugmentationLog.objects.create(
            job=self.job,
            log_level=level,
            message=message,
            metadata=metadata or {}
        )
        # Also log to server logger
        log_level_str = level.value.upper()
        slogger.glob.log(
            getattr(slogger.glob, log_level_str.lower(), slogger.glob.info),
            f"[AugJob {self.job.id}] {message}"
        )


@django_rq.job('augmentation', timeout=3600)
def run_augmentation_job(job_id: int):
    """
    RQ job for running augmentation.

    This function is enqueued to the 'augmentation' queue and runs in a background worker.
    """
    try:
        job = AugmentationJob.objects.get(pk=job_id)
        processor = AugmentationProcessor(job)
        processor.process()
    except AugmentationJob.DoesNotExist:
        slogger.glob.error(f"AugmentationJob with id {job_id} does not exist")
        raise
    except Exception as e:
        slogger.glob.error(f"Failed to process augmentation job {job_id}: {e}")
        raise
