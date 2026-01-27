# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import base64
import json
import logging
import os
from contextlib import AbstractContextManager
from http import HTTPStatus
from pathlib import Path
from typing import TYPE_CHECKING, Any

import urllib3

from cvat_sdk.api_client.api_client import ApiClient, ApiException, Endpoint
from cvat_sdk.core.exceptions import CvatSdkException
from cvat_sdk.core.helpers import StreamWithProgress, expect_status, make_request_headers
from cvat_sdk.core.progress import NullProgressReporter, ProgressReporter

if TYPE_CHECKING:
    from cvat_sdk.core.client import Client

MAX_REQUEST_SIZE = 100 * 2**20
MAX_TUS_RETRIES = 3
TUS_CHUNK_SIZE = 10 * 2**20


def _upload_with_tus(
    api_client: ApiClient,
    create_url: str,
    metadata: dict[str, str],
    file_stream: StreamWithProgress,
    logger: logging.Logger,
) -> str:
    common_headers = {**make_request_headers(api_client), "Tus-Resumable": "1.0.0"}

    file_stream.seek(0, os.SEEK_END)
    upload_length = file_stream.tell()
    assert metadata

    response = api_client.rest_client.POST(
        create_url,
        headers={
            **common_headers,
            "Upload-Length": str(upload_length),
            "Upload-Metadata": ",".join(
                [f"{k} {base64.b64encode(v.encode()).decode()}" for k, v in metadata.items()]
            ),
        },
    )
    real_filename = response.headers.get("Upload-Filename")

    if not real_filename:
        raise CvatSdkException("Server did not send Upload-Filename after upload creation")

    upload_url = response.headers.get("Location")
    if upload_url is None:
        raise CvatSdkException("Server did not send Location after upload creation")

    upload_offset = 0
    num_errors = 0

    while True:
        file_stream.seek(upload_offset)
        chunk = file_stream.read(TUS_CHUNK_SIZE)

        new_upload_offset = None

        try:
            response = api_client.rest_client.PATCH(
                upload_url,
                headers={
                    **common_headers,
                    "Content-Type": "application/offset+octet-stream",
                    "Upload-Offset": str(upload_offset),
                },
                body=chunk,
            )

            try:
                new_upload_offset = int(response.headers["Upload-Offset"])
            except KeyError:
                raise CvatSdkException("Server did not send Upload-Offset after chunk upload")

            # prevent the server from asking us to keep uploading the same chunk
            if new_upload_offset < upload_offset + len(chunk):
                raise CvatSdkException("Server reported unexpected Upload-Offset")
        except ApiException as e:
            if e.status and e.status < 500 and e.status != HTTPStatus.CONFLICT:
                raise

            if e.headers and "Upload-Offset" in e.headers:
                new_upload_offset = int(e.headers["Upload-Offset"])

            logger.error("Chunk upload failed", exc_info=e)
            num_errors += 1
        except urllib3.exceptions.HTTPError as e:
            logger.error("Chunk upload failed", exc_info=e)
            num_errors += 1

        if num_errors >= MAX_TUS_RETRIES:
            raise CvatSdkException("Too many upload errors")

        if new_upload_offset is None:
            response = api_client.rest_client.HEAD(upload_url, headers=common_headers)
            new_upload_offset = int(response.headers["Upload-Offset"])

        if new_upload_offset == upload_length:
            return real_filename

        if not 0 <= new_upload_offset <= upload_length:
            raise CvatSdkException("Server returned invalid upload offset")

        upload_offset = new_upload_offset


class Uploader:
    """
    Implements common uploading protocols
    """

    def __init__(self, client: Client):
        self._client = client

    def upload_file(
        self,
        url: str,
        filename: Path,
        *,
        meta: dict[str, Any],
        query_params: dict[str, Any] = None,
        fields: dict[str, Any] | None = None,
        pbar: ProgressReporter | None = None,
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

    def _upload_file_data_with_tus(self, url, filename, *, meta, pbar, logger=None) -> str:
        with open(filename, "rb") as input_file:
            return _upload_with_tus(
                self._client.api_client,
                create_url=url.rstrip("/") + "/",
                metadata=meta,
                file_stream=StreamWithProgress(input_file, pbar),
                logger=logger or self._client.logger,
            )

    def _tus_start_upload(self, url, *, query_params=None):
        response = self._client.api_client.rest_client.POST(
            url,
            query_params=query_params,
            headers={
                "Upload-Start": "",
                **make_request_headers(self._client.api_client),
            },
        )
        expect_status(202, response)
        return response

    def _tus_finish_upload(self, url, *, query_params=None, fields=None):
        response = self._client.api_client.rest_client.POST(
            url,
            headers={
                "Upload-Finish": "",
                **make_request_headers(self._client.api_client),
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
        conv_mask_to_poly: bool | None = None,
        url_params: dict[str, Any] | None = None,
        pbar: ProgressReporter | None = None,
        status_check_period: int | None = None,
    ):
        url = self._client.api_map.make_endpoint_url(endpoint.path, kwsub=url_params)
        params = {"format": format_name, "filename": filename.name}
        response = self.upload_file(
            url, filename, pbar=pbar, query_params=params, meta={"filename": params["filename"]}
        )

        if conv_mask_to_poly is not None:
            params["conv_mask_to_poly"] = "true" if conv_mask_to_poly else "false"

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
        url_params: dict[str, Any] | None = None,
        conv_mask_to_poly: bool | None = None,
        pbar: ProgressReporter | None = None,
        status_check_period: int | None = None,
    ):
        url = self._client.api_map.make_endpoint_url(upload_endpoint.path, kwsub=url_params)
        params = {"format": format_name, "filename": filename.name}

        if conv_mask_to_poly is not None:
            params["conv_mask_to_poly"] = "true" if conv_mask_to_poly else "false"

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
        pbar: ProgressReporter | None = None,
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
                        **make_request_headers(self._client.api_client),
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
