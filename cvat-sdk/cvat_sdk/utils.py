# Copyright (C) 2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import io

import requests
import tqdm


class StreamWithProgress:
    def __init__(self, stream: io.RawIOBase, pbar: tqdm.tqdm, length=None):
        self.stream = stream
        self.pbar = pbar

        if hasattr(stream, "__len__"):
            length = len(stream)

        self.length = length
        pbar.reset(length)

    def read(self, size=-1):
        chunk = self.stream.read(size)
        if chunk is not None:
            self.pbar.update(n=len(chunk))
        return chunk

    def __len__(self):
        return self.length

    def seek(self, pos, start=0):
        self.stream.seek(pos, start)
        self.pbar.n = pos

    def tell(self):
        return self.stream.tell()


def expect_status(code: int, response: requests.Response) -> None:
    response.raise_for_status()
    if response.status_code != code:
        raise Exception(
            "Failed to upload file: " f"unexpected status code received ({response.status_code})"
        )
