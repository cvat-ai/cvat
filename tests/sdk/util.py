# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
import json
import re

import urllib3
from cvat_sdk.exceptions import ApiValueError
from cvat_sdk.rest import RESTClientObject
from cvat_sdk.usecases.progress import TqdmProgressReporter
from tqdm import tqdm


class RestClientMock(RESTClientObject):
    def __init__(self, session):
        self.session = session

    def request(
        self,
        method,
        url,
        query_params=None,
        headers=None,
        body=None,
        post_params=None,
        *,
        _parse_response=True,
        _request_timeout=None,
        _check_status=True,
    ):
        if post_params and body:
            raise ApiValueError(
                "body parameter cannot be used with post_params parameter."
            )

        def _is_file(v):
            return isinstance(v, io.IOBase) or hasattr(v, "read")

        def _is_file_param(v):
            if _is_file(v):
                return True
            elif isinstance(v, tuple) and 2 <= len(v) <= 4:
                return isinstance(v[0], str) and (
                    isinstance(v[1], (str, bytes)) or _is_file(v[1])
                )
            return False

        if isinstance(body, dict):
            post_params = body
            body = None

        files = {}
        if post_params:
            # assume file parameters only in the root
            json_params = {}
            for k, v in post_params.items():
                if _is_file_param(v):
                    files[k] = v
                else:
                    json_params[k] = v
        else:
            json_params = post_params

        if json_params:
            assert not body
            if files:
                body = json_params
            else:
                body = json.dumps(json_params)

        for k, v in headers.items():
            if files and re.match("^multipart/form-data", v, flags=re.IGNORECASE):
                # requests handles this automatically
                del headers[k]
                break

        response = self.session.request(
            method,
            url,
            params=query_params,
            data=body,
            files=files,
            headers=headers,
            timeout=_request_timeout,
        )

        if _check_status:
            response.raise_for_status()

        return urllib3.HTTPResponse(
            body=response.content,
            headers=response.headers,
            status=response.status_code,
            reason=response.reason,
        )


def make_pbar(file, **kwargs):
    return TqdmProgressReporter(tqdm(file=file, mininterval=0, **kwargs))
