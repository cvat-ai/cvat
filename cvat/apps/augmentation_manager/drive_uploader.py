# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import io
import json
from typing import Any, Dict, Optional

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaIoBaseUpload
from rest_framework.exceptions import ValidationError

from cvat.apps.engine.cloud_provider import Credentials as CloudCredentials
from cvat.apps.engine.log import ServerLogManager
from cvat.apps.engine.models import CloudStorage

slogger = ServerLogManager(__name__)


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
        credentials = CloudCredentials()
        credentials.convert_from_db({
            'type': cloud_storage.credentials_type,
            'value': cloud_storage.credentials,
        })

        # Initialize Google Drive API service
        try:
            creds = Credentials(token=credentials.oauth_token)
            self._service = build("drive", "v3", credentials=creds)
            # Test connection
            self._service.about().get(fields="user").execute()
        except Exception as e:
            raise ValidationError(f"Failed to authenticate with Google Drive: {e}")

        self.root_folder = "CVAT_Datasets"

    def _find_folder(self, folder_name: str, parent_id: str = 'root') -> Optional[str]:
        """
        Find a folder by name within a parent folder.

        Args:
            folder_name: Name of the folder to find
            parent_id: Parent folder ID (default: 'root')

        Returns:
            Folder ID if found, None otherwise
        """
        try:
            query = f"name='{folder_name}' and '{parent_id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false"
            results = self._service.files().list(
                q=query,
                fields='files(id, name)',
                spaces='drive'
            ).execute()

            files = results.get('files', [])
            if files:
                return files[0]['id']
            return None

        except HttpError as error:
            slogger.glob.error(f"Error finding folder {folder_name}: {error}")
            return None

    def _create_folder(self, folder_name: str, parent_id: str = 'root') -> str:
        """
        Create a new folder in Google Drive.

        Args:
            folder_name: Name of the folder to create
            parent_id: Parent folder ID (default: 'root')

        Returns:
            Created folder ID
        """
        try:
            file_metadata = {
                'name': folder_name,
                'mimeType': 'application/vnd.google-apps.folder',
                'parents': [parent_id]
            }

            file = self._service.files().create(
                body=file_metadata,
                fields='id'
            ).execute()

            return file.get('id')

        except HttpError as error:
            slogger.glob.error(f"Error creating folder {folder_name}: {error}")
            raise ValidationError(f"Failed to create folder {folder_name}: {error}")

    def _get_or_create_folder(self, folder_name: str, parent_id: str = 'root') -> str:
        """
        Get existing folder or create if it doesn't exist.

        Args:
            folder_name: Name of the folder
            parent_id: Parent folder ID (default: 'root')

        Returns:
            Folder ID
        """
        folder_id = self._find_folder(folder_name, parent_id)
        if folder_id:
            return folder_id

        return self._create_folder(folder_name, parent_id)

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
        root_id = self._get_or_create_folder(self.root_folder, parent_id='root')

        # Get or create dataset folder
        dataset_id = self._get_or_create_folder(dataset_name, parent_id=root_id)

        # Create version folder
        version_id = self._get_or_create_folder(version, parent_id=dataset_id)

        # Create images subdirectory
        images_folder_id = self._get_or_create_folder('images', parent_id=version_id)

        return version_id

    def upload_image(self, image_bytes: bytes, filename: str, folder_id: str):
        """
        Upload augmented image to Drive.

        Args:
            image_bytes: Image data as bytes
            filename: Name for the uploaded file
            folder_id: Parent folder ID where image should be uploaded
        """
        try:
            # Upload to images subfolder
            images_folder = self._get_or_create_folder('images', parent_id=folder_id)

            # Determine MIME type based on extension
            if filename.lower().endswith('.png'):
                mime_type = 'image/png'
            elif filename.lower().endswith(('.jpg', '.jpeg')):
                mime_type = 'image/jpeg'
            else:
                mime_type = 'application/octet-stream'

            file_metadata = {
                'name': filename,
                'parents': [images_folder]
            }

            media = MediaIoBaseUpload(
                io.BytesIO(image_bytes),
                mimetype=mime_type,
                resumable=True
            )

            self._service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id'
            ).execute()

        except HttpError as error:
            slogger.glob.error(f"Error uploading image {filename}: {error}")
            raise ValidationError(f"Failed to upload image {filename}: {error}")

    def upload_metadata(self, metadata: Dict[str, Any], folder_id: str):
        """
        Upload job metadata as JSON.

        Args:
            metadata: Metadata dictionary
            folder_id: Parent folder ID where metadata should be uploaded
        """
        try:
            metadata_json = json.dumps(metadata, indent=2)
            metadata_bytes = metadata_json.encode('utf-8')

            file_metadata = {
                'name': 'metadata.json',
                'parents': [folder_id]
            }

            media = MediaIoBaseUpload(
                io.BytesIO(metadata_bytes),
                mimetype='application/json',
                resumable=True
            )

            self._service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id'
            ).execute()

        except HttpError as error:
            slogger.glob.error(f"Error uploading metadata: {error}")
            raise ValidationError(f"Failed to upload metadata: {error}")

    def upload_annotations(self, annotations: Dict[str, Any], folder_id: str):
        """
        Upload annotations as JSON.

        Args:
            annotations: Annotations dictionary (CVAT format or COCO format)
            folder_id: Parent folder ID where annotations should be uploaded
        """
        try:
            annotations_json = json.dumps(annotations, indent=2)
            annotations_bytes = annotations_json.encode('utf-8')

            file_metadata = {
                'name': 'annotations.json',
                'parents': [folder_id]
            }

            media = MediaIoBaseUpload(
                io.BytesIO(annotations_bytes),
                mimetype='application/json',
                resumable=True
            )

            self._service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id'
            ).execute()

        except HttpError as error:
            slogger.glob.error(f"Error uploading annotations: {error}")
            raise ValidationError(f"Failed to upload annotations: {error}")
