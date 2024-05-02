# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

class BasicError(Exception):
    """
    The basic exception type for all exceptions in the library
    """

class InvalidVideoError(BasicError):
    """
    Indicates an invalid video frame
    """

class InvalidManifestError(BasicError):
    """
    Indicates an invalid manifest
    """
