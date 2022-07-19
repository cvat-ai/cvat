# Copyright (C) 2020-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import json
import logging
import mimetypes
import os
import os.path as osp
from contextlib import ExitStack, closing
from http.cookies import SimpleCookie
from io import BytesIO
from time import sleep
from typing import Dict, List, Optional, Sequence, Tuple

import requests
import tqdm
from PIL import Image
from tusclient import client, uploader
from tusclient.request import TusRequest, TusUploadFailed

from cvat_sdk import ApiClient, ApiException, ApiValueError, Configuration, models
from cvat_sdk.types import ResourceType
from cvat_sdk.utils import StreamWithProgress, expect_status, filter_dict

log = logging.getLogger(__name__)


class CvatClient:
    def __init__(self, url: str, *, credentials: Optional[Tuple[str, str]] = None):
        # TODO: try to autodetect schema
        self._api_map = _CVAT_API_V2(url)
        self.api = ApiClient(Configuration(host=url))

        if credentials is not None:
            self.login(credentials)

    def __enter__(self):
        self.api.__enter__()
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        return self.api.__exit__(exc_type, exc_value, traceback)

    def close(self):
        return self.__exit__(None, None, None)

    @staticmethod
    def _detect_schema(url: str) -> str:
        raise NotImplementedError

    def login(self, credentials: Tuple[str, str]):
        (auth, response) = self.api.auth_api.create_login(
            models.LoginRequest(username=credentials[0], password=credentials[1])
        )

        self.api.set_default_header("Authorization", "Token " + auth.key)

        # TODO: use requests instead of urllib3
        # TODO: add cookie handling to ApiClient
        cookies = SimpleCookie(response.getheader("Set-Cookie"))
        self.api.cookie = " ".join(
            [cookies["sessionid"].output(header=""), cookies["csrftoken"].output(header="")]
        )

    def create_task(
        self,
        conf: models.TaskWriteRequest,
        resource_type: ResourceType,
        resources: Sequence[str],
        *,
        annotation_path: str = "",
        annotation_format: str = "CVAT XML 1.1",
        status_check_period: int = 5,
        dataset_repository_url: str = "",
        use_lfs: bool = False,
        pbar: Optional[tqdm.tqdm] = None,
        **kwargs,
    ) -> int:
        """
        Create a new task with the given name and labels JSON and
        add the files to it.

        Returns: id of the created task
        """

        if conf.get("project_id") and conf.get("labels"):
            raise ApiValueError(
                "Can't set labels to a task inside a project. "
                "Tasks inside a project use project's labels.",
                ["labels"],
            )
        (task, _) = self.api.tasks_api.create(conf)
        log.debug("Created task ID: %s NAME: %s", task.id, task.name)

        self.upload_task_data(task.id, resource_type, resources, pbar=pbar, **kwargs)

        log.debug("Awaiting for task %s creation...", task.id)
        status = None
        while status != models.RqStatusStateEnum.allowed_values[("value",)]["FINISHED"]:
            sleep(status_check_period)
            (status, _) = self.api.tasks_api.retrieve_status(task.id)

            log.debug(
                " Status=%s, Message=%s",
                status.state.value,
                status.message,
            )

            if status == models.RqStatusStateEnum.allowed_values[("value",)]["FAILED"]:
                raise ApiException(status=status.state.value, reason=status.message)

            status = status.state.value

        if annotation_path:
            self.upload_task_annotations(
                task.id, annotation_format, annotation_path, pbar=pbar, **kwargs
            )

        if dataset_repository_url:
            self._create_git_repo(
                task_id=task.id,
                repo_url=dataset_repository_url,
                status_check_period=status_check_period,
                use_lfs=use_lfs,
            )

        return task.id

    def _create_git_repo(
        self, *, task_id: int, repo_url: str, status_check_period: int = 5, use_lfs: bool = True
    ):
        common_headers = {"Cookie": self.api.cookie, **self.api.default_headers}

        response = self.api.rest_client.POST(
            self._api_map.git_create(task_id),
            post_params={"path": repo_url, "lfs": use_lfs, "tid": task_id},
            headers=common_headers,
        )
        response_json = json.loads(response)
        rq_id = response_json["rq_id"]
        log.info(f"Create RQ ID: {rq_id}")

        log.debug("Awaiting a dataset repository to be created for the task %s...", task_id)
        check_url = self._api_map.git_check(rq_id)
        status = None
        while status != "finished":
            sleep(status_check_period)
            response = self.api.rest_client.GET(check_url, headers=common_headers)
            response_json = json.loads(response.data)
            status = response_json["status"]
            if status == "failed" or status == "unknown":
                log.error(
                    "Dataset repository creation request for task %s failed" "with status %s.",
                    task_id,
                    status,
                )
                break

            log.debug(
                "Awaiting a dataset repository to be created for the task %s. Response status: %s",
                task_id,
                status,
            )

        log.debug("Dataset repository creation completed with status: %s.", status)

    MAX_REQUEST_SIZE = 100 * 2**20

    def _split_files_by_requests(
        self, filenames: List[str]
    ) -> Tuple[List[Tuple[List[str], int]], List[str], int]:
        bulk_files: Dict[str, int] = {}
        separate_files: Dict[str, int] = {}

        # sort by size
        for filename in filenames:
            filename = os.path.abspath(filename)
            file_size = os.stat(filename).st_size
            if self.MAX_REQUEST_SIZE < file_size:
                separate_files[filename] = file_size
            else:
                bulk_files[filename] = file_size

        total_size = sum(bulk_files.values()) + sum(separate_files.values())

        # group small files by requests
        bulk_file_groups: List[Tuple[List[str], int]] = []
        current_group_size: int = 0
        current_group: List[str] = []
        for filename, file_size in bulk_files.items():
            if self.MAX_REQUEST_SIZE < current_group_size + file_size:
                bulk_file_groups.append((current_group, current_group_size))
                current_group_size = 0
                current_group = []

            current_group.append(filename)
            current_group_size += file_size
        if current_group:
            bulk_file_groups.append((current_group, current_group_size))

        return bulk_file_groups, separate_files, total_size

    def upload_task_data(
        self,
        task_id: int,
        resource_type: ResourceType,
        resources: Sequence[str],
        *,
        pbar: Optional[tqdm.tqdm] = None,
        **kwargs,
    ) -> None:
        """Add local, remote, or shared files to an existing task."""
        data = {}
        if resource_type is ResourceType.LOCAL:
            bulk_file_groups, separate_files, total_size = self._split_files_by_requests(resources)
        elif resource_type is ResourceType.REMOTE:
            data = {f"remote_files[{i}]": f for i, f in enumerate(resources)}
        elif resource_type is ResourceType.SHARE:
            data = {f"server_files[{i}]": f for i, f in enumerate(resources)}

        data["image_quality"] = 70
        data.update(
            filter_dict(
                kwargs,
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
        if kwargs.get("frame_step") is not None:
            data["frame_filter"] = f"step={kwargs.get('frame_step')}"

        if resource_type in [ResourceType.REMOTE, ResourceType.SHARE]:
            self.api.tasks_api.create_data(
                task_id,
                data_request=models.DataRequest(**data),
                _content_type="multipart/form-data",
            )
        elif resource_type == ResourceType.LOCAL:
            if pbar is not None:
                pbar.reset(total_size)

            url = self._api_map.make_endpoint_url(
                self.api.tasks_api.create_data_endpoint.path.format(id=task_id)
            )
            self._tus_start_upload(url)

            for group, group_size in bulk_file_groups:
                with ExitStack() as es:
                    files = {}
                    for i, filename in enumerate(group):
                        files[f"client_files[{i}]"] = (
                            filename,
                            es.enter_context(closing(open(filename, "rb"))).read(),
                        )
                    response = self.api.rest_client.POST(
                        url,
                        post_params=dict(**data, **files),
                        headers={
                            "Content-Type": "multipart/form-data",
                            "Upload-Multiple": "",
                            "Cookies": self.api.cookie,
                            **self.api.default_headers,
                        },
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

    def _make_tus_uploader(cli: CvatClient, url, **kwargs):
        # Adjusts the library code for CVAT server
        # allows to reuse session
        class MyTusUploader(client.Uploader):
            def __init__(self, *_args, api_client: ApiClient, **_kwargs):
                self._api_client = api_client
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
                resp = self._api_client.rest_client.POST(self.client.url, headers=headers)
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
                resp = self._api_client.rest_client.HEAD(self.url, headers=self.headers)
                offset = resp.headers.get("upload-offset")
                if offset is None:
                    msg = "Attempt to retrieve offset fails with status {}".format(resp.status_code)
                    raise uploader.TusCommunicationError(msg, resp.status_code, resp.content)
                return int(offset)

        headers = {}
        headers["Origin"] = cli.api.configuration.host  # required by CVAT server
        headers["Cookie"] = cli.api.cookie
        headers.update(cli.api.default_headers)
        tus_client = client.TusClient(url, headers=headers)
        return MyTusUploader(client=tus_client, api_client=cli.api, **kwargs)

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
        response = self.api.rest_client.POST(
            url,
            post_params=params,
            headers={
                "Content-Type": "multipart/form-data",
                "Upload-Start": "",
                "Cookies": self.api.cookie,
                **self.api.default_headers,
            },
        )
        expect_status(202, response)
        return response

    def _tus_finish_upload(self, url, *, params=None, data=None):
        response = self.api.rest_client.POST(
            url,
            headers={
                "Content-Type": "multipart/form-data",
                "Upload-Finish": "",
                "Cookies": self.api.cookie,
                **self.api.default_headers,
            },
            post_params=dict(**(params or {}), **(data or {})),
        )
        expect_status(202, response)
        return response

    def upload_task_annotations(
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


class _CVAT_API_V2:
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

    def git_create(self, task_id):
        return self.git + f"create/{task_id}"

    def git_check(self, rq_id):
        return self.git + f"check/{rq_id}"

    def make_endpoint_url(self, path: str) -> str:
        return self.host + path
