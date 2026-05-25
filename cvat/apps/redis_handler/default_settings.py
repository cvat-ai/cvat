# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os

RQ_THREAD_POOL_SIZE = int(os.getenv("CVAT_RQ_THREAD_POOL_SIZE", 1))
"""
Number of concurrent job slots for ThreadPoolWorker (the +1 heartbeat
slot is added internally). Only meaningful when a queue's worker is launched
with --worker-class cvat.apps.redis_handler.worker.ThreadPoolWorker.
"""

RQ_THREAD_POOL_JOB_EXECUTION_TIME_THRESHOLD = int(
    os.getenv("CVAT_RQ_THREAD_POOL_JOB_EXECUTION_TIME_THRESHOLD", 60)
)
"""
ThreadPoolWorker soft per-job SLO in seconds; also reused as the drain
timeout on shutdown. Not a kill timeout — threads cannot be killed mid-job.
"""
