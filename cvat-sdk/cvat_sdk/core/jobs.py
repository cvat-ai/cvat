# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from typing import Optional

from cvat_sdk.api_client import apis, models
from cvat_sdk.core.downloading import Downloader
from cvat_sdk.core.model_proxy import ModelCrudMixin, ModelProxy
from cvat_sdk.core.progress import ProgressReporter
from cvat_sdk.core.uploading import Uploader


class JobProxy(
    ModelProxy[models.IJobRead, models.JobRead, apis.JobsApi], models.IJobRead, ModelCrudMixin
):
    _api_member_name = "jobs_api"
    _model_partial_update_arg = "patched_job_write_request"

    def import_annotations(
        self,
        format_name: str,
        filename: str,
        *,
        status_check_period: Optional[int] = None,
        pbar: Optional[ProgressReporter] = None,
    ):
        """
        Upload annotations for a job in the specified format (e.g. 'YOLO ZIP 1.0').
        """

        Uploader(self._client).upload_annotation_file_and_wait(
            self.api.create_annotations_endpoint,
            filename,
            format_name,
            url_params={"id": self.id},
            pbar=pbar,
            status_check_period=status_check_period,
        )

        self._client.logger.info(f"Annotation file '{filename}' for job #{self.id} uploaded")

    def export_dataset(
        self,
        format_name: str,
        filename: str,
        *,
        pbar: Optional[ProgressReporter] = None,
        status_check_period: Optional[int] = None,
        include_images: bool = True,
    ) -> None:
        """
        Download annotations for a job in the specified format (e.g. 'YOLO ZIP 1.0').
        """
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

        self._client.logger.info(f"Dataset for task {self.id} has been downloaded to {filename}")
