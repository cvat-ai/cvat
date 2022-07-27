# Copyright (C) 2020-2022 Intel Corporation
# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import mimetypes
import os.path as osp
from abc import ABC, abstractmethod
from io import BytesIO
from time import sleep
from typing import TYPE_CHECKING, Any, Dict, Optional, Sequence

from PIL import Image

from cvat_sdk import models
from cvat_sdk.impl.downloading import Downloader
from cvat_sdk.impl.progress import ProgressReporter
from cvat_sdk.impl.types import ResourceType
from cvat_sdk.impl.uploading import Uploader
from cvat_sdk.impl.utils import filter_dict
from cvat_sdk.model_utils import OpenApiModel
from cvat_sdk.models import ITaskRead

if TYPE_CHECKING:
    from cvat_sdk.impl.client import CvatClient


class ModelProxy(ABC):
    _client: CvatClient
    _model: OpenApiModel

    def __init__(self, client: CvatClient, model: OpenApiModel) -> None:
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


class TaskProxy(ModelProxy, ITaskRead):
    def __init__(self, client: CvatClient, task: models.TaskRead):
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

    def upload_annotations(
        self,
        fileformat: str,
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
            client.api.tasks_api.retrieve_annotations_endpoint.path,
            kwsub={"id": task_id},
        )
        params = {"format": fileformat, "filename": osp.basename(filename)}

        uploader = Uploader(client)
        uploader.upload_file(url, filename, pbar=pbar, logger=client.logger.debug, params=params)

        while True:
            response = client.api.rest_client.PUT(
                url, headers=client.api.get_common_headers(), query_params=params
            )
            if response.status == 201:
                break

            sleep(status_check_period)

        client.logger.info(
            f"Upload job for Task ID {task_id} with annotation file {filename} finished"
        )

    def download_frames(
        self,
        frame_ids: Sequence[int],
        *,
        outdir: str = "",
        quality: str = "original",
    ) -> Image:
        """
        Download the requested frame numbers for a task and save images as
        task_<ID>_frame_<FRAME>.jpg.
        """
        client = self._client
        task_id = self.id

        for frame_id in frame_ids:
            (_, response) = client.api.tasks_api.retrieve_data(
                task_id, frame_id, quality, type="frame"
            )
            im = Image.open(BytesIO(response.data))
            mime_type = im.get_format_mimetype() or "image/jpg"
            im_ext = mimetypes.guess_extension(mime_type)

            # FIXME It is better to use meta information from the server
            # to determine the extension
            # replace '.jpe' or '.jpeg' with a more used '.jpg'
            if im_ext in (".jpe", ".jpeg", None):
                im_ext = ".jpg"

            outfile = "task_{}_frame_{:06d}{}".format(task_id, frame_id, im_ext)
            im.save(osp.join(outdir, outfile))

    def download_dataset(
        self,
        format_name: str,
        filename: str,
        *,
        pbar: Optional[ProgressReporter] = None,
        status_check_period: int = None,
    ) -> None:
        """
        Download annotations for a task in the specified format (e.g. 'YOLO ZIP 1.0').
        """
        client = self._client
        if status_check_period is None:
            status_check_period = client.config.status_check_period

        task_id = self.id

        params = {"filename": self.name, "format": format_name}
        endpoint = client.api.tasks_api.retrieve_annotations_endpoint

        client.logger.info("Waiting for the server to prepare the file...")
        while True:
            (_, response) = endpoint.call_with_http_info(task_id, **params)
            client.logger.debug("STATUS {}".format(response.status))
            if response.status == 201:
                break
            sleep(status_check_period)

        url = client._api_map.make_endpoint_url(
            endpoint.path, kwsub={"id": task_id}, query_params=params
        )
        downloader = Downloader(client)
        downloader.download_file(url, output_path=filename, pbar=pbar)

        client.logger.info(f"Annotations have been exported to {filename}")

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
            (_, response) = endpoint.call_with_http_info(task_id=task_id)
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
