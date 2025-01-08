# Copyright (C) 2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import os
import os.path as osp
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
    OperationType,
    TmpDirManager,
    TmpEntityType,
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
        parsed_filename = ExportCacheManager.parse_file_path(file_path)
        cache_ttl = get_export_cache_ttl(parsed_filename.instance_type)

        if timezone.now().timestamp() <= osp.getmtime(file_path) + cache_ttl.total_seconds():
            logger.debug(f"Export cache file {file_path.name!r} was recently accessed")
            return False

        os.remove(file_path)
        logger.debug(f"Export cache file {file_path.name!r} was successfully removed")
        return True


def remove_tmp_dir(dir_path: str) -> bool:
    # we do not use locks here when handling a temporary directories
    # because undesired race conditions are not possible here:
    # 1. A temporary directory can be removed while parsing its name or checking the last modification date.
    # In that case an exception is expected and will be handled by the cron job.
    # 2. A temporary directory can be removed by a worker only when it is outdated.
    # 3. Each temporary directory has a unique name, so the race condition when one process is creating a directory
    # and another is removing it - impossible.
    parsed = TmpDirManager.parse_tmp_child(dir_path)
    assert parsed.operation == OperationType.EXPORT
    assert parsed.type == TmpEntityType.DIR
    cache_ttl = get_export_cache_ttl(parsed.instance_type)

    if timezone.now().timestamp() <= osp.getmtime(dir_path) + cache_ttl.total_seconds():
        return False

    shutil.rmtree(dir_path)
    logger.debug(f"Temporary directory {dir_path} was successfully removed")
    return True


class BaseCleanupThread(Thread, metaclass=ABCMeta):
    description: ClassVar[str]

    def __init__(self, stop_event: Event, *args, **kwargs) -> None:
        self._stop_event = stop_event
        self._removed_entities = 0
        self._exception = None
        super().__init__(*args, **kwargs, target=self._cleanup)

    @property
    def removed_entities(self) -> int:
        return self._removed_entities

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
        for dir_path in TmpDirManager.get_export_related_dirs():
            # stop clean up process correctly before rq job timeout is ended
            if self._stop_event.is_set():
                return

            try:
                if remove_tmp_dir(dir_path):
                    self._removed_entities += 1
            except CacheFileOrDirPathParseError:
                logger.warning(f"Cannot parse {dir_path.name}, skipping...")
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
                    self._removed_entities += 1
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
        f"{cleanup_thread.removed_entities} elements have been removed"
    )
