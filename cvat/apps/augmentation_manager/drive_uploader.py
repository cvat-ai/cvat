# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import json
from typing import Any, Dict, Optional

from cvat.apps.engine.cloud_provider import Credentials
from cvat.apps.engine.google_drive_service import GoogleDriveService
from cvat.apps.engine.models import CloudStorage


class DriveUploader:
    """
    Handles Google Drive upload operations for augmented datasets.

    Creates folder structure and uploads augmented images and metadata.
    """

    def __init__(self, cloud_storage: CloudStorage):
        """
        Initialize Drive uploader with cloud storage credentials.

        Args:
            cloud_storage: CloudStorage instance with Google Drive credentials
        """
        credentials = Credentials()
        credentials.convert_from_db({
            'type': cloud_storage.credentials_type,
            'value': cloud_storage.credentials,
        })

        self.drive_service = GoogleDriveService(credentials.oauth_token)
        self.root_folder = "CVAT_Datasets"

    def create_dataset_folder(self, dataset_name: str, version: str) -> str:
        """
        Create /CVAT_Datasets/<dataset_name>/<version>/ folder structure.

        Args:
            dataset_name: Name of the dataset (e.g., 'yolov8-cars')
            version: Version identifier (e.g., 'v1', 'v2', 'exp-20231122')

        Returns:
            Google Drive folder ID for the version folder
        """
        # Get or create root folder
        root_id = self.drive_service.get_or_create_folder(
            self.root_folder,
            parent_id='root'
        )

        # Get or create dataset folder
        dataset_id = self.drive_service.get_or_create_folder(
            dataset_name,
            parent_id=root_id
        )

        # Create version folder
        version_id = self.drive_service.get_or_create_folder(
            version,
            parent_id=dataset_id
        )

        # Create subdirectories
        images_folder_id = self.drive_service.get_or_create_folder(
            'images',
            parent_id=version_id
        )

        return version_id

    def upload_image(self, image_bytes: bytes, filename: str, folder_id: str):
        """
        Upload augmented image to Drive.

        Args:
            image_bytes: Image data as bytes
            filename: Name for the uploaded file
            folder_id: Parent folder ID where image should be uploaded
        """
        # Upload to images subfolder
        images_folder = self.drive_service.get_or_create_folder('images', parent_id=folder_id)

        self.drive_service.upload_file_content(
            file_content=image_bytes,
            file_name=filename,
            parent_folder_id=images_folder,
            mime_type='image/jpeg'
        )

    def upload_metadata(self, metadata: Dict[str, Any], folder_id: str):
        """
        Upload job metadata as JSON.

        Args:
            metadata: Metadata dictionary
            folder_id: Parent folder ID where metadata should be uploaded
        """
        metadata_json = json.dumps(metadata, indent=2)

        self.drive_service.upload_file_content(
            file_content=metadata_json.encode('utf-8'),
            file_name='metadata.json',
            parent_folder_id=folder_id,
            mime_type='application/json'
        )

    def upload_annotations(self, annotations: Dict[str, Any], folder_id: str):
        """
        Upload annotations as JSON.

        Args:
            annotations: Annotations dictionary (CVAT format or COCO format)
            folder_id: Parent folder ID where annotations should be uploaded
        """
        annotations_json = json.dumps(annotations, indent=2)

        self.drive_service.upload_file_content(
            file_content=annotations_json.encode('utf-8'),
            file_name='annotations.json',
            parent_folder_id=folder_id,
            mime_type='application/json'
        )
