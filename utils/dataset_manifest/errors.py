# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from pathlib import PurePath


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


class InvalidRelatedImageMetadataError(ValueError):
    """
    Indicates invalid related image metadata
    """

    def __init__(self, sidecar_path: PurePath, message: str) -> None:
        super().__init__(f"Invalid camera calibration sidecar '{sidecar_path}': {message}")


class InvalidManifestError(BasicError):
    """
    Indicates an invalid manifest
    """
