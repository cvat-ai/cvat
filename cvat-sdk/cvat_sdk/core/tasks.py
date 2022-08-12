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
from typing import TYPE_CHECKING, Any, Dict, List, Optional, Sequence

from PIL import Image

from cvat_sdk.api_client import apis, models
from cvat_sdk.core.downloading import Downloader
from cvat_sdk.core.model_proxy import ModelCrudMixin, ModelProxy
from cvat_sdk.core.progress import ProgressReporter
from cvat_sdk.core.types import ResourceType
from cvat_sdk.core.uploading import Uploader
from cvat_sdk.core.utils import filter_dict

if TYPE_CHECKING:
    from cvat_sdk.core.client import Client


class TaskProxy(
    ModelProxy[models.ITaskRead, models.TaskRead, apis.TasksApi], models.ITaskRead, ModelCrudMixin
):
    _api_member_name = "tasks_api"
    _model_partial_update_arg = "patched_task_write_request"

    @classmethod
    def create(cls, client: Client, spec: models.ITaskWriteRequest, **kwargs) -> TaskProxy:
        # Specifies 'spec' arg type
        return super().create(client, spec, **kwargs)

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
            self.api.create_data(
                self.id,
                data_request=models.DataRequest(**data),
                _content_type="multipart/form-data",
            )
        elif resource_type == ResourceType.LOCAL:
            url = self._client._api_map.make_endpoint_url(
                self.api.create_data_endpoint.path, kwsub={"id": self.id}
            )

            Uploader(self._client).upload_files(url, resources, pbar=pbar, **data)

    def import_annotations(
        self,
        format_name: str,
        filename: str,
        *,
        status_check_period: Optional[int] = None,
        pbar: Optional[ProgressReporter] = None,
    ):
        """
        Upload annotations for a task in the specified format (e.g. 'YOLO ZIP 1.0').
        """

        Uploader(self._client).upload_annotation_file_and_wait(
            self.api.create_annotations_endpoint,
            filename,
            format_name,
            url_params={"id": self.id},
            pbar=pbar,
            status_check_period=status_check_period,
        )

        self._client.logger.info(f"Annotation file '{filename}' for task #{self.id} uploaded")

    def retrieve_frame(
        self,
        frame_id: int,
        *,
        quality: Optional[str] = None,
    ) -> io.RawIOBase:
        (_, response) = self.api.retrieve_data(self.id, frame_id, quality, type="frame")
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
        Download the requested frame numbers for a task and save images as outdir/filename_pattern
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
        status_check_period: Optional[int] = None,
        include_images: bool = True,
    ) -> None:
        """
        Download annotations for a task in the specified format (e.g. 'YOLO ZIP 1.0').
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

        Downloader(self._client).prepare_and_download_file_from_endpoint(
            self.api.retrieve_backup_endpoint,
            filename=filename,
            pbar=pbar,
            status_check_period=status_check_period,
            url_params={"id": self.id},
        )

        self._client.logger.info(f"Backup for task {self.id} has been downloaded to {filename}")
