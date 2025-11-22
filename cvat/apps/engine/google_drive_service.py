# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import functools
import io
import json
import logging
from dataclasses import dataclass
from typing import Any, BinaryIO, Optional

from django.conf import settings
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaFileUpload, MediaIoBaseDownload
from rest_framework.exceptions import (
    AuthenticationFailed,
    NotFound,
    PermissionDenied,
    ValidationError,
)

from cvat.apps.engine.log import ServerLogManager

slogger = ServerLogManager(__name__)

# Google Drive API scopes
SCOPES = [
    "https://www.googleapis.com/auth/drive.readonly",  # Read-only access
    "https://www.googleapis.com/auth/drive.file",  # Access to files created by this app
]

# Constants for Google Drive Model Registry
CVAT_MODELS_ROOT_FOLDER = "CVAT_Models"
MODEL_METADATA_FILENAME = "model.json"
MODEL_LOG_FILENAME = "log.txt"


@dataclass
class ModelMetadata:
    """
    Represents metadata for a model stored in Google Drive.

    Attributes:
        name: Unique model identifier
        display_name: Human-readable name
        version: Model version (semantic versioning recommended)
        framework: ML framework (PYTORCH, TENSORFLOW, ONNX, etc.)
        model_type: Type of model (DETECTOR, CLASSIFIER, SEGMENTATION, etc.)
        description: Optional description
        labels: List of label names the model can predict
        input_shape: Expected input dimensions
        output_spec: Description of model output format
        tags: List of tags for categorization
        created_date: ISO 8601 timestamp
        updated_date: ISO 8601 timestamp
        author: Model author/creator
        drive_folder_id: Google Drive folder ID containing this model
        drive_file_id: Google Drive file ID of the model file
        model_filename: Name of the model file (e.g., model.pt, model.onnx)
    """

    name: str
    display_name: str
    version: str
    framework: str
    model_type: str
    description: Optional[str] = None
    labels: list[str] = None
    input_shape: Optional[dict[str, Any]] = None
    output_spec: Optional[dict[str, Any]] = None
    tags: list[str] = None
    created_date: Optional[str] = None
    updated_date: Optional[str] = None
    author: Optional[str] = None
    drive_folder_id: Optional[str] = None
    drive_file_id: Optional[str] = None
    model_filename: Optional[str] = None

    def __post_init__(self):
        if self.labels is None:
            self.labels = []
        if self.tags is None:
            self.tags = []

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> ModelMetadata:
        """Create ModelMetadata from dictionary (e.g., from model.json)"""
        return cls(
            name=data.get("name"),
            display_name=data.get("displayName", data.get("name")),
            version=data.get("version", "1.0.0"),
            framework=data.get("framework"),
            model_type=data.get("modelType", data.get("type")),
            description=data.get("description"),
            labels=data.get("labels", []),
            input_shape=data.get("inputShape"),
            output_spec=data.get("outputSpec"),
            tags=data.get("tags", []),
            created_date=data.get("createdDate"),
            updated_date=data.get("updatedDate"),
            author=data.get("author"),
            drive_folder_id=data.get("driveFolderId"),
            drive_file_id=data.get("driveFileId"),
            model_filename=data.get("modelFilename"),
        )

    def to_dict(self) -> dict[str, Any]:
        """Convert ModelMetadata to dictionary for serialization"""
        return {
            "name": self.name,
            "displayName": self.display_name,
            "version": self.version,
            "framework": self.framework,
            "modelType": self.model_type,
            "description": self.description,
            "labels": self.labels,
            "inputShape": self.input_shape,
            "outputSpec": self.output_spec,
            "tags": self.tags,
            "createdDate": self.created_date,
            "updatedDate": self.updated_date,
            "author": self.author,
            "driveFolderId": self.drive_folder_id,
            "driveFileId": self.drive_file_id,
            "modelFilename": self.model_filename,
        }


def validate_drive_status(func):
    """Decorator to validate Google Drive API status and handle errors"""

    @functools.wraps(func)
    def wrapper(self, *args, **kwargs):
        try:
            return func(self, *args, **kwargs)
        except HttpError as error:
            error_details = error.error_details if hasattr(error, "error_details") else []
            error_message = str(error)

            if error.resp.status == 401:
                # Unauthorized - token expired or invalid
                raise AuthenticationFailed(
                    f"Google Drive authentication failed: {error_message}. "
                    "Please refresh your OAuth token."
                )
            elif error.resp.status == 403:
                # Forbidden - insufficient permissions
                raise PermissionDenied(
                    f"Access denied to Google Drive resource: {error_message}. "
                    "Check your permissions and scopes."
                )
            elif error.resp.status == 404:
                # Not found
                raise NotFound(
                    f"Google Drive resource not found: {error_message}. "
                    "The file or folder may have been deleted."
                )
            elif error.resp.status == 429:
                # Rate limit exceeded
                raise ValidationError(
                    f"Google Drive API rate limit exceeded: {error_message}. "
                    "Please try again later."
                )
            else:
                # Other errors
                slogger.glob.error(f"Google Drive API error: {error_message}")
                raise ValidationError(f"Google Drive API error: {error_message}")
        except Exception as ex:
            slogger.glob.error(f"Unexpected error in Google Drive operation: {str(ex)}")
            raise

    return wrapper


class GoogleDriveService:
    """
    Service layer for Google Drive Model Registry.

    Handles all interactions with Google Drive API for model management:
    - Authentication with OAuth tokens
    - Listing models from /CVAT_Models/ directory
    - Downloading model files and metadata
    - Uploading new models
    - Parsing model.json metadata
    - Searching and filtering models
    """

    def __init__(self, oauth_token: str):
        """
        Initialize Google Drive service with OAuth token.

        Args:
            oauth_token: OAuth 2.0 access token for Google Drive API

        Raises:
            AuthenticationFailed: If token is invalid or expired
        """
        self.oauth_token = oauth_token
        self._service = None
        self._authenticate()

    def _authenticate(self) -> None:
        """Authenticate with Google Drive API using OAuth token"""
        try:
            # Create credentials from OAuth token
            # Note: In production, you should store and refresh tokens properly
            # This is a simplified implementation
            creds = Credentials(token=self.oauth_token)

            # Build the service
            self._service = build("drive", "v3", credentials=creds)

            # Test the connection
            self._service.about().get(fields="user").execute()

            slogger.glob.info("Successfully authenticated with Google Drive API")

        except HttpError as error:
            slogger.glob.error(f"Google Drive authentication failed: {error}")
            raise AuthenticationFailed(
                f"Failed to authenticate with Google Drive: {error}. "
                "Please provide a valid OAuth token."
            )
        except Exception as ex:
            slogger.glob.error(f"Unexpected authentication error: {ex}")
            raise AuthenticationFailed(f"Authentication error: {ex}")

    @validate_drive_status
    def _find_cvat_models_folder(self) -> Optional[str]:
        """
        Find the /CVAT_Models/ root folder in Google Drive.

        Returns:
            Folder ID if found, None otherwise
        """
        query = f"name='{CVAT_MODELS_ROOT_FOLDER}' and mimeType='application/vnd.google-apps.folder' and trashed=false"

        results = (
            self._service.files()
            .list(q=query, spaces="drive", fields="files(id, name)", pageSize=1)
            .execute()
        )

        files = results.get("files", [])
        if not files:
            slogger.glob.warning(
                f"'{CVAT_MODELS_ROOT_FOLDER}' folder not found in Google Drive"
            )
            return None

        folder_id = files[0]["id"]
        slogger.glob.info(f"Found {CVAT_MODELS_ROOT_FOLDER} folder: {folder_id}")
        return folder_id

    @validate_drive_status
    def _get_or_create_cvat_models_folder(self) -> str:
        """
        Get or create the /CVAT_Models/ root folder.

        Returns:
            Folder ID
        """
        folder_id = self._find_cvat_models_folder()

        if folder_id:
            return folder_id

        # Create the folder
        file_metadata = {
            "name": CVAT_MODELS_ROOT_FOLDER,
            "mimeType": "application/vnd.google-apps.folder",
        }

        folder = (
            self._service.files()
            .create(body=file_metadata, fields="id")
            .execute()
        )

        slogger.glob.info(f"Created {CVAT_MODELS_ROOT_FOLDER} folder: {folder['id']}")
        return folder["id"]

    @validate_drive_status
    def list_model_folders(self, parent_folder_id: Optional[str] = None) -> list[dict[str, Any]]:
        """
        List all model folders within /CVAT_Models/.

        Args:
            parent_folder_id: Optional parent folder ID. If None, uses /CVAT_Models/

        Returns:
            List of folder metadata dictionaries
        """
        if parent_folder_id is None:
            parent_folder_id = self._find_cvat_models_folder()
            if not parent_folder_id:
                slogger.glob.warning(
                    f"'{CVAT_MODELS_ROOT_FOLDER}' folder not found. No models to list."
                )
                return []

        query = (
            f"'{parent_folder_id}' in parents and "
            f"mimeType='application/vnd.google-apps.folder' and "
            f"trashed=false"
        )

        folders = []
        page_token = None

        while True:
            results = (
                self._service.files()
                .list(
                    q=query,
                    spaces="drive",
                    fields="nextPageToken, files(id, name, createdTime, modifiedTime)",
                    pageSize=100,
                    pageToken=page_token,
                )
                .execute()
            )

            folders.extend(results.get("files", []))
            page_token = results.get("nextPageToken")

            if not page_token:
                break

        slogger.glob.info(f"Found {len(folders)} model folders in Google Drive")
        return folders

    @validate_drive_status
    def get_folder_contents(self, folder_id: str) -> list[dict[str, Any]]:
        """
        Get all files within a specific folder.

        Args:
            folder_id: Google Drive folder ID

        Returns:
            List of file metadata dictionaries
        """
        query = f"'{folder_id}' in parents and trashed=false"

        files = []
        page_token = None

        while True:
            results = (
                self._service.files()
                .list(
                    q=query,
                    spaces="drive",
                    fields="nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime)",
                    pageSize=100,
                    pageToken=page_token,
                )
                .execute()
            )

            files.extend(results.get("files", []))
            page_token = results.get("nextPageToken")

            if not page_token:
                break

        return files

    @validate_drive_status
    def download_file(self, file_id: str, destination: BinaryIO) -> None:
        """
        Download a file from Google Drive.

        Args:
            file_id: Google Drive file ID
            destination: Binary stream to write file content
        """
        request = self._service.files().get_media(fileId=file_id)
        downloader = MediaIoBaseDownload(destination, request)

        done = False
        while not done:
            status, done = downloader.next_chunk()
            if status:
                slogger.glob.debug(f"Download progress: {int(status.progress() * 100)}%")

    @validate_drive_status
    def download_file_content(self, file_id: str) -> bytes:
        """
        Download file content as bytes.

        Args:
            file_id: Google Drive file ID

        Returns:
            File content as bytes
        """
        buffer = io.BytesIO()
        self.download_file(file_id, buffer)
        buffer.seek(0)
        return buffer.read()

    @validate_drive_status
    def parse_model_metadata(self, folder_id: str) -> Optional[ModelMetadata]:
        """
        Parse model.json metadata from a model folder.

        Args:
            folder_id: Google Drive folder ID containing the model

        Returns:
            ModelMetadata if model.json exists and is valid, None otherwise
        """
        # Find model.json file in folder
        query = (
            f"'{folder_id}' in parents and "
            f"name='{MODEL_METADATA_FILENAME}' and "
            f"trashed=false"
        )

        results = (
            self._service.files()
            .list(q=query, spaces="drive", fields="files(id, name)", pageSize=1)
            .execute()
        )

        files = results.get("files", [])
        if not files:
            slogger.glob.warning(
                f"No {MODEL_METADATA_FILENAME} found in folder {folder_id}"
            )
            return None

        # Download and parse model.json
        metadata_file_id = files[0]["id"]
        try:
            content = self.download_file_content(metadata_file_id)
            metadata_dict = json.loads(content.decode("utf-8"))

            # Add folder information
            metadata_dict["driveFolderId"] = folder_id

            # Find model file ID (any file that's not model.json or log.txt)
            folder_contents = self.get_folder_contents(folder_id)
            for file in folder_contents:
                if file["name"] not in [MODEL_METADATA_FILENAME, MODEL_LOG_FILENAME]:
                    # Assume this is the model file
                    metadata_dict["driveFileId"] = file["id"]
                    metadata_dict["modelFilename"] = file["name"]
                    break

            return ModelMetadata.from_dict(metadata_dict)

        except json.JSONDecodeError as ex:
            slogger.glob.error(f"Invalid JSON in {MODEL_METADATA_FILENAME}: {ex}")
            raise ValidationError(f"Invalid model metadata JSON: {ex}")
        except Exception as ex:
            slogger.glob.error(f"Error parsing model metadata: {ex}")
            raise

    @validate_drive_status
    def list_models(self) -> list[ModelMetadata]:
        """
        List all models from /CVAT_Models/ directory.

        Returns:
            List of ModelMetadata objects
        """
        models = []

        # Get all model folders
        folders = self.list_model_folders()

        # Parse metadata for each folder
        for folder in folders:
            try:
                metadata = self.parse_model_metadata(folder["id"])
                if metadata:
                    models.append(metadata)
                else:
                    slogger.glob.warning(
                        f"Skipping folder '{folder['name']}' - no valid metadata found"
                    )
            except Exception as ex:
                slogger.glob.error(
                    f"Error processing folder '{folder['name']}': {ex}"
                )
                # Continue processing other folders
                continue

        slogger.glob.info(f"Successfully listed {len(models)} models from Google Drive")
        return models

    @validate_drive_status
    def upload_model(
        self,
        model_file_path: str,
        metadata: ModelMetadata,
        parent_folder_id: Optional[str] = None,
    ) -> str:
        """
        Upload a new model to Google Drive.

        Args:
            model_file_path: Local path to model file
            metadata: Model metadata
            parent_folder_id: Optional parent folder ID. If None, uses /CVAT_Models/

        Returns:
            Google Drive folder ID of the created model folder
        """
        if parent_folder_id is None:
            parent_folder_id = self._get_or_create_cvat_models_folder()

        # Create model folder
        folder_metadata = {
            "name": metadata.name,
            "mimeType": "application/vnd.google-apps.folder",
            "parents": [parent_folder_id],
        }

        model_folder = (
            self._service.files()
            .create(body=folder_metadata, fields="id")
            .execute()
        )
        folder_id = model_folder["id"]

        # Upload model file
        file_metadata = {
            "name": metadata.model_filename or f"{metadata.name}.{metadata.framework.lower()}",
            "parents": [folder_id],
        }

        media = MediaFileUpload(model_file_path, resumable=True)
        model_file = (
            self._service.files()
            .create(body=file_metadata, media_body=media, fields="id")
            .execute()
        )

        # Update metadata with Drive IDs
        metadata.drive_folder_id = folder_id
        metadata.drive_file_id = model_file["id"]

        # Upload model.json
        metadata_content = json.dumps(metadata.to_dict(), indent=2)
        metadata_file_metadata = {
            "name": MODEL_METADATA_FILENAME,
            "parents": [folder_id],
            "mimeType": "application/json",
        }

        media = MediaFileUpload(
            io.BytesIO(metadata_content.encode("utf-8")),
            mimetype="application/json",
            resumable=True,
        )
        self._service.files().create(
            body=metadata_file_metadata, media_body=media
        ).execute()

        slogger.glob.info(f"Successfully uploaded model '{metadata.name}' to folder {folder_id}")
        return folder_id

    def search_models(
        self, query: Optional[str] = None, filters: Optional[dict[str, Any]] = None
    ) -> list[ModelMetadata]:
        """
        Search and filter models.

        Args:
            query: Search query string (searches name, display_name, description)
            filters: Dictionary of filters (framework, model_type, tags, etc.)

        Returns:
            Filtered list of ModelMetadata objects
        """
        # Get all models first
        all_models = self.list_models()

        # Apply text search
        if query:
            query_lower = query.lower()
            all_models = [
                m
                for m in all_models
                if (query_lower in m.name.lower())
                or (query_lower in m.display_name.lower())
                or (m.description and query_lower in m.description.lower())
            ]

        # Apply filters
        if filters:
            if "framework" in filters:
                all_models = [m for m in all_models if m.framework == filters["framework"]]

            if "model_type" in filters:
                all_models = [m for m in all_models if m.model_type == filters["model_type"]]

            if "tags" in filters:
                required_tags = filters["tags"]
                if isinstance(required_tags, str):
                    required_tags = [required_tags]
                all_models = [
                    m for m in all_models if any(tag in m.tags for tag in required_tags)
                ]

            if "version" in filters:
                all_models = [m for m in all_models if m.version == filters["version"]]

            if "author" in filters:
                all_models = [
                    m
                    for m in all_models
                    if m.author and filters["author"].lower() in m.author.lower()
                ]

        return all_models

    @validate_drive_status
    def delete_model(self, folder_id: str) -> None:
        """
        Delete a model folder (moves to trash).

        Args:
            folder_id: Google Drive folder ID
        """
        self._service.files().delete(fileId=folder_id).execute()
        slogger.glob.info(f"Deleted model folder {folder_id}")

    @validate_drive_status
    def get_model_by_id(self, folder_id: str) -> Optional[ModelMetadata]:
        """
        Get model metadata by folder ID.

        Args:
            folder_id: Google Drive folder ID

        Returns:
            ModelMetadata if found, None otherwise
        """
        return self.parse_model_metadata(folder_id)
