# Copyright (C) 2020-2022 Intel Corporation
# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import logging
from typing import Optional

from cvat_sdk import ApiClient, Configuration


class CvatClient:
    """
    Manages session and configuration.
    """
    # TODO: Locates resources and APIs.

    def __init__(self, url: str, *,
            logger: Optional[logging.Logger] = None):
        # TODO: use requests instead of urllib3 in ApiClient
        # TODO: try to autodetect schema
        self._api_map = _CVAT_API_V2(url)
        self.api = ApiClient(Configuration(host=url))
        self.logger = logger or logging.getLogger(__name__)

    def __enter__(self):
        self.api.__enter__()
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        return self.api.__exit__(exc_type, exc_value, traceback)

    def close(self):
        return self.__exit__(None, None, None)


class _CVAT_API_V2:
    """Build parameterized API URLs"""

    def __init__(self, host, https=False):
        if host.startswith("https://"):
            https = True
        if host.startswith("http://") or host.startswith("https://"):
            host = host.replace("http://", "")
            host = host.replace("https://", "")
        scheme = "https" if https else "http"
        self.host = "{}://{}".format(scheme, host)
        self.base = self.host + "/api/"
        self.git = f"{scheme}://{host}/git/repository/"

    def git_create(self, task_id):
        return self.git + f"create/{task_id}"

    def git_check(self, rq_id):
        return self.git + f"check/{rq_id}"

    def make_endpoint_url(self, path: str) -> str:
        return self.host + path
