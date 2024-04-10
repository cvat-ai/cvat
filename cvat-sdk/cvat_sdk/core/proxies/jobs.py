# Copyright (C) 2022-2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import io
import mimetypes
from pathlib import Path
from typing import TYPE_CHECKING, List, Optional, Sequence

from PIL import Image

from cvat_sdk.api_client import apis, models
from cvat_sdk.core.downloading import Downloader
from cvat_sdk.core.helpers import get_paginated_collection
from cvat_sdk.core.progress import ProgressReporter
from cvat_sdk.core.proxies.annotations import AnnotationCrudMixin
from cvat_sdk.core.proxies.issues import Issue
from cvat_sdk.core.proxies.model_proxy import (
    ModelListMixin,
    ModelRetrieveMixin,
    ModelUpdateMixin,
    build_model_bases,
)
from cvat_sdk.core.uploading import AnnotationUploader

if TYPE_CHECKING:
    from _typeshed import StrPath

_JobEntityBase, _JobRepoBase = build_model_bases(
    models.JobRead, apis.JobsApi, api_member_name="jobs_api"
)


class Job(
    models.IJobRead,
    _JobEntityBase,
    ModelUpdateMixin[models.IPatchedJobWriteRequest],
    AnnotationCrudMixin,
):
    _model_partial_update_arg = "patched_job_write_request"
    _put_annotations_data_param = "job_annotations_update_request"

    def import_annotations(
        self,
        format_name: str,
        filename: StrPath,
        *,
        status_check_period: Optional[int] = None,
        pbar: Optional[ProgressReporter] = None,
    ):
        """
        Upload annotations for a job in the specified format (e.g. 'YOLO ZIP 1.0').
        """

        filename = Path(filename)

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
        filename: StrPath,
        *,
        pbar: Optional[ProgressReporter] = None,
        status_check_period: Optional[int] = None,
        include_images: bool = True,
    ) -> None:
        """
        Download annotations for a job in the specified format (e.g. 'YOLO ZIP 1.0').
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

        self._client.logger.info(f"Dataset for job {self.id} has been downloaded to {filename}")

    def get_frame(
        self,
        frame_id: int,
        *,
        quality: Optional[str] = None,
    ) -> io.RawIOBase:
        (_, response) = self.api.retrieve_data(
            self.id, number=frame_id, quality=quality, type="frame"
        )
        return io.BytesIO(response.data)

    def get_preview(
        self,
    ) -> io.RawIOBase:
        (_, response) = self.api.retrieve_preview(self.id)
        return io.BytesIO(response.data)

    def download_frames(
        self,
        frame_ids: Sequence[int],
        *,
        image_extension: Optional[str] = None,
        outdir: StrPath = ".",
        quality: str = "original",
        filename_pattern: str = "frame_{frame_id:06d}{frame_ext}",
    ) -> Optional[List[Image.Image]]:
        """
        Download the requested frame numbers for a job and save images as outdir/filename_pattern
        """
        # TODO: add arg descriptions in schema

        outdir = Path(outdir)
        outdir.mkdir(parents=True, exist_ok=True)

        for frame_id in frame_ids:
            frame_bytes = self.get_frame(frame_id, quality=quality)

            im = Image.open(frame_bytes)
            if image_extension is None:
                mime_type = im.get_format_mimetype() or "image/jpg"
                im_ext = mimetypes.guess_extension(mime_type)

                # FIXME It is better to use meta information from the server
                # to determine the extension
                # replace '.jpe' or '.jpeg' with a more used '.jpg'
                if im_ext in (".jpe", ".jpeg", None):
                    im_ext = ".jpg"
            else:
                im_ext = f".{image_extension.strip('.')}"

            outfile = filename_pattern.format(frame_id=frame_id, frame_ext=im_ext)
            im.save(outdir / outfile)

    def get_meta(self) -> models.IDataMetaRead:
        (meta, _) = self.api.retrieve_data_meta(self.id)
        return meta

    def get_labels(self) -> List[models.ILabel]:
        return get_paginated_collection(
            self._client.api_client.labels_api.list_endpoint, job_id=self.id
        )

    def get_frames_info(self) -> List[models.IFrameMeta]:
        return self.get_meta().frames

    def remove_frames_by_ids(self, ids: Sequence[int]) -> None:
        self._client.api_client.tasks_api.jobs_partial_update_data_meta(
            self.id,
            patched_data_meta_write_request=models.PatchedDataMetaWriteRequest(deleted_frames=ids),
        )

    def get_issues(self) -> List[Issue]:
        return [
            Issue(self._client, m)
            for m in get_paginated_collection(
                self._client.api_client.issues_api.list_endpoint, job_id=self.id
            )
        ]


class JobsRepo(
    _JobRepoBase,
    ModelListMixin[Job],
    ModelRetrieveMixin[Job],
):
    _entity_type = Job
