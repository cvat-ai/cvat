# Copyright (C) 2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os
import warnings

DATASET_CACHE_TTL = int(os.getenv("CVAT_DATASET_CACHE_TTL", 60 * 60 * 24))
"Base lifetime for cached exported datasets, in seconds"

DATASET_CACHE_LOCK_ACQUIRE_TIMEOUT = os.getenv("CVAT_DATASET_CACHE_LOCK_TIMEOUT")
"Timeout for cache lock acquiring, in seconds"

if DATASET_CACHE_LOCK_ACQUIRE_TIMEOUT is not None:
    DATASET_CACHE_LOCK_ACQUIRE_TIMEOUT = int(DATASET_CACHE_LOCK_ACQUIRE_TIMEOUT)
    warnings.warn(
        "The CVAT_DATASET_CACHE_LOCK_TIMEOUT is deprecated, "
        "use DATASET_CACHE_LOCK_ACQUIRE_TIMEOUT instead", DeprecationWarning)
else:
    DATASET_CACHE_LOCK_ACQUIRE_TIMEOUT = int(os.getenv("DATASET_CACHE_LOCK_ACQUIRE_TIMEOUT", 10))

DATASET_EXPORT_LOCK_TTL = int(os.getenv("CVAT_DATASET_EXPORT_LOCK_TTL",  60 * 5))

DATASET_EXPORT_LOCKED_RETRY_INTERVAL = int(os.getenv("CVAT_DATASET_EXPORT_LOCKED_RETRY_INTERVAL", 60))
"Retry interval for cases the export cache lock was unavailable, in seconds"
