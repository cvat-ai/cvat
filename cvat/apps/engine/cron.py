# Copyright (C) 2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import importlib
import logging
import os
import os.path as osp
from datetime import timedelta
from pathlib import Path

from django.db.models import QuerySet
from django.utils import timezone

from cvat.apps.dataset_manager.util import ExportCacheManager, get_export_cache_lock
from cvat.apps.dataset_manager.views import (
    EXPORT_CACHE_LOCK_ACQUISITION_TIMEOUT,
    EXPORT_CACHE_LOCK_TTL,
    get_export_cache_ttl,
    log_exception,
)
from cvat.apps.engine.log import ServerLogManager
from cvat.apps.engine.models import Job, Project, Task

logger = ServerLogManager(__name__).glob


def clear_export_cache(file_path: str, logger: logging.Logger) -> None:
    with get_export_cache_lock(
        file_path,
        block=True,
        acquire_timeout=EXPORT_CACHE_LOCK_ACQUISITION_TIMEOUT,
        ttl=EXPORT_CACHE_LOCK_TTL,
    ):
        parsed_filename = ExportCacheManager.parse_file_path(file_path)
        cache_ttl = get_export_cache_ttl(parsed_filename.instance_type)

        if timezone.now().timestamp() <= osp.getmtime(file_path) + cache_ttl.total_seconds():
            logger.info("Cache file '{}' is recently accessed".format(file_path))
            return

        os.remove(file_path)
        logger.debug(f"Export cache file {file_path!r} successfully removed")


def cron_export_cache_cleanup(path_to_model: str) -> None:
    assert isinstance(path_to_model, str)

    started_at = timezone.now()
    module_name, model_name = path_to_model.rsplit(".", 1)
    module = importlib.import_module(module_name)
    ModelClass = getattr(module, model_name)
    assert ModelClass in (Project, Task, Job)

    one_month_ago = timezone.now() - timedelta(days=30)
    queryset: QuerySet[Project | Task | Job] = ModelClass.objects.filter(
        last_export_date__gte=one_month_ago
    )

    for instance in queryset.iterator():
        instance_dir_path = Path(instance.get_dirname())
        export_cache_dir_path = Path(instance.get_export_cache_directory())

        if not export_cache_dir_path.exists():
            logger.debug(
                f"{export_cache_dir_path.relative_to(instance_dir_path)} path does not exist, skipping..."
            )
            continue

        for child in export_cache_dir_path.iterdir():
            # export cache dir may contain temporary directories
            if not child.is_file():
                logger.debug(
                    f"The {child.relative_to(instance_dir_path)} is not a file, skipping..."
                )
                continue

            try:
                clear_export_cache(child, logger)
            except Exception:
                log_exception(logger)

    finished_at = timezone.now()
    logger.info(
        f"Clearing the {model_name.lower()} export cache has been successfully "
        f"completed after {int((finished_at - started_at).total_seconds())} seconds."
    )
