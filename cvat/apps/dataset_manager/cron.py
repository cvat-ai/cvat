# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import os
import shutil
from abc import ABCMeta, abstractmethod
from datetime import timedelta
from pathlib import Path
from typing import ClassVar, Type

from django.conf import settings
from django.utils import timezone

from cvat.apps.dataset_manager.util import (
    CacheFileOrDirPathParseError,
    ExportCacheManager,
    TmpDirManager,
    get_export_cache_lock,
)
from cvat.apps.dataset_manager.views import (
    EXPORT_CACHE_LOCK_ACQUISITION_TIMEOUT,
    EXPORT_CACHE_LOCK_TTL,
    get_export_cache_ttl,
    log_exception,
)
from cvat.apps.engine.log import ServerLogManager

logger = ServerLogManager(__name__).glob


def clear_export_cache(file_path: Path) -> bool:
    with get_export_cache_lock(
        file_path,
        block=True,
        acquire_timeout=EXPORT_CACHE_LOCK_ACQUISITION_TIMEOUT,
        ttl=EXPORT_CACHE_LOCK_TTL,
    ):
        parsed_filename = ExportCacheManager.parse_filename(file_path.name)
        cache_ttl = get_export_cache_ttl(parsed_filename.instance_type)

        if timezone.now().timestamp() <= file_path.stat().st_mtime + cache_ttl.total_seconds():
            logger.debug(f"Export cache file {file_path.name!r} was recently accessed")
            return False

        os.remove(file_path)
        logger.debug(f"Export cache file {file_path.name!r} was successfully removed")
        return True


class BaseCleaner(metaclass=ABCMeta):
    task_description: ClassVar[str]

    def __init__(self) -> None:
        self._number_of_removed_objects = 0

    @property
    def number_of_removed_objects(self) -> int:
        return self._number_of_removed_objects

    @abstractmethod
    def do_cleanup(self):
        pass


class TmpDirectoryCleaner(BaseCleaner):
    task_description: ClassVar[str] = "common temporary directory cleanup"

    def do_cleanup(self) -> None:
        # we do not use locks here when handling objects from tmp directory
        # because undesired race conditions are not possible here:
        # 1. A temporary file/directory can be removed while checking access time.
        #    In that case an exception is expected and is handled by the cron process.
        # 2. A temporary file/directory can be removed by the cron job only when it is outdated.
        # 3. Each temporary file/directory has a unique name, so the race condition when one process is creating an object
        #    and another is removing it - impossible.
        for child in os.scandir(TmpDirManager.TMP_ROOT):
            try:
                if (
                    child.stat().st_atime
                    + timedelta(days=TmpDirManager.TMP_FILE_OR_DIR_RETENTION_DAYS).total_seconds()
                    < timezone.now().timestamp()
                ):
                    if child.is_dir():
                        shutil.rmtree(child.path)
                    else:
                        os.remove(child.path)
                    logger.debug(f"The {child.name} was successfully removed")
                    self._number_of_removed_objects += 1
            except FileNotFoundError:
                # file or directory has been removed by another process
                continue
            except Exception:
                log_exception(logger)


class ExportCacheDirectoryCleaner(BaseCleaner):
    task_description: ClassVar[str] = "export cache directory cleanup"

    def do_cleanup(self) -> None:
        export_cache_dir_path = settings.EXPORT_CACHE_ROOT
        assert os.path.exists(export_cache_dir_path)

        for child in os.scandir(export_cache_dir_path):
            # export cache directory is expected to contain only files
            if not child.is_file():
                logger.warning(f"The {child.name} is not a file, skipping...")
                continue

            try:
                if clear_export_cache(child):
                    self._number_of_removed_objects += 1
            except CacheFileOrDirPathParseError:
                logger.warning(f"Cannot parse {child.name}, skipping...")
                continue

            except Exception:
                log_exception(logger)


def cleanup(CleanerClass: Type[ExportCacheDirectoryCleaner | TmpDirectoryCleaner]) -> None:
    assert issubclass(CleanerClass, BaseCleaner)
    started_at = timezone.now()

    cleaner = CleanerClass()
    cleaner.do_cleanup()

    finished_at = timezone.now()
    logger.info(
        f"The {cleaner.task_description!r} process has been successfully "
        f"completed after {int((finished_at - started_at).total_seconds())} seconds. "
        f"{cleaner.number_of_removed_objects} elements have been removed"
    )


def cleanup_export_cache_directory() -> None:
    cleanup(ExportCacheDirectoryCleaner)


def cleanup_tmp_directory() -> None:
    cleanup(TmpDirectoryCleaner)
