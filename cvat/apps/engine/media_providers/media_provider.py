# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from abc import ABCMeta


class IMediaProvider(metaclass=ABCMeta):
    def unload(self):
        pass
