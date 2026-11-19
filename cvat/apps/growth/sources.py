# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import requests

# Bound the amount of external feed content buffered by an API worker.
MAX_DOCUMENT_SIZE = 2 * 1024 * 1024
RESPONSE_CHUNK_SIZE = 64 * 1024
HTTP_TIMEOUT = (3, 5)
STALE_TTL = 7 * 24 * 60 * 60


def read_response_text(response: requests.Response) -> str:
    """Read a UTF-8 feed, rejecting content larger than MAX_DOCUMENT_SIZE bytes."""
    chunks = []
    size = 0
    for chunk in response.iter_content(RESPONSE_CHUNK_SIZE):
        size += len(chunk)
        if size > MAX_DOCUMENT_SIZE:
            raise ValueError("The updates document exceeds the size limit.")
        chunks.append(chunk)
    return b"".join(chunks).decode("utf-8")
