# Copyright (C) 2020-2022 Intel Corporation
# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import io
import mimetypes
import os
import os.path as osp
from abc import ABC, abstractmethod
from io import BytesIO
from time import sleep
from typing import TYPE_CHECKING, Any, Dict, List, Optional, Sequence

from PIL import Image

from cvat_sdk import models
from cvat_sdk.api_client.model_utils import OpenApiModel
from cvat_sdk.core.downloading import Downloader
from cvat_sdk.core.progress import ProgressReporter
from cvat_sdk.core.types import ResourceType
from cvat_sdk.core.uploading import Uploader
from cvat_sdk.core.utils import filter_dict

if TYPE_CHECKING:
    from cvat_sdk.core.client import Client


class ModelProxy(ABC):
    _client: Client
    _model: OpenApiModel

    def __init__(self, client: Client, model: OpenApiModel) -> None:
        self.__dict__["_client"] = client
        self.__dict__["_model"] = model

    def __getattr__(self, __name: str) -> Any:
        return self._model[__name]

    def __setattr__(self, __name: str, __value: Any) -> None:
        if __name in self.__dict__:
            self.__dict__[__name] = __value
        else:
            self._model[__name] = __value

    @abstractmethod
    def fetch(self, force: bool = False):
        """Fetches model data from the server"""
        ...

    @abstractmethod
    def commit(self, force: bool = False):
        """Commits local changes to the server"""
        ...

    def sync(self):
        """Pulls server state and commits local model changes"""
        raise NotImplementedError

    @abstractmethod
    def update(self, **kwargs):
        """Updates multiple fields at once"""
        ...


class TaskProxy(ModelProxy, models.ITaskRead):
    def __init__(self, client: Client, task: models.TaskRead):
        ModelProxy.__init__(self, client=client, model=task)

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
        client = self._client
        task_id = self.id

        (_, response) = client.api.tasks_api.retrieve_data(task_id, frame_id, quality, type="frame")

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
        task_id = self.id

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

            outfile = filename_pattern.format(task_id=task_id, frame_id=frame_id, frame_ext=im_ext)
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
        client = self._client
        if status_check_period is None:
            status_check_period = client.config.status_check_period

        task_id = self.id

        params = {"filename": self.name, "format": format_name}
        if include_images:
            endpoint = client.api.tasks_api.retrieve_dataset_endpoint
        else:
            endpoint = client.api.tasks_api.retrieve_annotations_endpoint

        client.logger.info("Waiting for the server to prepare the file...")
        while True:
            (_, response) = endpoint.call_with_http_info(id=task_id, **params)
            client.logger.debug("STATUS {}".format(response.status))
            if response.status == 201:
                break
            sleep(status_check_period)

        params["action"] = "download"
        url = client._api_map.make_endpoint_url(
            endpoint.path, kwsub={"id": task_id}, query_params=params
        )
        downloader = Downloader(client)
        downloader.download_file(url, output_path=filename, pbar=pbar)

        client.logger.info(f"Dataset has been exported to {filename}")

    def download_backup(
        self,
        filename: str,
        *,
        status_check_period: int = None,
        pbar: Optional[ProgressReporter] = None,
    ):
        """
        Download a task backup
        """
        client = self._client
        if status_check_period is None:
            status_check_period = client.config.status_check_period

        task_id = self.id

        endpoint = client.api.tasks_api.retrieve_backup_endpoint
        client.logger.info("Waiting for the server to prepare the file...")
        while True:
            (_, response) = endpoint.call_with_http_info(id=task_id)
            client.logger.debug("STATUS {}".format(response.status))
            if response.status == 201:
                break
            sleep(status_check_period)

        url = client._api_map.make_endpoint_url(
            endpoint.path, kwsub={"id": task_id}, query_params={"action": "download"}
        )
        downloader = Downloader(client)
        downloader.download_file(url, output_path=filename, pbar=pbar)

        client.logger.info(
            f"Task {task_id} has been exported sucessfully to {osp.abspath(filename)}"
        )

    def fetch(self, force: bool = False):
        # TODO: implement revision checking
        model, _ = self._client.api.tasks_api.retrieve(self.id)
        self._model = model

    def commit(self, force: bool = False):
        return super().commit(force)

    def update(self, **kwargs):
        return super().update(**kwargs)

    def __str__(self) -> str:
        return str(self._model)
