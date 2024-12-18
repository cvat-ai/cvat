# Copyright (C) 2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os
import warnings
from django.core.exceptions import ImproperlyConfigured


DATASET_CACHE_TTL = int(os.getenv("CVAT_DATASET_CACHE_TTL", 60 * 60 * 24))
"Base lifetime for cached exported datasets, in seconds"

default_export_cache_lock_ttl = 30

EXPORT_CACHE_LOCK_TTL = os.getenv("CVAT_DATASET_EXPORT_LOCK_TTL")
"Default lifetime for the export cache lock, in seconds."

if EXPORT_CACHE_LOCK_TTL is not None:
    EXPORT_CACHE_LOCK_TTL = int(EXPORT_CACHE_LOCK_TTL)
    warnings.warn(
        "The CVAT_DATASET_EXPORT_LOCK_TTL is deprecated, "
        "use CVAT_EXPORT_CACHE_LOCK_TTL instead", DeprecationWarning
    )
else:
    EXPORT_CACHE_LOCK_TTL = int(os.getenv("CVAT_EXPORT_CACHE_LOCK_TTL",  default_export_cache_lock_ttl))

EXPORT_CACHE_LOCK_ACQUISITION_TIMEOUT = os.getenv("CVAT_DATASET_CACHE_LOCK_TIMEOUT")
"Timeout for cache lock acquiring, in seconds"

if EXPORT_CACHE_LOCK_ACQUISITION_TIMEOUT is not None:
    EXPORT_CACHE_LOCK_ACQUISITION_TIMEOUT = int(EXPORT_CACHE_LOCK_ACQUISITION_TIMEOUT)
    warnings.warn(
        "The CVAT_DATASET_CACHE_LOCK_TIMEOUT is deprecated, "
        "use CVAT_EXPORT_CACHE_LOCK_ACQUISITION_TIMEOUT instead", DeprecationWarning
    )
else:
    default_export_cache_lock_acquire_timeout = 50
    EXPORT_CACHE_LOCK_ACQUISITION_TIMEOUT = int(os.getenv("CVAT_EXPORT_CACHE_LOCK_ACQUISITION_TIMEOUT", default_export_cache_lock_acquire_timeout))

if EXPORT_CACHE_LOCK_ACQUISITION_TIMEOUT <= EXPORT_CACHE_LOCK_TTL:
    raise ImproperlyConfigured(
        "Lock acquisition timeout must be more than lock TTL"
    )

EXPORT_LOCKED_RETRY_INTERVAL = os.getenv("CVAT_DATASET_EXPORT_LOCKED_RETRY_INTERVAL")
"Retry interval for cases the export cache lock was unavailable, in seconds"

if EXPORT_LOCKED_RETRY_INTERVAL is not None:
    EXPORT_LOCKED_RETRY_INTERVAL = int(EXPORT_LOCKED_RETRY_INTERVAL)
    warnings.warn(
        "The CVAT_DATASET_EXPORT_LOCKED_RETRY_INTERVAL is deprecated, "
        "use CVAT_EXPORT_LOCKED_RETRY_INTERVAL instead", DeprecationWarning
    )
else:
    EXPORT_LOCKED_RETRY_INTERVAL = int(os.getenv("CVAT_EXPORT_LOCKED_RETRY_INTERVAL", 60))
