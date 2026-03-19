# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


class BasicError(Exception):
    """
    The basic exception type for all exceptions in the library
    """


class InvalidImageError(BasicError):
    """
    Indicates an invalid image
    """


class InvalidVideoError(BasicError):
    """
    Indicates an invalid video frame
    """


class InvalidPcdError(Exception):
    """
    Indicates an invalid point cloud
    """


class InvalidManifestError(BasicError):
    """
    Indicates an invalid manifest
    """
