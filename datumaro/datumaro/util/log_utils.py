
# Copyright (C) 2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

from contextlib import contextmanager
import logging

@contextmanager
def logging_disabled(max_level=logging.CRITICAL):
    previous_level = logging.root.manager.disable
    logging.disable(max_level)
    try:
        yield
    finally:
        logging.disable(previous_level)