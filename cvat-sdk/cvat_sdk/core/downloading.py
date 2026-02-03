# Copyright (C) 2020-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import json
import os
import re
from contextlib import closing
from pathlib import Path
from typing import TYPE_CHECKING, Any

import urllib3

from cvat_sdk.api_client.api_client import Endpoint
from cvat_sdk.core.exceptions import CvatSdkException
from cvat_sdk.core.helpers import expect_status, make_request_headers
from cvat_sdk.core.progress import NullProgressReporter, ProgressReporter
from cvat_sdk.core.utils import atomic_writer

if TYPE_CHECKING:
    from cvat_sdk.core.client import Client


class Downloader:
    """
    Implements common downloading protocols
    """

    def __init__(self, client: Client):
        self._client = client

    @classmethod
    def _validate_filename(cls, filename: str) -> str | None:
        # Allow only meaningful and valid filenames for the user OS.

        if len(filename) > 254:
            return None

        stem, ext = os.path.splitext(filename)
        if not stem or len(ext) < 2:
            return None

        if filename.startswith(".") or re.search(r"[^A-Za-z0-9_\-\. ]", filename):
            return None

        return filename

    @classmethod
    def _get_server_filename(cls, response: urllib3.HTTPResponse) -> str:
        # Header format specification:
        # https://datatracker.ietf.org/doc/html/rfc2616#section-19.5.1
        content_disposition = next(
            (
                parameter
                for part in response.headers.get("Content-Disposition", "").split(";")
                if (parameter := part.strip()) and parameter.lower().startswith("filename=")
            ),
            None,
        )

        filename = None
        if content_disposition:
            filename = content_disposition.split("=", maxsplit=1)[1].strip('"')
            filename = cls._validate_filename(filename)

        if not filename:
            raise CvatSdkException(
                "Can't find the output filename in the server response, "
                "please try to specify the output filename explicitly"
            )

        return filename

    def download_file(
        self,
        url: str,
        output_path: Path,
        *,
        timeout: int = 60,
        pbar: ProgressReporter | None = None,
    ) -> Path:
        """
        Downloads the file from url into a temporary file, then renames it to the requested name.
        If output_path is a directory, saves the file into the directory with
        the server-defined name.

        Returns: path to the downloaded file
        """

        CHUNK_SIZE = 10 * 2**20

        if output_path.is_file():
            raise FileExistsError(output_path)

        if pbar is None:
            pbar = NullProgressReporter()

        response = self._client.api_client.rest_client.GET(
            url,
            headers=make_request_headers(self._client.api_client),
            _request_timeout=timeout,
            _parse_response=False,
        )
        with closing(response):
            try:
                file_size = int(response.headers.get("Content-Length", 0))
            except ValueError:
                file_size = None

            if output_path.is_dir():
                output_path /= self._get_server_filename(response)
                if output_path.exists():
                    raise FileExistsError(output_path)

            with (
                atomic_writer(output_path, "wb") as fd,
                pbar.task(
                    total=file_size,
                    desc="Downloading",
                    unit_scale=True,
                    unit="B",
                    unit_divisor=1024,
                ),
            ):
                while True:
                    chunk = response.read(amt=CHUNK_SIZE, decode_content=False)
                    if not chunk:
                        break

                    pbar.advance(len(chunk))
                    fd.write(chunk)

                return output_path

    def prepare_file(
        self,
        endpoint: Endpoint,
        *,
        url_params: dict[str, Any] | None = None,
        query_params: dict[str, Any] | None = None,
        status_check_period: int | None = None,
    ):
        client = self._client
        if status_check_period is None:
            status_check_period = client.config.status_check_period

        client.logger.info("Waiting for the server to prepare the file...")

        url = client.api_map.make_endpoint_url(
            endpoint.path, kwsub=url_params, query_params=query_params
        )

        # initialize background process
        response = client.api_client.rest_client.request(
            method=endpoint.settings["http_method"],
            url=url,
            headers=make_request_headers(self._client.api_client),
        )

        client.logger.debug("STATUS %s", response.status)
        expect_status(202, response)
        rq_id = json.loads(response.data).get("rq_id")
        assert rq_id, "Request identifier was not found in server response"

        # wait until background process will be finished or failed
        request, response = client.wait_for_completion(
            rq_id, status_check_period=status_check_period
        )

        return request

    def prepare_and_download_file_from_endpoint(
        self,
        endpoint: Endpoint,
        filename: Path,
        *,
        url_params: dict[str, Any] | None = None,
        query_params: dict[str, Any] | None = None,
        pbar: ProgressReporter | None = None,
        status_check_period: int | None = None,
    ) -> Path:
        client = self._client

        if status_check_period is None:
            status_check_period = client.config.status_check_period

        export_request = self.prepare_file(
            endpoint,
            url_params=url_params,
            query_params=query_params,
            status_check_period=status_check_period,
        )

        assert export_request.result_url, "Result url was not found in server response"
        return self.download_file(export_request.result_url, output_path=filename, pbar=pbar)
