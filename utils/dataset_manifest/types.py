# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from io import BytesIO
from typing import Protocol


class Named(Protocol):
    filename: str


class NamedBytesIO(BytesIO, Named):
    pass
