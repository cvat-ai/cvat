# Copyright (C) 2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

from enum import Enum

class ResourceType(Enum):
    LOCAL = 0
    SHARE = 1
    REMOTE = 2

    def __str__(self):
        return self.name.lower()

    def __repr__(self):
        return str(self)

    @staticmethod
    def argparse(s):
        try:
            return ResourceType[s.upper()]
        except KeyError:
            return s
