# Copyright (C) 2019-2022 Intel Corporation
# Copyright (C) 2023-2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from copy import deepcopy
from datetime import datetime, timedelta
import random
from time import sleep
from typing import IO, Any, Optional, Protocol, Sequence, Union
from enum import IntEnum, auto
import inspect
import os, os.path as osp
import zipfile
import fcntl
import os
import errno

from django.conf import settings
from django.db import models


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

EXPORT_CACHE_DIR_LOCK_FILENAME = "dir.lock"

class LockMode(IntEnum):
    shared = auto()
    exclusive = auto()

class HasFileno(Protocol):
    def fileno(self) -> int: ...

FileDescriptorLike = Union[int, HasFileno]


def _lock_file(
    f: FileDescriptorLike,
    mode: LockMode = LockMode.exclusive,
    block: bool = False,
):
    """
    Creates an advisory, filesystem-level lock using BSD Flock.
    """

    flags = 0

    if mode == LockMode.exclusive:
        flags |= fcntl.LOCK_EX
    elif mode == LockMode.shared:
        flags |= fcntl.LOCK_SH
    else:
        assert False

    if not block:
        flags |= fcntl.LOCK_NB

    try:
        # Flock call details:
        # https://manpages.debian.org/bookworm/manpages-dev/flock.2.en.html
        fcntl.flock(f, flags)
    except OSError as e:
        # Interrupts (errno.EINTR) should be forwarded
        if e.errno in [errno.EWOULDBLOCK, errno.ENOLCK]:
            raise LockNotAvailableError
        else:
            raise

def _unlock_file(f: FileDescriptorLike):
    # Flock call details:
    # https://manpages.debian.org/bookworm/manpages-dev/flock.2.en.html
    fcntl.flock(f, fcntl.LOCK_UN)


class AtomicOpen:
    """
    Class for ensuring that all file operations are atomic, treat
    initialization like a standard call to 'open' that happens to be atomic.
    This file opener *must* be used in a "with" block.
    """

    def __init__(
        self,
        path: str,
        *args,
        lock_mode: LockMode = LockMode.exclusive,
        block: bool = True,
        **kwargs,
    ):
        # Open the file to obtain a file descriptor for locking
        self.file: IO[Any] = open(path, *args, **kwargs)

        # Lock the opened file
        _lock_file(self.file, mode=lock_mode, block=block)

    # Return the opened file object (knowing a lock has been obtained).
    def __enter__(self, *args, **kwargs):
        return self.file

    # Unlock the file and close the file object.
    def __exit__(self, exc_type=None, exc_value=None, traceback=None):
        # Flush to make sure all buffered contents are written to file.
        self.file.flush()
        os.fsync(self.file.fileno())

        # Release the lock on the file.
        _unlock_file(self.file)

        self.file.close()

        # Handle exceptions that may have come up during execution, by
        # default any exceptions are raised to the user.
        if (exc_type != None):
            return False
        else:
            return True


def get_file_lock(
    file_path: os.PathLike[str],
    *open_args,
    lock_mode: LockMode = LockMode.exclusive,
    block: bool = False,
    timeout: Optional[int | timedelta] = None,
    **open_kwargs
) -> AtomicOpen:
    if block and timeout:
        raise NotImplementedError("Can't use timeout with blocking mode")

    time_start = None
    if timeout:
        time_start = datetime.now()

        if isinstance(timeout, int):
            timeout = timedelta(seconds=timeout)

    while True:
        if timeout and time_start + timeout < datetime.now():
            raise LockTimeoutError

        try:
            return AtomicOpen(
                file_path, *open_args, block=block, lock_mode=lock_mode, **open_kwargs
            )
        except LockNotAvailableError as e:
            if timeout:
                delay = 0.1 + random.random(1)
                if time_start + timeout < datetime.now() + delay:
                    raise LockTimeoutError from e

                sleep(delay)
            else:
                raise

    assert False, "Unreachable"


def get_dataset_cache_lock(
    export_dir: os.PathLike[str],
    *,
    mode: LockMode = LockMode.exclusive,
    block: bool = False,
    timeout: Optional[int | timedelta] = None,
) -> AtomicOpen:
    # Lock the directory using a file inside the directory
    lock_file_path = osp.join(export_dir, EXPORT_CACHE_DIR_LOCK_FILENAME)

    return get_file_lock(lock_file_path, mode='a', lock_mode=mode, block=block, timeout=timeout)
