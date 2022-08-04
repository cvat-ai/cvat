# Copyright (C) 2020-2022 Intel Corporation
# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import io
import mimetypes
import os
import os.path as osp
from io import BytesIO
from time import sleep
from typing import TYPE_CHECKING, Any, Dict, List, Optional, Sequence

from PIL import Image

from cvat_sdk import models
from cvat_sdk.helpers import expect_status
from cvat_sdk.impl.downloading import Downloader
from cvat_sdk.impl.model_proxy import ModelProxy
from cvat_sdk.impl.progress import ProgressReporter
from cvat_sdk.impl.uploading import Uploader
from cvat_sdk.models import ITaskRead
from cvat_sdk.types import ResourceType
from cvat_sdk.utils import filter_dict

if TYPE_CHECKING:
    from cvat_sdk.impl.client import Client



class TaskProxy(ModelProxy, ITaskRead):
    def __init__(self, client: Client, task: models.TaskRead):
        ModelProxy.__init__(self, client=client, model=task)

    def fetch(self, force: bool = False):
        # TODO: implement revision checking
        (self._model, _) = self._client.api.tasks_api.retrieve(self.id)

    def commit(self, force: bool = False):
        # TODO: implement revision checking
        self._client.api.tasks_api.partial_update(self.id,
            patched_task_write_request=models.PatchedTaskWriteRequest(**self._model.to_dict()))

    def remove(self):
        self._client.api.tasks_api.destroy(self.id)

    def upload_data(
        self,
        resource_type: ResourceType,
        resources: Sequence[str],
        *,
        pbar: Optional[ProgressReporter] = None,
        params: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Add local, remote, or shared files to an existing task.
        """
        client = self._client
        task_id = self.id

        params = params or {}

        data = {}
        if resource_type is ResourceType.LOCAL:
            pass  # handled later
        elif resource_type is ResourceType.REMOTE:
            data = {f"remote_files[{i}]": f for i, f in enumerate(resources)}
        elif resource_type is ResourceType.SHARE:
            data = {f"server_files[{i}]": f for i, f in enumerate(resources)}

        data["image_quality"] = 70
        data.update(
            filter_dict(
                params,
                keep=[
                    "chunk_size",
                    "copy_data",
                    "image_quality",
                    "sorting_method",
                    "start_frame",
                    "stop_frame",
                    "use_cache",
                    "use_zip_chunks",
                ],
            )
        )
        if params.get("frame_step") is not None:
            data["frame_filter"] = f"step={params.get('frame_step')}"

        if resource_type in [ResourceType.REMOTE, ResourceType.SHARE]:
            client.api.tasks_api.create_data(
                task_id,
                data_request=models.DataRequest(**data),
                _content_type="multipart/form-data",
            )
        elif resource_type == ResourceType.LOCAL:
            url = client._api_map.make_endpoint_url(
                client.api.tasks_api.create_data_endpoint.path, kwsub={"id": task_id}
            )

            uploader = Uploader(client)
            uploader.upload_files(url, resources, pbar=pbar, **data)

    def import_annotations(
        self,
        format_name: str,
        filename: str,
        *,
        status_check_period: int = None,
        pbar: Optional[ProgressReporter] = None,
    ):
        """
        Upload annotations for a task in the specified format
        (e.g. 'YOLO ZIP 1.0').
        """
        client = self._client
        if status_check_period is None:
            status_check_period = client.config.status_check_period

        task_id = self.id

        url = client._api_map.make_endpoint_url(
            client.api.tasks_api.create_annotations_endpoint.path,
            kwsub={"id": task_id},
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
            f"Upload job for Task ID {task_id} with annotation file {filename} finished"
        )

    def retrieve_frame(
        self,
        frame_id: int,
        *,
        quality: Optional[str] = None,
    ) -> io.RawIOBase:
        (_, response) = self._client.api.tasks_api.retrieve_data(self.id, frame_id, quality, type="frame")
        return BytesIO(response.data)

    def download_frames(
        self,
        frame_ids: Sequence[int],
        *,
        outdir: str = "",
        quality: str = "original",
        filename_pattern: str = "task_{task_id}_frame_{frame_id:06d}{frame_ext}",
    ) -> Optional[List[Image.Image]]:
        """
        Download the requested frame numbers for a task and save images as
        outdir/filename_pattern
        """
        # TODO: add arg descriptions in schema
        os.makedirs(outdir, exist_ok=True)

        for frame_id in frame_ids:
            frame_bytes = self.retrieve_frame(frame_id, quality=quality)

            im = Image.open(frame_bytes)
            mime_type = im.get_format_mimetype() or "image/jpg"
            im_ext = mimetypes.guess_extension(mime_type)

            # FIXME It is better to use meta information from the server
            # to determine the extension
            # replace '.jpe' or '.jpeg' with a more used '.jpg'
            if im_ext in (".jpe", ".jpeg", None):
                im_ext = ".jpg"

            outfile = filename_pattern.format(task_id=self.id, frame_id=frame_id, frame_ext=im_ext)
            im.save(osp.join(outdir, outfile))

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
        Download annotations for a task in the specified format (e.g. 'YOLO ZIP 1.0').
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

    def download_backup(
        self,
        filename: str,
        *,
        status_check_period: int = None,
        pbar: Optional[ProgressReporter] = None,
    ) -> None:
        """
        Download a task backup
        """
        downloader = Downloader(self._client)
        downloader.prepare_and_download_file_from_endpoint(
            self._client.api.tasks_api.retrieve_backup_endpoint,
            filename=filename, pbar=pbar, status_check_period=status_check_period,
            url_params={'id': self.id})

        self._client.logger.info(f"Backup for task {self.id} has been downloaded to {filename}")
