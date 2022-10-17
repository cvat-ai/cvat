# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


from typing import Sequence


class CvatSdkException(Exception):
    """Base class for SDK exceptions"""


class InvalidHostException(CvatSdkException):
    """Indicates an invalid hostname error"""


class IncompatibleVersionException(CvatSdkException):
    """Indicates server and SDK version mismatch"""


class TooManyManifests(CvatSdkException):
    """Too many manifest files specified for an upload"""

    candidates: Sequence[str]

    def __init__(self, *args: object, candidates: Sequence[str]) -> None:
        super().__init__(*args)
        self.candidates = candidates
