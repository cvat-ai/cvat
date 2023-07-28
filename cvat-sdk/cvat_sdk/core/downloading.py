# Copyright (C) 2020-2022 Intel Corporation
# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from contextlib import closing
from pathlib import Path
from typing import TYPE_CHECKING, Any, Dict, Optional

from cvat_sdk.api_client.api_client import Endpoint
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

            with atomic_writer(output_path, "wb") as fd, pbar.task(
                total=file_size, desc="Downloading", unit_scale=True, unit="B", unit_divisor=1024
            ):
                while True:
                    chunk = response.read(amt=CHUNK_SIZE, decode_content=False)
                    if not chunk:
                        break

                    pbar.advance(len(chunk))
                    fd.write(chunk)

    def prepare_and_download_file_from_endpoint(
        self,
        endpoint: Endpoint,
        filename: Path,
        *,
        url_params: Optional[Dict[str, Any]] = None,
        query_params: Optional[Dict[str, Any]] = None,
        pbar: Optional[ProgressReporter] = None,
        status_check_period: Optional[int] = None,
    ):
        client = self._client
        if status_check_period is None:
            status_check_period = client.config.status_check_period

        client.logger.info("Waiting for the server to prepare the file...")

        url = client.api_map.make_endpoint_url(
            endpoint.path, kwsub=url_params, query_params=query_params
        )
        client.wait_for_completion(
            url,
            method="GET",
            positive_statuses=[202],
            success_status=201,
            status_check_period=status_check_period,
        )

        query_params = dict(query_params or {})
        query_params["action"] = "download"
        url = client.api_map.make_endpoint_url(
            endpoint.path, kwsub=url_params, query_params=query_params
        )
        downloader = Downloader(client)
        downloader.download_file(url, output_path=filename, pbar=pbar)
