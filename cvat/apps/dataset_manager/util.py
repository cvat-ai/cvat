# Copyright (C) 2019-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import inspect
import os
import os.path as osp
import re
import tempfile
import zipfile
from collections.abc import Generator, Iterable
from contextlib import contextmanager
from copy import deepcopy
from datetime import timedelta
from enum import Enum
from threading import Lock
from typing import Any, Callable, Protocol
from uuid import UUID

import attrs
import django_rq
from datumaro.util import to_snake_case
from datumaro.util.os_util import make_file_name
from django.conf import settings
from pottery import Redlock


def current_function_name(depth=1):
    frame = inspect.currentframe()
    if frame is None:
        return "[unknown]"

    for _ in range(depth):
        frame = frame.f_back
        assert frame is not None, "not enough stack frames"

    return frame.f_code.co_name


def make_zip_archive(src_path, dst_path):
    with zipfile.ZipFile(dst_path, "w") as archive:
        for dirpath, _, filenames in os.walk(src_path):
            for name in filenames:
                path = osp.join(dirpath, name)
                archive.write(path, osp.relpath(path, src_path))


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


class CacheFileOrDirPathParseError(Exception):
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


class OperationType(str, Enum):
    EXPORT = "export"

    def __str__(self):
        return self.value


class ExportFileType(str, Enum):
    ANNOTATIONS = "annotations"
    BACKUP = "backup"
    DATASET = "dataset"
    EVENTS = "events"

    @classmethod
    def values(cls) -> list[str]:
        return [x.value for x in cls]

    def __str__(self):
        return self.value


class InstanceType(str, Enum):
    PROJECT = "project"
    TASK = "task"
    JOB = "job"

    @classmethod
    def values(cls) -> list[str]:
        return [x.value for x in cls]

    def __str__(self):
        return self.value


class FileId(Protocol):
    value: str


@attrs.frozen(kw_only=True)
class SimpleFileId(FileId):
    value: str = attrs.field()


@attrs.frozen(kw_only=True)
class ConstructedFileId(FileId):
    instance_type: InstanceType = attrs.field(converter=InstanceType)
    instance_id: int = attrs.field(converter=int)
    instance_timestamp: float = attrs.field(converter=float)

    @property
    def value(self):
        return "-".join(map(str, [self.instance_type, self.instance_id, self.instance_timestamp]))


@attrs.frozen(kw_only=True)
class ParsedExportFilename:
    file_type: ExportFileType = attrs.field(converter=ExportFileType)
    file_ext: str
    file_id: FileId


class TmpDirManager:
    SPLITTER = "-"
    TMP_ROOT = settings.TMP_FILES_ROOT
    TMP_FILE_OR_DIR_RETENTION_DAYS = settings.TMP_FILE_OR_DIR_RETENTION_DAYS
    IGNORE_CLEANUP_ERRORS = settings.IGNORE_TMP_FOLDER_CLEANUP_ERRORS

    @classmethod
    @contextmanager
    def get_tmp_directory(
        cls,
        *,
        prefix: str | None = None,
        suffix: str | None = None,
    ) -> Generator[str, Any, Any]:
        """
        The method allows to create a temporary directory and
        ensures that the parent directory uses the CVAT tmp directory
        """
        params = {}
        for k, v in {
            "prefix": prefix,
            "suffix": suffix,
            "ignore_cleanup_errors": cls.IGNORE_CLEANUP_ERRORS,
        }.items():
            if v is not None:
                params[k] = v

        with tempfile.TemporaryDirectory(**params, dir=cls.TMP_ROOT) as tmp_dir:
            yield tmp_dir

    @classmethod
    @contextmanager
    def get_tmp_directory_for_export(
        cls,
        *,
        instance_type: str,
    ) -> Generator[str, Any, Any]:
        instance_type = InstanceType(instance_type.lower())
        with cls.get_tmp_directory(
            prefix=cls.SPLITTER.join([OperationType.EXPORT, instance_type]) + cls.SPLITTER
        ) as tmp_dir:
            yield tmp_dir


class ExportCacheManager:
    ROOT = settings.EXPORT_CACHE_ROOT

    SPLITTER = "-"
    INSTANCE_PREFIX = "instance"
    FILE_NAME_TEMPLATE_WITH_INSTANCE = SPLITTER.join(
        [
            "{instance_type}",
            "{instance_id}",
            "{file_type}",
            INSTANCE_PREFIX +
            # store the instance timestamp in the file name to reliably get this information
            # ctime / mtime do not return file creation time on linux
            # mtime is used for file usage checks
            "{instance_timestamp}{optional_suffix}.{file_ext}",
        ]
    )

    FILE_NAME_TEMPLATE_WITHOUT_INSTANCE = SPLITTER.join(["{file_type}", "{file_id}.{file_ext}"])

    @classmethod
    def file_types_with_general_template(cls):
        return (ExportFileType.EVENTS,)

    @classmethod
    def make_dataset_file_path(
        cls,
        *,
        instance_type: str,
        instance_id: int,
        instance_timestamp: float,
        save_images: bool,
        format_name: str,
    ) -> str:
        from .formats.registry import EXPORT_FORMATS

        file_ext = (EXPORT_FORMATS[format_name].EXT).lower()

        instance_type = InstanceType(instance_type.lower())
        file_type = ExportFileType.DATASET if save_images else ExportFileType.ANNOTATIONS

        normalized_format_name = make_file_name(to_snake_case(format_name))
        filename = cls.FILE_NAME_TEMPLATE_WITH_INSTANCE.format(
            instance_type=instance_type,
            instance_id=instance_id,
            file_type=file_type,
            instance_timestamp=instance_timestamp,
            optional_suffix=cls.SPLITTER + normalized_format_name,
            file_ext=file_ext,
        )

        return osp.join(cls.ROOT, filename)

    @classmethod
    def make_backup_file_path(
        cls,
        *,
        instance_type: str,
        instance_id: int,
        instance_timestamp: float,
        lightweight: bool,
    ) -> str:
        instance_type = InstanceType(instance_type.lower())
        filename = cls.FILE_NAME_TEMPLATE_WITH_INSTANCE.format(
            instance_type=instance_type,
            instance_id=instance_id,
            file_type=ExportFileType.BACKUP,
            instance_timestamp=instance_timestamp,
            optional_suffix=cls.SPLITTER + "lightweight" if lightweight else "",
            file_ext="zip",
        )
        return osp.join(cls.ROOT, filename)

    @classmethod
    def make_file_path(
        cls,
        *,
        file_type: str,
        file_id: UUID,
        file_ext: str,
    ) -> str:
        filename = cls.FILE_NAME_TEMPLATE_WITHOUT_INSTANCE.format(
            # convert here to be sure only expected types are used
            file_type=ExportFileType(file_type),
            file_id=file_id,
            file_ext=file_ext,
        )
        return osp.join(cls.ROOT, filename)

    @classmethod
    def parse_filename(cls, filename: str) -> ParsedExportFilename:
        basename, file_ext = osp.splitext(filename)
        file_ext = file_ext.strip(".").lower()

        try:
            for exp_file_type in cls.file_types_with_general_template():
                if basename.startswith(exp_file_type):
                    file_type, file_id = basename.split(cls.SPLITTER, maxsplit=1)

                    return ParsedExportFilename(
                        file_type=file_type, file_id=SimpleFileId(value=file_id), file_ext=file_ext
                    )

            basename_match = re.fullmatch(
                (
                    rf"^(?P<instance_type>{'|'.join(InstanceType.values())})"
                    rf"{cls.SPLITTER}(?P<instance_id>\d+)"
                    rf"{cls.SPLITTER}(?P<file_type>{'|'.join(ExportFileType.values())})"
                    rf"{cls.SPLITTER}(?P<unparsed>.+)$"
                ),
                basename,
            )

            if not basename_match:
                assert False  # will be handled

            fragments = basename_match.groupdict()
            unparsed = fragments.pop("unparsed")[len(cls.INSTANCE_PREFIX) :]
            instance_timestamp = unparsed

            if fragments["file_type"] in (ExportFileType.DATASET, ExportFileType.ANNOTATIONS):
                # The "format" is a part of file id, but there is actually
                # no need to use it after filename parsing, so just drop it.
                instance_timestamp, _ = unparsed.split(cls.SPLITTER, maxsplit=1)
            elif fragments["file_type"] == ExportFileType.BACKUP:
                # Backup filename may have "lightweight" suffix
                split_unparsed = unparsed.split(cls.SPLITTER, maxsplit=1)
                if len(split_unparsed) > 1:
                    instance_timestamp, _ = split_unparsed

            parsed_file_name = ParsedExportFilename(
                file_type=fragments.pop("file_type"),
                file_id=ConstructedFileId(
                    instance_timestamp=instance_timestamp,
                    **fragments,
                ),
                file_ext=file_ext,
            )
        except Exception as ex:
            raise CacheFileOrDirPathParseError(f"Couldn't parse file name: {basename!r}") from ex

        return parsed_file_name


def extend_export_file_lifetime(file_path: str):
    # Update the last modification time to extend the export's lifetime,
    # as the last access time is not available on every filesystem.
    # As a result, file deletion by the cleaning job will be postponed.
    os.utime(file_path, None)


def linear_sort_shapes(shapes: Iterable) -> list:
    # as frame range is always has certain range
    # it allows us use efficient linear sorting algorithm
    min_frame = None
    max_frame = None
    d = {}
    for shape in shapes:
        frame = shape["frame"]
        d[frame] = shape
        min_frame = frame if min_frame is None else min(frame, min_frame)
        max_frame = frame if max_frame is None else max(frame, max_frame)

    sorted_shapes = []
    if max_frame is not None:
        for i in range(min_frame, max_frame + 1):
            if i in d:
                sorted_shapes.append(d[i])
    return sorted_shapes


def make_getter_by_frame_for_annotation_stream(
    gen: Iterable[dict],
) -> Callable[[int], Generator[dict, None, None]]:
    if isinstance(gen, list):
        gen = iter(gen)
    ann = None

    def get(frame_index: int) -> Generator[dict, None, None]:
        nonlocal ann

        while True:
            if ann is None:
                try:
                    ann = next(gen)
                except StopIteration:
                    break

            assert ann["frame"] >= frame_index
            if ann["frame"] == frame_index:
                yield ann
                ann = None
            else:
                break

    return get
