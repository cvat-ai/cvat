# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


def popattr(obj, name):
    value = getattr(obj, name)
    delattr(obj, name)
    return value
