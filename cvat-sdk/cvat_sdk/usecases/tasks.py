# Copyright (C) 2020-2022 Intel Corporation
# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations
from io import BytesIO

import mimetypes
import os.path as osp
from time import sleep
from typing import Any, Dict, List, Optional, Sequence, Union

from PIL.Image import Image

from cvat_sdk import ApiException, ApiValueError, models
from cvat_sdk.usecases.client import CvatClient
from cvat_sdk.usecases.downloading import Downloader
from cvat_sdk.usecases.helpers import get_paginated_collection
from cvat_sdk.usecases.progress_reporter import ProgressReporter
from cvat_sdk.usecases.types import ResourceType
from cvat_sdk.usecases.uploading import Uploader
from cvat_sdk.usecases.utils import assert_status, filter_dict
from cvat_sdk.usecases.git import create_git_repo


def create_task(
    client: CvatClient,
    spec: models.TaskWriteRequest,
    resource_type: ResourceType,
    resources: Sequence[str],
    *,
    data_params: Optional[Dict[str, Any]] = None,
    annotation_path: str = "",
    annotation_format: str = "CVAT XML 1.1",
    status_check_period: int = 5,
    dataset_repository_url: str = "",
    use_lfs: bool = False,
    pbar: Optional[ProgressReporter] = None,
) -> int:
    """
    Create a new task with the given name and labels JSON and
    add the files to it.

    Returns: id of the created task
    """

    if spec.get("project_id") and spec.get("labels"):
        raise ApiValueError(
            "Can't set labels to a task inside a project. "
            "Tasks inside a project use project's labels.",
            ["labels"],
        )
    (task, _) = client.api.tasks_api.create(spec)
    client.logger.debug("Created task ID: %s NAME: %s", task.id, task.name)

    upload_task_data(client, task.id, resource_type, resources, pbar=pbar, params=data_params)

    client.logger.debug("Awaiting for task %s creation...", task.id)
    status = None
    while status != models.RqStatusStateEnum.allowed_values[("value",)]["FINISHED"]:
        sleep(status_check_period)
        (status, _) = client.api.tasks_api.retrieve_status(task.id)

        client.logger.debug(
            "Task %s creation status=%s, message=%s",
            task.id,
            status.state.value,
            status.message,
        )

        if status == models.RqStatusStateEnum.allowed_values[("value",)]["FAILED"]:
            raise ApiException(status=status.state.value, reason=status.message)

        status = status.state.value

    if annotation_path:
        upload_task_annotations(client, task.id, annotation_format, annotation_path, pbar=pbar)

    if dataset_repository_url:
        create_git_repo(
            client,
            task_id=task.id,
            repo_url=dataset_repository_url,
            status_check_period=status_check_period,
            use_lfs=use_lfs,
        )

    return task.id

def upload_task_data(
    client: CvatClient,
    task_id: int,
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
        pass # handled later
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
            client.api.tasks_api.create_data_endpoint.path.format(id=task_id)
        )

        uploader = Uploader(client)
        uploader.upload_files(url, resources, pbar=pbar, **data)

def upload_task_annotations(
    client: CvatClient,
    task_id: int,
    fileformat: str,
    filename: str,
    *,
    status_check_period: int = 2,
    pbar: Optional[ProgressReporter] = None
):
    """
    Upload annotations for a task in the specified format
    (e.g. 'YOLO ZIP 1.0').
    """

    url = client._api_map.make_endpoint_url(
        client.api.tasks_api.retrieve_annotations_endpoint.path.format(task_id)
    )
    params = {"format": fileformat, "filename": osp.basename(filename)}

    if pbar is None:
        pbar = client._make_pbar("Uploading...")

    uploader = Uploader(client)
    uploader.upload_file(url, filename, pbar=pbar, logger=client.logger.debug, params=params)

    while True:
        response = client.api.rest_client.PUT(url,
            headers=client.api.get_common_headers(), query_params=params)
        if response.status == 201:
            break

        sleep(status_check_period)

    client.logger.info(
        f"Upload job for Task ID {task_id} "
        f"with annotation file {filename} finished"
    )

def list_tasks(
    client: CvatClient, *, return_json: bool = False, **kwargs
) -> Union[List[models.TaskRead], List[Dict[str, Any]]]:
    """List all tasks in either basic or JSON format."""

    return get_paginated_collection(
        endpoint=client.api.tasks_api.list, return_json=return_json, **kwargs
    )

def delete_tasks(client: CvatClient, task_ids: Sequence[int]):
    """
    Delete a list of tasks, ignoring those which don't exist.
    """

    for task_id in task_ids:
        (_, response) = client.api.tasks_api.destroy(task_id, _check_status=False)
        if 200 <= response.status <= 299:
            client.logger.debug(f"Task ID {task_id} deleted")
        elif response.status == 404:
            client.logger.debug(f"Task ID {task_id} not found")
        else:
            client.logger.debug(
                f"Failed to delete task ID {task_id}: "
                f"{response.msg} (status {response.status})"
            )

def download_frames(
    client: CvatClient,
    task_id: int,
    frame_ids: Sequence[int],
    *,
    outdir: str = "",
    quality: str = "original"
) -> Image:
    """
    Download the requested frame numbers for a task and save images as
    task_<ID>_frame_<FRAME>.jpg.
    """

    for frame_id in frame_ids:
        url = client.api.tasks_id_frame_id(task_id, frame_id, quality)
        response = client.session.get(url)
        response.raise_for_status()
        im = Image.open(BytesIO(response.content))
        mime_type = im.get_format_mimetype() or "image/jpg"
        im_ext = mimetypes.guess_extension(mime_type)
        # FIXME It is better to use meta information from the server
        # to determine the extension
        # replace '.jpe' or '.jpeg' with a more used '.jpg'
        if im_ext in (".jpe", ".jpeg", None):
            im_ext = ".jpg"

        outfile = "task_{}_frame_{:06d}{}".format(task_id, frame_id, im_ext)
        im.save(osp.join(outdir, outfile))

def tasks_dump(
    client,
    task_id,
    fileformat: str,
    filename: str,
    *,
    pbar: Optional[ProgressReporter] = None,
    status_check_period: int = 2,
) -> None:
    """
    Download annotations for a task in the specified format (e.g. 'YOLO ZIP 1.0').
    """

    url = client.api.tasks_id(task_id)
    response = client.session.get(url)
    response.raise_for_status()
    response_json = response.json()

    url = client.api.tasks_id_annotations_filename(task_id, response_json["name"], fileformat)

    client.logger.info("Waiting for the server to prepare the file...")

    while True:
        response = client.session.get(url)
        response.raise_for_status()
        client.logger.info("STATUS {}".format(response.status_code))
        if response.status_code == 201:
            break
        sleep(status_check_period)

    if pbar is not None:
        pbar.start("Downloading")

    downloader = Downloader(client)
    downloader.download_file(url + "&action=download", output_path=filename, pbar=pbar)

    client.logger.info(f"Annotations have been exported to {filename}")

def tasks_export(client, task_id, filename, *, completion_check_period=2, pbar=None):
    """Download a task backup"""
    client.logger.info("Waiting for the server to prepare the file...")

    url = client.api.tasks_id_backup(task_id)
    while True:
        response = client.session.get(url)
        response.raise_for_status()
        client.logger.info("STATUS {}".format(response.status_code))
        if response.status_code == 201:
            break
        sleep(completion_check_period)

    if pbar is None:
        pbar = client._make_pbar("Downloading")

    downloader = Downloader(client)
    downloader.download_file(url + "?action=download", output_path=filename, pbar=pbar)

    client.logger.info(f"Task {task_id} has been exported sucessfully " f"to {osp.abspath(filename)}")

def tasks_import(client, filename, *, completion_check_period=2, pbar=None) -> None:
    """Import a task from a backup file"""

    url = client.api.tasks_backup()
    params = {"filename": osp.basename(filename)}

    if pbar is None:
        pbar = client._make_pbar("Uploading...")

    response = client._upload_file_with_tus(
        url, filename, params=params, pbar=pbar, logger=client.logger.debug
    )
    response_json = response.json()
    rq_id = response_json["rq_id"]

    # check task status
    while True:
        sleep(completion_check_period)

        response = client.session.post(url, data={"rq_id": rq_id})
        if response.status_code == 201:
            break
        assert_status(202, response)

    task_id = response.json()["id"]
    client.logger.info(f"Task has been imported sucessfully. Task ID: {task_id}")
