# Google Drive Model Registry Integration - Design Document

**Version**: 1.0
**Date**: 2025-11-21
**Status**: Design Phase
**Author**: AI Assistant

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Motivation & Goals](#motivation--goals)
3. [Architecture Overview](#architecture-overview)
4. [Data Models & Schema](#data-models--schema)
5. [Google Drive Structure](#google-drive-structure)
6. [Backend Implementation](#backend-implementation)
7. [API Specification](#api-specification)
8. [Frontend Implementation](#frontend-implementation)
9. [Authentication & Security](#authentication--security)
10. [Caching Strategy](#caching-strategy)
11. [Error Handling & Resilience](#error-handling--resilience)
12. [Implementation Phases](#implementation-phases)
13. [Testing Strategy](#testing-strategy)
14. [Performance Considerations](#performance-considerations)
15. [Future Enhancements](#future-enhancements)

---

## Executive Summary

This document outlines the design for integrating Google Drive as a **Model Registry** in CVAT, enabling users to store, discover, and manage machine learning models for auto-annotation tasks. The solution provides a centralized model repository accessible through the CVAT UI, with full CRUD operations, metadata management, and seamless integration with CVAT's existing serverless function infrastructure.

**Key Features**:
- Centralized model storage in Google Drive (`/CVAT_Models/` directory)
- Dynamic model discovery and filtering in CVAT UI
- Metadata-driven model management (model.json)
- Integration with existing lambda_manager for inference
- Caching layer for performance optimization
- Multi-organization support with access control

---

## Motivation & Goals

### Current State

CVAT currently supports serverless ML functions (auto-annotation models) through:
- **Nuclio** serverless platform integration (`lambda_manager` app)
- Pre-deployed models (Segment Anything, YOLO, etc.)
- Static function discovery from Nuclio gateway
- Limited model management capabilities

**Limitations**:
- Models must be pre-deployed to Nuclio infrastructure
- No centralized model versioning or artifact storage
- Limited metadata and discoverability
- No user-friendly model upload/management interface
- Difficult to share custom models across organizations

### Goals

1. **Centralized Model Registry**: Single source of truth for all ML models in Google Drive
2. **Dynamic Discovery**: Automatically discover and list available models without redeployment
3. **Metadata Management**: Rich metadata (framework, version, input/output specs, tags)
4. **User-Friendly UI**: Browse, search, filter, upload, and manage models through CVAT interface
5. **Seamless Integration**: Work with existing serverless function infrastructure
6. **Performance**: Fast model discovery through intelligent caching
7. **Multi-tenancy**: Organization-level model access control
8. **Extensibility**: Support multiple model formats (ONNX, PyTorch, TensorFlow, etc.)

### Non-Goals (Out of Scope for v1)

- Model training within CVAT
- Automated model format conversion
- Model performance benchmarking
- Distributed model serving infrastructure
- Real-time model validation/testing
- Integration with other cloud storage providers (S3, Azure) for model registry

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CVAT Frontend                            │
│                                                                  │
│  ┌──────────────────┐    ┌─────────────────┐   ┌─────────────┐│
│  │  Models Page     │───▶│  Model Browser  │──▶│ Model Card  ││
│  │  (Navigation)    │    │  (List/Grid)    │   │ (Details)   ││
│  └──────────────────┘    └─────────────────┘   └─────────────┘│
│           │                      │                      │        │
│           └──────────────────────┴──────────────────────┘        │
│                                  │                                │
└──────────────────────────────────┼────────────────────────────────┘
                                   │ REST API
                    ┌──────────────▼──────────────┐
                    │     CVAT Backend (Django)    │
                    │                              │
                    │  ┌─────────────────────────┐ │
                    │  │  model_registry app     │ │
                    │  │  - Models               │ │
                    │  │  - Serializers          │ │
                    │  │  - ViewSets             │ │
                    │  │  - Permissions (OPA)    │ │
                    │  └────────┬────────────────┘ │
                    │           │                   │
                    │  ┌────────▼────────────────┐ │
                    │  │  Google Drive Service   │ │
                    │  │  - Authentication       │ │
                    │  │  - File Operations      │ │
                    │  │  - Metadata Parser      │ │
                    │  └────────┬────────────────┘ │
                    │           │                   │
                    │  ┌────────▼────────────────┐ │
                    │  │  Cache Manager          │ │
                    │  │  - Redis/Kvrocks        │ │
                    │  │  - Invalidation Logic   │ │
                    │  └─────────────────────────┘ │
                    └───────────┬──────────────────┘
                                │
                    ┌───────────▼──────────────┐
                    │     Google Drive API      │
                    │                           │
                    │  /CVAT_Models/            │
                    │  ├── model_name_1/        │
                    │  │   ├── model.onnx       │
                    │  │   ├── model.json       │
                    │  │   └── samples/         │
                    │  ├── model_name_2/        │
                    │  │   ├── model.pt         │
                    │  │   └── model.json       │
                    │  └── ...                  │
                    └───────────────────────────┘
```

### Component Interactions

1. **User Request Flow**:
   - User navigates to "Models" page in CVAT UI
   - Frontend requests model list from API: `GET /api/model-registry/models`
   - Backend checks cache for model list
   - If cache miss, queries Google Drive API
   - Returns paginated model list with metadata
   - Frontend displays models in searchable/filterable grid

2. **Model Upload Flow**:
   - User uploads model file + metadata through UI
   - Frontend sends multipart request: `POST /api/model-registry/models`
   - Backend validates metadata and file
   - Creates folder in Google Drive (`/CVAT_Models/{model_name}/`)
   - Uploads model file and `model.json`
   - Invalidates cache
   - Returns model details

3. **Model Inference Flow**:
   - User selects model for auto-annotation
   - Frontend calls existing lambda function API with model reference
   - Lambda function downloads model from Google Drive (if not cached locally)
   - Executes inference
   - Returns annotations

---

## Data Models & Schema

### Django Models

#### ModelRegistry (Primary Model)

```python
# cvat/apps/model_registry/models.py

from django.db import models
from django.contrib.auth.models import User
from cvat.apps.organizations.models import Organization
from cvat.apps.engine.models import TimestampedModel


class ModelFramework(models.TextChoices):
    ONNX = "onnx", "ONNX"
    PYTORCH = "pytorch", "PyTorch"
    TENSORFLOW = "tensorflow", "TensorFlow"
    KERAS = "keras", "Keras"
    OPENVINO = "openvino", "OpenVINO"
    TENSORRT = "tensorrt", "TensorRT"
    OTHER = "other", "Other"


class ModelType(models.TextChoices):
    DETECTOR = "detector", "Object Detector"
    SEGMENTATION = "segmentation", "Segmentation"
    CLASSIFICATION = "classification", "Classification"
    KEYPOINT = "keypoint", "Keypoint Detection"
    TRACKER = "tracker", "Object Tracker"
    REID = "reid", "Re-Identification"
    INTERACTOR = "interactor", "Interactive Segmentation"
    OTHER = "other", "Other"


class ModelRegistry(TimestampedModel):
    """
    Represents a machine learning model stored in Google Drive.
    Mirrors the structure in /CVAT_Models/{model_name}/ on Google Drive.
    """
    # Identifiers
    name = models.CharField(
        max_length=256,
        unique=True,
        help_text="Unique model name (matches folder name in Google Drive)"
    )
    display_name = models.CharField(
        max_length=256,
        help_text="Human-readable model name"
    )
    version = models.CharField(
        max_length=64,
        default="1.0.0",
        help_text="Model version (semver recommended)"
    )

    # Google Drive Integration
    drive_folder_id = models.CharField(
        max_length=128,
        unique=True,
        help_text="Google Drive folder ID containing the model"
    )
    drive_file_id = models.CharField(
        max_length=128,
        help_text="Google Drive file ID for the main model file"
    )

    # Model Metadata
    framework = models.CharField(
        max_length=32,
        choices=ModelFramework.choices,
        help_text="ML framework used to create the model"
    )
    model_type = models.CharField(
        max_length=32,
        choices=ModelType.choices,
        help_text="Type of model/task"
    )
    description = models.TextField(
        blank=True,
        help_text="Detailed model description"
    )

    # File Information
    file_name = models.CharField(
        max_length=256,
        help_text="Model file name (e.g., model.onnx)"
    )
    file_size = models.BigIntegerField(
        help_text="File size in bytes"
    )
    file_hash = models.CharField(
        max_length=64,
        blank=True,
        help_text="SHA256 hash of model file for integrity checking"
    )

    # Technical Specifications (JSON fields for flexibility)
    input_spec = models.JSONField(
        default=dict,
        help_text="Input specification: {shape, dtype, preprocessing}"
    )
    output_spec = models.JSONField(
        default=dict,
        help_text="Output specification: {shape, dtype, postprocessing}"
    )
    labels = models.JSONField(
        default=list,
        help_text="List of class labels/categories the model can predict"
    )

    # Metadata & Discoverability
    tags = models.JSONField(
        default=list,
        help_text="Tags for search/filtering (e.g., ['face', 'real-time'])"
    )
    metrics = models.JSONField(
        default=dict,
        blank=True,
        help_text="Performance metrics: {accuracy, mAP, FPS, etc.}"
    )

    # Access Control
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="owned_models",
        help_text="User who uploaded the model"
    )
    organization = models.ForeignKey(
        Organization,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="models",
        help_text="Organization this model belongs to (null = personal)"
    )
    is_public = models.BooleanField(
        default=False,
        help_text="Whether model is visible to all users"
    )

    # Lifecycle
    is_active = models.BooleanField(
        default=True,
        help_text="Whether model is available for use"
    )
    download_count = models.IntegerField(
        default=0,
        help_text="Number of times model has been downloaded/used"
    )
    last_used = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Last time model was used for inference"
    )

    class Meta:
        db_table = "model_registry"
        ordering = ["-created_date"]
        indexes = [
            models.Index(fields=["name"]),
            models.Index(fields=["framework"]),
            models.Index(fields=["model_type"]),
            models.Index(fields=["organization"]),
            models.Index(fields=["owner"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self):
        return f"{self.display_name} ({self.version})"


class ModelVersion(TimestampedModel):
    """
    Tracks version history for models.
    """
    model = models.ForeignKey(
        ModelRegistry,
        on_delete=models.CASCADE,
        related_name="versions"
    )
    version = models.CharField(max_length=64)
    drive_file_id = models.CharField(max_length=128)
    file_hash = models.CharField(max_length=64, blank=True)
    changes = models.TextField(blank=True)
    is_current = models.BooleanField(default=False)

    class Meta:
        db_table = "model_version"
        ordering = ["-created_date"]
        unique_together = [["model", "version"]]


class ModelDownloadLog(TimestampedModel):
    """
    Audit log for model downloads/usage.
    """
    model = models.ForeignKey(
        ModelRegistry,
        on_delete=models.CASCADE,
        related_name="download_logs"
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    task_id = models.IntegerField(null=True, blank=True)
    job_id = models.IntegerField(null=True, blank=True)
    inference_time = models.FloatField(
        null=True,
        blank=True,
        help_text="Inference time in seconds"
    )

    class Meta:
        db_table = "model_download_log"
        ordering = ["-created_date"]
```

### Database Migration

```python
# cvat/apps/model_registry/migrations/0001_initial.py

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('organizations', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='ModelRegistry',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_date', models.DateTimeField(auto_now_add=True)),
                ('updated_date', models.DateTimeField(auto_now=True)),
                ('name', models.CharField(max_length=256, unique=True)),
                ('display_name', models.CharField(max_length=256)),
                ('version', models.CharField(default='1.0.0', max_length=64)),
                ('drive_folder_id', models.CharField(max_length=128, unique=True)),
                ('drive_file_id', models.CharField(max_length=128)),
                ('framework', models.CharField(choices=[('onnx', 'ONNX'), ('pytorch', 'PyTorch'), ('tensorflow', 'TensorFlow'), ('keras', 'Keras'), ('openvino', 'OpenVINO'), ('tensorrt', 'TensorRT'), ('other', 'Other')], max_length=32)),
                ('model_type', models.CharField(choices=[('detector', 'Object Detector'), ('segmentation', 'Segmentation'), ('classification', 'Classification'), ('keypoint', 'Keypoint Detection'), ('tracker', 'Object Tracker'), ('reid', 'Re-Identification'), ('interactor', 'Interactive Segmentation'), ('other', 'Other')], max_length=32)),
                ('description', models.TextField(blank=True)),
                ('file_name', models.CharField(max_length=256)),
                ('file_size', models.BigIntegerField()),
                ('file_hash', models.CharField(blank=True, max_length=64)),
                ('input_spec', models.JSONField(default=dict)),
                ('output_spec', models.JSONField(default=dict)),
                ('labels', models.JSONField(default=list)),
                ('tags', models.JSONField(default=list)),
                ('metrics', models.JSONField(blank=True, default=dict)),
                ('is_public', models.BooleanField(default=False)),
                ('is_active', models.BooleanField(default=True)),
                ('download_count', models.IntegerField(default=0)),
                ('last_used', models.DateTimeField(blank=True, null=True)),
                ('owner', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='owned_models', to=settings.AUTH_USER_MODEL)),
                ('organization', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='models', to='organizations.organization')),
            ],
            options={
                'db_table': 'model_registry',
                'ordering': ['-created_date'],
            },
        ),
        migrations.CreateModel(
            name='ModelVersion',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_date', models.DateTimeField(auto_now_add=True)),
                ('updated_date', models.DateTimeField(auto_now=True)),
                ('version', models.CharField(max_length=64)),
                ('drive_file_id', models.CharField(max_length=128)),
                ('file_hash', models.CharField(blank=True, max_length=64)),
                ('changes', models.TextField(blank=True)),
                ('is_current', models.BooleanField(default=False)),
                ('model', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='versions', to='model_registry.modelregistry')),
            ],
            options={
                'db_table': 'model_version',
                'ordering': ['-created_date'],
            },
        ),
        migrations.CreateModel(
            name='ModelDownloadLog',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_date', models.DateTimeField(auto_now_add=True)),
                ('updated_date', models.DateTimeField(auto_now=True)),
                ('task_id', models.IntegerField(blank=True, null=True)),
                ('job_id', models.IntegerField(blank=True, null=True)),
                ('inference_time', models.FloatField(blank=True, null=True)),
                ('model', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='download_logs', to='model_registry.modelregistry')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'model_download_log',
                'ordering': ['-created_date'],
            },
        ),
        migrations.AddIndex(
            model_name='modelregistry',
            index=models.Index(fields=['name'], name='model_regis_name_idx'),
        ),
        migrations.AddIndex(
            model_name='modelregistry',
            index=models.Index(fields=['framework'], name='model_regis_framewo_idx'),
        ),
        migrations.AddIndex(
            model_name='modelregistry',
            index=models.Index(fields=['model_type'], name='model_regis_model_t_idx'),
        ),
        migrations.AddIndex(
            model_name='modelregistry',
            index=models.Index(fields=['organization'], name='model_regis_organiz_idx'),
        ),
        migrations.AddIndex(
            model_name='modelregistry',
            index=models.Index(fields=['owner'], name='model_regis_owner_i_idx'),
        ),
        migrations.AddIndex(
            model_name='modelregistry',
            index=models.Index(fields=['is_active'], name='model_regis_is_acti_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='modelversion',
            unique_together={('model', 'version')},
        ),
    ]
```

---

## Google Drive Structure

### Directory Layout

```
/CVAT_Models/                          # Root directory
├── yolov8_detector/                   # Model folder (unique name)
│   ├── model.json                     # Required: metadata file
│   ├── model.onnx                     # Required: model file
│   ├── README.md                      # Optional: documentation
│   ├── samples/                       # Optional: sample images
│   │   ├── sample1.jpg
│   │   └── sample2.jpg
│   └── logs/                          # Optional: training logs
│       └── training.log
│
├── sam_vit_h/                         # Another model
│   ├── model.json
│   ├── model.pt
│   └── checkpoint/                    # Optional: checkpoints
│       └── sam_vit_h_4b8939.pth
│
└── custom_detector_v2/
    ├── model.json
    ├── model.onnx
    └── previous_versions/             # Optional: version history
        └── v1.0.0/
            └── model.onnx
```

### model.json Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["name", "version", "framework", "type", "file_name"],
  "properties": {
    "name": {
      "type": "string",
      "description": "Unique model identifier (matches folder name)",
      "example": "yolov8_detector"
    },
    "display_name": {
      "type": "string",
      "description": "Human-readable name",
      "example": "YOLOv8 Object Detector"
    },
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$",
      "description": "Semantic version",
      "example": "1.2.0"
    },
    "framework": {
      "type": "string",
      "enum": ["onnx", "pytorch", "tensorflow", "keras", "openvino", "tensorrt", "other"],
      "example": "onnx"
    },
    "type": {
      "type": "string",
      "enum": ["detector", "segmentation", "classification", "keypoint", "tracker", "reid", "interactor", "other"],
      "example": "detector"
    },
    "description": {
      "type": "string",
      "example": "YOLOv8 trained on COCO dataset for general object detection"
    },
    "file_name": {
      "type": "string",
      "description": "Primary model file in this folder",
      "example": "model.onnx"
    },
    "input": {
      "type": "object",
      "properties": {
        "shape": {
          "type": "array",
          "items": {"type": ["integer", "null"]},
          "example": [1, 3, 640, 640]
        },
        "dtype": {
          "type": "string",
          "example": "float32"
        },
        "preprocessing": {
          "type": "object",
          "properties": {
            "normalize": {"type": "boolean"},
            "mean": {"type": "array", "items": {"type": "number"}},
            "std": {"type": "array", "items": {"type": "number"}},
            "resize": {"type": "object"}
          }
        }
      }
    },
    "output": {
      "type": "object",
      "properties": {
        "shape": {
          "type": "array",
          "items": {"type": ["integer", "null"]},
          "example": [1, 25200, 85]
        },
        "dtype": {"type": "string"},
        "format": {"type": "string", "example": "xyxy"}
      }
    },
    "labels": {
      "type": "array",
      "items": {"type": "string"},
      "description": "Class labels",
      "example": ["person", "car", "dog", "cat"]
    },
    "tags": {
      "type": "array",
      "items": {"type": "string"},
      "description": "Search tags",
      "example": ["real-time", "coco", "general-purpose"]
    },
    "metrics": {
      "type": "object",
      "properties": {
        "mAP": {"type": "number"},
        "mAP50": {"type": "number"},
        "fps": {"type": "number"},
        "accuracy": {"type": "number"}
      },
      "example": {"mAP50": 0.67, "fps": 45}
    },
    "requirements": {
      "type": "object",
      "properties": {
        "min_memory_mb": {"type": "integer"},
        "gpu_required": {"type": "boolean"},
        "runtime_dependencies": {
          "type": "array",
          "items": {"type": "string"}
        }
      }
    },
    "author": {
      "type": "object",
      "properties": {
        "name": {"type": "string"},
        "email": {"type": "string"},
        "organization": {"type": "string"}
      }
    },
    "license": {
      "type": "string",
      "example": "MIT"
    },
    "created_at": {
      "type": "string",
      "format": "date-time"
    },
    "updated_at": {
      "type": "string",
      "format": "date-time"
    }
  }
}
```

### Example model.json

```json
{
  "name": "yolov8_coco_detector",
  "display_name": "YOLOv8 COCO Object Detector",
  "version": "1.0.0",
  "framework": "onnx",
  "type": "detector",
  "description": "YOLOv8 model trained on COCO dataset with 80 classes. Optimized for real-time detection with high accuracy.",
  "file_name": "yolov8n.onnx",
  "input": {
    "shape": [1, 3, 640, 640],
    "dtype": "float32",
    "preprocessing": {
      "normalize": true,
      "mean": [0.0, 0.0, 0.0],
      "std": [255.0, 255.0, 255.0],
      "resize": {
        "width": 640,
        "height": 640,
        "keep_aspect_ratio": true
      }
    }
  },
  "output": {
    "shape": [1, 84, 8400],
    "dtype": "float32",
    "format": "xyxy",
    "description": "Boxes (4), confidence (1), class probabilities (80)"
  },
  "labels": [
    "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck",
    "boat", "traffic light", "fire hydrant", "stop sign", "parking meter", "bench"
  ],
  "tags": ["real-time", "coco", "general-purpose", "yolo", "detection"],
  "metrics": {
    "mAP50": 0.678,
    "mAP50-95": 0.456,
    "fps": 142,
    "inference_time_ms": 7.0
  },
  "requirements": {
    "min_memory_mb": 512,
    "gpu_required": false,
    "runtime_dependencies": ["onnxruntime>=1.12.0"]
  },
  "author": {
    "name": "Ultralytics",
    "organization": "Ultralytics LLC"
  },
  "license": "AGPL-3.0",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

---

## Backend Implementation

### Google Drive Service Layer

```python
# cvat/apps/model_registry/google_drive_service.py

import io
import json
import os
from typing import Dict, List, Optional, Tuple
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload, MediaIoBaseDownload
from googleapiclient.errors import HttpError
from django.conf import settings
from django.core.cache import cache

SCOPES = ['https://www.googleapis.com/auth/drive']


class GoogleDriveModelService:
    """
    Service layer for interacting with Google Drive Model Registry.
    Handles all Google Drive API operations for model management.
    """

    MODELS_ROOT_FOLDER = "CVAT_Models"
    CACHE_TTL = 3600  # 1 hour

    def __init__(self):
        """Initialize Google Drive API client."""
        credentials = self._get_credentials()
        self.service = build('drive', 'v3', credentials=credentials)
        self.root_folder_id = self._get_or_create_root_folder()

    def _get_credentials(self):
        """Load service account credentials from settings."""
        key_file_path = settings.GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY
        if not os.path.exists(key_file_path):
            raise FileNotFoundError(
                f"Google Drive service account key not found: {key_file_path}"
            )
        return service_account.Credentials.from_service_account_file(
            key_file_path, scopes=SCOPES
        )

    def _get_or_create_root_folder(self) -> str:
        """
        Get or create the CVAT_Models root folder in Google Drive.
        Returns the folder ID.
        """
        # Check cache first
        cache_key = f"gdrive:root_folder_id"
        folder_id = cache.get(cache_key)
        if folder_id:
            return folder_id

        # Search for existing folder
        query = (
            f"name='{self.MODELS_ROOT_FOLDER}' and "
            f"mimeType='application/vnd.google-apps.folder' and "
            f"trashed=false"
        )
        results = self.service.files().list(
            q=query,
            spaces='drive',
            fields='files(id, name)'
        ).execute()

        files = results.get('files', [])
        if files:
            folder_id = files[0]['id']
        else:
            # Create folder
            folder_metadata = {
                'name': self.MODELS_ROOT_FOLDER,
                'mimeType': 'application/vnd.google-apps.folder'
            }
            folder = self.service.files().create(
                body=folder_metadata,
                fields='id'
            ).execute()
            folder_id = folder['id']

        # Cache for 24 hours
        cache.set(cache_key, folder_id, 86400)
        return folder_id

    def list_model_folders(
        self,
        page_size: int = 100,
        page_token: Optional[str] = None
    ) -> Tuple[List[Dict], Optional[str]]:
        """
        List all model folders in CVAT_Models directory.

        Returns:
            Tuple of (folders list, next_page_token)
        """
        cache_key = f"gdrive:model_folders:{page_token or 'first'}"
        cached_data = cache.get(cache_key)
        if cached_data:
            return cached_data

        query = (
            f"'{self.root_folder_id}' in parents and "
            f"mimeType='application/vnd.google-apps.folder' and "
            f"trashed=false"
        )

        results = self.service.files().list(
            q=query,
            pageSize=page_size,
            pageToken=page_token,
            fields='nextPageToken, files(id, name, createdTime, modifiedTime)',
            orderBy='modifiedTime desc'
        ).execute()

        folders = results.get('files', [])
        next_token = results.get('nextPageToken')

        # Cache for 1 hour
        cache.set(cache_key, (folders, next_token), self.CACHE_TTL)
        return folders, next_token

    def get_folder_contents(self, folder_id: str) -> List[Dict]:
        """
        Get all files in a model folder.

        Args:
            folder_id: Google Drive folder ID

        Returns:
            List of file metadata dictionaries
        """
        cache_key = f"gdrive:folder_contents:{folder_id}"
        cached_data = cache.get(cache_key)
        if cached_data:
            return cached_data

        query = (
            f"'{folder_id}' in parents and "
            f"trashed=false"
        )

        results = self.service.files().list(
            q=query,
            fields='files(id, name, mimeType, size, md5Checksum, createdTime, modifiedTime)',
            pageSize=1000
        ).execute()

        files = results.get('files', [])

        # Cache for 1 hour
        cache.set(cache_key, files, self.CACHE_TTL)
        return files

    def read_model_metadata(self, folder_id: str) -> Optional[Dict]:
        """
        Read and parse model.json from a model folder.

        Args:
            folder_id: Google Drive folder ID

        Returns:
            Parsed model metadata or None if not found
        """
        cache_key = f"gdrive:metadata:{folder_id}"
        cached_data = cache.get(cache_key)
        if cached_data:
            return cached_data

        # Find model.json file
        query = (
            f"'{folder_id}' in parents and "
            f"name='model.json' and "
            f"trashed=false"
        )

        results = self.service.files().list(
            q=query,
            fields='files(id)',
            pageSize=1
        ).execute()

        files = results.get('files', [])
        if not files:
            return None

        file_id = files[0]['id']

        # Download and parse
        request = self.service.files().get_media(fileId=file_id)
        fh = io.BytesIO()
        downloader = MediaIoBaseDownload(fh, request)

        done = False
        while not done:
            status, done = downloader.next_chunk()

        fh.seek(0)
        metadata = json.load(fh)

        # Cache for 1 hour
        cache.set(cache_key, metadata, self.CACHE_TTL)
        return metadata

    def create_model_folder(
        self,
        model_name: str,
        model_file_path: str,
        metadata: Dict
    ) -> Tuple[str, str]:
        """
        Create a new model folder with model file and metadata.

        Args:
            model_name: Unique model name (folder name)
            model_file_path: Local path to model file
            metadata: Model metadata dictionary

        Returns:
            Tuple of (folder_id, model_file_id)
        """
        # Create folder
        folder_metadata = {
            'name': model_name,
            'mimeType': 'application/vnd.google-apps.folder',
            'parents': [self.root_folder_id]
        }
        folder = self.service.files().create(
            body=folder_metadata,
            fields='id'
        ).execute()
        folder_id = folder['id']

        try:
            # Upload model file
            file_metadata = {
                'name': os.path.basename(model_file_path),
                'parents': [folder_id]
            }
            media = MediaFileUpload(
                model_file_path,
                resumable=True,
                chunksize=10*1024*1024  # 10MB chunks
            )
            model_file = self.service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id, md5Checksum, size'
            ).execute()
            model_file_id = model_file['id']

            # Upload model.json
            metadata_json = json.dumps(metadata, indent=2)
            metadata_file = {
                'name': 'model.json',
                'parents': [folder_id]
            }
            media = io.BytesIO(metadata_json.encode('utf-8'))
            self.service.files().create(
                body=metadata_file,
                media_body=media,
                fields='id'
            ).execute()

            # Invalidate cache
            self._invalidate_cache()

            return folder_id, model_file_id, model_file.get('md5Checksum'), model_file.get('size')

        except Exception as e:
            # Rollback: delete folder
            self.service.files().delete(fileId=folder_id).execute()
            raise e

    def download_model_file(self, file_id: str, destination_path: str):
        """
        Download a model file from Google Drive.

        Args:
            file_id: Google Drive file ID
            destination_path: Local path to save file
        """
        request = self.service.files().get_media(fileId=file_id)

        with open(destination_path, 'wb') as fh:
            downloader = MediaIoBaseDownload(fh, request)
            done = False
            while not done:
                status, done = downloader.next_chunk()
                if status:
                    progress = int(status.progress() * 100)
                    # Could emit progress updates here

    def update_model_metadata(self, folder_id: str, metadata: Dict):
        """
        Update model.json in a model folder.

        Args:
            folder_id: Google Drive folder ID
            metadata: Updated metadata dictionary
        """
        # Find existing model.json
        query = (
            f"'{folder_id}' in parents and "
            f"name='model.json' and "
            f"trashed=false"
        )

        results = self.service.files().list(
            q=query,
            fields='files(id)',
            pageSize=1
        ).execute()

        files = results.get('files', [])

        metadata_json = json.dumps(metadata, indent=2)
        media = io.BytesIO(metadata_json.encode('utf-8'))

        if files:
            # Update existing
            file_id = files[0]['id']
            self.service.files().update(
                fileId=file_id,
                media_body=media
            ).execute()
        else:
            # Create new
            metadata_file = {
                'name': 'model.json',
                'parents': [folder_id]
            }
            self.service.files().create(
                body=metadata_file,
                media_body=media,
                fields='id'
            ).execute()

        # Invalidate cache
        self._invalidate_cache(folder_id)

    def delete_model_folder(self, folder_id: str):
        """
        Delete a model folder (move to trash).

        Args:
            folder_id: Google Drive folder ID
        """
        self.service.files().update(
            fileId=folder_id,
            body={'trashed': True}
        ).execute()

        # Invalidate cache
        self._invalidate_cache(folder_id)

    def search_models(
        self,
        query: Optional[str] = None,
        framework: Optional[str] = None,
        model_type: Optional[str] = None,
        tags: Optional[List[str]] = None
    ) -> List[Dict]:
        """
        Search models by various criteria.
        Note: This requires reading metadata from all folders (expensive).
        Consider using DB-backed search for better performance.

        Args:
            query: Text search in name/description
            framework: Filter by framework
            model_type: Filter by model type
            tags: Filter by tags

        Returns:
            List of matching models with metadata
        """
        # Get all folders
        all_folders = []
        page_token = None

        while True:
            folders, page_token = self.list_model_folders(
                page_size=100,
                page_token=page_token
            )
            all_folders.extend(folders)
            if not page_token:
                break

        # Read metadata and filter
        results = []
        for folder in all_folders:
            metadata = self.read_model_metadata(folder['id'])
            if not metadata:
                continue

            # Apply filters
            if query and query.lower() not in (
                metadata.get('name', '').lower() +
                metadata.get('display_name', '').lower() +
                metadata.get('description', '').lower()
            ):
                continue

            if framework and metadata.get('framework') != framework:
                continue

            if model_type and metadata.get('type') != model_type:
                continue

            if tags:
                model_tags = metadata.get('tags', [])
                if not any(tag in model_tags for tag in tags):
                    continue

            results.append({
                'folder_id': folder['id'],
                'folder_name': folder['name'],
                'metadata': metadata
            })

        return results

    def _invalidate_cache(self, folder_id: Optional[str] = None):
        """
        Invalidate cached data.

        Args:
            folder_id: If provided, only invalidate cache for this folder
        """
        if folder_id:
            cache.delete(f"gdrive:metadata:{folder_id}")
            cache.delete(f"gdrive:folder_contents:{folder_id}")
        else:
            # Invalidate all model-related caches
            cache.delete_pattern("gdrive:model_folders:*")
            cache.delete_pattern("gdrive:metadata:*")
            cache.delete_pattern("gdrive:folder_contents:*")
```

### Serializers

```python
# cvat/apps/model_registry/serializers.py

from rest_framework import serializers
from cvat.apps.engine.serializers import BasicUserSerializer
from .models import ModelRegistry, ModelVersion, ModelDownloadLog


class ModelRegistryReadSerializer(serializers.ModelSerializer):
    """Serializer for reading model registry entries."""

    owner = BasicUserSerializer(read_only=True)
    organization = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = ModelRegistry
        fields = '__all__'
        read_only_fields = (
            'id', 'created_date', 'updated_date', 'owner', 'organization',
            'drive_folder_id', 'drive_file_id', 'file_hash', 'file_size',
            'download_count', 'last_used'
        )


class ModelRegistryWriteSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating model registry entries."""

    model_file = serializers.FileField(write_only=True, required=True)
    metadata_file = serializers.FileField(write_only=True, required=False)

    class Meta:
        model = ModelRegistry
        fields = (
            'name', 'display_name', 'version', 'framework', 'model_type',
            'description', 'input_spec', 'output_spec', 'labels', 'tags',
            'metrics', 'is_public', 'model_file', 'metadata_file'
        )

    def validate_name(self, value):
        """Validate model name uniqueness."""
        if ModelRegistry.objects.filter(name=value).exists():
            raise serializers.ValidationError(
                f"Model with name '{value}' already exists"
            )
        # Validate name format (no special chars except underscore/hyphen)
        if not value.replace('_', '').replace('-', '').isalnum():
            raise serializers.ValidationError(
                "Model name can only contain letters, numbers, underscores, and hyphens"
            )
        return value

    def validate_model_file(self, value):
        """Validate model file."""
        # Check file extension
        allowed_extensions = [
            '.onnx', '.pt', '.pth', '.pb', '.h5', '.tflite',
            '.engine', '.xml', '.bin', '.ort'
        ]
        filename = value.name.lower()
        if not any(filename.endswith(ext) for ext in allowed_extensions):
            raise serializers.ValidationError(
                f"Unsupported model file format. Allowed: {', '.join(allowed_extensions)}"
            )

        # Check file size (max 5GB)
        max_size = 5 * 1024 * 1024 * 1024  # 5GB
        if value.size > max_size:
            raise serializers.ValidationError(
                f"Model file too large. Maximum size: 5GB"
            )

        return value

    def create(self, validated_data):
        """Create model registry entry and upload to Google Drive."""
        from .google_drive_service import GoogleDriveModelService
        import tempfile
        import os

        model_file = validated_data.pop('model_file')
        metadata_file = validated_data.pop('metadata_file', None)

        # Save model file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(model_file.name)[1]) as tmp:
            for chunk in model_file.chunks():
                tmp.write(chunk)
            tmp_path = tmp.name

        try:
            # Prepare metadata
            metadata = {
                'name': validated_data['name'],
                'display_name': validated_data['display_name'],
                'version': validated_data['version'],
                'framework': validated_data['framework'],
                'type': validated_data['model_type'],
                'description': validated_data.get('description', ''),
                'file_name': model_file.name,
                'input': validated_data.get('input_spec', {}),
                'output': validated_data.get('output_spec', {}),
                'labels': validated_data.get('labels', []),
                'tags': validated_data.get('tags', []),
                'metrics': validated_data.get('metrics', {}),
            }

            # Upload to Google Drive
            drive_service = GoogleDriveModelService()
            folder_id, file_id, file_hash, file_size = drive_service.create_model_folder(
                model_name=validated_data['name'],
                model_file_path=tmp_path,
                metadata=metadata
            )

            # Create database entry
            model_registry = ModelRegistry.objects.create(
                **validated_data,
                drive_folder_id=folder_id,
                drive_file_id=file_id,
                file_name=model_file.name,
                file_size=file_size,
                file_hash=file_hash,
                owner=self.context['request'].user,
                organization=self.context['request'].iam_context.get('organization')
            )

            return model_registry

        finally:
            # Clean up temp file
            if os.path.exists(tmp_path):
                os.remove(tmp_path)


class ModelVersionSerializer(serializers.ModelSerializer):
    """Serializer for model versions."""

    class Meta:
        model = ModelVersion
        fields = '__all__'
        read_only_fields = ('id', 'created_date', 'updated_date')


class ModelDownloadLogSerializer(serializers.ModelSerializer):
    """Serializer for model download logs."""

    user = BasicUserSerializer(read_only=True)

    class Meta:
        model = ModelDownloadLog
        fields = '__all__'
        read_only_fields = ('id', 'created_date', 'updated_date')
```

### ViewSet

```python
# cvat/apps/model_registry/views.py

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.utils import timezone
from drf_spectacular.utils import extend_schema, OpenApiParameter

from .models import ModelRegistry, ModelVersion
from .serializers import (
    ModelRegistryReadSerializer,
    ModelRegistryWriteSerializer,
    ModelVersionSerializer
)
from .permissions import ModelRegistryPermission
from .google_drive_service import GoogleDriveModelService


class ModelRegistryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing ML models in Google Drive registry.

    Supports:
    - List all models with filtering
    - Retrieve model details
    - Upload new models
    - Update model metadata
    - Delete models
    - Download model files
    - Sync from Google Drive
    """

    queryset = ModelRegistry.objects.all()
    permission_classes = [ModelRegistryPermission]
    parser_classes = [MultiPartParser, FormParser]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ModelRegistryWriteSerializer
        return ModelRegistryReadSerializer

    def get_queryset(self):
        """Filter queryset based on permissions."""
        user = self.request.user
        qs = super().get_queryset()

        # Filter by organization
        org = self.request.iam_context.get('organization')
        if org:
            qs = qs.filter(organization=org)
        else:
            # Personal models or public
            qs = qs.filter(
                models.Q(owner=user) |
                models.Q(is_public=True) |
                models.Q(organization__isnull=True)
            )

        # Apply filters from query params
        framework = self.request.query_params.get('framework')
        if framework:
            qs = qs.filter(framework=framework)

        model_type = self.request.query_params.get('type')
        if model_type:
            qs = qs.filter(model_type=model_type)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                models.Q(name__icontains=search) |
                models.Q(display_name__icontains=search) |
                models.Q(description__icontains=search)
            )

        tags = self.request.query_params.getlist('tags')
        if tags:
            # JSON field query
            for tag in tags:
                qs = qs.filter(tags__contains=[tag])

        return qs.filter(is_active=True)

    @extend_schema(
        summary="Sync models from Google Drive",
        description="Discover new models in Google Drive and sync with database",
        responses={200: ModelRegistryReadSerializer(many=True)}
    )
    @action(detail=False, methods=['post'])
    def sync(self, request):
        """
        Sync models from Google Drive to database.
        Discovers new models and updates existing ones.
        """
        drive_service = GoogleDriveModelService()
        synced_models = []
        errors = []

        # Get all folders from Google Drive
        page_token = None
        all_folders = []

        while True:
            folders, page_token = drive_service.list_model_folders(page_token=page_token)
            all_folders.extend(folders)
            if not page_token:
                break

        # Process each folder
        for folder in all_folders:
            try:
                # Read metadata
                metadata = drive_service.read_model_metadata(folder['id'])
                if not metadata:
                    errors.append({
                        'folder': folder['name'],
                        'error': 'No model.json found'
                    })
                    continue

                # Check if model exists in DB
                model_name = metadata.get('name', folder['name'])

                try:
                    model = ModelRegistry.objects.get(name=model_name)
                    # Update existing
                    model.display_name = metadata.get('display_name', model_name)
                    model.version = metadata.get('version', '1.0.0')
                    model.description = metadata.get('description', '')
                    model.framework = metadata.get('framework', 'other')
                    model.model_type = metadata.get('type', 'other')
                    model.input_spec = metadata.get('input', {})
                    model.output_spec = metadata.get('output', {})
                    model.labels = metadata.get('labels', [])
                    model.tags = metadata.get('tags', [])
                    model.metrics = metadata.get('metrics', {})
                    model.save()

                except ModelRegistry.DoesNotExist:
                    # Create new
                    # Get file info
                    files = drive_service.get_folder_contents(folder['id'])
                    model_file = next(
                        (f for f in files if f['name'] == metadata.get('file_name')),
                        None
                    )

                    if not model_file:
                        errors.append({
                            'folder': folder['name'],
                            'error': f"Model file {metadata.get('file_name')} not found"
                        })
                        continue

                    model = ModelRegistry.objects.create(
                        name=model_name,
                        display_name=metadata.get('display_name', model_name),
                        version=metadata.get('version', '1.0.0'),
                        drive_folder_id=folder['id'],
                        drive_file_id=model_file['id'],
                        framework=metadata.get('framework', 'other'),
                        model_type=metadata.get('type', 'other'),
                        description=metadata.get('description', ''),
                        file_name=metadata.get('file_name'),
                        file_size=int(model_file.get('size', 0)),
                        file_hash=model_file.get('md5Checksum', ''),
                        input_spec=metadata.get('input', {}),
                        output_spec=metadata.get('output', {}),
                        labels=metadata.get('labels', []),
                        tags=metadata.get('tags', []),
                        metrics=metadata.get('metrics', {}),
                        owner=request.user,
                        organization=request.iam_context.get('organization')
                    )

                synced_models.append(model)

            except Exception as e:
                errors.append({
                    'folder': folder['name'],
                    'error': str(e)
                })

        serializer = ModelRegistryReadSerializer(synced_models, many=True)
        return Response({
            'synced': serializer.data,
            'errors': errors,
            'total_folders': len(all_folders),
            'synced_count': len(synced_models),
            'error_count': len(errors)
        })

    @extend_schema(
        summary="Download model file",
        description="Download the model file from Google Drive",
        responses={200: {'type': 'string', 'format': 'binary'}}
    )
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Download model file from Google Drive."""
        import tempfile
        from django.http import FileResponse

        model = self.get_object()

        # Create temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=f'_{model.file_name}') as tmp:
            tmp_path = tmp.name

        # Download from Google Drive
        drive_service = GoogleDriveModelService()
        drive_service.download_model_file(model.drive_file_id, tmp_path)

        # Update stats
        model.download_count += 1
        model.last_used = timezone.now()
        model.save(update_fields=['download_count', 'last_used'])

        # Log download
        from .models import ModelDownloadLog
        ModelDownloadLog.objects.create(
            model=model,
            user=request.user
        )

        # Return file
        response = FileResponse(
            open(tmp_path, 'rb'),
            as_attachment=True,
            filename=model.file_name
        )
        return response

    @extend_schema(
        summary="Get model versions",
        description="List all versions of a model",
        responses={200: ModelVersionSerializer(many=True)}
    )
    @action(detail=True, methods=['get'])
    def versions(self, request, pk=None):
        """Get all versions of a model."""
        model = self.get_object()
        versions = model.versions.all()
        serializer = ModelVersionSerializer(versions, many=True)
        return Response(serializer.data)
```

### Permissions

```python
# cvat/apps/model_registry/permissions.py

from cvat.apps.iam.permissions import OpenPolicyAgentPermission


class ModelRegistryPermission(OpenPolicyAgentPermission):
    """
    Permission class for model registry operations.
    Uses OPA for fine-grained access control.
    """

    @classmethod
    def create_scope(cls, request, view, obj):
        scope = super().create_scope(request, view, obj)

        # Add model-specific context
        if obj:
            scope.update({
                'model': {
                    'id': obj.id,
                    'owner': {'id': obj.owner.id},
                    'organization': {'id': obj.organization.id} if obj.organization else None,
                    'is_public': obj.is_public,
                }
            })

        return scope

    @classmethod
    def get_resource(cls):
        return 'model_registry'
```

### OPA Policy

```rego
# cvat/apps/model_registry/rules/models.rego

package model_registry

import rego.v1

default allow := false

# Allow listing models
allow if {
    input.scope == "list"
}

# Allow viewing model details
allow if {
    input.scope == "view"
    is_model_accessible
}

# Allow creating models
allow if {
    input.scope == "create"
    input.auth.user.is_authenticated
}

# Allow updating own models
allow if {
    input.scope in ["change", "update"]
    input.auth.user.id == input.model.owner.id
}

# Allow updating if org admin
allow if {
    input.scope in ["change", "update"]
    input.model.organization.id == input.auth.organization.id
    input.auth.organization.role in ["owner", "maintainer"]
}

# Allow deleting own models
allow if {
    input.scope == "delete"
    input.auth.user.id == input.model.owner.id
}

# Allow deleting if org admin
allow if {
    input.scope == "delete"
    input.model.organization.id == input.auth.organization.id
    input.auth.organization.role == "owner"
}

# Allow downloading accessible models
allow if {
    input.scope == "download"
    is_model_accessible
}

# Helper: Check if model is accessible to user
is_model_accessible if {
    input.model.is_public == true
}

is_model_accessible if {
    input.auth.user.id == input.model.owner.id
}

is_model_accessible if {
    input.model.organization.id == input.auth.organization.id
}
```

---

## API Specification

### Endpoints

#### List Models
```http
GET /api/model-registry/models
```

**Query Parameters**:
- `page` (integer): Page number (default: 1)
- `page_size` (integer): Items per page (default: 10, max: 100)
- `search` (string): Search in name/description
- `framework` (string): Filter by framework (onnx, pytorch, tensorflow, etc.)
- `type` (string): Filter by model type (detector, segmentation, etc.)
- `tags` (array): Filter by tags
- `org` (integer): Filter by organization ID

**Response**:
```json
{
  "count": 42,
  "next": "http://localhost:8080/api/model-registry/models?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "yolov8_coco_detector",
      "display_name": "YOLOv8 COCO Object Detector",
      "version": "1.0.0",
      "framework": "onnx",
      "model_type": "detector",
      "description": "YOLOv8 trained on COCO dataset...",
      "file_name": "yolov8n.onnx",
      "file_size": 6615824,
      "input_spec": {...},
      "output_spec": {...},
      "labels": ["person", "car", ...],
      "tags": ["real-time", "coco", "yolo"],
      "metrics": {"mAP50": 0.678, "fps": 142},
      "is_public": true,
      "is_active": true,
      "download_count": 127,
      "last_used": "2025-11-20T14:30:00Z",
      "owner": {
        "id": 1,
        "username": "admin",
        "first_name": "Admin",
        "last_name": "User"
      },
      "organization": "ACME Corp",
      "created_date": "2025-01-15T10:30:00Z",
      "updated_date": "2025-01-15T10:30:00Z"
    }
  ]
}
```

#### Create Model
```http
POST /api/model-registry/models
Content-Type: multipart/form-data
```

**Request Body**:
```
name: yolov8_coco_detector
display_name: YOLOv8 COCO Object Detector
version: 1.0.0
framework: onnx
model_type: detector
description: YOLOv8 trained on COCO dataset
model_file: (binary file)
input_spec: {"shape": [1, 3, 640, 640], "dtype": "float32"}
output_spec: {"shape": [1, 84, 8400], "dtype": "float32"}
labels: ["person", "car", "dog"]
tags: ["real-time", "coco"]
metrics: {"mAP50": 0.678}
is_public: false
```

**Response**: 201 Created
```json
{
  "id": 1,
  "name": "yolov8_coco_detector",
  ...
}
```

#### Get Model Details
```http
GET /api/model-registry/models/{id}
```

**Response**: 200 OK (same structure as list item)

#### Update Model
```http
PATCH /api/model-registry/models/{id}
Content-Type: application/json
```

**Request Body**:
```json
{
  "description": "Updated description",
  "tags": ["real-time", "coco", "updated"],
  "is_public": true
}
```

**Response**: 200 OK (updated model)

#### Delete Model
```http
DELETE /api/model-registry/models/{id}
```

**Response**: 204 No Content

#### Download Model
```http
GET /api/model-registry/models/{id}/download
```

**Response**: 200 OK (binary file)

#### Sync from Google Drive
```http
POST /api/model-registry/models/sync
```

**Response**:
```json
{
  "synced": [...],
  "errors": [
    {"folder": "invalid_model", "error": "No model.json found"}
  ],
  "total_folders": 10,
  "synced_count": 8,
  "error_count": 2
}
```

#### Get Model Versions
```http
GET /api/model-registry/models/{id}/versions
```

**Response**:
```json
[
  {
    "id": 1,
    "model": 1,
    "version": "1.0.0",
    "drive_file_id": "1abc...",
    "is_current": true,
    "created_date": "2025-01-15T10:30:00Z"
  },
  {
    "id": 2,
    "model": 1,
    "version": "0.9.0",
    "drive_file_id": "2def...",
    "is_current": false,
    "created_date": "2025-01-10T09:00:00Z"
  }
]
```

---

## Frontend Implementation

### TypeScript Types

```typescript
// cvat-core/src/model-registry.ts

export interface ModelMetadata {
    id: number;
    name: string;
    displayName: string;
    version: string;
    framework: ModelFramework;
    modelType: ModelType;
    description: string;
    fileName: string;
    fileSize: number;
    fileHash: string;
    inputSpec: {
        shape: (number | null)[];
        dtype: string;
        preprocessing?: {
            normalize?: boolean;
            mean?: number[];
            std?: number[];
            resize?: {
                width: number;
                height: number;
                keepAspectRatio?: boolean;
            };
        };
    };
    outputSpec: {
        shape: (number | null)[];
        dtype: string;
        format?: string;
        description?: string;
    };
    labels: string[];
    tags: string[];
    metrics: Record<string, number>;
    isPublic: boolean;
    isActive: boolean;
    downloadCount: number;
    lastUsed: string | null;
    owner: {
        id: number;
        username: string;
        firstName: string;
        lastName: string;
    };
    organization: string | null;
    createdDate: string;
    updatedDate: string;
}

export enum ModelFramework {
    ONNX = 'onnx',
    PYTORCH = 'pytorch',
    TENSORFLOW = 'tensorflow',
    KERAS = 'keras',
    OPENVINO = 'openvino',
    TENSORRT = 'tensorrt',
    OTHER = 'other',
}

export enum ModelType {
    DETECTOR = 'detector',
    SEGMENTATION = 'segmentation',
    CLASSIFICATION = 'classification',
    KEYPOINT = 'keypoint',
    TRACKER = 'tracker',
    REID = 'reid',
    INTERACTOR = 'interactor',
    OTHER = 'other',
}

export class ModelRegistry {
    public readonly id: number;
    public readonly name: string;
    public readonly displayName: string;
    public readonly version: string;
    // ... other fields

    constructor(initialData: ModelMetadata) {
        this.id = initialData.id;
        this.name = initialData.name;
        this.displayName = initialData.displayName;
        this.version = initialData.version;
        // ...
    }

    async download(): Promise<Blob> {
        const response = await Axios.get(
            `/api/model-registry/models/${this.id}/download`,
            { responseType: 'blob' }
        );
        return response.data;
    }

    async delete(): Promise<void> {
        await Axios.delete(`/api/model-registry/models/${this.id}`);
    }

    async update(data: Partial<ModelMetadata>): Promise<ModelRegistry> {
        const response = await Axios.patch(
            `/api/model-registry/models/${this.id}`,
            data
        );
        return new ModelRegistry(response.data);
    }
}

export async function getModels(filter?: {
    page?: number;
    pageSize?: number;
    search?: string;
    framework?: ModelFramework;
    type?: ModelType;
    tags?: string[];
}): Promise<{ models: ModelRegistry[]; count: number }> {
    const params = new URLSearchParams();
    if (filter?.page) params.set('page', filter.page.toString());
    if (filter?.pageSize) params.set('page_size', filter.pageSize.toString());
    if (filter?.search) params.set('search', filter.search);
    if (filter?.framework) params.set('framework', filter.framework);
    if (filter?.type) params.set('type', filter.type);
    if (filter?.tags) filter.tags.forEach(tag => params.append('tags', tag));

    const response = await Axios.get(`/api/model-registry/models?${params}`);

    return {
        models: response.data.results.map((m: ModelMetadata) => new ModelRegistry(m)),
        count: response.data.count,
    };
}

export async function createModel(data: FormData): Promise<ModelRegistry> {
    const response = await Axios.post('/api/model-registry/models', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return new ModelRegistry(response.data);
}

export async function syncModels(): Promise<{
    synced: ModelRegistry[];
    errors: Array<{ folder: string; error: string }>;
}> {
    const response = await Axios.post('/api/model-registry/models/sync');
    return {
        synced: response.data.synced.map((m: ModelMetadata) => new ModelRegistry(m)),
        errors: response.data.errors,
    };
}
```

### Redux State

```typescript
// cvat-ui/src/reducers/model-registry-reducer.ts

import { ModelRegistry } from 'cvat-core/src/model-registry';
import { ModelRegistryActions, ModelRegistryActionTypes } from 'actions/model-registry-actions';

export interface ModelRegistryState {
    initialized: boolean;
    fetching: boolean;
    models: ModelRegistry[];
    totalCount: number;
    currentPage: number;
    pageSize: number;
    filters: {
        search: string;
        framework: string | null;
        type: string | null;
        tags: string[];
    };
    uploading: boolean;
    syncing: boolean;
}

const defaultState: ModelRegistryState = {
    initialized: false,
    fetching: false,
    models: [],
    totalCount: 0,
    currentPage: 1,
    pageSize: 12,
    filters: {
        search: '',
        framework: null,
        type: null,
        tags: [],
    },
    uploading: false,
    syncing: false,
};

export default function modelRegistryReducer(
    state = defaultState,
    action: ModelRegistryActions
): ModelRegistryState {
    switch (action.type) {
        case ModelRegistryActionTypes.GET_MODELS:
            return {
                ...state,
                initialized: false,
                fetching: true,
            };
        case ModelRegistryActionTypes.GET_MODELS_SUCCESS:
            return {
                ...state,
                initialized: true,
                fetching: false,
                models: action.payload.models,
                totalCount: action.payload.count,
            };
        case ModelRegistryActionTypes.GET_MODELS_FAILED:
            return {
                ...state,
                initialized: true,
                fetching: false,
            };
        case ModelRegistryActionTypes.UPLOAD_MODEL:
            return {
                ...state,
                uploading: true,
            };
        case ModelRegistryActionTypes.UPLOAD_MODEL_SUCCESS:
            return {
                ...state,
                uploading: false,
                models: [action.payload.model, ...state.models],
                totalCount: state.totalCount + 1,
            };
        case ModelRegistryActionTypes.UPLOAD_MODEL_FAILED:
            return {
                ...state,
                uploading: false,
            };
        case ModelRegistryActionTypes.SYNC_MODELS:
            return {
                ...state,
                syncing: true,
            };
        case ModelRegistryActionTypes.SYNC_MODELS_SUCCESS:
            return {
                ...state,
                syncing: false,
                // Trigger refetch
                initialized: false,
            };
        case ModelRegistryActionTypes.SYNC_MODELS_FAILED:
            return {
                ...state,
                syncing: false,
            };
        case ModelRegistryActionTypes.SET_FILTERS:
            return {
                ...state,
                filters: { ...state.filters, ...action.payload.filters },
                currentPage: 1,
            };
        case ModelRegistryActionTypes.SET_PAGE:
            return {
                ...state,
                currentPage: action.payload.page,
            };
        default:
            return state;
    }
}
```

### React Components

```typescript
// cvat-ui/src/components/model-registry-page/model-registry-page.tsx

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Row, Col, Pagination, Spin } from 'antd';
import { CombinedState } from 'reducers';
import { getModelsAsync } from 'actions/model-registry-actions';
import ModelBrowser from './model-browser';
import ModelFilters from './model-filters';
import ModelUploadModal from './model-upload-modal';
import './styles.scss';

export default function ModelRegistryPage(): JSX.Element {
    const dispatch = useDispatch();
    const {
        initialized,
        fetching,
        models,
        totalCount,
        currentPage,
        pageSize,
        filters,
    } = useSelector((state: CombinedState) => state.modelRegistry);

    useEffect(() => {
        if (!initialized) {
            dispatch(getModelsAsync(currentPage, pageSize, filters));
        }
    }, [initialized, currentPage, pageSize, filters]);

    const handlePageChange = (page: number) => {
        dispatch(setPage(page));
        dispatch(getModelsAsync(page, pageSize, filters));
    };

    return (
        <div className='cvat-model-registry-page'>
            <Row justify='space-between' align='middle' className='cvat-model-registry-header'>
                <Col>
                    <h1>Model Registry</h1>
                </Col>
                <Col>
                    <ModelUploadModal />
                </Col>
            </Row>

            <Row gutter={[16, 16]}>
                <Col span={6}>
                    <ModelFilters />
                </Col>
                <Col span={18}>
                    {fetching ? (
                        <div className='cvat-model-registry-loading'>
                            <Spin size='large' />
                        </div>
                    ) : (
                        <>
                            <ModelBrowser models={models} />
                            <Pagination
                                current={currentPage}
                                pageSize={pageSize}
                                total={totalCount}
                                onChange={handlePageChange}
                                showSizeChanger={false}
                                className='cvat-model-registry-pagination'
                            />
                        </>
                    )}
                </Col>
            </Row>
        </div>
    );
}
```

```typescript
// cvat-ui/src/components/model-registry-page/model-card.tsx

import React from 'react';
import { Card, Tag, Typography, Space, Button, Tooltip } from 'antd';
import {
    DownloadOutlined,
    InfoCircleOutlined,
    DeleteOutlined,
} from '@ant-design/icons';
import { ModelRegistry } from 'cvat-core/src/model-registry';
import './styles.scss';

const { Text, Title, Paragraph } = Typography;

interface Props {
    model: ModelRegistry;
    onDownload: (model: ModelRegistry) => void;
    onDelete: (model: ModelRegistry) => void;
    onViewDetails: (model: ModelRegistry) => void;
}

export default function ModelCard({
    model,
    onDownload,
    onDelete,
    onViewDetails,
}: Props): JSX.Element {
    return (
        <Card
            className='cvat-model-card'
            hoverable
            cover={
                <div className='cvat-model-card-header'>
                    <Tag color='blue'>{model.framework}</Tag>
                    <Tag color='green'>{model.modelType}</Tag>
                </div>
            }
            actions={[
                <Tooltip title='Download'>
                    <DownloadOutlined key='download' onClick={() => onDownload(model)} />
                </Tooltip>,
                <Tooltip title='View Details'>
                    <InfoCircleOutlined key='info' onClick={() => onViewDetails(model)} />
                </Tooltip>,
                <Tooltip title='Delete'>
                    <DeleteOutlined key='delete' onClick={() => onDelete(model)} />
                </Tooltip>,
            ]}
        >
            <Space direction='vertical' size='small' style={{ width: '100%' }}>
                <Title level={4} className='cvat-model-card-title'>
                    {model.displayName}
                </Title>
                <Text type='secondary'>{model.version}</Text>
                <Paragraph
                    ellipsis={{ rows: 2 }}
                    className='cvat-model-card-description'
                >
                    {model.description}
                </Paragraph>
                <div className='cvat-model-card-tags'>
                    {model.tags.slice(0, 3).map(tag => (
                        <Tag key={tag}>{tag}</Tag>
                    ))}
                    {model.tags.length > 3 && <Tag>+{model.tags.length - 3}</Tag>}
                </div>
                <div className='cvat-model-card-stats'>
                    <Text type='secondary'>
                        <DownloadOutlined /> {model.downloadCount} downloads
                    </Text>
                </div>
            </Space>
        </Card>
    );
}
```

---

## Authentication & Security

### Google Drive Authentication

**Service Account Approach** (Recommended for v1):

1. **Create Service Account** in Google Cloud Console
2. **Generate JSON Key** file
3. **Store Key Securely** on CVAT server
4. **Share /CVAT_Models/ folder** with service account email
5. **Grant Permissions**: Editor (read/write) or Viewer (read-only)

**Configuration**:
```python
# cvat/settings/base.py

GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY = os.getenv(
    'GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY',
    '/path/to/service-account-key.json'
)

# Or store in database
GOOGLE_DRIVE_CREDENTIALS_FROM_DB = os.getenv(
    'GOOGLE_DRIVE_CREDENTIALS_FROM_DB',
    'False'
).lower() in ('true', '1', 'yes')
```

**Environment Variables**:
```bash
GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY=/keys/google-drive-service-account.json
```

### Security Considerations

1. **Credential Storage**:
   - Service account key stored outside web root
   - File permissions: 600 (read/write for owner only)
   - Consider encrypting key file at rest
   - Rotate keys periodically (every 90 days)

2. **Access Control**:
   - OPA policies enforce organization boundaries
   - Personal vs. organization models
   - Public models visible to all users
   - Download logging for audit trail

3. **File Validation**:
   - Validate file extensions and MIME types
   - Scan files for malware (optional: ClamAV integration)
   - Check file size limits (max 5GB)
   - Verify file integrity with SHA256 hash

4. **API Security**:
   - Rate limiting on upload/download endpoints
   - CSRF protection
   - Authentication required for all operations
   - Permissions checked via OPA

5. **Data Privacy**:
   - Models may contain sensitive data
   - Organization models not accessible across orgs
   - Personal models private by default
   - Audit log for compliance

---

## Caching Strategy

### Cache Layers

1. **Redis Cache** (Primary):
   - Model list cache (1 hour TTL)
   - Model metadata cache (1 hour TTL)
   - Folder contents cache (1 hour TTL)
   - Root folder ID (24 hour TTL)

2. **Local File Cache** (Secondary):
   - Downloaded model files cached in `/tmp/cvat_models/`
   - LRU eviction when disk space > threshold
   - Cache key: `{model_id}_{file_hash}`

3. **Database Query Cache**:
   - Django QuerySet caching for repeated queries
   - Cache model list filtered by organization

### Cache Invalidation

**Invalidation Triggers**:
- Model upload: Clear list cache
- Model update: Clear specific model cache
- Model delete: Clear list and model cache
- Sync operation: Clear all caches

**Implementation**:
```python
# Cache key patterns
CACHE_KEY_PATTERNS = {
    'model_list': 'gdrive:model_folders:{page_token}',
    'model_metadata': 'gdrive:metadata:{folder_id}',
    'folder_contents': 'gdrive:folder_contents:{folder_id}',
    'root_folder': 'gdrive:root_folder_id',
}

def invalidate_cache(scope='all', folder_id=None):
    if scope == 'all':
        cache.delete_pattern('gdrive:*')
    elif scope == 'model_list':
        cache.delete_pattern('gdrive:model_folders:*')
    elif scope == 'model_metadata' and folder_id:
        cache.delete(f'gdrive:metadata:{folder_id}')
```

### Performance Optimization

1. **Lazy Loading**:
   - Load model metadata on-demand
   - Defer file downloads until needed

2. **Pagination**:
   - Limit API responses to 10-100 items
   - Use cursor-based pagination for large datasets

3. **Parallel Requests**:
   - Batch Google Drive API calls where possible
   - Use `batch()` API for multiple operations

4. **Background Sync**:
   - Schedule periodic sync jobs (e.g., every 15 minutes)
   - Use Celery/RQ for async sync tasks

5. **CDN for Model Files** (Future):
   - Cache popular models in CDN
   - Reduce Google Drive API calls

---

## Error Handling & Resilience

### Error Types

1. **Google Drive API Errors**:
   - **401 Unauthorized**: Invalid credentials
   - **403 Forbidden**: Insufficient permissions
   - **404 Not Found**: File/folder not found
   - **429 Too Many Requests**: Rate limit exceeded
   - **500 Internal Server Error**: Google Drive service issue

2. **Application Errors**:
   - Invalid model.json format
   - Missing required files
   - File size exceeded
   - Unsupported model format

### Error Handling Strategy

```python
# cvat/apps/model_registry/exceptions.py

from rest_framework.exceptions import APIException


class GoogleDriveAPIError(APIException):
    status_code = 502
    default_detail = 'Google Drive API error'


class ModelMetadataError(APIException):
    status_code = 400
    default_detail = 'Invalid model metadata'


class ModelNotFoundError(APIException):
    status_code = 404
    default_detail = 'Model not found in Google Drive'


# Retry logic with exponential backoff
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((GoogleDriveAPIError, requests.exceptions.RequestException))
)
def download_with_retry(file_id, destination):
    # Download logic
    pass
```

### Resilience Patterns

1. **Retry with Backoff**:
   - Retry failed API calls up to 3 times
   - Exponential backoff: 2s, 4s, 8s

2. **Circuit Breaker**:
   - Stop calling Google Drive if failure rate > 50%
   - Half-open state after 60 seconds

3. **Fallback**:
   - Serve stale cache data if API unavailable
   - Display warning to user

4. **Graceful Degradation**:
   - Continue working with cached models if sync fails
   - Show limited functionality notification

---

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1-2)

**Deliverables**:
- Django app: `model_registry`
- Database models and migrations
- Google Drive service layer
- Basic CRUD API endpoints
- Unit tests

**Tasks**:
1. Create Django app structure
2. Implement database models
3. Set up Google Drive API client
4. Implement folder/file operations
5. Create serializers and views
6. Write unit tests

**Success Criteria**:
- Can list models from Google Drive
- Can upload model to Google Drive
- Can download model from Google Drive
- All tests passing

### Phase 2: API & Permissions (Week 3)

**Deliverables**:
- Complete REST API
- OPA policies
- Caching implementation
- API documentation
- Integration tests

**Tasks**:
1. Implement all API endpoints
2. Create OPA permission rules
3. Add Redis caching
4. Generate OpenAPI schema
5. Write integration tests
6. API documentation

**Success Criteria**:
- All CRUD operations working
- Permissions enforced correctly
- Cache working with invalidation
- API documented in Swagger

### Phase 3: Frontend (Week 4-5)

**Deliverables**:
- Models page in CVAT UI
- Model browser component
- Upload modal
- Filter/search functionality
- Model detail view

**Tasks**:
1. Create React components
2. Implement Redux state management
3. Add routing and navigation
4. Create upload form
5. Implement filters and search
6. Add model detail modal
7. Write E2E tests

**Success Criteria**:
- Can browse models in UI
- Can upload new model
- Can search and filter
- Can view model details
- Can download model

### Phase 4: Integration & Polish (Week 6)

**Deliverables**:
- Lambda manager integration
- Error handling & UI feedback
- Performance optimization
- Documentation
- Deployment guide

**Tasks**:
1. Integrate with existing lambda_manager
2. Add loading states and error messages
3. Optimize performance (caching, lazy loading)
4. Write user documentation
5. Create deployment guide
6. End-to-end testing

**Success Criteria**:
- Models usable for auto-annotation
- Smooth UX with loading states
- Fast performance (<2s page load)
- Complete documentation
- Production-ready

---

## Testing Strategy

### Unit Tests

**Backend**:
```python
# cvat/apps/model_registry/tests/test_google_drive_service.py

from django.test import TestCase
from unittest.mock import Mock, patch
from ..google_drive_service import GoogleDriveModelService


class GoogleDriveServiceTest(TestCase):
    @patch('googleapiclient.discovery.build')
    def test_list_model_folders(self, mock_build):
        # Mock Google Drive API
        mock_service = Mock()
        mock_build.return_value = mock_service

        mock_service.files().list().execute.return_value = {
            'files': [
                {'id': '1', 'name': 'model1'},
                {'id': '2', 'name': 'model2'},
            ],
            'nextPageToken': None
        }

        service = GoogleDriveModelService()
        folders, next_token = service.list_model_folders()

        self.assertEqual(len(folders), 2)
        self.assertIsNone(next_token)

    # More tests...
```

**Frontend**:
```typescript
// cvat-ui/src/components/model-registry-page/model-card.test.tsx

import { render, screen, fireEvent } from '@testing-library/react';
import ModelCard from './model-card';

describe('ModelCard', () => {
    const mockModel = {
        id: 1,
        name: 'test_model',
        displayName: 'Test Model',
        version: '1.0.0',
        // ...
    };

    it('renders model information', () => {
        render(
            <ModelCard
                model={mockModel}
                onDownload={jest.fn()}
                onDelete={jest.fn()}
                onViewDetails={jest.fn()}
            />
        );

        expect(screen.getByText('Test Model')).toBeInTheDocument();
        expect(screen.getByText('1.0.0')).toBeInTheDocument();
    });

    it('calls onDownload when download button clicked', () => {
        const onDownload = jest.fn();
        render(<ModelCard model={mockModel} onDownload={onDownload} {...} />);

        fireEvent.click(screen.getByTitle('Download'));
        expect(onDownload).toHaveBeenCalledWith(mockModel);
    });
});
```

### Integration Tests

```python
# tests/python/rest_api/test_model_registry.py

import pytest
from io import BytesIO


@pytest.mark.usefixtures('restore_db_per_function')
class TestModelRegistry:
    def test_can_list_models(self, admin_user):
        response = admin_user.get('/api/model-registry/models')
        assert response.status_code == 200
        assert 'results' in response.json()

    def test_can_upload_model(self, admin_user):
        # Create fake model file
        model_file = BytesIO(b'fake onnx model')
        model_file.name = 'test_model.onnx'

        data = {
            'name': 'test_model',
            'display_name': 'Test Model',
            'version': '1.0.0',
            'framework': 'onnx',
            'model_type': 'detector',
            'model_file': model_file,
        }

        response = admin_user.post(
            '/api/model-registry/models',
            data=data,
            format='multipart'
        )
        assert response.status_code == 201
        assert response.json()['name'] == 'test_model'

    def test_cannot_upload_duplicate_model(self, admin_user):
        # Upload first model
        self.test_can_upload_model(admin_user)

        # Try to upload duplicate
        response = admin_user.post(...)  # Same name
        assert response.status_code == 400
```

### E2E Tests (Cypress)

```typescript
// tests/cypress/e2e/model-registry.cy.ts

describe('Model Registry', () => {
    before(() => {
        cy.login('admin', 'password');
        cy.visit('/models');
    });

    it('displays model list', () => {
        cy.get('.cvat-model-card').should('have.length.greaterThan', 0);
    });

    it('can search models', () => {
        cy.get('.cvat-model-search-input').type('yolo');
        cy.get('.cvat-model-card').should('contain', 'YOLO');
    });

    it('can upload new model', () => {
        cy.get('.cvat-model-upload-button').click();
        cy.get('.cvat-model-upload-modal').should('be.visible');

        cy.get('input[name="name"]').type('test_model');
        cy.get('input[name="display_name"]').type('Test Model');
        cy.get('select[name="framework"]').select('onnx');
        cy.get('select[name="model_type"]').select('detector');
        cy.get('input[type="file"]').attachFile('test_model.onnx');

        cy.get('.cvat-model-upload-submit').click();
        cy.get('.cvat-notification-success').should('be.visible');
        cy.get('.cvat-model-card').should('contain', 'Test Model');
    });

    it('can download model', () => {
        cy.get('.cvat-model-card').first().within(() => {
            cy.get('[title="Download"]').click();
        });

        // Check download started
        cy.wait(1000);
        cy.readFile('cypress/downloads/test_model.onnx').should('exist');
    });
});
```

---

## Performance Considerations

### Scalability

**Expected Load**:
- 100-1000 models per organization
- 10-100 concurrent users
- 1-10 model uploads/downloads per minute

**Bottlenecks**:
1. Google Drive API rate limits (1000 queries/100 seconds/user)
2. Model file download size (GB-scale files)
3. Metadata parsing (reading model.json from all folders)

**Optimizations**:
1. **Aggressive Caching**:
   - Cache model list for 1 hour
   - Cache metadata for 1 hour
   - Background refresh before expiry

2. **Batch Operations**:
   - Use Google Drive Batch API for multiple requests
   - Load 10-20 model metadata in parallel

3. **Lazy Loading**:
   - Load model details only when clicked
   - Defer file downloads until needed

4. **Database Index**:
   - Index on `name`, `framework`, `model_type`, `organization`
   - Full-text search on `name`, `display_name`, `description`

5. **Pagination**:
   - Limit to 12-24 models per page
   - Use cursor-based pagination for large datasets

### Monitoring

**Metrics to Track**:
- Google Drive API latency
- Cache hit/miss ratio
- Model download time
- Upload success/failure rate
- Number of models synced

**Alerts**:
- Google Drive API error rate > 5%
- Cache hit ratio < 80%
- Model download time > 30s
- Sync failures

---

## Future Enhancements

### Phase 2 Features

1. **Model Versioning UI**:
   - View version history
   - Rollback to previous version
   - Compare versions

2. **Model Performance Tracking**:
   - Track inference time per model
   - Accuracy metrics from annotations
   - User ratings and reviews

3. **Team Collaboration**:
   - Share models with specific users
   - Model collections/favorites
   - Comments and discussions

4. **Advanced Search**:
   - Semantic search (find similar models)
   - Search by input/output shape
   - Filter by performance metrics

5. **Model Conversion**:
   - Convert PyTorch → ONNX
   - Optimize models (quantization, pruning)
   - Format compatibility checks

### Long-term Vision

1. **Multi-Cloud Support**:
   - Support S3, Azure Blob for model storage
   - Unified interface across providers

2. **Model Training Integration**:
   - Train models within CVAT
   - Active learning workflows
   - Model fine-tuning

3. **Model Marketplace**:
   - Public model repository
   - Model licensing and payments
   - Community contributions

4. **Enterprise Features**:
   - Model governance and compliance
   - Access audit logs
   - Model encryption at rest

---

## Appendix

### Configuration Reference

```python
# Complete settings for model registry

# Google Drive
GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY = os.getenv(
    'GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY',
    '/keys/google-drive-service-account.json'
)

# Model Registry
MODEL_REGISTRY_ROOT_FOLDER = os.getenv('MODEL_REGISTRY_ROOT_FOLDER', 'CVAT_Models')
MODEL_REGISTRY_CACHE_TTL = int(os.getenv('MODEL_REGISTRY_CACHE_TTL', 3600))
MODEL_REGISTRY_MAX_FILE_SIZE = int(os.getenv('MODEL_REGISTRY_MAX_FILE_SIZE', 5 * 1024 * 1024 * 1024))  # 5GB
MODEL_REGISTRY_ALLOWED_EXTENSIONS = ['.onnx', '.pt', '.pth', '.pb', '.h5', '.tflite']
MODEL_REGISTRY_SYNC_INTERVAL = int(os.getenv('MODEL_REGISTRY_SYNC_INTERVAL', 900))  # 15 min

# Caching
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': f'redis://{REDIS_HOST}:{REDIS_PORT}/0',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}
```

### API Examples

```bash
# List models
curl -H "Authorization: Token YOUR_TOKEN" \
  "http://localhost:8080/api/model-registry/models?framework=onnx&type=detector"

# Upload model
curl -X POST \
  -H "Authorization: Token YOUR_TOKEN" \
  -F "name=my_detector" \
  -F "display_name=My Custom Detector" \
  -F "version=1.0.0" \
  -F "framework=onnx" \
  -F "model_type=detector" \
  -F "model_file=@model.onnx" \
  -F "labels=[\"person\",\"car\"]" \
  -F "tags=[\"custom\",\"real-time\"]" \
  "http://localhost:8080/api/model-registry/models"

# Download model
curl -H "Authorization: Token YOUR_TOKEN" \
  -o model.onnx \
  "http://localhost:8080/api/model-registry/models/1/download"

# Sync from Google Drive
curl -X POST \
  -H "Authorization: Token YOUR_TOKEN" \
  "http://localhost:8080/api/model-registry/models/sync"
```

---

## Summary

This design provides a **comprehensive, production-ready architecture** for integrating Google Drive as a Model Registry in CVAT. Key highlights:

✅ **Centralized Model Storage**: All models in `/CVAT_Models/` on Google Drive
✅ **Rich Metadata**: model.json with input/output specs, labels, metrics
✅ **Full CRUD API**: List, upload, download, update, delete models
✅ **Dynamic Discovery**: Sync models from Drive to database
✅ **Advanced Filtering**: Search by name, framework, type, tags
✅ **Caching Layer**: Redis caching for performance
✅ **Access Control**: OPA-based permissions with org support
✅ **User-Friendly UI**: React components for model browsing/management
✅ **Extensible**: Support for versioning, metrics tracking, collaboration

**Next Steps**: Begin Phase 1 implementation with core infrastructure and Google Drive integration.
