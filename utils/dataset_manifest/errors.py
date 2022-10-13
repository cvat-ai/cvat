# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

class Error(Exception):
    """
    The basic exception type for all exceptions in the library
    """

class InvalidVideoFrameError(Error):
    pass

class InvalidManifestError(Error):
    pass

class InvalidManifestFieldError(InvalidManifestError):
    pass

class MissingFieldError(InvalidManifestFieldError):
    pass

class InvalidFieldValueError(InvalidManifestFieldError):
    pass
