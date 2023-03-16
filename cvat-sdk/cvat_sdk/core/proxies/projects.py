# Copyright (C) 2022-2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import io
import json
from pathlib import Path
from typing import TYPE_CHECKING, List, Optional

from cvat_sdk.api_client import apis, models
from cvat_sdk.core.downloading import Downloader
from cvat_sdk.core.helpers import get_paginated_collection
from cvat_sdk.core.progress import ProgressReporter
from cvat_sdk.core.proxies.model_proxy import (
    ModelCreateMixin,
    ModelDeleteMixin,
    ModelListMixin,
    ModelRetrieveMixin,
    ModelUpdateMixin,
    build_model_bases,
)
from cvat_sdk.core.proxies.tasks import Task
from cvat_sdk.core.uploading import DatasetUploader, Uploader

if TYPE_CHECKING:
    from _typeshed import StrPath

_ProjectEntityBase, _ProjectRepoBase = build_model_bases(
    models.ProjectRead, apis.ProjectsApi, api_member_name="projects_api"
)


class Project(
    _ProjectEntityBase,
    models.IProjectRead,
    ModelUpdateMixin[models.IPatchedProjectWriteRequest],
    ModelDeleteMixin,
):
    _model_partial_update_arg = "patched_project_write_request"

    def import_dataset(
        self,
        format_name: str,
        filename: StrPath,
        *,
        status_check_period: Optional[int] = None,
        pbar: Optional[ProgressReporter] = None,
    ):
        """
        Import dataset for a project in the specified format (e.g. 'YOLO ZIP 1.0').
        """

        filename = Path(filename)

        DatasetUploader(self._client).upload_file_and_wait(
            self.api.create_dataset_endpoint,
            self.api.retrieve_dataset_endpoint,
            filename,
            format_name,
            url_params={"id": self.id},
            pbar=pbar,
            status_check_period=status_check_period,
        )

        self._client.logger.info(f"Annotation file '{filename}' for project #{self.id} uploaded")

    def export_dataset(
        self,
        format_name: str,
        filename: StrPath,
        *,
        pbar: Optional[ProgressReporter] = None,
        status_check_period: Optional[int] = None,
        include_images: bool = True,
    ) -> None:
        """
        Download annotations for a project in the specified format (e.g. 'YOLO ZIP 1.0').
        """

        filename = Path(filename)

        if include_images:
            endpoint = self.api.retrieve_dataset_endpoint
        else:
            endpoint = self.api.retrieve_annotations_endpoint

        Downloader(self._client).prepare_and_download_file_from_endpoint(
            endpoint=endpoint,
            filename=filename,
            url_params={"id": self.id},
            query_params={"format": format_name},
            pbar=pbar,
            status_check_period=status_check_period,
        )

        self._client.logger.info(f"Dataset for project {self.id} has been downloaded to {filename}")

    def download_backup(
        self,
        filename: StrPath,
        *,
        status_check_period: int = None,
        pbar: Optional[ProgressReporter] = None,
    ) -> None:
        """
        Download a project backup
        """

        filename = Path(filename)

        Downloader(self._client).prepare_and_download_file_from_endpoint(
            self.api.retrieve_backup_endpoint,
            filename=filename,
            pbar=pbar,
            status_check_period=status_check_period,
            url_params={"id": self.id},
        )

        self._client.logger.info(f"Backup for project {self.id} has been downloaded to {filename}")

    def get_annotations(self) -> models.ILabeledData:
        (annotations, _) = self.api.retrieve_annotations(self.id)
        return annotations

    def get_tasks(self) -> List[Task]:
        return [
            Task(self._client, m)
            for m in get_paginated_collection(
                self._client.api_client.tasks_api.list_endpoint, project_id=self.id
            )
        ]

    def get_labels(self) -> List[models.ILabel]:
        return get_paginated_collection(
            self._client.api_client.labels_api.list_endpoint, project_id=self.id
        )

    def get_preview(
        self,
    ) -> io.RawIOBase:
        (_, response) = self.api.retrieve_preview(self.id)
        return io.BytesIO(response.data)


class ProjectsRepo(
    _ProjectRepoBase,
    ModelCreateMixin[Project, models.IProjectWriteRequest],
    ModelListMixin[Project],
    ModelRetrieveMixin[Project],
):
    _entity_type = Project

    def create_from_dataset(
        self,
        spec: models.IProjectWriteRequest,
        *,
        dataset_path: str = "",
        dataset_format: str = "CVAT XML 1.1",
        status_check_period: int = None,
        pbar: Optional[ProgressReporter] = None,
    ) -> Project:
        """
        Create a new project with the given name and labels JSON and
        add the files to it.

        Returns: id of the created project
        """
        project = self.create(spec=spec)
        self._client.logger.info("Created project ID: %s NAME: %s", project.id, project.name)

        if dataset_path:
            project.import_dataset(
                format_name=dataset_format,
                filename=dataset_path,
                pbar=pbar,
                status_check_period=status_check_period,
            )

        project.fetch()
        return project

    def create_from_backup(
        self,
        filename: StrPath,
        *,
        status_check_period: int = None,
        pbar: Optional[ProgressReporter] = None,
    ) -> Project:
        """
        Import a project from a backup file
        """

        filename = Path(filename)

        if status_check_period is None:
            status_check_period = self._client.config.status_check_period

        params = {"filename": filename.name}
        url = self._client.api_map.make_endpoint_url(self.api.create_backup_endpoint.path)

        uploader = Uploader(self._client)
        response = uploader.upload_file(
            url,
            filename,
            meta=params,
            query_params=params,
            pbar=pbar,
            logger=self._client.logger.debug,
        )

        rq_id = json.loads(response.data)["rq_id"]
        response = self._client.wait_for_completion(
            url,
            success_status=201,
            positive_statuses=[202],
            post_params={"rq_id": rq_id},
            status_check_period=status_check_period,
        )

        project_id = json.loads(response.data)["id"]
        self._client.logger.info(
            f"Project has been imported successfully. Project ID: {project_id}"
        )

        return self.retrieve(project_id)
