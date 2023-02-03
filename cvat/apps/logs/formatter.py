# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import logging

class CvatFormatter(logging.Formatter):
    def __init__(self):
        super().__init__()

    def format(self, record):
        message = record.getMessage()

        return message
