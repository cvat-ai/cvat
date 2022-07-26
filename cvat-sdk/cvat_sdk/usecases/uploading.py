# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import logging
import os
from contextlib import ExitStack, closing
from typing import Dict, List, Optional, Tuple

from cvat_sdk import ApiClient
from cvat_sdk.usecases.client import CvatClient
from cvat_sdk.usecases.progress import ProgressReporter
from cvat_sdk.usecases.utils import StreamWithProgress, assert_status

log = logging.getLogger(__name__)


MAX_REQUEST_SIZE = 100 * 2**20


class Uploader:
    def __init__(self, client: CvatClient):
        self.client = client

    def upload_files(
        self, url: str, resources: List[str], *, pbar: Optional[ProgressReporter] = None, **kwargs
    ):
        bulk_file_groups, separate_files, total_size = self._split_files_by_requests(resources)

        if pbar is not None:
            pbar.start(total_size, desc="Uploading data")

        self._tus_start_upload(url)

        for group, group_size in bulk_file_groups:
            with ExitStack() as es:
                files = {}
                for i, filename in enumerate(group):
                    files[f"client_files[{i}]"] = (
                        filename,
                        es.enter_context(closing(open(filename, "rb"))).read(),
                    )
                response = self.client.api.rest_client.POST(
                    url,
                    post_params=dict(**kwargs, **files),
                    headers={
                        "Content-Type": "multipart/form-data",
                        "Upload-Multiple": "",
                        **self.client.api.get_common_headers(),
                    },
                )
            assert_status(200, response)

            if pbar is not None:
                pbar.advance(group_size)

        for filename in separate_files:
            self._upload_file_with_tus(url, filename, params=kwargs, pbar=pbar, logger=log.debug)

        self._tus_finish_upload(url, params=kwargs)

    def upload_file(self, url, filename, *, params=None, pbar=None, logger=None):
        return self._upload_file_with_tus(
            url=url, filename=filename, params=params, pbar=pbar, logger=logger
        )

    def _split_files_by_requests(
        self, filenames: List[str]
    ) -> Tuple[List[Tuple[List[str], int]], List[str], int]:
        bulk_files: Dict[str, int] = {}
        separate_files: Dict[str, int] = {}

        # sort by size
        for filename in filenames:
            filename = os.path.abspath(filename)
            file_size = os.stat(filename).st_size
            if MAX_REQUEST_SIZE < file_size:
                separate_files[filename] = file_size
            else:
                bulk_files[filename] = file_size

        total_size = sum(bulk_files.values()) + sum(separate_files.values())

        # group small files by requests
        bulk_file_groups: List[Tuple[List[str], int]] = []
        current_group_size: int = 0
        current_group: List[str] = []
        for filename, file_size in bulk_files.items():
            if MAX_REQUEST_SIZE < current_group_size + file_size:
                bulk_file_groups.append((current_group, current_group_size))
                current_group_size = 0
                current_group = []

            current_group.append(filename)
            current_group_size += file_size
        if current_group:
            bulk_file_groups.append((current_group, current_group_size))

        return bulk_file_groups, separate_files, total_size

    @staticmethod
    def _make_tus_uploader(api_client: ApiClient, url: str, **kwargs):
        import tusclient.uploader as tus_uploader
        from tusclient.client import TusClient, Uploader
        from tusclient.request import TusRequest, TusUploadFailed

        class MyTusUploader(Uploader):
            # Adjusts the library code for CVAT server
            # Allows to reuse session

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

            @tus_uploader._catch_requests_error
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
                    raise tus_uploader.TusCommunicationError(msg, resp.status_code, resp.content)
                return tus_uploader.urljoin(self.client.url, url)

            @tus_uploader._catch_requests_error
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
                    raise tus_uploader.TusCommunicationError(msg, resp.status_code, resp.content)
                return int(offset)

        # Add headers required by CVAT server
        headers = {}
        headers["Origin"] = api_client.configuration.host
        headers.update(api_client.get_common_headers())
        client = TusClient(url, headers=headers)

        return MyTusUploader(client=client, api_client=api_client, **kwargs)

    def _upload_file_data_with_tus(self, url, filename, *, params=None, pbar=None, logger=None):
        CHUNK_SIZE = 10 * 2**20

        file_size = os.stat(filename).st_size

        with open(filename, "rb") as input_file:
            if pbar is not None:
                input_file = StreamWithProgress(input_file, pbar, length=file_size)

            tus_uploader = self._make_tus_uploader(
                self.client.api,
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
        response = self.client.api.rest_client.POST(
            url,
            post_params=params,
            headers={
                "Upload-Start": "",
                **self.client.api.get_common_headers(),
            },
        )
        assert_status(202, response)
        return response

    def _tus_finish_upload(self, url, *, params=None):
        response = self.client.api.rest_client.POST(
            url,
            headers={
                "Upload-Finish": "",
                **self.client.api.get_common_headers(),
            },
            post_params=params,
        )
        assert_status(202, response)
        return response
