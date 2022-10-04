# Copyright (C) 2020-2022 Intel Corporation
# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import os
import os.path as osp
from contextlib import closing
from typing import TYPE_CHECKING, Any, Dict, Optional

from cvat_sdk.api_client.api_client import Endpoint
from cvat_sdk.core.progress import ProgressReporter

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
        output_path: str,
        *,
        timeout: int = 60,
        pbar: Optional[ProgressReporter] = None,
    ) -> None:
        """
        Downloads the file from url into a temporary file, then renames it to the requested name.
        """

        CHUNK_SIZE = 10 * 2**20

        assert not osp.exists(output_path)

        tmp_path = output_path + ".tmp"
        if osp.exists(tmp_path):
            raise FileExistsError(f"Can't write temporary file '{tmp_path}' - file exists")

        response = self._client.api_client.rest_client.GET(
            url,
            _request_timeout=timeout,
            headers=self._client.api_client.get_common_headers(),
            _parse_response=False,
        )
        with closing(response):
            try:
                file_size = int(response.getheader("Content-Length", 0))
            except ValueError:
                file_size = None

            try:
                with open(tmp_path, "wb") as fd:
                    if pbar is not None:
                        pbar.start(file_size, desc="Downloading")

                    while True:
                        chunk = response.read(amt=CHUNK_SIZE, decode_content=False)
                        if not chunk:
                            break

                        if pbar is not None:
                            pbar.advance(len(chunk))

                        fd.write(chunk)

                os.rename(tmp_path, output_path)
            except:
                os.unlink(tmp_path)
                raise

    def prepare_and_download_file_from_endpoint(
        self,
        endpoint: Endpoint,
        filename: str,
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
