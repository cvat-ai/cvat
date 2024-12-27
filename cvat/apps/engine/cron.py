# Copyright (C) 2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import os
import os.path as osp
from datetime import timedelta
from functools import wraps
from threading import Event, Thread
from time import sleep
from typing import Callable

from django.conf import settings
from django.utils import timezone
from rq import get_current_job

from cvat.apps.dataset_manager.util import ExportCacheManager, get_export_cache_lock
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


def clear_export_cache(file_path: str) -> None:
    with get_export_cache_lock(
        file_path,
        block=True,
        acquire_timeout=EXPORT_CACHE_LOCK_ACQUISITION_TIMEOUT,
        ttl=EXPORT_CACHE_LOCK_TTL,
    ):
        parsed_filename = ExportCacheManager.parse_file_path(file_path)
        cache_ttl = get_export_cache_ttl(parsed_filename.instance_type)

        if timezone.now().timestamp() <= osp.getmtime(file_path) + cache_ttl.total_seconds():
            logger.debug(f"Export cache file {file_path!r} was recently accessed")
            return

        os.remove(file_path)
        logger.debug(f"Export cache file {file_path!r} was successfully removed")


class CleanupExportCacheThread(Thread):
    def __init__(self, stop_event: Event, *args, **kwargs) -> None:
        self._stop_event = stop_event
        self._removed_files_count = 0
        self._exception_occurred = None
        super().__init__(*args, **kwargs, target=self._cleanup_export_cache)

    @property
    def removed_files_count(self) -> int:
        return self._removed_files_count

    @property
    def exception_occurred(self) -> Exception | None:
        return self._exception_occurred

    def set_exception(self, ex: Exception) -> None:
        assert isinstance(ex, Exception)
        self._exception_occurred = ex

    @suppress_exceptions
    def _cleanup_export_cache(self) -> None:
        export_cache_dir_path = settings.EXPORT_CACHE_ROOT
        assert os.path.exists(export_cache_dir_path)

        for child in os.scandir(export_cache_dir_path):
            # stop clean up process correctly before rq job timeout is ended
            if self._stop_event.is_set():
                return

            # export cache directory may contain temporary directories
            if not child.is_file():
                logger.debug(f"The {child.name} is not a file, skipping...")
                continue

            try:
                clear_export_cache(child)
                self._removed_files_count += 1
            except Exception:
                log_exception(logger)


def cron_export_cache_cleanup() -> None:
    started_at = timezone.now()
    rq_job = get_current_job()
    seconds_left = rq_job.timeout - 60
    sleep_interval = 10
    assert seconds_left > sleep_interval
    finish_before = started_at + timedelta(seconds=seconds_left)

    stop_event = Event()
    cleanup_export_cache_thread = CleanupExportCacheThread(stop_event=stop_event)
    cleanup_export_cache_thread.start()

    while timezone.now() < finish_before:
        if not cleanup_export_cache_thread.is_alive():
            stop_event.set()
            break
        sleep(sleep_interval)

    if not stop_event.is_set():
        stop_event.set()

    cleanup_export_cache_thread.join()
    if isinstance(
        (exception_occurred := cleanup_export_cache_thread.exception_occurred), Exception
    ):
        raise exception_occurred

    finished_at = timezone.now()
    logger.info(
        f"Export cache cleanup has been successfully "
        f"completed after {int((finished_at - started_at).total_seconds())} seconds. "
        f"{cleanup_export_cache_thread.removed_files_count} files have been removed"
    )
