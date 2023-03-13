# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


import itertools
from typing import Callable, Iterator, TypeVar

from django.http.response import HttpResponse

T = TypeVar('T')

def get_paginated_collection(
    request_chunk_callback: Callable[[int], HttpResponse]
) -> Iterator[T]:
    values = []

    for page in itertools.count(start=1):
        response = request_chunk_callback(page)
        data = response.json()
        values.extend(data["results"])
        if not data.get('next'):
            break

    return values
