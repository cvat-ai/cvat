# Copyright (C) 2019-2022 Intel Corporation
# Copyright (C) 2023-2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from contextlib import contextmanager, suppress
from copy import deepcopy
from datetime import timedelta
from threading import Lock
from typing import Any, Generator, Optional, Sequence
from enum import IntEnum, auto
import inspect
import os
import os.path as osp
import zipfile

import django_rq
from django.conf import settings
from django.db import models
from pottery import Redlock, ReleaseUnlockedLock


def current_function_name(depth=1):
    return inspect.getouterframes(inspect.currentframe())[depth].function


def make_zip_archive(src_path, dst_path):
    with zipfile.ZipFile(dst_path, 'w') as archive:
        for (dirpath, _, filenames) in os.walk(src_path):
            for name in filenames:
                path = osp.join(dirpath, name)
                archive.write(path, osp.relpath(path, src_path))


def bulk_create(db_model, objects, flt_param):
    if objects:
        if flt_param:
            if 'postgresql' in settings.DATABASES["default"]["ENGINE"]:
                return db_model.objects.bulk_create(objects)
            else:
                ids = list(db_model.objects.filter(**flt_param).values_list('id', flat=True))
                db_model.objects.bulk_create(objects)

                return list(db_model.objects.exclude(id__in=ids).filter(**flt_param))
        else:
            return db_model.objects.bulk_create(objects)

    return []

def is_prefetched(queryset: models.QuerySet, field: str) -> bool:
    return field in queryset._prefetch_related_lookups

def add_prefetch_fields(queryset: models.QuerySet, fields: Sequence[str]) -> models.QuerySet:
    for field in fields:
        if not is_prefetched(queryset, field):
            queryset = queryset.prefetch_related(field)

    return queryset

def get_cached(queryset: models.QuerySet, pk: int) -> models.Model:
    """
    Like regular queryset.get(), but checks for the cached values first
    instead of just making a request.
    """

    # Read more about caching insights:
    # https://www.mattduck.com/2021-01-django-orm-result-cache.html
    # The field is initialized on accessing the query results, eg. on iteration
    if getattr(queryset, '_result_cache'):
        result = next((obj for obj in queryset if obj.pk == pk), None)
    else:
        result = None

    if result is None:
        result = queryset.get(id=pk)

    return result

def deepcopy_simple(v):
    # Default deepcopy is very slow

    if isinstance(v, dict):
        return {k: deepcopy_simple(vv) for k, vv in v.items()}
    elif isinstance(v, (list, tuple, set)):
        return type(v)(deepcopy_simple(vv) for vv in v)
    elif isinstance(v, (int, float, str, bool)) or v is None:
        return v
    else:
        return deepcopy(v)



class LockError(Exception):
    pass

class LockTimeoutError(LockError):
    pass

class LockNotAvailableError(LockError):
    pass

class LockMode(IntEnum):
    shared = auto()
    exclusive = auto()


@contextmanager
def get_dataset_cache_lock(
    export_path: os.PathLike[str],
    *,
    ttl: int | timedelta,
    block: bool = True,
    acquire_timeout: Optional[int | timedelta] = None,
) -> Generator[Lock, Any, Any]:
    if isinstance(acquire_timeout, timedelta):
        acquire_timeout = acquire_timeout.total_seconds()

    if acquire_timeout is None:
        acquire_timeout = -1

    if isinstance(ttl, timedelta):
        ttl = ttl.total_seconds()
    elif not ttl:
        raise ValueError("max_ttl must be a positive number")

    lock = Redlock(
        key=export_path,
        masters={
            django_rq.get_connection(settings.CVAT_QUEUES.EXPORT_DATA.value)
        },
        auto_release_time=ttl,
        raise_on_redis_errors=True,
    )
    try:
        acquired = lock.acquire(blocking=block, timeout=acquire_timeout)
        if acquired:
            yield lock
        else:
            if acquire_timeout > 0:
                raise LockTimeoutError
            else:
                raise LockNotAvailableError

    finally:
        with suppress(ReleaseUnlockedLock):
            lock.release()
