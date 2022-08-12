# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


from typing import Optional

import requests


def detect_schema(url: str) -> Optional[str]:
    """
    Attempts to detect URL schema (http or https) if none provided in the URL.
    """

    if url.startswith("http://") or url.startswith("https://"):
        return url

    for schema in ["https://", "http://"]:
        try:
            v = schema + url
            response = requests.request("GET", v)
            response.raise_for_status()
            return v
        except requests.HTTPError:
            pass

    return None
