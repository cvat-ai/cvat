# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


class CvatSdkException(Exception):
    """Base class for SDK exceptions"""


class InvalidHostException(CvatSdkException):
    """Indicates an invalid hostname error"""


class IncompatibleVersionException(CvatSdkException):
    """Indicates server and SDK version mismatch"""


class OutdatedModelException(CvatSdkException):
    """Indicates that SDK model is outdated and needs refreshing from the server"""
