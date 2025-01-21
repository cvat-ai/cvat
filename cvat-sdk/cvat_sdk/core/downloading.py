# Copyright (C) 2020-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import json
from contextlib import closing
from pathlib import Path
from typing import TYPE_CHECKING, Any, Optional

from cvat_sdk.api_client.api_client import Endpoint
from cvat_sdk.core.helpers import expect_status
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

    def download_file(
        self,
        url: str,
        output_path: Path,
        *,
        timeout: int = 60,
        pbar: Optional[ProgressReporter] = None,
    ) -> None:
        """
        Downloads the file from url into a temporary file, then renames it to the requested name.
        """

        CHUNK_SIZE = 10 * 2**20

        assert not output_path.exists()

        if pbar is None:
            pbar = NullProgressReporter()

        response = self._client.api_client.rest_client.GET(
            url,
            _request_timeout=timeout,
            headers=self._client.api_client.get_common_headers(),
            _parse_response=False,
        )
        with closing(response):
            try:
                file_size = int(response.headers.get("Content-Length", 0))
            except ValueError:
                file_size = None

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

    def prepare_file(
        self,
        endpoint: Endpoint,
        *,
        url_params: Optional[dict[str, Any]] = None,
        query_params: Optional[dict[str, Any]] = None,
        status_check_period: Optional[int] = None,
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
            headers=client.api_client.get_common_headers(),
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
        url_params: Optional[dict[str, Any]] = None,
        query_params: Optional[dict[str, Any]] = None,
        pbar: Optional[ProgressReporter] = None,
        status_check_period: Optional[int] = None,
    ):
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
        self.download_file(export_request.result_url, output_path=filename, pbar=pbar)
