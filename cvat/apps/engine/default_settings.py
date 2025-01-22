# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import logging as log
import os

from attrs.converters import to_bool
from django.core.exceptions import ImproperlyConfigured

logger = log.getLogger("cvat")

MEDIA_CACHE_ALLOW_STATIC_CACHE = to_bool(os.getenv("CVAT_ALLOW_STATIC_CACHE", False))
"""
Allow or disallow static media cache.
If disabled, CVAT will only use the dynamic media cache. New tasks requesting static media cache
will be automatically switched to the dynamic cache.
When enabled, this option can increase data access speed and reduce server load,
but significantly increase disk space occupied by tasks.
"""

CVAT_CHUNK_CREATE_TIMEOUT = 50
"""
Sets the chunk preparation timeout in seconds after which the backend will respond with 429 code.
"""

CVAT_CHUNK_CREATE_CHECK_INTERVAL = 0.2
"""
Sets the frequency of checking the readiness of the chunk
"""
default_export_cache_ttl = 60 * 60 * 24
default_export_cache_lock_ttl = 30
default_export_cache_lock_acquisition_timeout = 50
default_export_locked_retry_interval = 60

EXPORT_CACHE_TTL = os.getenv("CVAT_DATASET_CACHE_TTL")
"Base lifetime for cached export files, in seconds"

if EXPORT_CACHE_TTL is not None:
    EXPORT_CACHE_TTL = int(EXPORT_CACHE_TTL)
    logger.warning(
        "The CVAT_DATASET_CACHE_TTL is deprecated, use CVAT_EXPORT_CACHE_TTL instead",
    )
else:
    EXPORT_CACHE_TTL = int(os.getenv("CVAT_EXPORT_CACHE_TTL", default_export_cache_ttl))


EXPORT_CACHE_LOCK_TTL = os.getenv("CVAT_DATASET_EXPORT_LOCK_TTL")
"Default lifetime for the export cache lock, in seconds."

if EXPORT_CACHE_LOCK_TTL is not None:
    EXPORT_CACHE_LOCK_TTL = int(EXPORT_CACHE_LOCK_TTL)
    logger.warning(
        "The CVAT_DATASET_EXPORT_LOCK_TTL is deprecated, use CVAT_EXPORT_CACHE_LOCK_TTL instead",
    )
else:
    EXPORT_CACHE_LOCK_TTL = int(
        os.getenv("CVAT_EXPORT_CACHE_LOCK_TTL", default_export_cache_lock_ttl)
    )

EXPORT_CACHE_LOCK_ACQUISITION_TIMEOUT = os.getenv("CVAT_DATASET_CACHE_LOCK_TIMEOUT")
"Timeout for cache lock acquiring, in seconds"

if EXPORT_CACHE_LOCK_ACQUISITION_TIMEOUT is not None:
    EXPORT_CACHE_LOCK_ACQUISITION_TIMEOUT = int(EXPORT_CACHE_LOCK_ACQUISITION_TIMEOUT)
    logger.warning(
        "The CVAT_DATASET_CACHE_LOCK_TIMEOUT is deprecated, "
        "use CVAT_EXPORT_CACHE_LOCK_ACQUISITION_TIMEOUT instead",
    )
else:
    EXPORT_CACHE_LOCK_ACQUISITION_TIMEOUT = int(
        os.getenv(
            "CVAT_EXPORT_CACHE_LOCK_ACQUISITION_TIMEOUT",
            default_export_cache_lock_acquisition_timeout,
        )
    )

if EXPORT_CACHE_LOCK_ACQUISITION_TIMEOUT <= EXPORT_CACHE_LOCK_TTL:
    raise ImproperlyConfigured("Lock acquisition timeout must be more than lock TTL")

EXPORT_LOCKED_RETRY_INTERVAL = os.getenv("CVAT_DATASET_EXPORT_LOCKED_RETRY_INTERVAL")
"Retry interval for cases the export cache lock was unavailable, in seconds"

if EXPORT_LOCKED_RETRY_INTERVAL is not None:
    EXPORT_LOCKED_RETRY_INTERVAL = int(EXPORT_LOCKED_RETRY_INTERVAL)
    logger.warning(
        "The CVAT_DATASET_EXPORT_LOCKED_RETRY_INTERVAL is deprecated, "
        "use CVAT_EXPORT_LOCKED_RETRY_INTERVAL instead",
    )
else:
    EXPORT_LOCKED_RETRY_INTERVAL = int(
        os.getenv("CVAT_EXPORT_LOCKED_RETRY_INTERVAL", default_export_locked_retry_interval)
    )

MAX_CONSENSUS_REPLICAS = int(os.getenv("CVAT_MAX_CONSENSUS_REPLICAS", 11))
if MAX_CONSENSUS_REPLICAS < 1:
    raise ImproperlyConfigured(f"MAX_CONSENSUS_REPLICAS must be >= 1, got {MAX_CONSENSUS_REPLICAS}")
