# Copyright (C) 2025 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import os
import shutil
from abc import ABCMeta, abstractmethod
from datetime import timedelta
from functools import wraps
from pathlib import Path
from threading import Event, Thread
from time import sleep
from typing import Callable, ClassVar

from django.conf import settings
from django.utils import timezone
from django.utils.module_loading import import_string
from rq import get_current_job

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


def suppress_exceptions(func: Callable[[CleanupExportCacheThread], None]):
    @wraps(func)
    def wrapper(self: CleanupExportCacheThread):
        try:
            func(self)
        except Exception as ex:
            self.set_exception(ex)

    return wrapper


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



class BaseCleanupThread(Thread, metaclass=ABCMeta):
    description: ClassVar[str]

    def __init__(self, stop_event: Event, *args, **kwargs) -> None:
        self._stop_event = stop_event
        self._number_of_removed_objects = 0
        self._exception = None
        super().__init__(*args, **kwargs, target=self._cleanup)

    @property
    def number_of_removed_objects(self) -> int:
        return self._number_of_removed_objects

    @abstractmethod
    def _cleanup(self) -> None: ...

    def set_exception(self, ex: Exception) -> None:
        assert isinstance(ex, Exception)
        self._exception = ex

    def raise_if_exception(self) -> None:
        if isinstance(self._exception, Exception):
            raise self._exception


class CleanupTmpDirThread(BaseCleanupThread):
    description: ClassVar[str] = "Cleanup common temporary directory"

    @suppress_exceptions
    def _cleanup(self) -> None:
        # we do not use locks here when handling objects from tmp directory
        # because undesired race conditions are not possible here:
        # 1. A temporary file/directory can be removed while checking access time.
        #    In that case an exception is expected and is handled by the cron process.
        # 2. A temporary file/directory can be removed by the cron job only when it is outdated.
        # 3. Each temporary file/directory has a unique name, so the race condition when one process is creating an object
        # and another is removing it - impossible.
        for child in os.scandir(TmpDirManager.TMP_ROOT):
            # stop clean up process correctly before rq job timeout is ended
            if self._stop_event.is_set():
                return

            try:
                if (
                    child.stat().st_atime + timedelta(
                        days=TmpDirManager.TMP_FILE_OR_DIR_RETENTION_DAYS
                    ).total_seconds() < timezone.now().timestamp()
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


class CleanupExportCacheThread(BaseCleanupThread):
    description: ClassVar[str] = "Cleanup export cache"

    @suppress_exceptions
    def _cleanup(self) -> None:
        export_cache_dir_path = settings.EXPORT_CACHE_ROOT
        assert os.path.exists(export_cache_dir_path)

        for child in os.scandir(export_cache_dir_path):
            # stop clean up process correctly before rq job timeout is ended
            if self._stop_event.is_set():
                return

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


def cleanup(thread_class_path: str) -> None:
    ThreadClass = import_string(thread_class_path)
    assert issubclass(ThreadClass, BaseCleanupThread)

    started_at = timezone.now()
    rq_job = get_current_job()
    seconds_left = rq_job.timeout - 60
    sleep_interval = 10
    assert seconds_left > sleep_interval
    finish_before = started_at + timedelta(seconds=seconds_left)

    stop_event = Event()
    cleanup_thread = ThreadClass(stop_event=stop_event)
    cleanup_thread.start()

    while timezone.now() < finish_before:
        if not cleanup_thread.is_alive():
            stop_event.set()
            break
        sleep(sleep_interval)

    if not stop_event.is_set():
        stop_event.set()

    cleanup_thread.join()
    cleanup_thread.raise_if_exception()

    finished_at = timezone.now()
    logger.info(
        f"The {cleanup_thread.description!r} process has been successfully "
        f"completed after {int((finished_at - started_at).total_seconds())} seconds. "
        f"{cleanup_thread.number_of_removed_objects} elements have been removed"
    )
