# Copyright (C) 2019-2022 Intel Corporation
# Copyright (C) 2023-2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import inspect
import os
import os.path as osp
import re
import zipfile
from collections.abc import Generator, Sequence
from contextlib import contextmanager
from copy import deepcopy
from datetime import timedelta
from enum import Enum
from threading import Lock
from typing import Any

import attrs
import django_rq
from datumaro.util import to_snake_case
from datumaro.util.os_util import make_file_name
from django.conf import settings
from django.db import models
from pottery import Redlock


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
            if "postgresql" in settings.DATABASES["default"]["ENGINE"]:
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


def faster_deepcopy(v):
    "A slightly optimized version of the default deepcopy, can be used as a drop-in replacement."
    # Default deepcopy is very slow, here we do shallow copy for primitive types and containers

    t = type(v)
    if t is dict:
        return {k: faster_deepcopy(vv) for k, vv in v.items()}
    elif t in (list, tuple, set):
        return t(faster_deepcopy(vv) for vv in v)
    elif isinstance(v, (int, float, str, bool)) or v is None:
        return v
    else:
        return deepcopy(v)


class LockNotAvailableError(Exception):
    pass

class CacheFilePathParseError(Exception):
    pass


def make_export_cache_lock_key(filename: os.PathLike[str]) -> str:
    return f"export_lock:{os.fspath(filename)}"


@contextmanager
def get_export_cache_lock(
    export_path: os.PathLike[str],
    *,
    ttl: int | timedelta,
    block: bool = True,
    acquire_timeout: int | timedelta,
) -> Generator[Lock, Any, Any]:
    assert acquire_timeout is not None, "Endless waiting for the lock should be avoided"

    if isinstance(acquire_timeout, timedelta):
        acquire_timeout = acquire_timeout.total_seconds()

    if acquire_timeout < 0:
        raise ValueError("acquire_timeout must be a non-negative number")


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


class ExportFileType(str, Enum):
    ANNOTATIONS = "annotations"
    BACKUP = "backup"
    DATASET = "dataset"


@attrs.frozen
class _ParsedExportFilename:
    file_type: ExportFileType
    file_ext: str
    instance_type: str
    instance_timestamp: float


@attrs.frozen
class ParsedDatasetFilename(_ParsedExportFilename):
    format_repr: str


@attrs.frozen
class ParsedBackupFilename(_ParsedExportFilename):
    pass


class ExportCacheManager:
    # store the instance timestamp in the file name to reliably get this information
    # ctime / mtime do not return file creation time on linux
    # mtime is used for file usage checks
    BASE_FILE_NAME_TEMPLATE = "{file_type}-instance{instance_timestamp}{optional_suffix}.{file_ext}"

    @classmethod
    def make_dataset_file_path(
        cls,
        cache_dir: str,
        *,
        save_images: bool,
        instance_timestamp: float,
        format_name: str,
    ) -> str:
        from .formats.registry import EXPORT_FORMATS

        file_ext = EXPORT_FORMATS[format_name].EXT

        file_type = ExportFileType.DATASET if save_images else ExportFileType.ANNOTATIONS

        normalized_format_name = make_file_name(to_snake_case(format_name))
        filename = cls.BASE_FILE_NAME_TEMPLATE.format_map(
            {
                "file_type": file_type,
                "instance_timestamp": instance_timestamp,
                "optional_suffix": "-" + normalized_format_name,
                "file_ext": file_ext,
            }
        )

        return osp.join(cache_dir, filename)

    @classmethod
    def make_backup_file_path(
        cls,
        cache_dir: str,
        *,
        instance_timestamp: float,
    ) -> str:
        filename = cls.BASE_FILE_NAME_TEMPLATE.format_map(
            {
                "file_type": ExportFileType.BACKUP,
                "instance_timestamp": instance_timestamp,
                "optional_suffix": "",
                "file_ext": "zip",
            }
        )
        return osp.join(cache_dir, filename)

    @staticmethod
    def parse_file_path(
        file_path: os.PathLike[str],
    ) -> ParsedDatasetFilename | ParsedBackupFilename:
        file_path = osp.normpath(file_path)
        dirname, basename = osp.split(file_path)

        # handle directory
        dirname_match = re.search(
            rf"/(jobs|tasks|projects)/\d+/{settings.EXPORT_CACHE_DIR_NAME}$", dirname
        )
        if not dirname_match:
            raise CacheFilePathParseError(f"Couldn't parse instance type in '{dirname}'")

        instance_type_names = dirname_match.group(1)
        assert instance_type_names in {"projects", "tasks", "jobs"}
        instance_type_name = instance_type_names[:-1]

        # handle file name
        file_type, unparsed = basename.split("-", maxsplit=1)
        file_type = ExportFileType(file_type)

        unparsed, file_ext = osp.splitext(unparsed)
        unparsed = unparsed[len('instance'):]
        specific_params = {}

        if file_type in (ExportFileType.DATASET, ExportFileType.ANNOTATIONS):
            try:
                instance_timestamp, format_repr = unparsed.split("-", maxsplit=1)
            except ValueError:
                raise CacheFilePathParseError(f"Couldn't parse file name: '{basename}'")

            specific_params["format_repr"] = format_repr
            ParsedFileNameClass = ParsedDatasetFilename
        elif file_type == ExportFileType.BACKUP:
            instance_timestamp = unparsed
            ParsedFileNameClass = ParsedBackupFilename
        else:
            raise CacheFilePathParseError(f"Unsupported file type: {file_type!r}")

        try:
            instance_timestamp = float(instance_timestamp)
        except ValueError:
            raise CacheFilePathParseError(f"Couldn't parse instance timestamp: '{instance_timestamp}'")

        return ParsedFileNameClass(
            file_type=file_type.value,
            file_ext=file_ext,
            instance_type=instance_type_name,
            instance_timestamp=instance_timestamp,
            **specific_params,
        )


def extend_export_file_lifetime(file_path: str):
    # Update the last modification time to extend the export's lifetime,
    # as the last access time is not available on every filesystem.
    # As a result, file deletion by the cleaning job will be postponed.
    os.utime(file_path, None)
