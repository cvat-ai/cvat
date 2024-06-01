# Copyright (C) 2019-2022 Intel Corporation
# Copyright (C) 2023-2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import inspect
import os
import os.path as osp
import re
import zipfile
from contextlib import contextmanager
from copy import deepcopy
from datetime import timedelta
from threading import Lock
from typing import Any, Generator, Optional, Sequence

import attrs
import django_rq
from datumaro.util import to_snake_case
from datumaro.util.os_util import make_file_name
from django.conf import settings
from django.db import models
from pottery import Redlock

from cvat.apps.engine.models import Job, Project, Task


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


class LockNotAvailableError(Exception):
    pass


def make_export_cache_lock_key(filename: os.PathLike[str]) -> str:
    return f"export_lock:{os.fspath(filename)}"


@contextmanager
def get_export_cache_lock(
    export_path: os.PathLike[str],
    *,
    ttl: int | timedelta,
    block: bool = True,
    acquire_timeout: Optional[int | timedelta] = None,
) -> Generator[Lock, Any, Any]:
    if isinstance(acquire_timeout, timedelta):
        acquire_timeout = acquire_timeout.total_seconds()
    if acquire_timeout is not None and acquire_timeout < 0:
        raise ValueError("acquire_timeout must be a non-negative number")
    elif acquire_timeout is None:
        acquire_timeout = -1

    if isinstance(ttl, timedelta):
        ttl = ttl.total_seconds()
    if not ttl or ttl < 0:
        raise ValueError("ttl must be a non-negative number")

    # https://redis.io/docs/latest/develop/use/patterns/distributed-locks/
    # The lock is exclusive, so it may potentially reduce performance in some cases,
    # where parallel access is potentially possible and valid,
    # e.g. dataset downloading could use a shared lock instead.
    lock = Redlock(
        key=make_export_cache_lock_key(export_path),
        masters={django_rq.get_connection(settings.CVAT_QUEUES.EXPORT_DATA.value)},
        auto_release_time=ttl,
    )
    acquired = lock.acquire(blocking=block, timeout=acquire_timeout)
    try:
        if acquired:
            yield lock
        else:
            raise LockNotAvailableError

    finally:
        if acquired:
            lock.release()


EXPORT_CACHE_DIR_NAME = 'export_cache'


def get_export_cache_dir(db_instance: Project | Task | Job) -> str:
    base_dir = osp.abspath(db_instance.get_dirname())

    if osp.isdir(base_dir):
        return osp.join(base_dir, EXPORT_CACHE_DIR_NAME)
    else:
        raise FileNotFoundError(
            '{} dir {} does not exist'.format(db_instance.__class__.__name__, base_dir)
        )


def make_export_filename(
    dst_dir: str,
    save_images: bool,
    instance_timestamp: float,
    format_name: str,
) -> str:
    from .formats.registry import EXPORT_FORMATS
    file_ext = EXPORT_FORMATS[format_name].EXT

    filename = '%s-instance%f-%s.%s' % (
        'dataset' if save_images else 'annotations',
        # store the instance timestamp in the file name to reliably get this information
        # ctime / mtime do not return file creation time on linux
        # mtime is used for file usage checks
        instance_timestamp,
        make_file_name(to_snake_case(format_name)),
        file_ext,
    )
    return osp.join(dst_dir, filename)


@attrs.define
class ParsedExportFilename:
    instance_type: str
    has_images: bool
    instance_timestamp: Optional[float]
    format_repr: str
    file_ext: str


def parse_export_file_path(file_path: os.PathLike[str]) -> ParsedExportFilename:
    file_path = osp.normpath(file_path)
    dirname, basename = osp.split(file_path)

    basename_match = re.fullmatch(
        (
            r'(?P<export_mode>dataset|annotations)'
            r'(?:-instance(?P<instance_timestamp>\d+\.\d+))?' # optional for backward compatibility
            r'-(?P<format_tag>.+)'
            r'\.(?P<file_ext>.+)'
        ),
        basename
    )
    if not basename_match:
        raise ValueError(f"Couldn't parse filename components in '{basename}'")

    dirname_match = re.search(rf'/(jobs|tasks|projects)/\d+/{EXPORT_CACHE_DIR_NAME}$', dirname)
    if not dirname_match:
        raise ValueError(f"Couldn't parse instance type in '{dirname}'")

    match dirname_match.group(1):
        case 'jobs':
            instance_type_name = 'job'
        case 'tasks':
            instance_type_name = 'task'
        case 'projects':
            instance_type_name = 'project'
        case _:
            assert False

    if 'instance_timestamp' in basename_match.groupdict():
        instance_timestamp = float(basename_match.group('instance_timestamp'))
    else:
        instance_timestamp = None

    return ParsedExportFilename(
        instance_type=instance_type_name,
        has_images=basename_match.group('export_mode') == 'dataset',
        instance_timestamp=instance_timestamp,
        format_repr=basename_match.group('format_tag'),
        file_ext=basename_match.group('file_ext'),
    )
