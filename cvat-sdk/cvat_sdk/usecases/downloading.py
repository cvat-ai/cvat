# Copyright (C) 2020-2022 Intel Corporation
# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations
from contextlib import closing
import os

import os.path as osp
from typing import Optional

from cvat_sdk.usecases.client import CvatClient
from cvat_sdk.usecases.progress_reporter import ProgressReporter


class Downloader:
    def __init__(self, client: CvatClient):
        self.client = client

    def download_file(
        self,
        url: str,
        output_path: str,
        *,
        timeout: int = 60,
        pbar: Optional[ProgressReporter] = None,
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

        response = self.client.api.rest_client.GET(url, _request_timeout=timeout)
        with closing(response):
            try:
                file_size = int(response.getheader("Content-Length", 0))
            except (ValueError, KeyError):
                file_size = None

            try:
                with open(tmp_path, "wb") as fd:
                    if pbar is not None:
                        pbar.start(file_size, desc="Downloading")

                    try:
                        for chunk in response.read_chunked(
                                chunk_size=CHUNK_SIZE, decode_content=False):
                            if pbar is not None:
                                pbar.advance(len(chunk))

                            fd.write(chunk)
                    finally:
                        if pbar is not None:
                            pbar.close()

                os.rename(tmp_path, output_path)
            except:
                os.unlink(tmp_path)
                raise
