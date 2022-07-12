# Copyright (C) 2020-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import json
import logging
import mimetypes
import os
import os.path as osp
from contextlib import ExitStack, closing
from io import BytesIO
from time import sleep
from typing import Dict, List, Optional, Sequence, Tuple

import requests
import tqdm
from PIL import Image
from tusclient import client, uploader
from tusclient.request import TusRequest, TusUploadFailed

from .definition import ResourceType
from .utils import StreamWithProgress, expect_status

log = logging.getLogger(__name__)


class CLI:
    def __init__(self, session: requests.Session, api: CVAT_API_V2, credentials: Tuple[str, str]):
        self.api = api
        self.session = session
        self.login(credentials)

    def tasks_data(
        self,
        task_id: int,
        resource_type: ResourceType,
        resources: Sequence[str],
        *,
        pbar: tqdm.tqdm = None,
        **kwargs,
    ) -> None:
        """Add local, remote, or shared files to an existing task."""
        url = self.api.tasks_id_data(task_id)
        data = {}

        if resource_type == ResourceType.LOCAL:
            bulk_files: Dict[str, int] = {}
            separate_files: Dict[str, int] = {}

            MAX_REQUEST_SIZE = 100 * 2**20

            for filename in resources:
                filename = os.path.abspath(filename)
                file_size = os.stat(filename).st_size
                if MAX_REQUEST_SIZE < file_size:
                    separate_files[filename] = file_size
                else:
                    bulk_files[filename] = file_size

            total_size = sum(bulk_files.values()) + sum(separate_files.values())

            # split files by requests
            bulk_file_groups = []
            current_group_size = 0
            current_group = []
            for filename, file_size in bulk_files.items():
                if MAX_REQUEST_SIZE < current_group_size + file_size:
                    bulk_file_groups.append((current_group, current_group_size))
                    current_group_size = 0
                    current_group = []

                current_group.append(filename)
                current_group_size += file_size
            if current_group:
                bulk_file_groups.append((current_group, current_group_size))
        elif resource_type == ResourceType.REMOTE:
            data = {"remote_files[{}]".format(i): f for i, f in enumerate(resources)}
        elif resource_type == ResourceType.SHARE:
            data = {"server_files[{}]".format(i): f for i, f in enumerate(resources)}

        data["image_quality"] = 70

        ## capture additional kwargs
        for flag in [
            "chunk_size",
            "copy_data",
            "image_quality",
            "sorting_method",
            "start_frame",
            "stop_frame",
            "use_cache",
            "use_zip_chunks",
        ]:
            if kwargs.get(flag) is not None:
                data[flag] = kwargs.get(flag)
        if kwargs.get("frame_step") is not None:
            data["frame_filter"] = f"step={kwargs.get('frame_step')}"

        if resource_type in [ResourceType.REMOTE, ResourceType.SHARE]:
            response = self.session.post(url, data=data)
            response.raise_for_status()
        elif resource_type == ResourceType.LOCAL:
            if pbar is None:
                pbar = self._make_pbar("Uploading files...")

            if pbar is not None:
                pbar.reset(total_size)

            self._tus_start_upload(url)

            for group, group_size in bulk_file_groups:
                with ExitStack() as es:
                    group_files = {}
                    for i, filename in enumerate(group):
                        group_files[f"client_files[{i}]"] = (
                            filename,
                            es.enter_context(closing(open(filename, "rb"))),
                        )
                    response = self.session.post(
                        url, data=data, files=group_files, headers={"Upload-Multiple": ""}
                    )
                expect_status(200, response)

                if pbar is not None:
                    pbar.update(group_size)

            for filename in separate_files:
                self._upload_file_with_tus(url, filename, pbar=pbar, logger=log.debug)

            self._tus_finish_upload(url, data=data)

    def tasks_list(self, use_json_output, **kwargs):
        """List all tasks in either basic or JSON format."""
        url = self.api.tasks
        response = self.session.get(url)
        response.raise_for_status()
        output = []
        page = 1
        json_data_list = []
        while True:
            response_json = response.json()
            output += response_json["results"]
            for r in response_json["results"]:
                if use_json_output:
                    json_data_list.append(r)
                else:
                    log.info("{id},{name},{status}".format(**r))
            if not response_json["next"]:
                log.info(json.dumps(json_data_list, indent=4))
                return output
            page += 1
            url = self.api.tasks_page(page)
            response = self.session.get(url)
            response.raise_for_status()
        return output

    def tasks_create(
        self,
        name: str,
        labels: List[Dict[str, str]],
        resource_type: ResourceType,
        resources: Sequence[str],
        *,
        annotation_path="",
        annotation_format="CVAT XML 1.1",
        completion_verification_period=20,
        git_completion_verification_period=2,
        dataset_repository_url="",
        lfs=False,
        pbar: tqdm.tqdm = None,
        **kwargs,
    ) -> int:
        """
        Create a new task with the given name and labels JSON and
        add the files to it.

        Returns: id of the created task
        """

        url = self.api.tasks
        labels = [] if kwargs.get("project_id") is not None else labels
        data = {"name": name, "labels": labels}

        for flag in ["bug_tracker", "overlap", "project_id", "segment_size"]:
            if kwargs.get(flag) is not None:
                data[flag] = kwargs.get(flag)

        response = self.session.post(url, json=data)
        response.raise_for_status()
        response_json = response.json()
        log.info("Created task ID: {id} NAME: {name}".format(**response_json))

        task_id = response_json["id"]
        assert isinstance(task_id, int)
        self.tasks_data(task_id, resource_type, resources, pbar=pbar, **kwargs)

        if annotation_path != "":
            url = self.api.tasks_id_status(task_id)
            response = self.session.get(url)
            response_json = response.json()

            log.info("Awaiting data compression before uploading annotations...")
            while response_json["state"] != "Finished":
                sleep(completion_verification_period)
                response = self.session.get(url)
                response_json = response.json()
                logger_string = """Awaiting compression for task {}.
                            Status={}, Message={}""".format(
                    task_id, response_json["state"], response_json["message"]
                )
                log.info(logger_string)

            self.tasks_upload(task_id, annotation_format, annotation_path, pbar=pbar, **kwargs)

        if dataset_repository_url:
            response = self.session.post(
                self.api.git_create(task_id),
                json={"path": dataset_repository_url, "lfs": lfs, "tid": task_id},
            )
            response_json = response.json()
            rq_id = response_json["rq_id"]
            log.info(f"Create RQ ID: {rq_id}")
            check_url = self.api.git_check(rq_id)
            response = self.session.get(check_url)
            response_json = response.json()
            while response_json["status"] != "finished":
                log.info(
                    """Awaiting a dataset repository to be created for the task. Response status: {}""".format(
                        response_json["status"]
                    )
                )
                sleep(git_completion_verification_period)
                response = self.session.get(check_url)
                response_json = response.json()
                if response_json["status"] == "failed" or response_json["status"] == "unknown":
                    log.error(
                        f"Dataset repository creation request for task {task_id} failed"
                        f'with status {response_json["status"]}.'
                    )
                    break

            log.info(
                f"Dataset repository creation completed with status: {response_json['status']}."
            )

        return task_id

    def tasks_delete(self, task_ids, **kwargs):
        """Delete a list of tasks, ignoring those which don't exist."""
        for task_id in task_ids:
            url = self.api.tasks_id(task_id)
            response = self.session.delete(url)
            try:
                response.raise_for_status()
                log.info("Task ID {} deleted".format(task_id))
            except requests.exceptions.HTTPError as e:
                if response.status_code == 404:
                    log.info("Task ID {} not found".format(task_id))
                else:
                    raise e

    def tasks_frame(self, task_id, frame_ids, outdir="", quality="original", **kwargs):
        """Download the requested frame numbers for a task and save images as
        task_<ID>_frame_<FRAME>.jpg."""
        for frame_id in frame_ids:
            url = self.api.tasks_id_frame_id(task_id, frame_id, quality)
            response = self.session.get(url)
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
            im.save(os.path.join(outdir, outfile))

    def tasks_dump(
        self, task_id, fileformat, filename, *, pbar=None, completion_check_period=2, **kwargs
    ) -> None:
        """
        Download annotations for a task in the specified format (e.g. 'YOLO ZIP 1.0').
        """

        url = self.api.tasks_id(task_id)
        response = self.session.get(url)
        response.raise_for_status()
        response_json = response.json()

        url = self.api.tasks_id_annotations_filename(task_id, response_json["name"], fileformat)

        log.info("Waiting for the server to prepare the file...")

        while True:
            response = self.session.get(url)
            response.raise_for_status()
            log.info("STATUS {}".format(response.status_code))
            if response.status_code == 201:
                break
            sleep(completion_check_period)

        if pbar is None:
            pbar = self._make_pbar("Downloading")
        self._download_file(url + "&action=download", output_path=filename, pbar=pbar)

        log.info(f"Annotations have been exported to {filename}")

    def _make_tus_uploader(cli, url, **kwargs):
        # Adjusts the library code for CVAT server
        # allows to reuse session
        class MyTusUploader(client.Uploader):
            def __init__(self, *_args, session: requests.Session = None, **_kwargs):
                self._session = session
                super().__init__(*_args, **_kwargs)

            def _do_request(self):
                self.request = TusRequest(self)
                self.request.handle = self._session
                try:
                    self.request.perform()
                    self.verify_upload()
                except TusUploadFailed as error:
                    self._retry_or_cry(error)

            @uploader._catch_requests_error
            def create_url(self):
                """
                Return upload url.

                Makes request to tus server to create a new upload url for the required file upload.
                """
                headers = self.headers
                headers["upload-length"] = str(self.file_size)
                headers["upload-metadata"] = ",".join(self.encode_metadata())
                headers["origin"] = cli.api.host  # required by CVAT server
                resp = self._session.post(self.client.url, headers=headers)
                url = resp.headers.get("location")
                if url is None:
                    msg = "Attempt to retrieve create file url with status {}".format(
                        resp.status_code
                    )
                    raise uploader.TusCommunicationError(msg, resp.status_code, resp.content)
                return uploader.urljoin(self.client.url, url)

            @uploader._catch_requests_error
            def get_offset(self):
                """
                Return offset from tus server.

                This is different from the instance attribute 'offset' because this makes an
                http request to the tus server to retrieve the offset.
                """
                resp = self._session.head(self.url, headers=self.headers)
                offset = resp.headers.get("upload-offset")
                if offset is None:
                    msg = "Attempt to retrieve offset fails with status {}".format(resp.status_code)
                    raise uploader.TusCommunicationError(msg, resp.status_code, resp.content)
                return int(offset)

        tus_client = client.TusClient(url, headers=cli.session.headers)
        return MyTusUploader(client=tus_client, session=cli.session, **kwargs)

    def _upload_file_data_with_tus(self, url, filename, *, params=None, pbar=None, logger=None):
        CHUNK_SIZE = 10 * 2**20

        file_size = os.stat(filename).st_size

        with open(filename, "rb") as input_file:
            if pbar is not None:
                input_file = StreamWithProgress(input_file, pbar, length=file_size)

            tus_uploader = self._make_tus_uploader(
                url + "/",
                metadata=params,
                file_stream=input_file,
                chunk_size=CHUNK_SIZE,
                log_func=logger,
            )
            tus_uploader.upload()

    def _upload_file_with_tus(self, url, filename, *, params=None, pbar=None, logger=None):
        # "CVAT-TUS" protocol has 2 extra messages
        self._tus_start_upload(url, params=params)
        self._upload_file_data_with_tus(
            url=url, filename=filename, params=params, pbar=pbar, logger=logger
        )
        return self._tus_finish_upload(url, params=params)

    def _tus_start_upload(self, url, *, params=None):
        response = self.session.post(url, headers={"Upload-Start": ""}, params=params)
        expect_status(202, response)
        return response

    def _tus_finish_upload(self, url, *, params=None, data=None):
        response = self.session.post(url, headers={"Upload-Finish": ""}, params=params, data=data)
        expect_status(202, response)
        return response

    def tasks_upload(
        self, task_id, fileformat, filename, *, completion_check_period=2, pbar=None, **kwargs
    ):
        """Upload annotations for a task in the specified format
        (e.g. 'YOLO ZIP 1.0')."""
        url = self.api.tasks_id_annotations(task_id)
        params = {"format": fileformat, "filename": os.path.basename(filename)}

        if pbar is None:
            pbar = self._make_pbar("Uploading...")

        self._upload_file_with_tus(url, filename, params=params, pbar=pbar, logger=log.debug)

        while True:
            response = self.session.put(url, params=params)
            response.raise_for_status()
            if response.status_code == 201:
                break

            sleep(completion_check_period)

        log.info(f"Upload job for Task ID {task_id} " f"with annotation file {filename} finished")

    def tasks_export(self, task_id, filename, *, completion_check_period=2, pbar=None, **kwargs):
        """Download a task backup"""
        log.info("Waiting for the server to prepare the file...")

        url = self.api.tasks_id_backup(task_id)
        while True:
            response = self.session.get(url)
            response.raise_for_status()
            log.info("STATUS {}".format(response.status_code))
            if response.status_code == 201:
                break
            sleep(completion_check_period)

        if pbar is None:
            pbar = self._make_pbar("Downloading")
        self._download_file(url + "?action=download", output_path=filename, pbar=pbar)

        log.info(f"Task {task_id} has been exported sucessfully " f"to {os.path.abspath(filename)}")

    def tasks_import(self, filename, *, completion_check_period=2, pbar=None, **kwargs) -> None:
        """Import a task from a backup file"""

        url = self.api.tasks_backup()
        params = {"filename": os.path.basename(filename)}

        if pbar is None:
            pbar = self._make_pbar("Uploading...")

        response = self._upload_file_with_tus(
            url, filename, params=params, pbar=pbar, logger=log.debug
        )
        response_json = response.json()
        rq_id = response_json["rq_id"]

        # check task status
        while True:
            sleep(completion_check_period)

            response = self.session.post(url, data={"rq_id": rq_id})
            if response.status_code == 201:
                break
            expect_status(202, response)

        task_id = response.json()["id"]
        log.info(f"Task has been imported sucessfully. Task ID: {task_id}")

    def login(self, credentials):
        url = self.api.login
        auth = {"username": credentials[0], "password": credentials[1]}
        response = self.session.post(url, auth)
        response.raise_for_status()
        if "csrftoken" in response.cookies:
            self.session.headers["X-CSRFToken"] = response.cookies["csrftoken"]

    def _make_pbar(self, title: str = None) -> tqdm.tqdm:
        return tqdm.tqdm(unit_scale=True, unit="B", unit_divisor=1024, desc=title)

    def _download_file(
        self, url: str, output_path: str, *, timeout: int = 60, pbar: Optional[tqdm.tqdm] = None
    ) -> None:
        """
        Downloads the file from url into a temporary file, then renames it
        to the requested name.
        """

        CHUNK_SIZE = 10 * 2**20

        assert not osp.exists(output_path)

        tmp_path = output_path + ".tmp"
        if osp.exists(tmp_path):
            raise FileExistsError(f"Can't write temporary file '{tmp_path}' - file exists")

        response = self.session.get(url, timeout=timeout, stream=True)

        with closing(response):
            response.raise_for_status()

            try:
                file_size = int(response.headers.get("Content-Length", 0))
            except (ValueError, KeyError):
                file_size = None

            try:
                with open(tmp_path, "wb") as fd:
                    if pbar is not None:
                        pbar.reset(file_size)

                    try:
                        for chunk in response.iter_content(chunk_size=CHUNK_SIZE):
                            if pbar is not None:
                                pbar.update(n=len(chunk))

                            fd.write(chunk)
                    finally:
                        if pbar is not None:
                            pbar.close()

                os.rename(tmp_path, output_path)
            except:
                os.unlink(tmp_path)
                raise


class CVAT_API_V2:
    """Build parameterized API URLs"""

    def __init__(self, host, https=False):
        if host.startswith("https://"):
            https = True
        if host.startswith("http://") or host.startswith("https://"):
            host = host.replace("http://", "")
            host = host.replace("https://", "")
        scheme = "https" if https else "http"
        self.host = "{}://{}".format(scheme, host)
        self.base = self.host + "/api/"
        self.git = f"{scheme}://{host}/git/repository/"

    @property
    def tasks(self):
        return self.base + "tasks"

    def tasks_page(self, page_id):
        return self.tasks + "?page={}".format(page_id)

    def tasks_backup(self):
        return self.tasks + "/backup"

    def tasks_id(self, task_id):
        return self.tasks + "/{}".format(task_id)

    def tasks_id_data(self, task_id):
        return self.tasks_id(task_id) + "/data"

    def tasks_id_frame_id(self, task_id, frame_id, quality):
        return self.tasks_id(task_id) + "/data?type=frame&number={}&quality={}".format(
            frame_id, quality
        )

    def tasks_id_status(self, task_id):
        return self.tasks_id(task_id) + "/status"

    def tasks_id_backup(self, task_id):
        return self.tasks_id(task_id) + "/backup"

    def tasks_id_annotations(self, task_id):
        return self.tasks_id(task_id) + "/annotations"

    def tasks_id_annotations_format(self, task_id, fileformat):
        return self.tasks_id_annotations(task_id) + "?format={}".format(fileformat)

    def tasks_id_annotations_filename(self, task_id, name, fileformat):
        return self.tasks_id_annotations(task_id) + "?format={}&filename={}".format(
            fileformat, name
        )

    def git_create(self, task_id):
        return self.git + f"create/{task_id}"

    def git_check(self, rq_id):
        return self.git + f"check/{rq_id}"

    @property
    def login(self):
        return self.base + "auth/login"
