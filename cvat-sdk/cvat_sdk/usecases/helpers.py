# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import json
from typing import Any, Dict, List, Union

from cvat_sdk.api_client import Endpoint
from cvat_sdk.usecases.utils import assert_status


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
        assert_status(200, response)

        if return_json:
            results.extend(json.loads(response.data).get("results", []))
        else:
            results.extend(page_contents.results)

        if not page_contents.next:
            break
        page += 1

    return results
