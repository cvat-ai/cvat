# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import io
import json
from typing import Any, Dict, Iterable, List, Optional, Union

import tqdm
import urllib3

from cvat_sdk import exceptions
from cvat_sdk.api_client.api_client import Endpoint
from cvat_sdk.core.progress import ProgressReporter


def get_paginated_collection(
    endpoint: Endpoint, *, return_json: bool = False, **kwargs
) -> Union[List, List[Dict[str, Any]]]:
    """
    Accumulates results from all the pages
    """

    results = []
    page = 1
    while True:
        (page_contents, response) = endpoint.call_with_http_info(**kwargs, page=page)
        expect_status(200, response)

        if return_json:
            results.extend(json.loads(response.data).get("results", []))
        else:
            results.extend(page_contents.results)

        if not page_contents.next:
            break
        page += 1

    return results


class TqdmProgressReporter(ProgressReporter):
    def __init__(self, instance: tqdm.tqdm) -> None:
        super().__init__()
        self.tqdm = instance

    @property
    def period(self) -> float:
        return 0

    def start(self, total: int, *, desc: Optional[str] = None):
        self.tqdm.reset(total)
        self.tqdm.set_description_str(desc)

    def report_status(self, progress: int):
        self.tqdm.update(progress - self.tqdm.n)

    def advance(self, delta: int):
        self.tqdm.update(delta)

    def finish(self):
        self.tqdm.refresh()


class StreamWithProgress:
    def __init__(self, stream: io.RawIOBase, pbar: ProgressReporter, length: Optional[int] = None):
        self.stream = stream
        self.pbar = pbar

        if hasattr(stream, "__len__"):
            length = len(stream)

        self.length = length
        pbar.start(length)

    def read(self, size=-1):
        chunk = self.stream.read(size)
        if chunk is not None:
            self.pbar.advance(len(chunk))
        return chunk

    def __len__(self):
        return self.length

    def seek(self, pos, start=0):
        self.stream.seek(pos, start)
        self.pbar.report_status(pos)

    def tell(self):
        return self.stream.tell()

    def __enter__(self) -> StreamWithProgress:
        return self

    def __exit__(self, exc_type, exc_value, exc_traceback) -> None:
        self.pbar.finish()


def expect_status(codes: Union[int, Iterable[int]], response: urllib3.HTTPResponse) -> None:
    if not hasattr(codes, "__iter__"):
        codes = [codes]

    if response.status in codes:
        return

    if 300 <= response.status <= 500:
        raise exceptions.ApiException(response.status, reason=response.msg, http_resp=response)
    else:
        raise exceptions.ApiException(
            response.status, reason="Unexpected status code received", http_resp=response
        )
