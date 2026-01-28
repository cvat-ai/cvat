# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


class BadFunctionError(Exception):
    """
    An exception that signifies that an auto-detection function has violated some constraint
    set by its interface.
    """
