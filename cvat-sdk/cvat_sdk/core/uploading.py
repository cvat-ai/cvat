# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import json
import os
from contextlib import AbstractContextManager
from pathlib import Path
from typing import TYPE_CHECKING, Any, Optional

import requests
import urllib3

from cvat_sdk.api_client.api_client import ApiClient, Endpoint
from cvat_sdk.api_client.exceptions import ApiException
from cvat_sdk.api_client.rest import RESTClientObject
from cvat_sdk.core.helpers import StreamWithProgress, expect_status
from cvat_sdk.core.progress import NullProgressReporter, ProgressReporter

if TYPE_CHECKING:
    from cvat_sdk.core.client import Client

import tusclient.uploader as tus_uploader
from tusclient.client import TusClient as _TusClient
from tusclient.client import Uploader as _TusUploader
from tusclient.request import TusRequest as _TusRequest
from tusclient.request import TusUploadFailed as _TusUploadFailed

MAX_REQUEST_SIZE = 100 * 2**20


class _RestClientAdapter:
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


class _MyTusUploader(_TusUploader):
    # Adjusts the library code for CVAT server
    # Allows to reuse session

    def __init__(self, *_args, api_client: ApiClient, **_kwargs):
        self._api_client = api_client
        super().__init__(*_args, **_kwargs)

    def _do_request(self):
        self.request = _TusRequest(self)
        self.request.handle = _RestClientAdapter(self._api_client.rest_client)
        try:
            self.request.perform()
            self.verify_upload()
        except _TusUploadFailed as error:
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
        self.real_filename = resp.headers.get("Upload-Filename")
        url = resp.headers.get("location")
        if url is None:
            msg = "Attempt to retrieve create file url with status {}".format(resp.status_code)
            raise tus_uploader.TusCommunicationError(msg, resp.status_code, resp.content)
        return tus_uploader.urljoin(self.client.url, url)

    @tus_uploader._catch_requests_error
    def get_offset(self):
        """
        Return offset from tus server.

        This is different from the instance attribute 'offset' because this makes an
        http request to the tus server to retrieve the offset.
        """
        try:
            resp = self._api_client.rest_client.HEAD(self.url, headers=self.headers)
        except ApiException as ex:
            if ex.status == 405:  # Method Not Allowed
                # In CVAT up to version 2.2.0, HEAD requests were internally
                # converted to GET by mod_wsgi, and subsequently rejected by the server.
                # For compatibility with old servers, we'll handle such rejections by
                # restarting the upload from the beginning.
                return 0

            raise tus_uploader.TusCommunicationError(
                f"Attempt to retrieve offset failed with status {ex.status}",
                ex.status,
                ex.body,
            ) from ex

        offset = resp.headers.get("upload-offset")
        if offset is None:
            raise tus_uploader.TusCommunicationError(
                f"Attempt to retrieve offset failed with status {resp.status}",
                resp.status,
                resp.data,
            )

        return int(offset)


class Uploader:
    """
    Implements common uploading protocols
    """

    _CHUNK_SIZE = 10 * 2**20

    def __init__(self, client: Client):
        self._client = client

    def upload_file(
        self,
        url: str,
        filename: Path,
        *,
        meta: dict[str, Any],
        query_params: dict[str, Any] = None,
        fields: Optional[dict[str, Any]] = None,
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

        if pbar is None:
            pbar = NullProgressReporter()

        file_size = filename.stat().st_size

        self._tus_start_upload(url, query_params=query_params)
        with self._uploading_task(pbar, file_size):
            real_filename = self._upload_file_data_with_tus(
                url=url, filename=filename, meta=meta, pbar=pbar, logger=logger
            )
        query_params["filename"] = real_filename
        return self._tus_finish_upload(url, query_params=query_params, fields=fields)

    @staticmethod
    def _uploading_task(pbar: ProgressReporter, total_size: int) -> AbstractContextManager[None]:
        return pbar.task(
            total=total_size, desc="Uploading data", unit_scale=True, unit="B", unit_divisor=1024
        )

    @staticmethod
    def _make_tus_uploader(api_client: ApiClient, url: str, **kwargs):
        # Add headers required by CVAT server
        headers = {}
        headers["Origin"] = api_client.configuration.host
        headers.update(api_client.get_common_headers())

        client = _TusClient(url, headers=headers)

        return _MyTusUploader(client=client, api_client=api_client, **kwargs)

    def _upload_file_data_with_tus(self, url, filename, *, meta=None, pbar, logger=None) -> str:
        with open(filename, "rb") as input_file:
            tus_uploader = self._make_tus_uploader(
                self._client.api_client,
                url=url.rstrip("/") + "/",
                metadata=meta,
                file_stream=StreamWithProgress(input_file, pbar),
                chunk_size=Uploader._CHUNK_SIZE,
                log_func=logger,
            )
            tus_uploader.upload()
            return tus_uploader.real_filename

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
        filename: Path,
        format_name: str,
        *,
        url_params: Optional[dict[str, Any]] = None,
        pbar: Optional[ProgressReporter] = None,
        status_check_period: Optional[int] = None,
    ):
        url = self._client.api_map.make_endpoint_url(endpoint.path, kwsub=url_params)
        params = {"format": format_name, "filename": filename.name}
        response = self.upload_file(
            url, filename, pbar=pbar, query_params=params, meta={"filename": params["filename"]}
        )

        rq_id = json.loads(response.data).get("rq_id")
        assert rq_id, "The rq_id was not found in the response"

        self._client.wait_for_completion(rq_id, status_check_period=status_check_period)


class DatasetUploader(Uploader):
    def upload_file_and_wait(
        self,
        upload_endpoint: Endpoint,
        filename: Path,
        format_name: str,
        *,
        url_params: Optional[dict[str, Any]] = None,
        pbar: Optional[ProgressReporter] = None,
        status_check_period: Optional[int] = None,
    ):
        url = self._client.api_map.make_endpoint_url(upload_endpoint.path, kwsub=url_params)
        params = {"format": format_name, "filename": filename.name}
        response = self.upload_file(
            url, filename, pbar=pbar, query_params=params, meta={"filename": params["filename"]}
        )
        rq_id = json.loads(response.data).get("rq_id")
        assert rq_id, "The rq_id was not found in the response"

        self._client.wait_for_completion(rq_id, status_check_period=status_check_period)


class DataUploader(Uploader):
    def __init__(self, client: Client, *, max_request_size: int = MAX_REQUEST_SIZE):
        super().__init__(client)
        self.max_request_size = max_request_size

    def upload_files(
        self,
        url: str,
        resources: list[Path],
        *,
        pbar: Optional[ProgressReporter] = None,
        **kwargs,
    ):
        bulk_file_groups, separate_files, total_size = self._split_files_by_requests(resources)

        if pbar is None:
            pbar = NullProgressReporter()

        if str(kwargs.get("sorting_method")).lower() == "predefined":
            # Request file ordering, because we reorder files to send more efficiently
            kwargs.setdefault("upload_file_order", [p.name for p in resources])

        with self._uploading_task(pbar, total_size):
            self._tus_start_upload(url)

            for group, group_size in bulk_file_groups:
                files = {}
                for i, filename in enumerate(group):
                    files[f"client_files[{i}]"] = (
                        os.fspath(filename),
                        filename.read_bytes(),
                    )
                response = self._client.api_client.rest_client.POST(
                    url,
                    post_params={"image_quality": kwargs["image_quality"], **files},
                    headers={
                        "Content-Type": "multipart/form-data",
                        "Upload-Multiple": "",
                        **self._client.api_client.get_common_headers(),
                    },
                )
                expect_status(200, response)

                pbar.advance(group_size)

            for filename in separate_files:
                self._upload_file_data_with_tus(
                    url,
                    filename,
                    meta={"filename": filename.name},
                    pbar=pbar,
                    logger=self._client.logger.debug,
                )

        return self._tus_finish_upload(url, fields=kwargs)

    def _split_files_by_requests(
        self, filenames: list[Path]
    ) -> tuple[list[tuple[list[Path], int]], list[Path], int]:
        bulk_files: dict[str, int] = {}
        separate_files: dict[str, int] = {}
        max_request_size = self.max_request_size

        # sort by size
        for filename in filenames:
            filename = filename.resolve()
            file_size = filename.stat().st_size
            if max_request_size < file_size:
                separate_files[filename] = file_size
            else:
                bulk_files[filename] = file_size

        total_size = sum(bulk_files.values()) + sum(separate_files.values())

        # group small files by requests
        bulk_file_groups: list[tuple[list[str], int]] = []
        current_group_size: int = 0
        current_group: list[str] = []
        for filename, file_size in bulk_files.items():
            if max_request_size < current_group_size + file_size:
                bulk_file_groups.append((current_group, current_group_size))
                current_group_size = 0
                current_group = []

            current_group.append(filename)
            current_group_size += file_size
        if current_group:
            bulk_file_groups.append((current_group, current_group_size))

        return bulk_file_groups, separate_files, total_size
