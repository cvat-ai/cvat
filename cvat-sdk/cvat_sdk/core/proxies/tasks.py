# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import io
import json
import mimetypes
import shutil
from collections.abc import Sequence
from enum import Enum
from pathlib import Path
from time import sleep
from typing import TYPE_CHECKING, Any, Optional

from PIL import Image

from cvat_sdk.api_client import apis, exceptions, models
from cvat_sdk.core.helpers import get_paginated_collection
from cvat_sdk.core.progress import ProgressReporter
from cvat_sdk.core.proxies.annotations import AnnotationCrudMixin
from cvat_sdk.core.proxies.jobs import Job
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
from cvat_sdk.core.uploading import AnnotationUploader, DataUploader, Uploader
from cvat_sdk.core.utils import filter_dict

if TYPE_CHECKING:
    from _typeshed import StrPath, SupportsWrite


class ResourceType(Enum):
    LOCAL = 0
    SHARE = 1
    REMOTE = 2

    def __str__(self):
        return self.name.lower()

    def __repr__(self):
        return str(self)


_TaskEntityBase, _TaskRepoBase = build_model_bases(
    models.TaskRead, apis.TasksApi, api_member_name="tasks_api"
)


class Task(
    _TaskEntityBase,
    models.ITaskRead,
    ModelUpdateMixin[models.IPatchedTaskWriteRequest],
    ModelDeleteMixin,
    AnnotationCrudMixin,
    ExportDatasetMixin,
    DownloadBackupMixin,
):
    _model_partial_update_arg = "patched_task_write_request"
    _put_annotations_data_param = "task_annotations_update_request"

    def upload_data(
        self,
        resources: Sequence[StrPath],
        *,
        resource_type: ResourceType = ResourceType.LOCAL,
        pbar: Optional[ProgressReporter] = None,
        params: Optional[dict[str, Any]] = None,
        wait_for_completion: bool = True,
        status_check_period: Optional[int] = None,
    ) -> None:
        """
        Add local, remote, or shared files to an existing task.
        """
        params = params or {}

        data = {"image_quality": 70}

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
                    "job_file_mapping",
                    "filename_pattern",
                    "cloud_storage_id",
                    "server_files_exclude",
                    "validation_params",
                ],
            )
        )
        if params.get("frame_step") is not None:
            data["frame_filter"] = f"step={params.get('frame_step')}"

        if resource_type in [ResourceType.REMOTE, ResourceType.SHARE]:
            for resource in resources:
                if not isinstance(resource, str):
                    raise TypeError(f"resources: expected instances of str, got {type(resource)}")

            if resource_type is ResourceType.REMOTE:
                data["remote_files"] = resources
            elif resource_type is ResourceType.SHARE:
                data["server_files"] = resources

            result, _ = self.api.create_data(
                self.id,
                data_request=models.DataRequest(**data),
            )
            rq_id = result.rq_id
        elif resource_type == ResourceType.LOCAL:
            url = self._client.api_map.make_endpoint_url(
                self.api.create_data_endpoint.path, kwsub={"id": self.id}
            )

            response = DataUploader(self._client).upload_files(
                url, list(map(Path, resources)), pbar=pbar, **data
            )
            response = json.loads(response.data)
            rq_id = response.get("rq_id")
            assert rq_id, "The rq_id param was not found in the response"

        if wait_for_completion:
            if status_check_period is None:
                status_check_period = self._client.config.status_check_period

            self._client.logger.info("Awaiting for task %s creation...", self.id)
            while True:
                sleep(status_check_period)
                request_details, response = self._client.api_client.requests_api.retrieve(rq_id)
                status, message = request_details.status, request_details.message

                self._client.logger.info(
                    "Task %s creation status: %s (message=%s)",
                    self.id,
                    status,
                    message,
                )

                if status.value == models.RequestStatus.allowed_values[("value",)]["FINISHED"]:
                    break

                elif status.value == models.RequestStatus.allowed_values[("value",)]["FAILED"]:
                    raise exceptions.ApiException(status=status, reason=message, http_resp=response)

            self.fetch()

    def import_annotations(
        self,
        format_name: str,
        filename: StrPath,
        *,
        status_check_period: Optional[int] = None,
        pbar: Optional[ProgressReporter] = None,
    ):
        """
        Upload annotations for a task in the specified format (e.g. 'YOLO 1.1').
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

        self._client.logger.info(f"Annotation file '{filename}' for task #{self.id} uploaded")

    def get_frame(
        self,
        frame_id: int,
        *,
        quality: Optional[str] = None,
    ) -> io.RawIOBase:
        params = {}
        if quality:
            params["quality"] = quality
        (_, response) = self.api.retrieve_data(self.id, number=frame_id, **params, type="frame")
        return io.BytesIO(response.data)

    def get_preview(
        self,
    ) -> io.RawIOBase:
        (_, response) = self.api.retrieve_preview(self.id)
        return io.BytesIO(response.data)

    def download_chunk(
        self,
        chunk_id: int,
        output_file: SupportsWrite[bytes],
        *,
        quality: Optional[str] = None,
    ) -> None:
        params = {}
        if quality:
            params["quality"] = quality
        (_, response) = self.api.retrieve_data(
            self.id, number=chunk_id, **params, type="chunk", _parse_response=False
        )

        with response:
            shutil.copyfileobj(response, output_file)

    def download_frames(
        self,
        frame_ids: Sequence[int],
        *,
        image_extension: Optional[str] = None,
        outdir: StrPath = ".",
        quality: str = "original",
        filename_pattern: str = "frame_{frame_id:06d}{frame_ext}",
    ) -> Optional[list[Image.Image]]:
        """
        Download the requested frame numbers for a task and save images as outdir/filename_pattern
        """

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

    def get_jobs(self) -> list[Job]:
        return [
            Job(self._client, model=m)
            for m in get_paginated_collection(
                self._client.api_client.jobs_api.list_endpoint, task_id=self.id
            )
        ]

    def get_meta(self) -> models.IDataMetaRead:
        (meta, _) = self.api.retrieve_data_meta(self.id)
        return meta

    def get_labels(self) -> list[models.ILabel]:
        return get_paginated_collection(
            self._client.api_client.labels_api.list_endpoint, task_id=self.id
        )

    def get_frames_info(self) -> list[models.IFrameMeta]:
        return self.get_meta().frames

    def remove_frames_by_ids(self, ids: Sequence[int]) -> None:
        self.api.partial_update_data_meta(
            self.id,
            patched_data_meta_write_request=models.PatchedDataMetaWriteRequest(deleted_frames=ids),
        )


class TasksRepo(
    _TaskRepoBase,
    ModelCreateMixin[Task, models.ITaskWriteRequest],
    ModelRetrieveMixin[Task],
    ModelListMixin[Task],
    ModelBatchDeleteMixin,
):
    _entity_type = Task

    def create_from_data(
        self,
        spec: models.ITaskWriteRequest,
        resources: Sequence[StrPath],
        *,
        resource_type: ResourceType = ResourceType.LOCAL,
        data_params: Optional[dict[str, Any]] = None,
        annotation_path: str = "",
        annotation_format: str = "CVAT XML 1.1",
        status_check_period: int = None,
        pbar: Optional[ProgressReporter] = None,
    ) -> Task:
        """
        Create a new task with the given name and labels JSON and
        add the files to it.

        Returns: id of the created task
        """
        if getattr(spec, "project_id", None) and getattr(spec, "labels", None):
            raise exceptions.ApiValueError(
                "Can't set labels to a task inside a project. "
                "Tasks inside a project use project's labels.",
                ["labels"],
            )

        task = self.create(spec=spec)
        self._client.logger.info("Created task ID: %s NAME: %s", task.id, task.name)

        task.upload_data(
            resource_type=resource_type,
            resources=resources,
            pbar=pbar,
            params=data_params,
            wait_for_completion=True,
            status_check_period=status_check_period,
        )

        if annotation_path:
            task.import_annotations(annotation_format, annotation_path, pbar=pbar)

        task.fetch()

        return task

    # This is a backwards compatibility wrapper to support calls which pass
    # the task_ids parameter by keyword (the base class implementation is generic,
    # so it doesn't support this).
    # pylint: disable-next=arguments-differ
    def remove_by_ids(self, task_ids: Sequence[int]) -> None:
        """
        Delete a list of tasks, ignoring those which don't exist.
        """

        super().remove_by_ids(task_ids)

    def create_from_backup(
        self,
        filename: StrPath,
        *,
        status_check_period: int = None,
        pbar: Optional[ProgressReporter] = None,
    ) -> Task:
        """
        Import a task from a backup file
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

        task_id = request.result_id
        self._client.logger.info(f"Task has been imported successfully. Task ID: {task_id}")

        return self.retrieve(task_id)
