# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import os
import os.path as osp
from contextlib import ExitStack, closing
from typing import TYPE_CHECKING, Any, Dict, List, Optional, Sequence, Tuple

import requests
import urllib3

from cvat_sdk.api_client.api_client import ApiClient, Endpoint
from cvat_sdk.api_client.rest import RESTClientObject
from cvat_sdk.core.helpers import StreamWithProgress, expect_status
from cvat_sdk.core.progress import ProgressReporter

if TYPE_CHECKING:
    from cvat_sdk.core.client import Client

MAX_REQUEST_SIZE = 100 * 2**20


class Uploader:
    """
    Implements common uploading protocols
    """

    def __init__(self, client: Client):
        self._client = client

    def upload_file(
        self,
        url: str,
        filename: str,
        *,
        meta: Dict[str, Any],
        query_params: Dict[str, Any] = None,
        fields: Optional[Dict[str, Any]] = None,
        pbar: Optional[ProgressReporter] = None,
        logger=None,
    ) -> urllib3.HTTPResponse:
        """
        Annotation uploads:
        - have "filename" meta field in chunks
        - have "filename" and "format" query params in the "Upload-Finished" request


        Data (image, video, ...) uploads:
        - have "filename" meta field in chunks
        - have a number of fields in the "Upload-Finished" request


        Backup uploads:
        - have "filename" meta field in chunks
        - have "filename" query params in the "Upload-Finished" request

        OR
        - have "task_file" field in the POST request data (a file)

        meta['filename'] is always required. It must be set to the "visible" file name or path

        Returns:
            response of the last request (the "Upload-Finished" one)
        """
        # "CVAT-TUS" protocol has 2 extra messages
        # query params are used only in the extra messages
        assert meta["filename"]

        self._tus_start_upload(url, query_params=query_params)
        self._upload_file_data_with_tus(
            url=url, filename=filename, meta=meta, pbar=pbar, logger=logger
        )
        return self._tus_finish_upload(url, query_params=query_params, fields=fields)

    def _wait_for_completion(
        self,
        url: str,
        *,
        success_status: int,
        status_check_period: Optional[int] = None,
        query_params: Optional[Dict[str, Any]] = None,
        post_params: Optional[Dict[str, Any]] = None,
        method: str = "POST",
        positive_statuses: Optional[Sequence[int]] = None,
    ) -> urllib3.HTTPResponse:
        return self._client.wait_for_completion(
            url,
            success_status=success_status,
            status_check_period=status_check_period,
            query_params=query_params,
            post_params=post_params,
            method=method,
            positive_statuses=positive_statuses,
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

        class RestClientAdapter:
            # Provides requests.Session-like interface for REST client
            # only patch is called in the tus client

            def __init__(self, rest_client: RESTClientObject):
                self.rest_client = rest_client

            def _request(self, method, url, data=None, json=None, **kwargs):
                raw = self.rest_client.request(
                    method=method,
                    url=url,
                    headers=kwargs.get("headers"),
                    query_params=kwargs.get("params"),
                    post_params=json,
                    body=data,
                    _parse_response=False,
                    _request_timeout=kwargs.get("timeout"),
                    _check_status=False,
                )

                result = requests.Response()
                result._content = raw.data
                result.raw = raw
                result.headers.update(raw.headers)
                result.status_code = raw.status
                result.reason = raw.msg
                return result

            def patch(self, *args, **kwargs):
                return self._request("PATCH", *args, **kwargs)

        class MyTusUploader(Uploader):
            # Adjusts the library code for CVAT server
            # Allows to reuse session

            def __init__(self, *_args, api_client: ApiClient, **_kwargs):
                self._api_client = api_client
                super().__init__(*_args, **_kwargs)

            def _do_request(self):
                self.request = TusRequest(self)
                self.request.handle = RestClientAdapter(self._api_client.rest_client)
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
                # FIXME: traefik changes HEAD to GET for some reason, and it breaks the protocol

                # Assume we are starting from scratch. This effectively disallows us to resume
                # old file uploading
                return 0

                # resp = self._api_client.rest_client.HEAD(self.url, headers=self.headers)
                # offset = resp.headers.get("upload-offset")
                # if offset is None:
                #     msg = "Attempt to retrieve offset fails with status {}".format(resp.status_code)
                #     raise tus_uploader.TusCommunicationError(msg, resp.status_code, resp.content)
                # return int(offset)

        # Add headers required by CVAT server
        headers = {}
        headers["Origin"] = api_client.configuration.host
        headers.update(api_client.get_common_headers())

        client = TusClient(url, headers=headers)

        return MyTusUploader(client=client, api_client=api_client, **kwargs)

    def _upload_file_data_with_tus(self, url, filename, *, meta=None, pbar=None, logger=None):
        CHUNK_SIZE = 10 * 2**20

        file_size = os.stat(filename).st_size

        with open(filename, "rb") as input_file:
            if pbar is not None:
                input_file = StreamWithProgress(input_file, pbar, length=file_size)

            tus_uploader = self._make_tus_uploader(
                self._client.api_client,
                url=url.rstrip("/") + "/",
                metadata=meta,
                file_stream=input_file,
                chunk_size=CHUNK_SIZE,
                log_func=logger,
            )
            tus_uploader.upload()

    def _tus_start_upload(self, url, *, query_params=None):
        response = self._client.api_client.rest_client.POST(
            url,
            query_params=query_params,
            headers={
                "Upload-Start": "",
                **self._client.api_client.get_common_headers(),
            },
        )
        expect_status(202, response)
        return response

    def _tus_finish_upload(self, url, *, query_params=None, fields=None):
        response = self._client.api_client.rest_client.POST(
            url,
            headers={
                "Upload-Finish": "",
                **self._client.api_client.get_common_headers(),
            },
            query_params=query_params,
            post_params=fields,
        )
        expect_status(202, response)
        return response


class AnnotationUploader(Uploader):
    def upload_file_and_wait(
        self,
        endpoint: Endpoint,
        filename: str,
        format_name: str,
        *,
        url_params: Optional[Dict[str, Any]] = None,
        pbar: Optional[ProgressReporter] = None,
        status_check_period: Optional[int] = None,
    ):
        url = self._client.api_map.make_endpoint_url(endpoint.path, kwsub=url_params)
        params = {"format": format_name, "filename": osp.basename(filename)}
        self.upload_file(
            url, filename, pbar=pbar, query_params=params, meta={"filename": params["filename"]}
        )

        self._wait_for_completion(
            url,
            success_status=201,
            positive_statuses=[202],
            status_check_period=status_check_period,
            query_params=params,
            method="POST",
        )


class DatasetUploader(Uploader):
    def upload_file_and_wait(
        self,
        endpoint: Endpoint,
        filename: str,
        format_name: str,
        *,
        url_params: Optional[Dict[str, Any]] = None,
        pbar: Optional[ProgressReporter] = None,
        status_check_period: Optional[int] = None,
    ):
        url = self._client.api_map.make_endpoint_url(endpoint.path, kwsub=url_params)
        params = {"format": format_name, "filename": osp.basename(filename)}
        self.upload_file(
            url, filename, pbar=pbar, query_params=params, meta={"filename": params["filename"]}
        )

        self._wait_for_completion(
            url,
            success_status=201,
            positive_statuses=[202],
            status_check_period=status_check_period,
            query_params=params,
            method="GET",
        )


class DataUploader(Uploader):
    def upload_files(
        self,
        url: str,
        resources: List[str],
        *,
        pbar: Optional[ProgressReporter] = None,
        **kwargs,
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
                response = self._client.api_client.rest_client.POST(
                    url,
                    post_params=dict(**kwargs, **files),
                    headers={
                        "Content-Type": "multipart/form-data",
                        "Upload-Multiple": "",
                        **self._client.api_client.get_common_headers(),
                    },
                )
            expect_status(200, response)

            if pbar is not None:
                pbar.advance(group_size)

        for filename in separate_files:
            # TODO: check if basename produces invalid paths here, can lead to overwriting
            self._upload_file_data_with_tus(
                url,
                filename,
                meta={"filename": osp.basename(filename)},
                pbar=pbar,
                logger=self._client.logger.debug,
            )

        self._tus_finish_upload(url, fields=kwargs)
