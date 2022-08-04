# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import os.path as osp
from time import sleep
from typing import TYPE_CHECKING, Optional

from cvat_sdk import models
from cvat_sdk.helpers import expect_status
from cvat_sdk.impl.downloading import Downloader
from cvat_sdk.impl.model_proxy import ModelProxy
from cvat_sdk.impl.progress import ProgressReporter
from cvat_sdk.impl.uploading import Uploader
from cvat_sdk.models import IJobRead

if TYPE_CHECKING:
    from cvat_sdk.impl.client import Client



class JobProxy(ModelProxy, IJobRead):
    def __init__(self, client: Client, job: models.JobRead):
        ModelProxy.__init__(self, client=client, model=job)

    def fetch(self, force: bool = False):
        # TODO: implement revision checking
        (self._model, _) = self._client.api.jobs_api.retrieve(self.id)

    def commit(self, force: bool = False):
        # TODO: implement revision checking
        self._client.api.jobs_api.partial_update(self.id,
            patched_job_write_request=models.PatchedJobWriteRequest(**self._model.to_dict()))

    def import_annotations(
        self,
        format_name: str,
        filename: str,
        *,
        status_check_period: int = None,
        pbar: Optional[ProgressReporter] = None,
    ):
        """
        Upload annotations for a job in the specified format
        (e.g. 'YOLO ZIP 1.0').
        """
        client = self._client
        if status_check_period is None:
            status_check_period = client.config.status_check_period

        job_id = self.id

        url = client._api_map.make_endpoint_url(
            client.api.jobs_api.create_annotations_endpoint.path,
            kwsub={"id": job_id},
        )
        params = {"format": format_name, "filename": osp.basename(filename)}

        uploader = Uploader(client)
        uploader.upload_file(
            url, filename, pbar=pbar, query_params=params, meta={"filename": params["filename"]}
        )

        while True:
            response = client.api.rest_client.POST(
                url, headers=client.api.get_common_headers(), query_params=params
            )
            if response.status == 201:
                break
            expect_status(202, response)

            sleep(status_check_period)

        client.logger.info(
            f"Upload job for job ID {job_id} with annotation file {filename} finished"
        )

    def export_dataset(
        self,
        format_name: str,
        filename: str,
        *,
        pbar: Optional[ProgressReporter] = None,
        status_check_period: int = None,
        include_images: bool = True,
    ) -> None:
        """
        Download annotations for a job in the specified format (e.g. 'YOLO ZIP 1.0').
        """
        if include_images:
            endpoint = self._client.api.tasks_api.retrieve_dataset_endpoint
        else:
            endpoint = self._client.api.tasks_api.retrieve_annotations_endpoint
        downloader = Downloader(self._client)
        downloader.prepare_and_download_file_from_endpoint(endpoint=endpoint, filename=filename,
            url_params={"id": self.id}, query_params={"format": format_name},
            pbar=pbar, status_check_period=status_check_period)

        self._client.logger.info(f"Dataset for task {self.id} has been downloaded to {filename}")
