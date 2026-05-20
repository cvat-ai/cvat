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
Allow or disallow static media cache for new tasks.
If disabled, CVAT will not allow task creation with static media cache.
New tasks requesting static media cache will be automatically switched to the dynamic cache.
When enabled, CVAT will allow task creation with static media chunks.

Static media cache can increase data access speed and reduce server load,
but significantly increase disk space occupied by tasks.
"""

CVAT_CACHE_ITEM_MAX_SIZE = 500 * 1024 * 1024
"""
Kvrocks limits the item size to 512 MB, which results “Connection reset” exception.
Let's check the data size and raise an understandable exception instead of the redis-py exception
Sets the maximum size in bytes of a data chunk item stored on redis_ondisk
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

DEFAULT_DB_BULK_CREATE_BATCH_SIZE = int(os.getenv("CVAT_DEFAULT_DB_BULK_CREATE_BATCH_SIZE", 5000))

DEFAULT_DB_ANNO_CHUNK_SIZE = int(os.getenv("CVAT_DEFAULT_DB_ANNO_CHUNK_SIZE", 2000))

MAX_JOBS_PER_TASK = int(os.getenv("CVAT_MAX_JOBS_PER_TASK", 5_000))

DEFAULT_BACKING_CS_ID = os.getenv("CVAT_DEFAULT_BACKING_CS_ID")
"""
ID of the default backing cloud storage for local tasks.
If not set or blank, tasks will be stored on the filesystem.
"""
if DEFAULT_BACKING_CS_ID:
    DEFAULT_BACKING_CS_ID = int(DEFAULT_BACKING_CS_ID)
else:
    DEFAULT_BACKING_CS_ID = None

CLOUD_STORAGE_INSTANCE_CACHE_SIZE = int(os.getenv("CVAT_CLOUD_STORAGE_INSTANCE_CACHE_SIZE", 2))
"""
Number of cloud storage client instances kept in the per-process TTL cache.
Constructing boto3/Azure/GCS clients is expensive (~100ms each), so reusing
them across calls is a significant win — but each cached instance keeps a
boto3 Session and HTTP connection pool resident in memory.

Measured RSS overhead vs. an idle Django worker (boto3 S3, anonymous, single
NUMPROC). The first instance includes the one-time ~12 MB shared botocore
service-model load; each subsequent slot adds ~1.1 MB:
  -   1 cached:   +12 MB
  -   2 cached:   +13 MB  (1 +  1 * 1.1)
  -   8 cached:   +20 MB  (1 +  7 * 1.1)
  -  16 cached:   +29 MB  (1 + 15 * 1.1)
  -  32 cached:   +45 MB  (measured)
  - 128 cached:  +152 MB  (measured)

Recommended per-role overrides via `CVAT_CLOUD_STORAGE_INSTANCE_CACHE_SIZE`:
  - default (e.g. import/export/quality workers):  2  — one-off jobs, rare
    repeats; keep RSS small.
  - server (UI/API):                               8  — task-creation dialog
    navigation makes repeat hits on the same CS within a session.
  - chunk worker:                                 16  — batches of chunks
    against the same CS / backing CS are the hottest reuse path.
"""

CLOUD_STORAGE_INSTANCE_CACHE_TTL = int(os.getenv("CVAT_CLOUD_STORAGE_INSTANCE_CACHE_TTL", 300))
"""
Time-to-live (seconds) for cached cloud storage client instances.

On expiry the entry is evicted, the boto3 Session is GC'd, and its kept-alive
HTTP connection pool is closed. This bounds how long an idle client (with
potentially stale TCP connections, DNS records, or STS session tokens) can
linger in the cache. After eviction the next request rebuilds the client
(~27 ms with the shared botocore loader) and re-establishes connections.

Lower values trade build-time CPU for fresher state; higher values trade RSS
for fewer cold rebuilds. Default 300 s (5 min).
"""
