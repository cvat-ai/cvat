# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import io
import json
from pathlib import Path
from typing import TYPE_CHECKING, Optional

from cvat_sdk.api_client import apis, models
from cvat_sdk.core.helpers import get_paginated_collection
from cvat_sdk.core.progress import ProgressReporter
from cvat_sdk.core.proxies.model_proxy import (
    DownloadBackupMixin,
    ExportDatasetMixin,
    ModelBatchDeleteMixin,
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
    ExportDatasetMixin,
    DownloadBackupMixin,
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
        Import dataset for a project in the specified format (e.g. 'YOLO 1.1').
        """

        filename = Path(filename)

        DatasetUploader(self._client).upload_file_and_wait(
            self.api.create_dataset_endpoint,
            filename,
            format_name,
            url_params={"id": self.id},
            pbar=pbar,
            status_check_period=status_check_period,
        )

        self._client.logger.info(f"Annotation file '{filename}' for project #{self.id} uploaded")

    def get_annotations(self) -> models.ILabeledData:
        (annotations, _) = self.api.retrieve_annotations(self.id)
        return annotations

    def get_tasks(self) -> list[Task]:
        return [
            Task(self._client, m)
            for m in get_paginated_collection(
                self._client.api_client.tasks_api.list_endpoint, project_id=self.id
            )
        ]

    def get_labels(self) -> list[models.ILabel]:
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
    ModelBatchDeleteMixin,
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

        rq_id = json.loads(response.data).get("rq_id")
        assert rq_id, "The rq_id was not found in server response"
        request, response = self._client.wait_for_completion(
            rq_id, status_check_period=status_check_period
        )

        project_id = request.result_id
        self._client.logger.info(
            f"Project has been imported successfully. Project ID: {project_id}"
        )

        return self.retrieve(project_id)
