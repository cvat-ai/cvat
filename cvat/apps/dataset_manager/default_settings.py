# Copyright (C) 2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os
import warnings

DATASET_CACHE_TTL = int(os.getenv("CVAT_DATASET_CACHE_TTL", 60 * 60 * 24))
"Base lifetime for cached exported datasets, in seconds"

default_dataset_export_lock_ttl = 60 * 5
DATASET_EXPORT_LOCK_TTL = int(os.getenv("CVAT_DATASET_EXPORT_LOCK_TTL",  default_dataset_export_lock_ttl))
"""
Default lifetime for the export cache lock, in seconds.
This value should be short enough to minimize the waiting time until the lock is automatically released
(e.g., in cases where a worker process is killed by the OOM killer and the lock is not released).
The lock will be automatically extended as needed for the duration of the worker process.
"""

DATASET_CACHE_LOCK_ACQUIRE_TIMEOUT = os.getenv("CVAT_DATASET_CACHE_LOCK_TIMEOUT")
"Timeout for cache lock acquiring, in seconds"

if DATASET_CACHE_LOCK_ACQUIRE_TIMEOUT is not None:
    DATASET_CACHE_LOCK_ACQUIRE_TIMEOUT = int(DATASET_CACHE_LOCK_ACQUIRE_TIMEOUT)
    warnings.warn(
        "The CVAT_DATASET_CACHE_LOCK_TIMEOUT is deprecated, "
        "use DATASET_CACHE_LOCK_ACQUIRE_TIMEOUT instead", DeprecationWarning)
else:
    default_dataset_lock_acquire_timeout = default_dataset_export_lock_ttl + 5
    """
    Set default lock acquire timeout to the default lock lifetime + small buffer
    to handle possible cases when a lock wasn't released by the worker process
    and will be released automatically by Redis
    """
    DATASET_CACHE_LOCK_ACQUIRE_TIMEOUT = int(os.getenv("DATASET_CACHE_LOCK_ACQUIRE_TIMEOUT", default_dataset_lock_acquire_timeout))

DATASET_EXPORT_LOCKED_RETRY_INTERVAL = int(os.getenv("CVAT_DATASET_EXPORT_LOCKED_RETRY_INTERVAL", 60))
"Retry interval for cases the export cache lock was unavailable, in seconds"
