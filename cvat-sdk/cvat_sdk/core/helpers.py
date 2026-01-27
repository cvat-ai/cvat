# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import io
import json
import warnings
from collections.abc import Iterable
from typing import Any

import tqdm
import urllib3

from cvat_sdk import exceptions
from cvat_sdk.api_client.api_client import ApiClient, Endpoint
from cvat_sdk.core.progress import BaseProgressReporter, ProgressReporter


def get_paginated_collection(
    endpoint: Endpoint, *, return_json: bool = False, **kwargs
) -> list | list[dict[str, Any]]:
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

        if (
            page_contents is not None
            and not page_contents.next
            or page_contents is None
            and not json.loads(response.data).get("next")
        ):
            break
        page += 1

    return results


class _BaseTqdmProgressReporter(BaseProgressReporter):
    tqdm: tqdm.tqdm | None

    def report_status(self, progress: int):
        super().report_status(progress)
        self.tqdm.update(progress - self.tqdm.n)

    def advance(self, delta: int):
        super().advance(delta)
        self.tqdm.update(delta)


class TqdmProgressReporter(_BaseTqdmProgressReporter):
    def __init__(self, instance: tqdm.tqdm) -> None:
        super().__init__()
        warnings.warn(f"use {DeferredTqdmProgressReporter.__name__} instead", DeprecationWarning)

        self.tqdm = instance

    def start2(self, total: int, *, desc: str | None = None, **kwargs) -> None:
        super().start2(total=total, desc=desc, **kwargs)

        self.tqdm.reset(total)
        self.tqdm.set_description_str(desc)

    def finish(self):
        self.tqdm.refresh()
        super().finish()


class DeferredTqdmProgressReporter(_BaseTqdmProgressReporter):
    def __init__(self, tqdm_args: dict | None = None) -> None:
        super().__init__()
        self.tqdm_args = tqdm_args or {}
        self.tqdm = None

    def start2(
        self,
        total: int,
        *,
        desc: str | None = None,
        unit: str = "it",
        unit_scale: bool = False,
        unit_divisor: int = 1000,
        **kwargs,
    ) -> None:
        super().start2(
            total=total,
            desc=desc,
            unit=unit,
            unit_scale=unit_scale,
            unit_divisor=unit_divisor,
            **kwargs,
        )
        assert not self.tqdm

        self.tqdm = tqdm.tqdm(
            **self.tqdm_args,
            total=total,
            desc=desc,
            unit=unit,
            unit_scale=unit_scale,
            unit_divisor=unit_divisor,
        )

    def finish(self):
        self.tqdm.close()
        self.tqdm = None
        super().finish()


class StreamWithProgress:
    def __init__(self, stream: io.RawIOBase, pbar: ProgressReporter):
        self.stream = stream
        self.pbar = pbar

        assert self.stream.tell() == 0

    def read(self, size=-1):
        chunk = self.stream.read(size)
        if chunk is not None:
            self.pbar.advance(len(chunk))
        return chunk

    def seek(self, pos: int, whence: int = io.SEEK_SET) -> None:
        old_pos = self.stream.tell()
        new_pos = self.stream.seek(pos, whence)
        self.pbar.advance(new_pos - old_pos)
        return new_pos

    def tell(self) -> int:
        return self.stream.tell()


def expect_status(codes: int | Iterable[int], response: urllib3.HTTPResponse) -> None:
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


def make_request_headers(api_client: ApiClient, **kwargs) -> dict[str, str]:
    headers = api_client.get_common_headers()
    query_params = []
    api_client.update_params_for_auth(headers=headers, queries=query_params, **kwargs)
    assert not query_params  # query auth is not expected

    return headers
