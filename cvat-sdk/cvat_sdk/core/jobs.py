# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import io
import mimetypes
import os
import os.path as osp
from typing import List, Optional, Sequence

from PIL import Image

from cvat_sdk.api_client import apis, models
from cvat_sdk.core.downloading import Downloader
from cvat_sdk.core.model_proxy import (
    Entity,
    ModelListMixin,
    ModelProxy,
    ModelRetrieveMixin,
    ModelUpdateMixin,
    Repo,
)
from cvat_sdk.core.progress import ProgressReporter
from cvat_sdk.core.uploading import AnnotationUploader


class _JobProxy(ModelProxy[models.JobRead, apis.JobsApi]):
    _api_member_name = "jobs_api"


class Job(models.IJobRead, _JobProxy, Entity, ModelUpdateMixin):
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

        AnnotationUploader(self._client).upload_file_and_wait(
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

        self._client.logger.info(f"Dataset for job {self.id} has been downloaded to {filename}")

    def get_frame(
        self,
        frame_id: int,
        *,
        quality: Optional[str] = None,
    ) -> io.RawIOBase:
        (_, response) = self.api.retrieve_data(self.id, frame_id, quality, type="frame")
        return io.BytesIO(response.data)

    def download_frames(
        self,
        frame_ids: Sequence[int],
        *,
        outdir: str = "",
        quality: str = "original",
        filename_pattern: str = "task_{task_id}_frame_{frame_id:06d}{frame_ext}",
    ) -> Optional[List[Image.Image]]:
        """
        Download the requested frame numbers for a job and save images as outdir/filename_pattern
        """
        # TODO: add arg descriptions in schema
        os.makedirs(outdir, exist_ok=True)

        for frame_id in frame_ids:
            frame_bytes = self.get_frame(frame_id, quality=quality)

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


class JobsRepo(
    _JobProxy,
    Repo,
    ModelListMixin[Job],
    ModelRetrieveMixin[Job],
):
    _entity_type = Job
