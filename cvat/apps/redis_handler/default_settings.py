# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT
import os

CVAT_RQ_POOL_MULTIPROCESSING_START_METHOD = os.environ.get(
    "CVAT_RQ_POOL_MULTIPROCESSING_START_METHOD",
    "fork",
)
"""
multiprocessing start method that `cvat_rqworker_pool` uses to spawn pool workers.
"""
