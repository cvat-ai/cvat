# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import glob
import os
import shutil
from abc import ABCMeta, abstractmethod
from collections.abc import Iterator
from datetime import timedelta
from pathlib import Path
from typing import ClassVar

from django.conf import settings
from django.utils import timezone

from cvat.apps.dataset_manager.util import (
    CacheFileOrDirPathParseError,
    ConstructedFileId,
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


class BaseCleaner(metaclass=ABCMeta):
    @property
    @abstractmethod
    def owned_path_globs(self) -> Iterator[str]:
        """Absolute glob patterns matching every file/directory this cleaner may remove"""


class _BaseCronCleaner(BaseCleaner):
    """
    By default, removes files and directories that have not been accessed
    for TmpDirManager.TMP_FILE_OR_DIR_RETENTION_DAYS days
    """

    task_description: ClassVar[str]
    RETENTION: ClassVar[timedelta] = timedelta(days=TmpDirManager.TMP_FILE_OR_DIR_RETENTION_DAYS)

    def _is_outdated(self, path: Path) -> bool:
        return path.stat().st_atime + self.RETENTION.total_seconds() < timezone.now().timestamp()

    def _remove_if_outdated(self, path: Path) -> bool:
        """Remove the file/directory if it is outdated. Returns whether it has been removed."""
        # we do not use locks here when handling objects from tmp directory
        # because undesired race conditions are not possible here:
        # 1. A temporary file/directory can be removed while checking access time.
        #    In that case an exception is expected and is handled by the cron process.
        # 2. A temporary file/directory can be removed by the cron job only when it is outdated.
        # 3. Each temporary file/directory has a unique name, so the race condition when one process is creating an object
        #    and another is removing it - impossible.
        if not self._is_outdated(path):
            return False

        if path.is_dir():
            shutil.rmtree(path)
        else:
            os.remove(path)

        logger.debug(f"The {path} was successfully removed")
        return True

    def cron_cleanup(self) -> int:
        """
        Remove every outdated object from the paths this cleaner is responsible for.
        Returns the number of removed objects.
        """
        removed = 0

        for pattern in self.owned_path_globs:
            for path in map(Path, glob.iglob(pattern)):
                try:
                    removed += int(self._remove_if_outdated(path))
                except FileNotFoundError:
                    # file or directory has been removed by another process
                    continue
                except Exception:
                    log_exception(logger)

        return removed


class _BaseSingleFileCleaner(BaseCleaner):
    def owns(self, path: Path) -> bool:
        """Whether the cleaner is allowed to remove the path"""
        return any(path.match(pattern) for pattern in self.owned_path_globs)

    def single_file_cleanup(self, path: Path) -> int:
        """
        Remove a single file this cleaner is responsible for.
        Returns the number of removed objects (0 or 1).
        """
        if not self.owns(path):
            raise ValueError(f"{path} is not in a directory handled by {type(self).__name__}")

        try:
            os.remove(path)
        except FileNotFoundError:
            return 0

        logger.debug(f"The {path} was successfully removed")
        return 1


class TmpDirectoryCleaner(_BaseCronCleaner, _BaseSingleFileCleaner):
    task_description: ClassVar[str] = "common temporary directory cleanup"

    @property
    def owned_path_globs(self) -> Iterator[str]:
        yield f"{TmpDirManager.TMP_ROOT}/*"


class InstanceTmpDirectoriesCleaner(_BaseCronCleaner, _BaseSingleFileCleaner):
    """
    Cleans <PROJECTS_ROOT|TASKS_ROOT|JOBS_ROOT>/<id>/tmp directories
    (see cvat.apps.engine.models.FileSystemRelatedModel.get_tmp_dirname)
    """

    task_description: ClassVar[str] = "project/task/job temporary directories cleanup"

    @property
    def owned_path_globs(self) -> Iterator[str]:
        for root in (settings.PROJECTS_ROOT, settings.TASKS_ROOT, settings.JOBS_ROOT):
            yield f"{root}/*/tmp/*"


class ExportCacheDirectoryCleaner(_BaseCronCleaner):
    """
    Cleans export cache files whose TTL has expired
    """

    task_description: ClassVar[str] = "export cache directory cleanup"

    @property
    def owned_path_globs(self) -> Iterator[str]:
        yield f"{ExportCacheManager.ROOT}/*"

    def _remove_if_outdated(self, path: Path) -> bool:
        try:
            with get_export_cache_lock(
                path,
                block=True,
                acquire_timeout=EXPORT_CACHE_LOCK_ACQUISITION_TIMEOUT,
                ttl=EXPORT_CACHE_LOCK_TTL,
            ):
                parsed_filename = ExportCacheManager.parse_filename(path.name)
                if isinstance(parsed_filename.file_id, ConstructedFileId):
                    cache_ttl = get_export_cache_ttl(parsed_filename.file_id.instance_type)
                else:
                    cache_ttl = get_export_cache_ttl()  # use common default cache TTL

                if timezone.now().timestamp() <= path.stat().st_mtime + cache_ttl.total_seconds():
                    logger.debug(f"Export cache file {path.name!r} was recently accessed")
                    return False

                os.remove(path)
                logger.debug(f"Export cache file {path.name!r} was successfully removed")
                return True
        except CacheFileOrDirPathParseError:
            logger.warning(f"Cannot parse {path.name}, skipping...")
            return False


def cleanup(CleanerClass: type[_BaseCronCleaner]) -> None:
    assert issubclass(CleanerClass, _BaseCronCleaner)
    started_at = timezone.now()

    cleaner = CleanerClass()
    removed = cleaner.cron_cleanup()

    finished_at = timezone.now()
    logger.info(
        f"The {cleaner.task_description!r} process has been successfully "
        f"completed after {int((finished_at - started_at).total_seconds())} seconds. "
        f"{removed} elements have been removed"
    )


def cleanup_export_cache_directory() -> None:
    cleanup(ExportCacheDirectoryCleaner)


def cleanup_tmp_directory() -> None:
    cleanup(TmpDirectoryCleaner)


def cleanup_instance_tmp_directories() -> None:
    cleanup(InstanceTmpDirectoriesCleaner)
