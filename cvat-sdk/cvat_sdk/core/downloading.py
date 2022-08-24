# Copyright (C) 2020-2022 Intel Corporation
# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import os
import os.path as osp
from contextlib import closing
from typing import TYPE_CHECKING, Optional

from cvat_sdk.core.progress import ProgressReporter

if TYPE_CHECKING:
    from cvat_sdk.core.client import Client


class Downloader:
    def __init__(self, client: Client):
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

        response = self.client.api.rest_client.GET(
            url,
            _request_timeout=timeout,
            headers=self.client.api.get_common_headers(),
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
